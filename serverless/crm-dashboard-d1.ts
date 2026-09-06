import { dashboardDays, validateDashboardRange, validDay } from "../shared/crm-dashboard";
import type { DashboardData } from "../shared/crm-dashboard";
import { getCrmPaymentsOverview } from "./crm-payments-overview-d1";

type Actor = { workspaceId: string; permissions?: string[] };
type Capabilities = { bookings: boolean; payments: boolean };
export async function getCrmDashboard(db: D1Database, actor: Actor, input: { from: string; to: string; jobType?: string }, access: Capabilities, today = new Date().toISOString().slice(0, 10)): Promise<DashboardData> {
  if (!actor.workspaceId || !actor.permissions?.includes("crm:read")) throw Object.assign(new Error("You do not have permission to view this dashboard."), { statusCode: 403 });
  const range = validateDashboardRange(input.from, input.to);
  const jobType = String(input.jobType || "").trim();
  if (jobType.length > 100) throw Object.assign(new Error("Invalid job type."), { statusCode: 400 });
  const capabilities = { bookings: access.bookings, payments: access.bookings && access.payments };
  const ws = actor.workspaceId;
  const [leadResult, jobResult, taskResult, receiptResult, due] = await Promise.all([
    db.prepare(`SELECT id, event_type, lead_source, source, created_at FROM crm_enquiries WHERE workspace_id = ? AND status <> 'archived'`).bind(ws).all<any>(),
    capabilities.bookings ? db.prepare(`SELECT id, title, job_type, event_date, booking_date, created_at, status, venue_text FROM crm_jobs WHERE workspace_id = ? AND status <> 'archived'`).bind(ws).all<any>() : { results: [] },
    capabilities.bookings ? db.prepare(`SELECT t.id, t.job_id, t.title, t.due_at, t.priority, j.title AS job_title, j.job_type FROM crm_tasks t JOIN crm_jobs j ON j.id = t.job_id AND j.workspace_id = t.workspace_id WHERE t.workspace_id = ? AND t.status = 'pending' AND trim(t.due_at) <> '' AND j.status NOT IN ('archived', 'cancelled', 'completed') ORDER BY t.due_at, t.id`).bind(ws).all<any>() : { results: [] },
    capabilities.payments ? db.prepare(`SELECT date(p.paid_at) AS day, upper(p.currency) AS currency, SUM(CASE WHEN p.payment_type = 'refund' THEN -p.amount ELSE p.amount END) AS amount FROM crm_invoice_payments p JOIN crm_invoices i ON i.id = p.invoice_id AND i.workspace_id = p.workspace_id JOIN crm_jobs j ON j.id = i.job_id AND j.workspace_id = i.workspace_id WHERE p.workspace_id = ? AND date(p.paid_at) BETWEEN ? AND ? AND (? = '' OR j.job_type = ?) GROUP BY day, upper(p.currency)`).bind(ws, range.previousFrom, range.to, jobType, jobType).all<any>() : { results: [] },
    capabilities.payments ? getCrmPaymentsOverview(db, actor) : null,
  ]);
  const leads = leadResult.results || [], jobs = jobResult.results || [];
  const matches = (type: string) => !jobType || type === jobType;
  const days = dashboardDays(range.from, range.to), previousDays = dashboardDays(range.previousFrom, range.previousTo);
  const byDay = new Map([...previousDays, ...days].map(day => [day.date, day]));
  const sources = new Map<string, { name: string; count: number }>();
  for (const lead of leads.filter((row: any) => matches(row.event_type))) {
    const date = String(lead.created_at || "").slice(0, 10);
    const day = byDay.get(date);
    if (day) day.leads++;
    if (date >= range.from && date <= range.to) {
      const source = String(lead.lead_source || lead.source || "Not recorded").trim() || "Not recorded";
      const key = source.toLocaleLowerCase("en-GB");
      const entry = sources.get(key) || { name: source, count: 0 };
      entry.count++;
      sources.set(key, entry);
    }
  }
  const selectedJobs = jobs.filter((row: any) => matches(row.job_type));
  for (const job of selectedJobs) {
    const booked = byDay.get(String(job.booking_date || job.created_at || "").slice(0, 10));
    if (booked) booked.bookings++;
    const event = byDay.get(String(job.event_date || "").slice(0, 10));
    if (event && job.status !== 'cancelled') event.weddings++;
  }
  for (const row of receiptResult.results || []) {
    const day = byDay.get(row.day);
    if (day) day.payments[row.currency] = Number(row.amount);
  }
  const selectedIds = new Set(selectedJobs.map((job: any) => job.id));
  const payments = (due?.rows || []).filter(row => row.outstandingAmount > 0 && selectedIds.has(row.job.id)).map(row => ({ id: row.id, jobId: row.job.id, jobTitle: row.job.title, invoiceId: row.invoiceId, reference: row.invoiceReference, due: row.dueDate, amount: row.outstandingAmount, currency: row.currency })).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.id.localeCompare(b.id));
  return {
    range, capabilities,
    jobTypes: [...new Set([...leads.map((row: any) => row.event_type), ...jobs.map((row: any) => row.job_type)].filter(Boolean))].sort() as string[],
    days, previousDays,
    currencies: [...new Set([...(receiptResult.results || []).map((row: any) => row.currency), ...payments.map(row => row.currency)])].sort() as string[],
    sources: [...sources.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    upcoming: selectedJobs.filter((job: any) => !['cancelled', 'completed'].includes(job.status) && validDay(job.event_date) && job.event_date >= today).map((job: any) => ({ id: job.id, title: job.title, date: job.event_date, venue: job.venue_text, type: job.job_type })).sort((a: any, b: any) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)),
    tasks: (taskResult.results || []).filter((task: any) => matches(task.job_type) && validDay(String(task.due_at).slice(0, 10))).map((task: any) => ({ id: task.id, jobId: task.job_id, jobTitle: task.job_title, title: task.title, due: String(task.due_at).slice(0, 10), priority: task.priority })),
    payments,
  };
}
