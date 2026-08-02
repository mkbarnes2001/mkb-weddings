import { getAuthenticatedClientIdentity } from "./client-auth-d1";

export type PortalActor = {
  userId?: string;
  email?: string;
  workspaceId: string;
  businessName?: string;
  permissions?: string[];
  accessMode?: string;
};

type D1Db = any;
type R2BucketLike = any;
type EmailEnv = {
  RESEND_API_KEY?: string;
  CLIENT_AUTH_EMAIL_PROVIDER?: string;
  CLIENT_AUTH_FROM_EMAIL?: string;
  CLIENT_AUTH_FROM_NAME?: string;
  WEDPLANNED_AUTH_FROM_EMAIL?: string;
  WEDPLANNED_AUTH_FROM_NAME?: string;
};

const PORTAL_LINK_TTL_MS = 30 * 60 * 1000;
const CLIENT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const FIELD_TYPES = new Set(["heading", "description", "short_text", "long_text", "select", "radio", "checkbox", "file"]);

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function json<T>(value: unknown, fallback: T): T {
  try {
    return value ? JSON.parse(String(value)) as T : fallback;
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

function requirePermission(actor: PortalActor, permission: string) {
  if (!(actor.permissions || []).includes(permission)) {
    throw httpError("You do not have permission to perform this CRM action.", 403);
  }
}

function validEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower(value));
}

