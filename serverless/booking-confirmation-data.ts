import { bookingError, mergeBookingText } from "../shared/online-booking";
import { bookingHash } from "./crm-calendar-google";

export function bookingMessageValues(
  event: any,
  links: { invoice?: string; booking?: string } = {},
) {
  const d = JSON.parse(event.document_json),
    zone = d.timezone || "Europe/London";
  return {
    client_name: d.name || "",
    first_name: d.firstName || d.name?.split(" ")[0] || "",
    last_name: d.lastName || "",
    session_name: d.serviceName || "",
    session_date: new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(event.starts_at),
    session_start_time: new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(event.starts_at),
    company_name: d.businessName || "",
    team_member: d.resourceName || "",
    booking_status:
      event.status === "requested" ? "awaiting approval" : event.status,
    invoice_link: links.invoice || "",
    booking_link: links.booking || "",
  };
}
export function bookingThankYou(event: any) {
  const d = JSON.parse(event.document_json);
  return ["confirmed", "requested"].includes(event.status) &&
    d.messages?.thankYou
    ? mergeBookingText(d.messages.thankYou, bookingMessageValues(event))
    : "";
}
export async function bookingDocumentEvent(
  db: any,
  slug: string,
  id: string,
  token: string,
) {
  if (!token || token.length > 200)
    throw bookingError("Booking access is invalid.", 403);
  const hash = await bookingHash(token);
  const e = await db
    .prepare(
      `SELECT e.* FROM crm_calendar_events e JOIN crm_online_booking_pages p ON p.workspace_id=e.workspace_id WHERE p.public_slug=? AND e.id=? AND (e.token_hash=? OR EXISTS(SELECT 1 FROM crm_booking_document_tokens t WHERE t.workspace_id=e.workspace_id AND t.event_id=e.id AND t.token_hash=? AND t.expires_at>?))`,
    )
    .bind(slug, id, hash, hash, Date.now())
    .first();
  if (!e) throw bookingError("Booking not found.", 404);
  return e;
}
export async function getBookingInvoice(
  db: any,
  slug: string,
  id: string,
  token: string,
) {
  const e = await bookingDocumentEvent(db, slug, id, token);
  if (!e.invoice_id) throw bookingError("Invoice not found.", 404);
  const invoice = await db
    .prepare(
      "SELECT id,reference,currency,total_amount,status,issue_date,due_date,business_snapshot_json,client_snapshot_json FROM crm_invoices WHERE workspace_id=? AND id=? AND job_id=?",
    )
    .bind(e.workspace_id, e.invoice_id, e.job_id)
    .first();
  if (!invoice) throw bookingError("Invoice not found.", 404);
  const [items, schedule, payments] = await Promise.all([
    db
      .prepare(
        "SELECT name,quantity,unit_price_amount,line_total_amount FROM crm_invoice_items WHERE workspace_id=? AND invoice_id=? ORDER BY display_order",
      )
      .bind(e.workspace_id, e.invoice_id)
      .all(),
    db
      .prepare(
        "SELECT label,amount,due_date FROM crm_invoice_schedule_items WHERE workspace_id=? AND invoice_id=? ORDER BY due_date,display_order",
      )
      .bind(e.workspace_id, e.invoice_id)
      .all(),
    db
      .prepare(
        "SELECT COALESCE(SUM(CASE WHEN payment_type='payment' THEN amount ELSE -amount END),0) paid FROM crm_invoice_payments WHERE workspace_id=? AND invoice_id=?",
      )
      .bind(e.workspace_id, e.invoice_id)
      .first(),
  ]);
  return {
    reference: invoice.reference,
    currency: invoice.currency,
    total: invoice.total_amount,
    status: invoice.status,
    issued: invoice.issue_date,
    due: invoice.due_date,
    businessName: JSON.parse(invoice.business_snapshot_json).businessName || "",
    clientName: JSON.parse(invoice.client_snapshot_json).name || "",
    items: items.results,
    schedule: schedule.results,
    paid: Number(payments.paid),
  };
}
export async function applyBookingWorkflows(
  db: any,
  workspaceId: string,
  eventId = "",
) {
  const { results } = await db
    .prepare(
      `SELECT e.*,j.booking_date,j.event_date FROM crm_calendar_events e JOIN crm_jobs j ON j.id=e.job_id AND j.workspace_id=e.workspace_id WHERE e.workspace_id=? AND (?='' OR e.id=?) AND e.status='confirmed' AND json_extract(e.document_json,'$.workflow.id') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM crm_booking_workflow_applied a WHERE a.event_id=e.id AND a.workspace_id=e.workspace_id) LIMIT 200`,
    )
    .bind(workspaceId, eventId, eventId)
    .all();
  for (const e of results) {
    const w = JSON.parse(e.document_json).workflow,
      id = "booking_workflow_" + e.id;
    const snapshot = w.steps.map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      taskType: s.task_type,
      relativeTo: s.relative_to,
      offsetDays: s.offset_days,
      priority: s.priority,
      sortOrder: s.sort_order,
      required: Boolean(s.required),
    }));
    const statements = [
      db
        .prepare(
          `INSERT OR IGNORE INTO crm_job_workflows(id,workspace_id,job_id,template_id,template_name,template_version,snapshot_json) SELECT ?,?,?,(SELECT id FROM crm_workflow_templates WHERE id=? AND workspace_id=?),?,?,? WHERE EXISTS(SELECT 1 FROM crm_calendar_events WHERE workspace_id=? AND id=? AND status='confirmed' AND version=?) AND NOT EXISTS(SELECT 1 FROM crm_booking_workflow_applied WHERE workspace_id=? AND event_id=?)`,
        )
        .bind(
          id,
          workspaceId,
          e.job_id,
          w.id,
          workspaceId,
          w.name,
          w.version,
          JSON.stringify(snapshot),
          workspaceId,
          e.id,
          e.version,
          workspaceId,
          e.id,
        ),
    ];
    for (const [i, step] of w.steps.entries()) {
      const base =
        step.relative_to === "booking_date" ? e.booking_date : e.event_date;
      const due = base
        ? new Date(
            Date.parse(base + "T12:00:00Z") +
              Number(step.offset_days) * 86400000,
          )
            .toISOString()
            .slice(0, 10)
        : "";
      statements.push(
        db
          .prepare(
            `INSERT OR IGNORE INTO crm_tasks(id,workspace_id,job_id,workflow_id,template_step_id,title,description,task_type,priority,due_at,assigned_user_id) SELECT ?,?,?,?,(SELECT id FROM crm_workflow_template_steps WHERE id=? AND workspace_id=?),?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM crm_job_workflows WHERE id=? AND workspace_id=? AND status='active') AND NOT EXISTS(SELECT 1 FROM crm_booking_workflow_applied WHERE workspace_id=? AND event_id=?) AND EXISTS(SELECT 1 FROM crm_calendar_events WHERE id=? AND workspace_id=? AND status='confirmed' AND version=?)`,
          )
          .bind(
            id + "_" + i,
            workspaceId,
            e.job_id,
            id,
            step.id,
            workspaceId,
            step.name,
            step.description,
            step.task_type,
            step.priority,
            due,
            e.staff_user_id || null,
            id,
            workspaceId,
            workspaceId,
            e.id,
            e.id,
            workspaceId,
            e.version,
          ),
      );
    }
    statements.push(
      db
        .prepare(
          "INSERT OR IGNORE INTO crm_booking_workflow_applied(workspace_id,event_id) SELECT ?,? WHERE EXISTS(SELECT 1 FROM crm_calendar_events WHERE workspace_id=? AND id=? AND status='confirmed' AND version=?)",
        )
        .bind(workspaceId, e.id, workspaceId, e.id, e.version),
    );
    await db.batch(statements);
  }
}
