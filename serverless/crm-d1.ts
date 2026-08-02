import { applyDefaultWorkflowToJob, ensureWorkflowWorkspaceSetup } from "./crm-workflow-d1";

type D1Db = any;

export type CrmActor = {
  userId?: string;
  email?: string;
  workspaceId: string;
  businessName?: string;
  permissions?: string[];
  accessMode?: string;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function integer(value: unknown): number | null {
  if (value === null || value === undefined || text(value) === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function safeJson(value: unknown, fallback: any = {}) {
  try {
    return JSON.parse(text(value) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function httpError(message: string, statusCode = 400, details: string[] = []) {
  const error = new Error(message) as Error & { statusCode?: number; details?: string[] };
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function requirePermission(actor: CrmActor, permission: string) {
  if (!(actor.permissions || []).includes(permission)) {
    throw httpError("You do not have permission to perform this CRM action.", 403);
  }
}

function validEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower(value));
}

function slugify(value: unknown) {
  return lower(value)
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 110);
}

function displayName(firstName: unknown, lastName: unknown, fallback = "") {
  return [text(firstName), text(lastName)].filter(Boolean).join(" ") || text(fallback);
}

function shortCode() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 7).toUpperCase();
}

function datedReference(prefix: string) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${prefix}-${date}-${shortCode()}`;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function activity(db: D1Db, actor: Partial<CrmActor>, input: {
  workspaceId: string;
  entityType: "contact" | "enquiry" | "job";
  entityId: string;
  eventType: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  await db.prepare(`
    INSERT INTO crm_activities (
      id, workspace_id, entity_type, entity_id, event_type, summary,
      actor_user_id, actor_email, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    `crm_activity_${crypto.randomUUID()}`,
    input.workspaceId,
    input.entityType,
    input.entityId,
    input.eventType,
    input.summary,
    text(actor.userId) || null,
    lower(actor.email),
    JSON.stringify(input.metadata || {}),
  ).run();
}

async function platformAudit(db: D1Db, actor: CrmActor, input: {
  eventType: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  await db.prepare(`
    INSERT INTO platform_audit_events (
      id, workspace_id, actor_user_id, actor_email, event_type,
      entity_type, entity_id, summary, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    `audit_${crypto.randomUUID()}`,
    actor.workspaceId,
    text(actor.userId) || null,
    lower(actor.email),
    input.eventType,
    input.entityType,
    input.entityId,
    input.summary,
    JSON.stringify(input.metadata || {}),
  ).run();
}

function hydrateStage(row: any) {
  return {
    id: text(row.id),
    key: text(row.stage_key),
    name: text(row.name),
    type: text(row.stage_type),
    sortOrder: Number(row.sort_order || 0),
    color: text(row.color_key || "neutral"),
    default: Boolean(row.is_default),
  };
}

function hydrateContact(row: any) {
  return {
    id: text(row.id),
    firstName: text(row.first_name),
    lastName: text(row.last_name),
    displayName: text(row.display_name),
    email: text(row.email),
    phone: text(row.phone),
    source: text(row.source),
    status: text(row.status),
    marketingConsent: Boolean(row.marketing_consent),
    privacyConsentAt: row.privacy_consent_at || undefined,
    notes: text(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function hydrateEnquiry(row: any) {
  return {
    id: text(row.id),
    reference: text(row.reference),
    stageId: text(row.stage_id),
    stageKey: text(row.stage_key),
    stageName: text(row.stage_name),
    stageType: text(row.stage_type),
    status: text(row.status),
    source: text(row.source),
    campaign: text(row.campaign),
    eventType: text(row.event_type),
    eventDate: text(row.event_date),
    dateFlexibility: text(row.date_flexibility),
    venueText: text(row.venue_text),
    venueId: text(row.venue_id),
    venueSlug: text(row.venue_slug),
    serviceInterest: text(row.service_interest),
    packageInterest: text(row.package_interest),
    budgetMin: row.budget_min == null ? null : Number(row.budget_min),
    budgetMax: row.budget_max == null ? null : Number(row.budget_max),
    currency: text(row.currency || "GBP"),
    notes: text(row.notes),
    assignedUserId: text(row.assigned_user_id),
    contactedAt: row.contacted_at || undefined,
    qualifiedAt: row.qualified_at || undefined,
    wonAt: row.won_at || undefined,
    lostAt: row.lost_at || undefined,
    lostReason: text(row.lost_reason),
    acceptedJobId: text(row.accepted_job_id),
    convertedAt: row.converted_at || undefined,
    primaryContact: row.primary_contact_id ? {
      id: text(row.primary_contact_id),
      displayName: text(row.primary_contact_name),
      email: text(row.primary_contact_email),
      phone: text(row.primary_contact_phone),
    } : null,
    partnerContact: row.partner_contact_id ? {
      id: text(row.partner_contact_id),
      displayName: text(row.partner_contact_name),
      email: text(row.partner_contact_email),
      phone: text(row.partner_contact_phone),
    } : null,
    lastCommunicationAt: row.last_communication_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function hydrateJob(row: any) {
  return {
    id: text(row.id),
    reference: text(row.reference),
    enquiryId: text(row.enquiry_id),
    jobType: text(row.job_type),
    status: text(row.status),
    title: text(row.title),
    bookingDate: text(row.booking_date),
    eventDate: text(row.event_date),
    serviceName: text(row.service_name),
    packageName: text(row.package_name),
    valueAmount: row.value_amount == null ? null : Number(row.value_amount),
    currency: text(row.currency || "GBP"),
    venueText: text(row.venue_text),
    venueId: text(row.venue_id),
    venueSlug: text(row.venue_slug),
    clientPortalStatus: text(row.client_portal_status),
    weddingSlug: text(row.wedding_slug),
    taskTotal: Number(row.task_total || 0),
    taskCompleted: Number(row.task_completed || 0),
    taskPending: Number(row.task_pending || 0),
    taskOverdue: Number(row.task_overdue || 0),
    nextTaskTitle: text(row.next_task_title),
    nextTaskDueAt: text(row.next_task_due_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ENQUIRY_SELECT = `
  SELECT e.*, s.stage_key, s.name AS stage_name, s.stage_type,
    pc.id AS primary_contact_id, pc.display_name AS primary_contact_name,
    pc.email AS primary_contact_email, pc.phone AS primary_contact_phone,
    partner.id AS partner_contact_id, partner.display_name AS partner_contact_name,
    partner.email AS partner_contact_email, partner.phone AS partner_contact_phone,
    (SELECT MAX(communication.occurred_at) FROM crm_communications communication
      WHERE communication.workspace_id = e.workspace_id AND communication.enquiry_id = e.id) AS last_communication_at
  FROM crm_enquiries e
  JOIN crm_pipeline_stages s ON s.id = e.stage_id AND s.workspace_id = e.workspace_id
  LEFT JOIN crm_enquiry_contacts epc ON epc.enquiry_id = e.id AND epc.workspace_id = e.workspace_id AND epc.role = 'primary'
  LEFT JOIN crm_contacts pc ON pc.id = epc.contact_id AND pc.workspace_id = e.workspace_id
  LEFT JOIN crm_enquiry_contacts epartner ON epartner.enquiry_id = e.id AND epartner.workspace_id = e.workspace_id AND epartner.role = 'partner'
  LEFT JOIN crm_contacts partner ON partner.id = epartner.contact_id AND partner.workspace_id = e.workspace_id
`;

async function ensureCrmWorkspaceSetup(db: D1Db, workspaceId: string) {
  const stages = [
    ["new", "New enquiry", "open", 10, "blue", 1],
    ["contacted", "Contacted", "open", 20, "violet", 0],
    ["qualified", "Qualified", "open", 30, "amber", 0],
    ["proposal", "Proposal / quote sent", "open", 40, "orange", 0],
    ["awaiting", "Awaiting decision", "open", 50, "pink", 0],
    ["accepted", "Accepted", "won", 60, "green", 0],
    ["lost", "Lost / unavailable", "lost", 70, "red", 0],
  ];
  const statements = stages.map(([key, name, type, order, color, isDefault]) =>
    db.prepare(`
      INSERT OR IGNORE INTO crm_pipeline_stages (
        id, workspace_id, stage_key, name, stage_type, sort_order, color_key, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(`crm_stage_${workspaceId}_${key}`, workspaceId, key, name, type, order, color, isDefault)
  );
  statements.push(
    db.prepare(`
      INSERT OR IGNORE INTO crm_lead_form_settings (workspace_id, enabled, notification_email)
      VALUES (?, 0, '')
    `).bind(workspaceId),
    db.prepare(`
      UPDATE crm_lead_form_settings
      SET notification_email = CASE
        WHEN trim(notification_email) <> '' THEN notification_email
        ELSE COALESCE((SELECT NULLIF(contact_email, '') FROM workspace_settings WHERE workspace_id = ?), '')
      END
      WHERE workspace_id = ?
    `).bind(workspaceId, workspaceId),
  );
  await db.batch(statements);
  await ensureWorkflowWorkspaceSetup(db, workspaceId);
}

async function defaultStage(db: D1Db, workspaceId: string) {
  await ensureCrmWorkspaceSetup(db, workspaceId);
  const row = await db.prepare(`
    SELECT * FROM crm_pipeline_stages
    WHERE workspace_id = ? AND status = 'active'
    ORDER BY is_default DESC, sort_order ASC
    LIMIT 1
  `).bind(workspaceId).first();
  if (!row) throw httpError("CRM pipeline is not configured for this business.", 409);
  return row;
}

async function stageById(db: D1Db, workspaceId: string, stageId: string) {
  const row = await db.prepare(`
    SELECT * FROM crm_pipeline_stages
    WHERE workspace_id = ? AND id = ? AND status = 'active'
    LIMIT 1
  `).bind(workspaceId, stageId).first();
  if (!row) throw httpError("Choose a valid CRM pipeline stage.", 400);
  return row;
}

async function stageByKey(db: D1Db, workspaceId: string, key: string) {
  const row = await db.prepare(`
    SELECT * FROM crm_pipeline_stages
    WHERE workspace_id = ? AND stage_key = ? AND status = 'active'
    LIMIT 1
  `).bind(workspaceId, key).first();
  if (!row) throw httpError(`CRM stage '${key}' is not configured.`, 409);
  return row;
}

async function upsertContact(db: D1Db, workspaceId: string, input: any, source: string, privacyConsentAt?: string) {
  const firstName = text(input?.firstName);
  const lastName = text(input?.lastName);
  const email = lower(input?.email);
  const phone = text(input?.phone);
  const name = displayName(firstName, lastName, input?.displayName || email);
  if (!name && !email && !phone) return null;
  if (email && !validEmail(email)) throw httpError("Enter a valid email address.", 400);

  const contactId = text(input?.id);
  if (contactId) {
    const existingById = await db.prepare(`
      SELECT * FROM crm_contacts WHERE workspace_id = ? AND id = ? LIMIT 1
    `).bind(workspaceId, contactId).first();
    if (!existingById) throw httpError("Contact not found.", 404);
    if (email) {
      const emailConflict = await db.prepare(`
        SELECT id FROM crm_contacts
        WHERE workspace_id = ? AND email_normalized = ? AND id <> ?
        LIMIT 1
      `).bind(workspaceId, email, contactId).first();
      if (emailConflict) throw httpError("That email address already belongs to another CRM contact.", 409);
    }
    await db.prepare(`
      UPDATE crm_contacts SET
        first_name = ?, last_name = ?, display_name = ?,
        email_normalized = ?, email = ?, phone = ?,
        privacy_consent_at = COALESCE(privacy_consent_at, ?),
        marketing_consent = CASE WHEN ? = 1 THEN 1 ELSE marketing_consent END,
        notes = CASE WHEN ? <> '' THEN ? ELSE notes END,
        status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND workspace_id = ?
    `).bind(
      firstName, lastName, name, email, email, phone,
      privacyConsentAt || null, input?.marketingConsent ? 1 : 0,
      text(input?.notes), text(input?.notes), contactId, workspaceId,
    ).run();
    return contactId;
  }

  if (email) {
    const existing = await db.prepare(`
      SELECT * FROM crm_contacts WHERE workspace_id = ? AND email_normalized = ? LIMIT 1
    `).bind(workspaceId, email).first();
    if (existing) {
      await db.prepare(`
        UPDATE crm_contacts SET
          first_name = CASE WHEN ? <> '' THEN ? ELSE first_name END,
          last_name = CASE WHEN ? <> '' THEN ? ELSE last_name END,
          display_name = CASE WHEN ? <> '' THEN ? ELSE display_name END,
          email_normalized = ?, email = ?, phone = CASE WHEN ? <> '' THEN ? ELSE phone END,
          privacy_consent_at = COALESCE(privacy_consent_at, ?),
          marketing_consent = CASE WHEN ? = 1 THEN 1 ELSE marketing_consent END,
          status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND workspace_id = ?
      `).bind(
        firstName, firstName, lastName, lastName, name, name, email, email,
        phone, phone, privacyConsentAt || null, input?.marketingConsent ? 1 : 0,
        existing.id, workspaceId,
      ).run();
      return text(existing.id);
    }
  }

  const id = `crm_contact_${crypto.randomUUID()}`;
  await db.prepare(`
    INSERT INTO crm_contacts (
      id, workspace_id, first_name, last_name, display_name,
      email_normalized, email, phone, source, marketing_consent,
      privacy_consent_at, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    id, workspaceId, firstName, lastName, name, email, email, phone,
    text(source || "manual"), input?.marketingConsent ? 1 : 0,
    privacyConsentAt || null, text(input?.notes),
  ).run();
  return id;
}

async function getContactsForEnquiry(db: D1Db, workspaceId: string, enquiryId: string) {
  const result = await db.prepare(`
    SELECT c.*, ec.role
    FROM crm_enquiry_contacts ec
    JOIN crm_contacts c ON c.id = ec.contact_id AND c.workspace_id = ec.workspace_id
    WHERE ec.workspace_id = ? AND ec.enquiry_id = ?
    ORDER BY CASE ec.role WHEN 'primary' THEN 0 WHEN 'partner' THEN 1 ELSE 2 END, c.display_name COLLATE NOCASE
  `).bind(workspaceId, enquiryId).all();
  return (result.results || []).map((row: any) => ({ ...hydrateContact(row), role: text(row.role) }));
}

export async function getCrmOverview(db: D1Db, actor: CrmActor) {
  requirePermission(actor, "crm:read");
  await ensureCrmWorkspaceSetup(db, actor.workspaceId);
  const [stageResult, enquiryResult, contactResult, jobResult, settings] = await Promise.all([
    db.prepare(`SELECT * FROM crm_pipeline_stages WHERE workspace_id = ? AND status = 'active' ORDER BY sort_order, name`).bind(actor.workspaceId).all(),
    db.prepare(`${ENQUIRY_SELECT} WHERE e.workspace_id = ? AND e.status <> 'archived' ORDER BY e.created_at DESC`).bind(actor.workspaceId).all(),
    db.prepare(`SELECT * FROM crm_contacts WHERE workspace_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT 200`).bind(actor.workspaceId).all(),
    db.prepare(`
      SELECT job.*,
        (SELECT COUNT(*) FROM crm_tasks task WHERE task.workspace_id = job.workspace_id AND task.job_id = job.id AND task.status <> 'cancelled') AS task_total,
        (SELECT COUNT(*) FROM crm_tasks task WHERE task.workspace_id = job.workspace_id AND task.job_id = job.id AND task.status = 'completed') AS task_completed,
        (SELECT COUNT(*) FROM crm_tasks task WHERE task.workspace_id = job.workspace_id AND task.job_id = job.id AND task.status = 'pending') AS task_pending,
        (SELECT COUNT(*) FROM crm_tasks task WHERE task.workspace_id = job.workspace_id AND task.job_id = job.id AND task.status = 'pending' AND trim(task.due_at) <> '' AND task.due_at < date('now')) AS task_overdue,
        (SELECT task.title FROM crm_tasks task WHERE task.workspace_id = job.workspace_id AND task.job_id = job.id AND task.status = 'pending' ORDER BY CASE WHEN trim(task.due_at) = '' THEN 1 ELSE 0 END, task.due_at, task.created_at LIMIT 1) AS next_task_title,
        (SELECT task.due_at FROM crm_tasks task WHERE task.workspace_id = job.workspace_id AND task.job_id = job.id AND task.status = 'pending' ORDER BY CASE WHEN trim(task.due_at) = '' THEN 1 ELSE 0 END, task.due_at, task.created_at LIMIT 1) AS next_task_due_at
      FROM crm_jobs job WHERE job.workspace_id = ? AND job.status <> 'archived'
      ORDER BY CASE WHEN trim(job.event_date) = '' THEN 1 ELSE 0 END, job.event_date, job.created_at DESC LIMIT 200
    `).bind(actor.workspaceId).all(),
    db.prepare(`
      SELECT lead.*, settings.currency AS workspace_currency
      FROM crm_lead_form_settings lead
      LEFT JOIN workspace_settings settings ON settings.workspace_id = lead.workspace_id
      WHERE lead.workspace_id = ? LIMIT 1
    `).bind(actor.workspaceId).first(),
  ]);
  const enquiries = (enquiryResult.results || []).map(hydrateEnquiry);
  return {
    schemaVersion: 30,
    workspace: { id: actor.workspaceId, name: text(actor.businessName), currency: text(settings?.workspace_currency || "GBP") },
    stages: (stageResult.results || []).map(hydrateStage),
    enquiries,
    contacts: (contactResult.results || []).map(hydrateContact),
    jobs: (jobResult.results || []).map(hydrateJob),
    leadForm: {
      enabled: Boolean(settings?.enabled),
      publicPath: text(settings?.public_path || "/enquire"),
      defaultService: text(settings?.default_service),
      title: text(settings?.title || "Tell us about your wedding"),
      intro: text(settings?.intro),
      thankYouTitle: text(settings?.thank_you_title || "Thank you"),
      thankYouMessage: text(settings?.thank_you_message),
      notificationEmail: text(settings?.notification_email),
      privacyText: text(settings?.privacy_text),
      consentRequired: settings?.consent_required === undefined ? true : Boolean(settings?.consent_required),
      autoresponderEnabled: Boolean(settings?.autoresponder_enabled),
      autoresponderSubject: text(settings?.autoresponder_subject || "We have received your enquiry"),
      autoresponderMessage: text(settings?.autoresponder_message || "Thank you for getting in touch. We have received your enquiry and will reply as soon as possible."),
    },
    stats: {
      open: enquiries.filter((item: any) => item.status === "open").length,
      new: enquiries.filter((item: any) => item.stageKey === "new" && item.status === "open").length,
      won: enquiries.filter((item: any) => item.status === "won").length,
      lost: enquiries.filter((item: any) => item.status === "lost").length,
      jobs: (jobResult.results || []).length,
    },
  };
}

export async function getCrmEnquiry(db: D1Db, actor: CrmActor, enquiryId: string) {
  requirePermission(actor, "crm:read");
  const row = await db.prepare(`${ENQUIRY_SELECT} WHERE e.workspace_id = ? AND e.id = ? LIMIT 1`).bind(actor.workspaceId, enquiryId).first();
  if (!row) throw httpError("Enquiry not found.", 404);
  const [contacts, activityResult, job, communications] = await Promise.all([
    getContactsForEnquiry(db, actor.workspaceId, enquiryId),
    db.prepare(`SELECT * FROM crm_activities WHERE workspace_id = ? AND entity_type = 'enquiry' AND entity_id = ? ORDER BY created_at DESC LIMIT 100`).bind(actor.workspaceId, enquiryId).all(),
    db.prepare(`SELECT * FROM crm_jobs WHERE workspace_id = ? AND enquiry_id = ? LIMIT 1`).bind(actor.workspaceId, enquiryId).first(),
    db.prepare(`SELECT * FROM crm_communications WHERE workspace_id = ? AND enquiry_id = ? ORDER BY occurred_at DESC, created_at DESC LIMIT 100`).bind(actor.workspaceId, enquiryId).all(),
  ]);
  return {
    enquiry: hydrateEnquiry(row),
    contacts,
    activities: (activityResult.results || []).map((item: any) => ({
      id: text(item.id), eventType: text(item.event_type), summary: text(item.summary),
      actorEmail: text(item.actor_email), metadata: safeJson(item.metadata_json, {}), createdAt: item.created_at,
    })),
    job: job ? hydrateJob(job) : null,
    communications: (communications.results || []).map((item: any) => ({
      id: text(item.id), contactId: text(item.contact_id), enquiryId: text(item.enquiry_id), jobId: text(item.job_id),
      channel: text(item.channel), direction: text(item.direction), subject: text(item.subject), body: text(item.body),
      status: text(item.status), occurredAt: item.occurred_at, actorEmail: text(item.actor_email), createdAt: item.created_at,
    })),
  };
}

export async function createAdminEnquiry(db: D1Db, actor: CrmActor, input: any) {
  requirePermission(actor, "crm:manage");
  const primary = input?.primaryContact || {};
  if (!text(primary.firstName || primary.displayName)) throw httpError("Primary contact name is required.");
  if (!validEmail(primary.email)) throw httpError("Primary contact email is required.");
  const stage = input?.stageId ? await stageById(db, actor.workspaceId, text(input.stageId)) : await defaultStage(db, actor.workspaceId);
  const primaryId = await upsertContact(db, actor.workspaceId, primary, text(input?.source || "manual"));
  const partnerId = await upsertContact(db, actor.workspaceId, input?.partnerContact, text(input?.source || "manual"));
  const enquiryId = `crm_enquiry_${crypto.randomUUID()}`;
  const reference = datedReference("ENQ");
  const statements: any[] = [
    db.prepare(`
      INSERT INTO crm_enquiries (
        id, workspace_id, reference, stage_id, status, source, campaign, event_type,
        event_date, date_flexibility, venue_text, venue_id, venue_slug,
        service_interest, package_interest, budget_min, budget_max, currency,
        notes, assigned_user_id, consent_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      enquiryId, actor.workspaceId, reference, stage.id,
      text(input?.source || "manual"), text(input?.campaign), text(input?.eventType || "wedding"),
      text(input?.eventDate), text(input?.dateFlexibility), text(input?.venueText), text(input?.venueId), text(input?.venueSlug),
      text(input?.serviceInterest), text(input?.packageInterest), integer(input?.budgetMin), integer(input?.budgetMax), text(input?.currency || "GBP"),
      text(input?.notes), text(input?.assignedUserId) || null, JSON.stringify(input?.consent || {}),
    ),
    db.prepare(`INSERT INTO crm_enquiry_contacts (enquiry_id, workspace_id, contact_id, role) VALUES (?, ?, ?, 'primary')`).bind(enquiryId, actor.workspaceId, primaryId),
    db.prepare(`INSERT INTO crm_activities (id, workspace_id, entity_type, entity_id, event_type, summary, actor_user_id, actor_email, metadata_json) VALUES (?, ?, 'enquiry', ?, 'enquiry.created', ?, ?, ?, '{}')`).bind(
      `crm_activity_${crypto.randomUUID()}`, actor.workspaceId, enquiryId, `Created ${reference}.`, text(actor.userId) || null, lower(actor.email),
    ),
  ];
  if (partnerId) statements.push(
    db.prepare(`INSERT INTO crm_enquiry_contacts (enquiry_id, workspace_id, contact_id, role) VALUES (?, ?, ?, 'partner')`).bind(enquiryId, actor.workspaceId, partnerId),
  );
  await db.batch(statements);
  await platformAudit(db, actor, { eventType: "crm.enquiry.created", entityType: "crm_enquiry", entityId: enquiryId, summary: `Created CRM enquiry ${reference}.` });
  return getCrmEnquiry(db, actor, enquiryId);
}

export async function updateAdminEnquiry(db: D1Db, actor: CrmActor, enquiryId: string, input: any) {
  requirePermission(actor, "crm:manage");
  const current = await db.prepare(`SELECT * FROM crm_enquiries WHERE workspace_id = ? AND id = ? LIMIT 1`).bind(actor.workspaceId, enquiryId).first();
  if (!current) throw httpError("Enquiry not found.", 404);
  const stage = input?.stageId ? await stageById(db, actor.workspaceId, text(input.stageId)) : await stageById(db, actor.workspaceId, text(current.stage_id));
  const stageStatus = stage.stage_type === "won" ? "won" : stage.stage_type === "lost" ? "lost" : "open";
  if (stage.stage_type === "won" && text(current.status) !== "won") {
    throw httpError("Use Accept booking to move an enquiry into the Accepted stage.", 409);
  }
  if (stage.stage_type === "lost" && text(current.status) !== "lost") {
    throw httpError("Use Mark lost to move an enquiry into the Lost stage.", 409);
  }

  const primaryId = input?.primaryContact ? await upsertContact(db, actor.workspaceId, input.primaryContact, text(current.source)) : null;
  const partnerId = input?.partnerContact ? await upsertContact(db, actor.workspaceId, input.partnerContact, text(current.source)) : null;

  const statements: any[] = [
    db.prepare(`
      UPDATE crm_enquiries SET
        stage_id = ?, status = ?, source = ?, campaign = ?, event_type = ?, event_date = ?,
        date_flexibility = ?, venue_text = ?, venue_id = ?, venue_slug = ?,
        service_interest = ?, package_interest = ?, budget_min = ?, budget_max = ?,
        currency = ?, notes = ?, assigned_user_id = ?,
        contacted_at = CASE WHEN ? = 'contacted' AND contacted_at IS NULL THEN CURRENT_TIMESTAMP ELSE contacted_at END,
        qualified_at = CASE WHEN ? = 'qualified' AND qualified_at IS NULL THEN CURRENT_TIMESTAMP ELSE qualified_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND workspace_id = ?
    `).bind(
      stage.id, stageStatus, text(input?.source ?? current.source), text(input?.campaign ?? current.campaign), text(input?.eventType ?? current.event_type), text(input?.eventDate ?? current.event_date),
      text(input?.dateFlexibility ?? current.date_flexibility), text(input?.venueText ?? current.venue_text), text(input?.venueId ?? current.venue_id), text(input?.venueSlug ?? current.venue_slug),
      text(input?.serviceInterest ?? current.service_interest), text(input?.packageInterest ?? current.package_interest), integer(input?.budgetMin ?? current.budget_min), integer(input?.budgetMax ?? current.budget_max),
      text(input?.currency ?? current.currency), text(input?.notes ?? current.notes), text(input?.assignedUserId ?? current.assigned_user_id) || null,
      text(stage.stage_key), text(stage.stage_key), enquiryId, actor.workspaceId,
    ),
  ];
  if (primaryId) {
    statements.push(db.prepare(`DELETE FROM crm_enquiry_contacts WHERE enquiry_id = ? AND workspace_id = ? AND role = 'primary'`).bind(enquiryId, actor.workspaceId));
    statements.push(db.prepare(`INSERT INTO crm_enquiry_contacts (enquiry_id, workspace_id, contact_id, role) VALUES (?, ?, ?, 'primary')`).bind(enquiryId, actor.workspaceId, primaryId));
  }
  if (input?.partnerContact) {
    statements.push(db.prepare(`DELETE FROM crm_enquiry_contacts WHERE enquiry_id = ? AND workspace_id = ? AND role = 'partner'`).bind(enquiryId, actor.workspaceId));
    if (partnerId) statements.push(db.prepare(`INSERT INTO crm_enquiry_contacts (enquiry_id, workspace_id, contact_id, role) VALUES (?, ?, ?, 'partner')`).bind(enquiryId, actor.workspaceId, partnerId));
  }
  statements.push(db.prepare(`INSERT INTO crm_activities (id, workspace_id, entity_type, entity_id, event_type, summary, actor_user_id, actor_email, metadata_json) VALUES (?, ?, 'enquiry', ?, 'enquiry.updated', 'Updated enquiry details.', ?, ?, ?)`).bind(
    `crm_activity_${crypto.randomUUID()}`, actor.workspaceId, enquiryId, text(actor.userId) || null, lower(actor.email), JSON.stringify({ stageId: stage.id }),
  ));
  await db.batch(statements);
  return getCrmEnquiry(db, actor, enquiryId);
}

export async function moveEnquiryStage(db: D1Db, actor: CrmActor, enquiryId: string, stageId: string) {
  return updateAdminEnquiry(db, actor, enquiryId, { stageId });
}

export async function markEnquiryLost(db: D1Db, actor: CrmActor, enquiryId: string, reason: string) {
  requirePermission(actor, "crm:manage");
  const lost = await stageByKey(db, actor.workspaceId, "lost");
  const result = await db.prepare(`
    UPDATE crm_enquiries SET stage_id = ?, status = 'lost', lost_at = CURRENT_TIMESTAMP,
      lost_reason = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workspace_id = ? AND status <> 'won'
  `).bind(lost.id, text(reason), enquiryId, actor.workspaceId).run();
  if (!result.meta?.changes) throw httpError("Enquiry not found or already accepted.", 404);
  await activity(db, actor, { workspaceId: actor.workspaceId, entityType: "enquiry", entityId: enquiryId, eventType: "enquiry.lost", summary: text(reason) ? `Marked lost: ${text(reason)}` : "Marked enquiry as lost." });
  return getCrmEnquiry(db, actor, enquiryId);
}

async function uniqueWeddingSlug(db: D1Db, base: string) {
  const root = slugify(base) || "wedding";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root.slice(0, 100)}-${shortCode().toLowerCase()}`;
    const exists = await db.prepare(`SELECT slug FROM weddings WHERE slug = ? LIMIT 1`).bind(candidate).first();
    if (!exists) return candidate;
  }
  throw httpError("Unable to generate a unique Wedding URL. Please try again.", 409);
}

export async function acceptEnquiry(db: D1Db, actor: CrmActor, enquiryId: string, input: any = {}) {
  requirePermission(actor, "crm:manage");
  const enquiryRow = await db.prepare(`${ENQUIRY_SELECT} WHERE e.workspace_id = ? AND e.id = ? LIMIT 1`).bind(actor.workspaceId, enquiryId).first();
  if (!enquiryRow) throw httpError("Enquiry not found.", 404);
  if (text(enquiryRow.accepted_job_id)) {
    const existing = await db.prepare(`SELECT * FROM crm_jobs WHERE workspace_id = ? AND id = ? LIMIT 1`).bind(actor.workspaceId, enquiryRow.accepted_job_id).first();
    if (existing) return { enquiry: hydrateEnquiry(enquiryRow), job: hydrateJob(existing), idempotent: true };
  }
  const existingJob = await db.prepare(`SELECT * FROM crm_jobs WHERE workspace_id = ? AND enquiry_id = ? LIMIT 1`).bind(actor.workspaceId, enquiryId).first();
  if (existingJob) return { enquiry: hydrateEnquiry(enquiryRow), job: hydrateJob(existingJob), idempotent: true };
  if (!text(enquiryRow.event_date)) throw httpError("Add the wedding/event date before accepting this booking.", 409);

  const contacts = await getContactsForEnquiry(db, actor.workspaceId, enquiryId);
  const primary = contacts.find((item: any) => item.role === "primary");
  const partner = contacts.find((item: any) => item.role === "partner");
  if (!primary) throw httpError("A primary client is required before accepting this booking.", 409);

  let linkedWeddingSlug = text(input?.weddingSlug);
  let weddingInsert: any = null;
  if (linkedWeddingSlug) {
    const linked = await db.prepare(`SELECT slug FROM weddings WHERE workspace_id = ? AND slug = ? LIMIT 1`).bind(actor.workspaceId, linkedWeddingSlug).first();
    if (!linked) throw httpError("The selected Wedding record does not belong to this business.", 404);
  } else {
    const venueMatch = text(enquiryRow.venue_slug)
      ? await db.prepare(`SELECT slug, id, name FROM venues WHERE workspace_id = ? AND slug = ? LIMIT 1`).bind(actor.workspaceId, enquiryRow.venue_slug).first()
      : text(enquiryRow.venue_text)
        ? await db.prepare(`SELECT slug, id, name FROM venues WHERE workspace_id = ? AND lower(name) = lower(?) LIMIT 1`).bind(actor.workspaceId, enquiryRow.venue_text).first()
        : null;
    const venueName = text(venueMatch?.name || enquiryRow.venue_text || "Venue TBC");
    const firstNames = [text(primary.firstName || primary.displayName).split(" ")[0], partner ? text(partner.firstName || partner.displayName).split(" ")[0] : ""].filter(Boolean);
    const couple = firstNames.join(" & ") || text(primary.displayName);
    linkedWeddingSlug = await uniqueWeddingSlug(db, `${venueName}-${firstNames.join("-and-") || couple}`);
    const title = `${couple} at ${venueName}`;
    const document = {
      schemaVersion: 1,
      slug: linkedWeddingSlug,
      title,
      couple,
      venue: venueName,
      venueSlug: text(venueMatch?.slug || enquiryRow.venue_slug || slugify(venueName)),
      venueId: text(venueMatch?.id || enquiryRow.venue_id),
      weddingDate: text(enquiryRow.event_date),
      excerpt: "",
      intro: "",
      story: [],
      facts: {},
      suppliers: [],
      seo: { title: "", description: "" },
      status: "draft",
      crm: { enquiryId, source: text(enquiryRow.source) },
      updatedAt: new Date().toISOString(),
    };
    weddingInsert = db.prepare(`
      INSERT INTO weddings (
        slug, workspace_id, source, title, couple, venue, venue_slug, venue_id, wedding_date,
        excerpt, intro, status, story_enabled, story_status, seo_title, seo_description,
        document_json, published_json, updated_at
      ) VALUES (?, ?, 'crm', ?, ?, ?, ?, ?, ?, '', '', 'draft', 0, 'draft', '', '', ?, '', CURRENT_TIMESTAMP)
    `).bind(
      linkedWeddingSlug, actor.workspaceId, title, couple, venueName,
      document.venueSlug, document.venueId, document.weddingDate, JSON.stringify(document),
    );
  }

  const acceptedStage = await stageByKey(db, actor.workspaceId, "accepted");
  const jobId = `crm_job_${crypto.randomUUID()}`;
  const jobReference = datedReference("JOB");
  const title = text(input?.title) || `${text(primary.displayName)}${partner ? ` & ${text(partner.displayName)}` : ""}`;
  const statements: any[] = [];
  if (weddingInsert) statements.push(weddingInsert);
  statements.push(
    db.prepare(`
      INSERT INTO crm_jobs (
        id, workspace_id, reference, enquiry_id, job_type, status, title,
        booking_date, event_date, service_name, package_name, value_amount, currency,
        assigned_user_id, venue_text, venue_id, venue_slug, wedding_slug,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'booked', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      jobId, actor.workspaceId, jobReference, enquiryId, text(enquiryRow.event_type || "wedding"), title,
      new Date().toISOString().slice(0, 10), text(enquiryRow.event_date), text(enquiryRow.service_interest), text(enquiryRow.package_interest),
      integer(input?.valueAmount ?? enquiryRow.budget_max), text(enquiryRow.currency || "GBP"), text(enquiryRow.assigned_user_id) || text(actor.userId) || null,
      text(enquiryRow.venue_text), text(enquiryRow.venue_id), text(enquiryRow.venue_slug), linkedWeddingSlug,
    ),
    db.prepare(`
      UPDATE crm_enquiries SET stage_id = ?, status = 'won', won_at = CURRENT_TIMESTAMP,
        accepted_job_id = ?, converted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND workspace_id = ? AND accepted_job_id IS NULL
    `).bind(acceptedStage.id, jobId, enquiryId, actor.workspaceId),
  );
  for (const contact of contacts) {
    statements.push(db.prepare(`INSERT INTO crm_job_contacts (job_id, workspace_id, contact_id, role) VALUES (?, ?, ?, ?)`).bind(jobId, actor.workspaceId, contact.id, contact.role));
  }
  statements.push(
    db.prepare(`INSERT INTO crm_activities (id, workspace_id, entity_type, entity_id, event_type, summary, actor_user_id, actor_email, metadata_json) VALUES (?, ?, 'enquiry', ?, 'enquiry.accepted', ?, ?, ?, ?)`).bind(
      `crm_activity_${crypto.randomUUID()}`, actor.workspaceId, enquiryId, `Accepted booking and created ${jobReference}.`, text(actor.userId) || null, lower(actor.email), JSON.stringify({ jobId, weddingSlug: linkedWeddingSlug }),
    ),
    db.prepare(`INSERT INTO crm_activities (id, workspace_id, entity_type, entity_id, event_type, summary, actor_user_id, actor_email, metadata_json) VALUES (?, ?, 'job', ?, 'job.created', ?, ?, ?, ?)`).bind(
      `crm_activity_${crypto.randomUUID()}`, actor.workspaceId, jobId, `Created from enquiry ${text(enquiryRow.reference)}.`, text(actor.userId) || null, lower(actor.email), JSON.stringify({ enquiryId, weddingSlug: linkedWeddingSlug }),
    ),
  );
  await db.batch(statements);
  await platformAudit(db, actor, { eventType: "crm.enquiry.accepted", entityType: "crm_job", entityId: jobId, summary: `Accepted ${text(enquiryRow.reference)} and created ${jobReference}.`, metadata: { enquiryId, weddingSlug: linkedWeddingSlug } });
  await applyDefaultWorkflowToJob(db, actor, jobId).catch(() => null);
  const job = await db.prepare(`SELECT * FROM crm_jobs WHERE workspace_id = ? AND id = ? LIMIT 1`).bind(actor.workspaceId, jobId).first();
  return { enquiry: (await getCrmEnquiry(db, actor, enquiryId)).enquiry, job: hydrateJob(job), idempotent: false };
}

export async function getCrmContact(db: D1Db, actor: CrmActor, contactId: string) {
  requirePermission(actor, "crm:read");
  const row = await db.prepare(`SELECT * FROM crm_contacts WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(contactId, actor.workspaceId).first();
  if (!row) throw httpError("Contact not found.", 404);
  const [enquiries, jobs, activities, communications] = await Promise.all([
    db.prepare(`
      SELECT enquiry.id, enquiry.reference, enquiry.status, enquiry.event_date, enquiry.venue_text, link.role
      FROM crm_enquiry_contacts link
      JOIN crm_enquiries enquiry ON enquiry.id = link.enquiry_id AND enquiry.workspace_id = link.workspace_id
      WHERE link.contact_id = ? AND link.workspace_id = ?
      ORDER BY enquiry.created_at DESC
    `).bind(contactId, actor.workspaceId).all(),
    db.prepare(`
      SELECT job.*, link.role
      FROM crm_job_contacts link
      JOIN crm_jobs job ON job.id = link.job_id AND job.workspace_id = link.workspace_id
      WHERE link.contact_id = ? AND link.workspace_id = ?
      ORDER BY job.event_date, job.created_at DESC
    `).bind(contactId, actor.workspaceId).all(),
    db.prepare(`
      SELECT * FROM crm_activities
      WHERE workspace_id = ? AND entity_type = 'contact' AND entity_id = ?
      ORDER BY created_at DESC LIMIT 100
    `).bind(actor.workspaceId, contactId).all(),
    db.prepare(`SELECT * FROM crm_communications WHERE workspace_id = ? AND contact_id = ? ORDER BY occurred_at DESC, created_at DESC LIMIT 100`).bind(actor.workspaceId, contactId).all(),
  ]);
  return {
    contact: hydrateContact(row),
    enquiries: (enquiries.results || []).map((item: any) => ({
      id: text(item.id), reference: text(item.reference), status: text(item.status), role: text(item.role),
      eventDate: text(item.event_date), venueText: text(item.venue_text),
    })),
    jobs: (jobs.results || []).map((item: any) => ({ ...hydrateJob(item), role: text(item.role) })),
    activities: (activities.results || []).map((item: any) => ({
      id: text(item.id), eventType: text(item.event_type), summary: text(item.summary),
      actorEmail: text(item.actor_email), metadata: safeJson(item.metadata_json, {}), createdAt: item.created_at,
    })),
    communications: (communications.results || []).map((item: any) => ({
      id: text(item.id), contactId: text(item.contact_id), enquiryId: text(item.enquiry_id), jobId: text(item.job_id),
      channel: text(item.channel), direction: text(item.direction), subject: text(item.subject), body: text(item.body),
      status: text(item.status), occurredAt: item.occurred_at, actorEmail: text(item.actor_email), createdAt: item.created_at,
    })),
  };
}

export async function updateCrmContact(db: D1Db, actor: CrmActor, contactId: string, input: any) {
  requirePermission(actor, "crm:manage");
  const current = await db.prepare(`SELECT * FROM crm_contacts WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(contactId, actor.workspaceId).first();
  if (!current) throw httpError("Contact not found.", 404);
  const firstName = text(input?.firstName ?? current.first_name);
  const lastName = text(input?.lastName ?? current.last_name);
  const nextDisplayName = displayName(firstName, lastName, input?.displayName ?? current.display_name);
  const email = lower(input?.email ?? current.email);
  if (email && !validEmail(email)) throw httpError("Enter a valid email address.");
  if (email) {
    const duplicate = await db.prepare(`
      SELECT id FROM crm_contacts WHERE workspace_id = ? AND email_normalized = ? AND id <> ? LIMIT 1
    `).bind(actor.workspaceId, email, contactId).first();
    if (duplicate) throw httpError("Another contact in this business already uses that email address.", 409);
    const identityConflict = await db.prepare(`
      SELECT identity.id
      FROM client_identities identity
      WHERE identity.workspace_id = ? AND identity.email_normalized = ?
        AND identity.id NOT IN (
          SELECT access.identity_id FROM crm_job_client_access access
          WHERE access.workspace_id = ? AND access.contact_id = ?
        )
      LIMIT 1
    `).bind(actor.workspaceId, email, actor.workspaceId, contactId).first();
    if (identityConflict) throw httpError("That email address is already linked to another client portal identity.", 409);
  }
  if (!email) {
    const portalAccess = await db.prepare(`
      SELECT 1 FROM crm_job_client_access
      WHERE workspace_id = ? AND contact_id = ? AND status = 'active' LIMIT 1
    `).bind(actor.workspaceId, contactId).first();
    if (portalAccess) throw httpError("Revoke active client portal access before removing this contact's email address.", 409);
  }
  const status = text(input?.status) === "archived" ? "archived" : "active";
  await db.batch([
    db.prepare(`
      UPDATE crm_contacts SET first_name = ?, last_name = ?, display_name = ?, email_normalized = ?, email = ?,
        phone = ?, notes = ?, status = ?, marketing_consent = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND workspace_id = ?
    `).bind(
      firstName, lastName, nextDisplayName, email, email, text(input?.phone ?? current.phone),
      text(input?.notes ?? current.notes), status, input?.marketingConsent ? 1 : 0, contactId, actor.workspaceId,
    ),
    db.prepare(`
      UPDATE client_identities SET email_normalized = ?, email = ?, display_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE workspace_id = ? AND id IN (
        SELECT identity_id FROM crm_job_client_access WHERE workspace_id = ? AND contact_id = ?
      )
    `).bind(email, email, nextDisplayName, actor.workspaceId, actor.workspaceId, contactId),
  ]);
  await activity(db, actor, {
    workspaceId: actor.workspaceId,
    entityType: "contact",
    entityId: contactId,
    eventType: "contact.updated",
    summary: `Updated ${nextDisplayName || "contact"}.`,
    metadata: { emailChanged: lower(current.email) !== email, status },
  });
  await platformAudit(db, actor, {
    eventType: "crm.contact.updated", entityType: "crm_contact", entityId: contactId,
    summary: `Updated CRM contact ${nextDisplayName || contactId}.`, metadata: { status },
  });
  return getCrmContact(db, actor, contactId);
}

export async function saveLeadFormSettings(db: D1Db, actor: CrmActor, input: any) {
  requirePermission(actor, "crm:manage");
  const notificationEmail = lower(input?.notificationEmail);
  if (notificationEmail && !validEmail(notificationEmail)) throw httpError("Enter a valid notification email address.");
  // v1.9.0 exposes one stable public route. Custom form paths are deferred until
  // Pages routing can resolve them without colliding with existing website routes.
  const publicPath = "/enquire";
  await db.prepare(`
    INSERT INTO crm_lead_form_settings (
      workspace_id, enabled, public_path, default_service, title, intro, thank_you_title,
      thank_you_message, notification_email, privacy_text, consent_required, autoresponder_enabled,
      autoresponder_subject, autoresponder_message, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(workspace_id) DO UPDATE SET
      enabled = excluded.enabled, public_path = excluded.public_path,
      default_service = excluded.default_service, title = excluded.title,
      intro = excluded.intro, thank_you_title = excluded.thank_you_title,
      thank_you_message = excluded.thank_you_message, notification_email = excluded.notification_email,
      privacy_text = excluded.privacy_text, consent_required = excluded.consent_required,
      autoresponder_enabled = excluded.autoresponder_enabled, autoresponder_subject = excluded.autoresponder_subject,
      autoresponder_message = excluded.autoresponder_message, updated_at = CURRENT_TIMESTAMP
  `).bind(
    actor.workspaceId, input?.enabled ? 1 : 0, publicPath, text(input?.defaultService), text(input?.title), text(input?.intro),
    text(input?.thankYouTitle), text(input?.thankYouMessage), notificationEmail,
    text(input?.privacyText), input?.consentRequired === false ? 0 : 1, input?.autoresponderEnabled ? 1 : 0,
    text(input?.autoresponderSubject || "We have received your enquiry"),
    text(input?.autoresponderMessage || "Thank you for getting in touch. We have received your enquiry and will reply as soon as possible."),
  ).run();
  await platformAudit(db, actor, {
    eventType: "crm.lead_form.updated",
    entityType: "crm_lead_form",
    entityId: actor.workspaceId,
    summary: `${input?.enabled ? "Enabled" : "Disabled"} the public CRM lead form.`,
    metadata: { publicPath, notificationConfigured: Boolean(notificationEmail), autoresponderEnabled: Boolean(input?.autoresponderEnabled) },
  });
  return getCrmOverview(db, actor);
}

export async function getPublicLeadForm(db: D1Db, workspaceId: string) {
  if (!workspaceId) throw httpError("Lead form not found.", 404);
  const row = await db.prepare(`
    SELECT s.*, w.name AS workspace_name, ws.business_name
    FROM crm_lead_form_settings s
    JOIN workspaces w ON w.id = s.workspace_id AND w.status = 'active'
    LEFT JOIN workspace_settings ws ON ws.workspace_id = s.workspace_id
    WHERE s.workspace_id = ? AND s.enabled = 1
    LIMIT 1
  `).bind(workspaceId).first();
  if (!row) throw httpError("Lead form not found.", 404);
  return {
    businessName: text(row.business_name || row.workspace_name),
    defaultService: text(row.default_service),
    title: text(row.title),
    intro: text(row.intro),
    thankYouTitle: text(row.thank_you_title),
    thankYouMessage: text(row.thank_you_message),
    privacyText: text(row.privacy_text),
    consentRequired: Boolean(row.consent_required),
    currency: text(row.currency || "GBP"),
  };
}

export async function submitPublicEnquiry(db: D1Db, workspaceId: string, request: Request, input: any) {
  const settings = await getPublicLeadForm(db, workspaceId);
  if (text(input?.website)) return { accepted: true, reference: "" };
  const firstName = text(input?.firstName);
  const email = lower(input?.email);
  if (!firstName) throw httpError("Enter your name.");
  if (!validEmail(email)) throw httpError("Enter a valid email address.");
  if (settings.consentRequired && !input?.privacyConsent) throw httpError("Please confirm the privacy consent box.");

  const ip = text(request.headers.get("CF-Connecting-IP") || "unknown");
  const userAgent = text(request.headers.get("user-agent"));
  const fingerprint = await sha256(`${workspaceId}|${ip}|${userAgent.slice(0, 180)}`);
  const recent = await db.prepare(`
    SELECT COUNT(*) AS count FROM crm_enquiries
    WHERE workspace_id = ? AND request_fingerprint = ?
      AND datetime(created_at) >= datetime('now', '-1 hour')
  `).bind(workspaceId, fingerprint).first();
  if (Number(recent?.count || 0) >= 5) throw httpError("Too many enquiries were submitted from this device. Please try again later.", 429);

  const stage = await defaultStage(db, workspaceId);
  const privacyConsent = Boolean(input?.privacyConsent);
  const consentAt = privacyConsent ? new Date().toISOString() : undefined;
  const primaryId = await upsertContact(db, workspaceId, {
    firstName, lastName: input?.lastName, email, phone: input?.phone,
    marketingConsent: Boolean(input?.marketingConsent),
  }, "website", consentAt);
  const partnerId = await upsertContact(db, workspaceId, {
    firstName: input?.partnerFirstName, lastName: input?.partnerLastName,
    email: input?.partnerEmail, phone: input?.partnerPhone,
  }, "website");
  const enquiryId = `crm_enquiry_${crypto.randomUUID()}`;
  const reference = datedReference("ENQ");
  const consent = {
    privacyConsent,
    privacyConsentAt: consentAt || null,
    marketingConsent: Boolean(input?.marketingConsent),
    privacyText: settings.privacyText,
  };
  const statements: any[] = [
    db.prepare(`
      INSERT INTO crm_enquiries (
        id, workspace_id, reference, stage_id, status, source, campaign, event_type,
        event_date, date_flexibility, venue_text, service_interest, package_interest,
        budget_min, budget_max, currency, notes, consent_json, request_fingerprint,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'open', 'website', ?, 'wedding', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      enquiryId, workspaceId, reference, stage.id, text(input?.campaign), text(input?.eventDate), text(input?.dateFlexibility),
      text(input?.venueText), text(input?.serviceInterest || "Wedding photography"), text(input?.packageInterest),
      integer(input?.budgetMin), integer(input?.budgetMax), text(settings.currency || "GBP"), text(input?.message || input?.notes), JSON.stringify(consent), fingerprint,
    ),
    db.prepare(`INSERT INTO crm_enquiry_contacts (enquiry_id, workspace_id, contact_id, role) VALUES (?, ?, ?, 'primary')`).bind(enquiryId, workspaceId, primaryId),
    db.prepare(`INSERT INTO crm_activities (id, workspace_id, entity_type, entity_id, event_type, summary, actor_email, metadata_json) VALUES (?, ?, 'enquiry', ?, 'enquiry.web_submitted', 'Submitted through the public lead form.', ?, ?)`).bind(
      `crm_activity_${crypto.randomUUID()}`, workspaceId, enquiryId, email, JSON.stringify({ source: "website" }),
    ),
  ];
  if (partnerId) statements.push(db.prepare(`INSERT INTO crm_enquiry_contacts (enquiry_id, workspace_id, contact_id, role) VALUES (?, ?, ?, 'partner')`).bind(enquiryId, workspaceId, partnerId));
  await db.batch(statements);
  return { accepted: true, reference, businessName: settings.businessName, thankYouTitle: settings.thankYouTitle, thankYouMessage: settings.thankYouMessage };
}