function randomToken(bytes = 32) {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = "";
  for (const byte of buffer) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(value: unknown) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slug(value: unknown, fallback = "field") {
  return lower(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || fallback;
}

function safeFilename(value: unknown) {
  const raw = text(value) || "attachment";
  const dot = raw.lastIndexOf(".");
  const extension = dot > 0 ? raw.slice(dot).replace(/[^A-Za-z0-9.]/g, "").slice(0, 12) : "";
  const base = (dot > 0 ? raw.slice(0, dot) : raw)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "attachment";
  return `${base}${extension}`;
}

export type QuestionnaireField = {
  id: string;
  type: "heading" | "description" | "short_text" | "long_text" | "select" | "radio" | "checkbox" | "file";
  label: string;
  help: string;
  required: boolean;
  options: string[];
};

function sanitiseSchema(value: unknown): QuestionnaireField[] {
  const input = Array.isArray(value) ? value : json<any[]>(value, []);
  const used = new Set<string>();
  const fields: QuestionnaireField[] = [];
  for (const item of input.slice(0, 120)) {
    const type = text(item?.type);
    if (!FIELD_TYPES.has(type)) continue;
    let id = slug(item?.id || item?.label || `field_${fields.length + 1}`);
    while (used.has(id)) id = `${id}_${fields.length + 1}`;
    used.add(id);
    const options = Array.isArray(item?.options)
      ? item.options.map(text).filter(Boolean).slice(0, 40)
      : text(item?.options).split("\n").map(text).filter(Boolean).slice(0, 40);
    fields.push({
      id,
      type: type as QuestionnaireField["type"],
      label: text(item?.label).slice(0, 240) || (type === "description" ? "Description" : type === "heading" ? "Section heading" : "Question"),
      help: text(item?.help).slice(0, 900),
      required: Boolean(item?.required) && !["heading", "description"].includes(type),
      options: ["select", "radio", "checkbox"].includes(type) ? options : [],
    });
  }
  return fields;
}

function hydrateTemplate(row: any) {
  return {
    id: text(row.id),
    name: text(row.name),
    description: text(row.description),
    status: text(row.status),
    version: Number(row.version || 1),
    fields: sanitiseSchema(row.schema_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function hydrateFile(row: any) {
  return {
    id: text(row.id),
    fieldKey: text(row.field_key),
    filename: text(row.original_filename),
    mimeType: text(row.mime_type),
    fileSize: Number(row.file_size || 0),
    status: text(row.status),
    uploadedAt: row.uploaded_at,
  };
}

function hydrateInstance(row: any, responses: Record<string, unknown> = {}, files: any[] = []) {
  return {
    id: text(row.id),
    jobId: text(row.job_id),
    templateId: text(row.template_id),
    assignedContactId: text(row.assigned_contact_id),
    assignedContactName: text(row.assigned_contact_name),
    title: text(row.title),
    introduction: text(row.introduction),
    fields: sanitiseSchema(row.schema_json),
    templateVersion: Number(row.template_version || 1),
    status: text(row.status),
    dueAt: text(row.due_at),
    sentAt: row.sent_at || undefined,
    openedAt: row.opened_at || undefined,
    completedAt: row.completed_at || undefined,
    lastSavedAt: row.last_saved_at || undefined,
    responses,
    files,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function hydrateJob(row: any) {
  return {
    id: text(row.id || row.job_id),
    reference: text(row.reference),
    title: text(row.title),
    status: text(row.status),
    eventDate: text(row.event_date),
    serviceName: text(row.service_name),
    venueText: text(row.venue_text),
    weddingSlug: text(row.wedding_slug),
    clientPortalStatus: text(row.client_portal_status),
  };
}

async function recordJobActivity(db: D1Db, actor: Partial<PortalActor>, workspaceId: string, jobId: string, eventType: string, summary: string, metadata: Record<string, unknown> = {}) {
  await db.prepare(`
    INSERT INTO crm_activities (
      id, workspace_id, entity_type, entity_id, event_type, summary,
      actor_user_id, actor_email, metadata_json, created_at
    ) VALUES (?, ?, 'job', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    `crm_activity_${crypto.randomUUID()}`,
    workspaceId,
    jobId,
    eventType,
    summary,
    text(actor.userId) || null,
    lower(actor.email),
    JSON.stringify(metadata),
  ).run();
}

async function ensureStarterTemplate(db: D1Db, workspaceId: string) {
  const existing = await db.prepare(`SELECT id FROM crm_questionnaire_templates WHERE workspace_id = ? LIMIT 1`).bind(workspaceId).first();
  if (existing) return;
  const fields = sanitiseSchema([
    { id: "couple_names", type: "short_text", label: "Couple names", help: "Confirm how you would like your names shown.", required: true },
    { id: "morning_prep", type: "long_text", label: "Morning preparation address", help: "Include postcode and any access details.", required: true },
    { id: "ceremony_details", type: "long_text", label: "Ceremony details", help: "Venue, address, start time and officiant if known.", required: true },
    { id: "reception_details", type: "long_text", label: "Reception and key timings", help: "Meal, speeches, first dance and any unusual events.", required: false },
    { id: "reference_files", type: "file", label: "Reference photographs or documents", help: "Optional files up to 10 MB each.", required: false },
  ]);
  await db.prepare(`
    INSERT INTO crm_questionnaire_templates (
      id, workspace_id, name, description, status, version, schema_json, created_at, updated_at
    ) VALUES (?, ?, 'Pre-wedding questionnaire', 'Collect the practical details needed to prepare for the wedding day.', 'active', 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(`crm_questionnaire_template_${workspaceId}_pre_wedding`, workspaceId, JSON.stringify(fields)).run();
}

async function instanceResponses(db: D1Db, workspaceId: string, instanceId: string) {
  const rows = await db.prepare(`
    SELECT field_key, value_json FROM crm_questionnaire_responses
    WHERE workspace_id = ? AND instance_id = ?
  `).bind(workspaceId, instanceId).all();
  const result: Record<string, unknown> = {};
  for (const row of rows.results || []) result[text(row.field_key)] = json(row.value_json, null);
  return result;
}

async function instanceFiles(db: D1Db, workspaceId: string, instanceId: string) {
  const rows = await db.prepare(`
    SELECT * FROM crm_questionnaire_files
    WHERE workspace_id = ? AND instance_id = ? AND status = 'active'
    ORDER BY uploaded_at DESC
  `).bind(workspaceId, instanceId).all();
  return (rows.results || []).map(hydrateFile);
}

async function templateRow(db: D1Db, workspaceId: string, templateId: string) {
  return db.prepare(`
    SELECT * FROM crm_questionnaire_templates
    WHERE id = ? AND workspace_id = ? LIMIT 1
  `).bind(templateId, workspaceId).first();
}

async function jobRow(db: D1Db, workspaceId: string, jobId: string) {
  return db.prepare(`SELECT * FROM crm_jobs WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(jobId, workspaceId).first();
}

async function contactRow(db: D1Db, workspaceId: string, contactId: string) {
  return db.prepare(`SELECT * FROM crm_contacts WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(contactId, workspaceId).first();
}

async function instanceRow(db: D1Db, workspaceId: string, instanceId: string) {
  return db.prepare(`
    SELECT qi.*, contact.display_name AS assigned_contact_name
    FROM crm_questionnaire_instances qi
    LEFT JOIN crm_contacts contact ON contact.id = qi.assigned_contact_id AND contact.workspace_id = qi.workspace_id
    WHERE qi.id = ? AND qi.workspace_id = ? LIMIT 1
  `).bind(instanceId, workspaceId).first();
}

export async function getQuestionnaireOverview(db: D1Db, actor: PortalActor) {
  requirePermission(actor, "crm:read");
  await ensureStarterTemplate(db, actor.workspaceId);
  const [templates, instances] = await Promise.all([
    db.prepare(`SELECT * FROM crm_questionnaire_templates WHERE workspace_id = ? ORDER BY status = 'active' DESC, updated_at DESC, name`).bind(actor.workspaceId).all(),
    db.prepare(`
      SELECT qi.*, job.title AS job_title, job.reference AS job_reference,
             contact.display_name AS assigned_contact_name
      FROM crm_questionnaire_instances qi
      JOIN crm_jobs job ON job.id = qi.job_id AND job.workspace_id = qi.workspace_id
      LEFT JOIN crm_contacts contact ON contact.id = qi.assigned_contact_id AND contact.workspace_id = qi.workspace_id
      WHERE qi.workspace_id = ?
      ORDER BY qi.created_at DESC
      LIMIT 250
    `).bind(actor.workspaceId).all(),
  ]);
  return {
    templates: (templates.results || []).map(hydrateTemplate),
    instances: (instances.results || []).map((row: any) => ({
      ...hydrateInstance(row),
      jobTitle: text(row.job_title),
      jobReference: text(row.job_reference),
    })),
  };
}

export async function getQuestionnaireTemplate(db: D1Db, actor: PortalActor, templateId: string) {
  requirePermission(actor, "crm:read");
  const row = await templateRow(db, actor.workspaceId, templateId);
  if (!row) throw httpError("Questionnaire template not found.", 404);
  return hydrateTemplate(row);
}

export async function createQuestionnaireTemplate(db: D1Db, actor: PortalActor, input: any) {
  requirePermission(actor, "crm:manage");
  const name = text(input?.name) || "Untitled questionnaire";
  const fields = sanitiseSchema(input?.fields || []);
  const id = `crm_questionnaire_template_${crypto.randomUUID()}`;
  await db.prepare(`
    INSERT INTO crm_questionnaire_templates (
      id, workspace_id, name, description, status, version, schema_json,
      created_by_user_id, updated_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    id,
    actor.workspaceId,
    name.slice(0, 180),
    text(input?.description).slice(0, 900),
    ["draft", "active"].includes(text(input?.status)) ? text(input.status) : "draft",
    JSON.stringify(fields),
    text(actor.userId) || null,
    text(actor.userId) || null,
  ).run();
  return getQuestionnaireTemplate(db, actor, id);
}

export async function saveQuestionnaireTemplate(db: D1Db, actor: PortalActor, templateId: string, input: any) {
  requirePermission(actor, "crm:manage");
  const current = await templateRow(db, actor.workspaceId, templateId);
  if (!current) throw httpError("Questionnaire template not found.", 404);
  const fields = sanitiseSchema(input?.fields ?? current.schema_json);
  const status = ["draft", "active", "archived"].includes(text(input?.status)) ? text(input.status) : text(current.status);
  await db.prepare(`
    UPDATE crm_questionnaire_templates SET
      name = ?, description = ?, status = ?, version = version + 1,
      schema_json = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workspace_id = ?
  `).bind(
    text(input?.name ?? current.name).slice(0, 180) || "Untitled questionnaire",
    text(input?.description ?? current.description).slice(0, 900),
    status,
    JSON.stringify(fields),
    text(actor.userId) || null,
    templateId,
    actor.workspaceId,
  ).run();
  return getQuestionnaireTemplate(db, actor, templateId);
}

export async function archiveQuestionnaireTemplate(db: D1Db, actor: PortalActor, templateId: string) {
  return saveQuestionnaireTemplate(db, actor, templateId, { status: "archived" });
}

export async function getCrmJobWorkspace(db: D1Db, actor: PortalActor, jobId: string) {
  requirePermission(actor, "crm:read");
  await ensureStarterTemplate(db, actor.workspaceId);
  const job = await jobRow(db, actor.workspaceId, jobId);
  if (!job) throw httpError("Job not found.", 404);
  const [contactRows, accessRows, instanceRows, templateRows, activityRows] = await Promise.all([
    db.prepare(`
      SELECT contact.*, link.role
      FROM crm_job_contacts link
      JOIN crm_contacts contact ON contact.id = link.contact_id AND contact.workspace_id = link.workspace_id
      WHERE link.job_id = ? AND link.workspace_id = ?
      ORDER BY CASE link.role WHEN 'primary' THEN 0 WHEN 'partner' THEN 1 ELSE 2 END, contact.display_name
    `).bind(jobId, actor.workspaceId).all(),
    db.prepare(`
      SELECT access.*, contact.display_name, contact.email
      FROM crm_job_client_access access
      JOIN crm_contacts contact ON contact.id = access.contact_id AND contact.workspace_id = access.workspace_id
      WHERE access.job_id = ? AND access.workspace_id = ?
      ORDER BY access.created_at
    `).bind(jobId, actor.workspaceId).all(),
    db.prepare(`
      SELECT qi.*, contact.display_name AS assigned_contact_name
      FROM crm_questionnaire_instances qi
      LEFT JOIN crm_contacts contact ON contact.id = qi.assigned_contact_id AND contact.workspace_id = qi.workspace_id
      WHERE qi.job_id = ? AND qi.workspace_id = ?
      ORDER BY qi.created_at DESC
    `).bind(jobId, actor.workspaceId).all(),
    db.prepare(`SELECT * FROM crm_questionnaire_templates WHERE workspace_id = ? AND status <> 'archived' ORDER BY status = 'active' DESC, name`).bind(actor.workspaceId).all(),
    db.prepare(`SELECT * FROM crm_activities WHERE workspace_id = ? AND entity_type = 'job' AND entity_id = ? ORDER BY created_at DESC LIMIT 100`).bind(actor.workspaceId, jobId).all(),
  ]);
  const instances = [];
  for (const row of instanceRows.results || []) {
    instances.push(hydrateInstance(row, await instanceResponses(db, actor.workspaceId, text(row.id)), await instanceFiles(db, actor.workspaceId, text(row.id))));
  }
  return {
    job: hydrateJob(job),
    contacts: (contactRows.results || []).map((row: any) => ({
      id: text(row.id),
      displayName: text(row.display_name),
      email: text(row.email),
      phone: text(row.phone),
      role: text(row.role),
    })),
    portalAccess: (accessRows.results || []).map((row: any) => ({
      jobId: text(row.job_id),
      contactId: text(row.contact_id),
      identityId: text(row.identity_id),
      displayName: text(row.display_name),
      email: text(row.email),
      role: text(row.role),
      status: text(row.status),
      invitedAt: row.invited_at || undefined,
      acceptedAt: row.accepted_at || undefined,
      revokedAt: row.revoked_at || undefined,
    })),
    questionnaires: instances,
    templates: (templateRows.results || []).map(hydrateTemplate),
    activities: (activityRows.results || []).map((row: any) => ({
      id: text(row.id),
      eventType: text(row.event_type),
      summary: text(row.summary),
      actorEmail: text(row.actor_email),
      createdAt: row.created_at,
    })),
  };
}

export async function assignQuestionnaire(db: D1Db, actor: PortalActor, jobId: string, input: any) {
  requirePermission(actor, "crm:manage");
  const job = await jobRow(db, actor.workspaceId, jobId);
  if (!job) throw httpError("Job not found.", 404);
  const template = await templateRow(db, actor.workspaceId, text(input?.templateId));
  if (!template || text(template.status) === "archived") throw httpError("Choose an active questionnaire template.", 400);
  const contactId = text(input?.contactId);
  if (!contactId) throw httpError("Choose the client who should complete this questionnaire.", 400);
  if (!await contactRow(db, actor.workspaceId, contactId)) throw httpError("Assigned client not found.", 404);
  const activeAccess = await db.prepare(`
    SELECT identity_id FROM crm_job_client_access
    WHERE workspace_id = ? AND job_id = ? AND status = 'active'
      AND contact_id = ?
    LIMIT 1
  `).bind(actor.workspaceId, jobId, contactId).first();
  const initialStatus = activeAccess ? "sent" : "draft";
  const id = `crm_questionnaire_${crypto.randomUUID()}`;
  await db.prepare(`
    INSERT INTO crm_questionnaire_instances (
      id, workspace_id, job_id, template_id, assigned_contact_id,
      title, introduction, schema_json, template_version, status, due_at, sent_at,
      created_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'sent' THEN CURRENT_TIMESTAMP ELSE NULL END, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    id,
    actor.workspaceId,
    jobId,
    text(template.id),
    contactId,
    text(input?.title || template.name).slice(0, 180),
    text(input?.introduction || template.description).slice(0, 1200),
    JSON.stringify(sanitiseSchema(template.schema_json)),
    Number(template.version || 1),
    initialStatus,
    text(input?.dueAt) || null,
    initialStatus,
    text(actor.userId) || null,
  ).run();
  await recordJobActivity(db, actor, actor.workspaceId, jobId, "questionnaire.assigned", `${initialStatus === "sent" ? "Assigned and sent" : "Assigned"} ${text(input?.title || template.name)}.`, { questionnaireId: id, contactId, status: initialStatus });
  const row = await instanceRow(db, actor.workspaceId, id);
  return hydrateInstance(row, {}, []);
}

export async function getQuestionnaireInstanceAdmin(db: D1Db, actor: PortalActor, instanceId: string) {
  requirePermission(actor, "crm:read");
  const row = await instanceRow(db, actor.workspaceId, instanceId);
  if (!row) throw httpError("Questionnaire not found.", 404);
  return hydrateInstance(row, await instanceResponses(db, actor.workspaceId, instanceId), await instanceFiles(db, actor.workspaceId, instanceId));
}

async function ensureClientIdentity(db: D1Db, workspaceId: string, contact: any) {
  const email = lower(contact?.email);
  if (!validEmail(email)) throw httpError("The selected client needs a valid email address before portal access can be sent.", 400);
  const id = `identity_${crypto.randomUUID()}`;
  await db.prepare(`
    INSERT INTO client_identities (
      id, workspace_id, email_normalized, email, display_name, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(workspace_id, email_normalized) DO UPDATE SET
      email = excluded.email,
      display_name = CASE WHEN trim(excluded.display_name) <> '' THEN excluded.display_name ELSE client_identities.display_name END,
      status = 'active',
      updated_at = CURRENT_TIMESTAMP
  `).bind(id, workspaceId, email, email, text(contact.display_name)).run();
  return db.prepare(`SELECT * FROM client_identities WHERE workspace_id = ? AND email_normalized = ? AND status = 'active' LIMIT 1`).bind(workspaceId, email).first();
}

async function sendPortalEmail(env: EmailEnv, input: { to: string; businessName: string; jobTitle: string; loginUrl: string; questionnaireCount: number }) {
  const provider = lower(env.CLIENT_AUTH_EMAIL_PROVIDER || "resend");
  if (provider !== "resend") throw httpError(`Unsupported client-auth email provider: ${provider}`, 500);
  const apiKey = text(env.RESEND_API_KEY);
  const fromEmail = text(env.CLIENT_AUTH_FROM_EMAIL || env.WEDPLANNED_AUTH_FROM_EMAIL);
  if (!apiKey || !fromEmail) throw httpError("Client portal email is not configured. Add RESEND_API_KEY and CLIENT_AUTH_FROM_EMAIL to the public and Admin Pages projects.", 500);
  const fromName = text(env.CLIENT_AUTH_FROM_NAME || env.WEDPLANNED_AUTH_FROM_NAME || input.businessName || "WedPlanned");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [input.to],
      subject: `Your client portal for ${input.jobTitle || "your booking"}`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#151515;max-width:580px;margin:auto"><p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#666">${escapeHtml(input.businessName || "WedPlanned")}</p><h1 style="font-size:25px;font-weight:600">Your client portal is ready</h1><p>Use the secure button below to open <strong>${escapeHtml(input.jobTitle || "your booking")}</strong>${input.questionnaireCount ? ` and complete ${input.questionnaireCount === 1 ? "your questionnaire" : `${input.questionnaireCount} questionnaires`}` : ""}.</p><p style="margin:28px 0"><a href="${escapeHtml(input.loginUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px">Open client portal</a></p><p style="font-size:12px;color:#777">This one-time sign-in link expires in 30 minutes. After signing in, your session remains active on this device.</p></div>`,
      text: `${input.businessName}\n\nYour client portal is ready for ${input.jobTitle}.\n${input.loginUrl}\n\nThis one-time sign-in link expires in 30 minutes.`,
    }),
  });
  if (!response.ok) {
    const body: any = await response.json().catch(() => ({}));
    throw httpError(text(body?.message || body?.error || `Email provider returned ${response.status}.`), 502);
  }
}

async function portalOrigin(db: D1Db, workspaceId: string, fallback: string) {
  const domain = await db.prepare(`
    SELECT hostname FROM workspace_domains
    WHERE workspace_id = ? AND purpose = 'public' AND verified = 1
    ORDER BY created_at DESC LIMIT 1
  `).bind(workspaceId).first();
  if (text(domain?.hostname)) return `https://${text(domain.hostname)}`;
  const settings = await db.prepare(`SELECT website_url FROM workspace_settings WHERE workspace_id = ? LIMIT 1`).bind(workspaceId).first();
  if (text(settings?.website_url)) {
    try { return new URL(text(settings.website_url)).origin; } catch {}
  }
  return new URL(fallback).origin;
}

async function createPortalInvitation(db: D1Db, workspaceId: string, job: any, contact: any, identity: any, createdByUserId: string, origin: string) {
  const rawToken = randomToken(32);
  const tokenHash = await sha256(rawToken);
  const invitationId = `crm_portal_invitation_${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + PORTAL_LINK_TTL_MS).toISOString();
  const jobId = text(job.id || job.job_id);
  const returnPath = `/client-portal?job=${encodeURIComponent(jobId)}`;
  await db.prepare(`
    INSERT INTO crm_portal_invitations (
      id, workspace_id, job_id, contact_id, identity_id, email,
      token_hash, return_path, expires_at, sent_at, created_by_user_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
  `).bind(
    invitationId,
    workspaceId,
    jobId,
    text(contact.id),
    text(identity.id),
    lower(contact.email),
    tokenHash,
    returnPath,
    expiresAt,
    createdByUserId || null,
  ).run();
  const originUrl = await portalOrigin(db, workspaceId, origin);
  return { invitationId, rawToken, loginUrl: `${originUrl}/api/public/client-portal/verify?token=${encodeURIComponent(rawToken)}`, returnPath, expiresAt };
}

export async function inviteJobClient(db: D1Db, env: EmailEnv, actor: PortalActor, jobId: string, input: any, requestUrl: string) {
  requirePermission(actor, "crm:manage");
  const job = await jobRow(db, actor.workspaceId, jobId);
  if (!job) throw httpError("Job not found.", 404);
  const contact = await contactRow(db, actor.workspaceId, text(input?.contactId));
  if (!contact) throw httpError("Client not found.", 404);
  const identity = await ensureClientIdentity(db, actor.workspaceId, contact);
  const roleRow = await db.prepare(`SELECT role FROM crm_job_contacts WHERE job_id = ? AND workspace_id = ? AND contact_id = ? LIMIT 1`).bind(jobId, actor.workspaceId, contact.id).first();
  const role = ["primary", "partner", "participant"].includes(text(roleRow?.role)) ? text(roleRow.role) : "participant";
  await db.prepare(`
    INSERT INTO crm_job_client_access (
      job_id, workspace_id, contact_id, identity_id, role, status, invited_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(job_id, identity_id) DO UPDATE SET
      contact_id = excluded.contact_id,
      role = excluded.role,
      status = 'active',
      invited_at = CURRENT_TIMESTAMP,
      revoked_at = NULL,
      updated_at = CURRENT_TIMESTAMP
  `).bind(jobId, actor.workspaceId, contact.id, identity.id, role).run();

  const questionnaires = await db.prepare(`
    SELECT id FROM crm_questionnaire_instances
    WHERE workspace_id = ? AND job_id = ?
      AND (assigned_contact_id IS NULL OR assigned_contact_id = ?)
      AND status IN ('draft', 'sent')
  `).bind(actor.workspaceId, jobId, contact.id).all();
  await db.prepare(`
    UPDATE crm_questionnaire_instances SET
      assigned_contact_id = COALESCE(assigned_contact_id, ?),
      status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END,
      sent_at = COALESCE(sent_at, CURRENT_TIMESTAMP),
      updated_at = CURRENT_TIMESTAMP
    WHERE workspace_id = ? AND job_id = ?
      AND (assigned_contact_id IS NULL OR assigned_contact_id = ?)
      AND status IN ('draft', 'sent')
  `).bind(contact.id, actor.workspaceId, jobId, contact.id).run();

  const invitation = await createPortalInvitation(db, actor.workspaceId, job, contact, identity, text(actor.userId), requestUrl);
  try {
    await sendPortalEmail(env, {
      to: lower(contact.email),
      businessName: text(actor.businessName || "WedPlanned"),
      jobTitle: text(job.title || job.reference),
      loginUrl: invitation.loginUrl,
      questionnaireCount: Number(questionnaires.results?.length || 0),
    });
  } catch (error) {
    await db.prepare(`DELETE FROM crm_portal_invitations WHERE id = ? AND workspace_id = ?`).bind(invitation.invitationId, actor.workspaceId).run().catch(() => {});
    throw error;
  }
  await db.prepare(`UPDATE crm_jobs SET client_portal_status = 'invited', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`).bind(jobId, actor.workspaceId).run();
  await recordJobActivity(db, actor, actor.workspaceId, jobId, "portal.invited", `Sent client portal invitation to ${lower(contact.email)}.`, { contactId: contact.id, questionnaireCount: Number(questionnaires.results?.length || 0) });
  return { ok: true, message: `Client portal invitation sent to ${lower(contact.email)}.`, expiresAt: invitation.expiresAt };
}

export async function revokeJobClientAccess(db: D1Db, actor: PortalActor, jobId: string, identityId: string) {
  requirePermission(actor, "crm:manage");
  const result = await db.prepare(`
    UPDATE crm_job_client_access SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE job_id = ? AND workspace_id = ? AND identity_id = ? AND status = 'active'
  `).bind(jobId, actor.workspaceId, identityId).run();
  if (!result.meta?.changes) throw httpError("Active client portal access not found.", 404);
  await recordJobActivity(db, actor, actor.workspaceId, jobId, "portal.revoked", "Revoked client portal access.", { identityId });
  return getCrmJobWorkspace(db, actor, jobId);
}

async function portalAccessForIdentity(db: D1Db, workspaceId: string, identityId: string) {
  return db.prepare(`
    SELECT access.*, job.reference, job.title, job.status AS job_status,
           job.event_date, job.service_name, job.venue_text, job.wedding_slug,
           contact.display_name AS contact_name
    FROM crm_job_client_access access
    JOIN crm_jobs job ON job.id = access.job_id AND job.workspace_id = access.workspace_id
    JOIN crm_contacts contact ON contact.id = access.contact_id AND contact.workspace_id = access.workspace_id
    WHERE access.workspace_id = ? AND access.identity_id = ? AND access.status = 'active'
      AND job.status NOT IN ('cancelled', 'archived')
    ORDER BY job.event_date, job.created_at DESC
  `).bind(workspaceId, identityId).all();
}

async function publicIdentity(db: D1Db, request: Request, workspaceId: string) {
  const identity = await getAuthenticatedClientIdentity(db, request);
  if (!identity || identity.workspaceId !== workspaceId) return null;
  return identity;
}

export async function requestPortalMagicLink(db: D1Db, env: EmailEnv, workspaceId: string, requestUrl: string, emailInput: unknown) {
  const email = lower(emailInput);
  const generic = { ok: true, message: "If that email has active client-portal access, a secure sign-in link will arrive shortly." };
  if (!validEmail(email)) return generic;
  const identity = await db.prepare(`SELECT * FROM client_identities WHERE workspace_id = ? AND email_normalized = ? AND status = 'active' LIMIT 1`).bind(workspaceId, email).first();
  if (!identity) return generic;
  const accessRows = await portalAccessForIdentity(db, workspaceId, text(identity.id));
  const access = accessRows.results?.[0];
  if (!access) return generic;
  const recent = await db.prepare(`
    SELECT COUNT(*) AS total FROM crm_portal_invitations
    WHERE workspace_id = ? AND identity_id = ? AND created_at >= datetime('now', '-10 minutes')
  `).bind(workspaceId, identity.id).first();
  if (Number(recent?.total || 0) >= 3) return generic;
  const workspace = await db.prepare(`SELECT COALESCE(NULLIF(business_name,''), 'WedPlanned') AS business_name FROM workspace_settings WHERE workspace_id = ? LIMIT 1`).bind(workspaceId).first();
  const invitation = await createPortalInvitation(db, workspaceId, access, { id: access.contact_id, email, display_name: access.contact_name }, identity, "", requestUrl);
  await sendPortalEmail(env, {
    to: email,
    businessName: text(workspace?.business_name || "WedPlanned"),
    jobTitle: text(access.title || access.reference),
    loginUrl: invitation.loginUrl,
    questionnaireCount: 0,
  });
  return generic;
}

export async function verifyPortalMagicLink(db: D1Db, rawToken: string) {
  const tokenHash = await sha256(text(rawToken));
  const row = await db.prepare(`
    SELECT invitation.*, identity.email, identity.email_normalized, identity.display_name, identity.status AS identity_status
    FROM crm_portal_invitations invitation
    JOIN client_identities identity ON identity.id = invitation.identity_id AND identity.workspace_id = invitation.workspace_id
    JOIN crm_job_client_access access ON access.job_id = invitation.job_id AND access.workspace_id = invitation.workspace_id AND access.identity_id = invitation.identity_id AND access.status = 'active'
    WHERE invitation.token_hash = ? LIMIT 1
  `).bind(tokenHash).first();
  if (!row || text(row.identity_status) !== "active") return { ok: false, status: 400, error: "This sign-in link is invalid or has expired." } as const;
  if (text(row.consumed_at)) return { ok: false, status: 400, error: "This sign-in link has already been used." } as const;
  if (!text(row.expires_at) || Date.parse(text(row.expires_at)) <= Date.now()) return { ok: false, status: 400, error: "This sign-in link has expired." } as const;
  const consumed = await db.prepare(`UPDATE crm_portal_invitations SET consumed_at = CURRENT_TIMESTAMP WHERE id = ? AND consumed_at IS NULL AND datetime(expires_at) > CURRENT_TIMESTAMP`).bind(row.id).run();
  if (Number(consumed?.meta?.changes || 0) !== 1) return { ok: false, status: 400, error: "This sign-in link is invalid, expired or has already been used." } as const;

  const rawSession = randomToken(32);
  const sessionHash = await sha256(rawSession);
  const sessionExpiresAt = new Date(Date.now() + CLIENT_SESSION_TTL_MS).toISOString();
  await db.batch([
    db.prepare(`UPDATE client_identities SET verified_at = COALESCE(verified_at, CURRENT_TIMESTAMP), last_authenticated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(row.identity_id),
    db.prepare(`UPDATE crm_job_client_access SET accepted_at = COALESCE(accepted_at, CURRENT_TIMESTAMP), status = 'active', updated_at = CURRENT_TIMESTAMP WHERE job_id = ? AND workspace_id = ? AND identity_id = ?`).bind(row.job_id, row.workspace_id, row.identity_id),
    db.prepare(`UPDATE crm_jobs SET client_portal_status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`).bind(row.job_id, row.workspace_id),
    db.prepare(`INSERT INTO client_identity_sessions (id, identity_id, token_hash, expires_at, last_seen_at, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).bind(`session_${crypto.randomUUID()}`, row.identity_id, sessionHash, sessionExpiresAt),
  ]);
  await recordJobActivity(db, { email: row.email }, text(row.workspace_id), text(row.job_id), "portal.signed_in", "Client signed in to the portal.", { identityId: row.identity_id });
  const returnPath = text(row.return_path).startsWith("/") ? text(row.return_path) : "/client-portal";
  return { ok: true, status: 200, sessionToken: rawSession, returnPath } as const;
}

export async function getPublicPortal(db: D1Db, request: Request, workspaceId: string) {
  const workspace = await db.prepare(`SELECT business_name, logo_url, accent_color, contact_email FROM workspace_settings WHERE workspace_id = ? LIMIT 1`).bind(workspaceId).first();
  const business = {
    name: text(workspace?.business_name || "WedPlanned"),
    logoUrl: text(workspace?.logo_url),
    accentColor: text(workspace?.accent_color || "#111111"),
    contactEmail: text(workspace?.contact_email),
  };
  const identity = await publicIdentity(db, request, workspaceId);
  if (!identity) return { authenticated: false, identity: null, business, jobs: [] };
  const accessRows = await portalAccessForIdentity(db, workspaceId, identity.id);
  const jobs = [];
  for (const access of accessRows.results || []) {
    const questionnaireRows = await db.prepare(`
      SELECT qi.*, contact.display_name AS assigned_contact_name
      FROM crm_questionnaire_instances qi
      LEFT JOIN crm_contacts contact ON contact.id = qi.assigned_contact_id AND contact.workspace_id = qi.workspace_id
      WHERE qi.workspace_id = ? AND qi.job_id = ?
        AND qi.status IN ('sent', 'opened', 'in_progress', 'completed')
        AND (qi.assigned_contact_id IS NULL OR qi.assigned_contact_id = ?)
      ORDER BY qi.completed_at IS NOT NULL, qi.due_at, qi.created_at
    `).bind(workspaceId, access.job_id, access.contact_id).all();
    jobs.push({
      ...hydrateJob(access),
      contactName: text(access.contact_name),
      questionnaires: (questionnaireRows.results || []).map((row: any) => hydrateInstance(row)),
    });
  }
  return {
    authenticated: true,
    identity: { id: identity.id, email: identity.email, displayName: identity.displayName },
    business,
    jobs,
  };
}

async function authorisedPublicInstance(db: D1Db, request: Request, workspaceId: string, instanceId: string) {
  const identity = await publicIdentity(db, request, workspaceId);
  if (!identity) throw httpError("Client sign-in required.", 401);
  const row = await db.prepare(`
    SELECT qi.*, access.contact_id AS access_contact_id, contact.display_name AS assigned_contact_name
    FROM crm_questionnaire_instances qi
    JOIN crm_job_client_access access
      ON access.job_id = qi.job_id AND access.workspace_id = qi.workspace_id
      AND access.identity_id = ? AND access.status = 'active'
    LEFT JOIN crm_contacts contact ON contact.id = qi.assigned_contact_id AND contact.workspace_id = qi.workspace_id
    WHERE qi.id = ? AND qi.workspace_id = ?
      AND qi.status IN ('sent', 'opened', 'in_progress', 'completed')
      AND (qi.assigned_contact_id IS NULL OR qi.assigned_contact_id = access.contact_id)
    LIMIT 1
  `).bind(identity.id, instanceId, workspaceId).first();
  if (!row) throw httpError("Questionnaire not found.", 404);
  return { identity, row };
}

export async function getPublicQuestionnaire(db: D1Db, request: Request, workspaceId: string, instanceId: string) {
  const { identity, row } = await authorisedPublicInstance(db, request, workspaceId, instanceId);
  if (["sent"].includes(text(row.status))) {
    await db.prepare(`UPDATE crm_questionnaire_instances SET status = 'opened', opened_at = COALESCE(opened_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`).bind(instanceId, workspaceId).run();
    row.status = "opened";
    row.opened_at = row.opened_at || new Date().toISOString();
  }
  return {
    identity: { email: identity.email, displayName: identity.displayName },
    questionnaire: hydrateInstance(row, await instanceResponses(db, workspaceId, instanceId), await instanceFiles(db, workspaceId, instanceId)),
  };
}

function validateSubmission(fields: QuestionnaireField[], responses: Record<string, unknown>, files: Array<{ fieldKey: string }> = []) {
  const missing: string[] = [];
  for (const field of fields) {
    if (!field.required) continue;
    if (["heading", "description"].includes(field.type)) continue;
    if (field.type === "file") {
      if (!files.some((file) => file.fieldKey === field.id)) missing.push(field.label);
      continue;
    }
    const value = responses[field.id];
    const empty = value == null || value === "" || (Array.isArray(value) && !value.length) || value === false;
    if (empty) missing.push(field.label);
  }
  return missing;
}

export async function savePublicQuestionnaire(db: D1Db, request: Request, workspaceId: string, instanceId: string, input: any) {
  const { identity, row } = await authorisedPublicInstance(db, request, workspaceId, instanceId);
  if (text(row.status) === "completed" && !input?.submit) throw httpError("This questionnaire has already been submitted.", 409);
  const fields = sanitiseSchema(row.schema_json);
  const allowed = new Set(fields.filter((field) => !["heading", "description", "file"].includes(field.type)).map((field) => field.id));
  const responses = input?.responses && typeof input.responses === "object" ? input.responses : {};
  const statements = [];
  for (const [fieldKey, value] of Object.entries(responses)) {
    if (!allowed.has(fieldKey)) continue;
    statements.push(db.prepare(`
      INSERT INTO crm_questionnaire_responses (
        instance_id, workspace_id, field_key, value_json, updated_by_identity_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(instance_id, field_key) DO UPDATE SET
        value_json = excluded.value_json,
        updated_by_identity_id = excluded.updated_by_identity_id,
        updated_at = CURRENT_TIMESTAMP
    `).bind(instanceId, workspaceId, fieldKey, JSON.stringify(value), identity.id));
  }
  const merged = { ...(await instanceResponses(db, workspaceId, instanceId)), ...responses };
  const submit = Boolean(input?.submit);
  const files = submit ? await instanceFiles(db, workspaceId, instanceId) : [];
  const missing = submit ? validateSubmission(fields, merged, files) : [];
  if (missing.length) throw httpError("Complete the required questions before submitting.", 400, missing);
  statements.push(db.prepare(`
    UPDATE crm_questionnaire_instances SET
      status = CASE WHEN ? = 1 THEN 'completed' WHEN status IN ('sent','opened') THEN 'in_progress' ELSE status END,
      opened_at = COALESCE(opened_at, CURRENT_TIMESTAMP),
      completed_at = CASE WHEN ? = 1 THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE completed_at END,
      last_saved_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workspace_id = ?
  `).bind(submit ? 1 : 0, submit ? 1 : 0, instanceId, workspaceId));
  await db.batch(statements);
  if (submit) await recordJobActivity(db, { email: identity.email }, workspaceId, text(row.job_id), "questionnaire.completed", `Completed ${text(row.title)}.`, { questionnaireId: instanceId, identityId: identity.id });
  else await recordJobActivity(db, { email: identity.email }, workspaceId, text(row.job_id), "questionnaire.saved", `Saved progress on ${text(row.title)}.`, { questionnaireId: instanceId, identityId: identity.id });
  const refreshed = await instanceRow(db, workspaceId, instanceId);
  return hydrateInstance(refreshed, await instanceResponses(db, workspaceId, instanceId), await instanceFiles(db, workspaceId, instanceId));
}

export async function uploadQuestionnaireFile(db: D1Db, bucket: R2BucketLike, request: Request, workspaceId: string, instanceId: string, fieldKeyInput: string, file: File) {
  if (!bucket) throw httpError("Private file storage is not configured.", 500);
  const { identity, row } = await authorisedPublicInstance(db, request, workspaceId, instanceId);
  const fieldKey = slug(fieldKeyInput);
  const fields = sanitiseSchema(row.schema_json);
  if (!fields.some((field) => field.id === fieldKey && field.type === "file")) throw httpError("Choose a valid file-upload question.", 400);
  if (!(file instanceof File) || file.size <= 0 || file.size > MAX_FILE_SIZE) throw httpError("Choose a file between 1 byte and 10 MB.", 400);
  const filename = safeFilename(file.name);
  const fileId = `crm_questionnaire_file_${crypto.randomUUID()}`;
  const storageKey = `workspaces/${workspaceId}/crm/jobs/${text(row.job_id)}/questionnaires/${instanceId}/${fileId}/${filename}`;
  await bucket.put(storageKey, file, {
    httpMetadata: {
      contentType: text(file.type || "application/octet-stream"),
      contentDisposition: `attachment; filename="${filename.replace(/"/g, "")}"`,
      cacheControl: "private, no-store",
    },
    customMetadata: { workspaceId, jobId: text(row.job_id), instanceId, fieldKey, identityId: identity.id },
  });
  try {
    await db.prepare(`
      INSERT INTO crm_questionnaire_files (
        id, workspace_id, instance_id, field_key, identity_id, storage_key,
        original_filename, mime_type, file_size, status, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
    `).bind(fileId, workspaceId, instanceId, fieldKey, identity.id, storageKey, text(file.name).slice(0, 500), text(file.type || "application/octet-stream"), file.size).run();
    await db.prepare(`UPDATE crm_questionnaire_instances SET status = CASE WHEN status IN ('sent','opened') THEN 'in_progress' ELSE status END, opened_at = COALESCE(opened_at, CURRENT_TIMESTAMP), last_saved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`).bind(instanceId, workspaceId).run();
  } catch (error) {
    await bucket.delete(storageKey).catch(() => {});
    throw error;
  }
  return hydrateFile(await db.prepare(`SELECT * FROM crm_questionnaire_files WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(fileId, workspaceId).first());
}

export async function getQuestionnaireFileForClient(db: D1Db, bucket: R2BucketLike, request: Request, workspaceId: string, instanceId: string, fileId: string) {
  await authorisedPublicInstance(db, request, workspaceId, instanceId);
  const row = await db.prepare(`SELECT * FROM crm_questionnaire_files WHERE id = ? AND instance_id = ? AND workspace_id = ? AND status = 'active' LIMIT 1`).bind(fileId, instanceId, workspaceId).first();
  if (!row) throw httpError("File not found.", 404);
  const object = await bucket.get(text(row.storage_key));
  if (!object) throw httpError("File not found.", 404);
  return { object, row };
}

export async function getQuestionnaireFileForAdmin(db: D1Db, bucket: R2BucketLike, actor: PortalActor, instanceId: string, fileId: string) {
  requirePermission(actor, "crm:read");
  const row = await db.prepare(`SELECT * FROM crm_questionnaire_files WHERE id = ? AND instance_id = ? AND workspace_id = ? AND status = 'active' LIMIT 1`).bind(fileId, instanceId, actor.workspaceId).first();
  if (!row) throw httpError("File not found.", 404);
  const object = await bucket.get(text(row.storage_key));
  if (!object) throw httpError("File not found.", 404);
  return { object, row };
}

export async function deleteQuestionnaireFile(db: D1Db, bucket: R2BucketLike, request: Request, workspaceId: string, instanceId: string, fileId: string) {
  const { identity } = await authorisedPublicInstance(db, request, workspaceId, instanceId);
  const row = await db.prepare(`SELECT * FROM crm_questionnaire_files WHERE id = ? AND instance_id = ? AND workspace_id = ? AND status = 'active' LIMIT 1`).bind(fileId, instanceId, workspaceId).first();
  if (!row) throw httpError("File not found.", 404);
  if (text(row.identity_id) && text(row.identity_id) !== identity.id) throw httpError("You cannot remove this file.", 403);
  await bucket.delete(text(row.storage_key)).catch(() => {});
  await db.prepare(`UPDATE crm_questionnaire_files SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`).bind(fileId, workspaceId).run();
  return { ok: true };
}
