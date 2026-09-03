import {
  sendCrmEmail,
  type CrmEmailDeliveryActor,
  type CrmEmailDeliveryEnv,
} from "./crm-email-delivery-d1";
import {
  getCrmEmailSettings,
} from "./crm-email-settings-d1";

type D1Db = any;

export type WorkflowActor = {
  userId?: string;
  email?: string;
  workspaceId: string;
  businessName?: string;
  permissions?: string[];
};

type WorkflowEmailEnv = CrmEmailDeliveryEnv;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function integer(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function safeJson(value: unknown, fallback: any = {}) {
  try { return JSON.parse(text(value) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

function httpError(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function requirePermission(actor: WorkflowActor, permission: string) {
  if (!(actor.permissions || []).includes(permission)) throw httpError("You do not have permission to perform this CRM action.", 403);
}

function validEmail(value: unknown) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower(value));
}

function escapeHtml(value: unknown) {
  return text(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function dateAtOffset(value: unknown, offsetDays: number) {
  const raw = text(value);
  if (!raw) return "";
  const parsed = new Date(raw.length <= 10 ? `${raw}T12:00:00Z` : raw);
  if (Number.isNaN(parsed.getTime())) return "";
  parsed.setUTCDate(parsed.getUTCDate() + offsetDays);
  return parsed.toISOString().slice(0, 10);
}

function hydrateStep(row: any) {
  return {
    id: text(row.id),
    templateId: text(row.template_id),
    name: text(row.name),
    description: text(row.description),
    taskType: text(row.task_type || "task"),
    relativeTo: text(row.relative_to || "event_date"),
    offsetDays: Number(row.offset_days || 0),
    priority: text(row.priority || "normal"),
    sortOrder: Number(row.sort_order || 0),
    required: Boolean(row.required),
  };
}

function hydrateTemplate(row: any, steps: any[] = []) {
  return {
    id: text(row.id),
    name: text(row.name),
    description: text(row.description),
    appliesTo: text(row.applies_to || "job"),
    status: text(row.status || "draft"),
    version: Number(row.version || 1),
    default: Boolean(row.is_default),
    steps,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function hydrateTask(row: any) {
  return {
    id: text(row.id),
    jobId: text(row.job_id),
    enquiryId: text(row.enquiry_id),
    workflowId: text(row.workflow_id),
    templateStepId: text(row.template_step_id),
    title: text(row.title),
    description: text(row.description),
    taskType: text(row.task_type || "task"),
    status: text(row.status || "pending"),
    priority: text(row.priority || "normal"),
    dueAt: text(row.due_at),
    assignedUserId: text(row.assigned_user_id),
    completedAt: row.completed_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function hydrateCommunication(row: any) {
  return {
    id: text(row.id),
    contactId: text(row.contact_id),
    enquiryId: text(row.enquiry_id),
    jobId: text(row.job_id),
    contactName: text(row.contact_name),
    contactEmail: text(row.contact_email),
    channel: text(row.channel || "note"),
    direction: text(row.direction || "internal"),
    subject: text(row.subject),
    body: text(row.body),
    status: text(row.status || "logged"),
    provider: text(row.provider),
    providerMessageId: text(row.provider_message_id),
    failureReason: text(row.failure_reason),
    deliveredAt: row.delivered_at || undefined,
    openedAt: row.opened_at || undefined,
    clickedAt: row.clicked_at || undefined,
    occurredAt: row.occurred_at,
    actorEmail: text(row.actor_email),
    metadata: safeJson(row.metadata_json, {}),
    createdAt: row.created_at,
  };
}

async function recordActivity(db: D1Db, actor: Partial<WorkflowActor>, input: { workspaceId: string; jobId: string; eventType: string; summary: string; metadata?: Record<string, unknown> }) {
  await db.prepare(`
    INSERT INTO crm_activities (
      id, workspace_id, entity_type, entity_id, event_type, summary,
      actor_user_id, actor_email, metadata_json, created_at
    ) VALUES (?, ?, 'job', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    `crm_activity_${crypto.randomUUID()}`,
    input.workspaceId,
    input.jobId,
    input.eventType,
    input.summary,
    text(actor.userId) || null,
    lower(actor.email),
    JSON.stringify(input.metadata || {}),
  ).run();
}

export async function ensureWorkflowWorkspaceSetup(db: D1Db, workspaceId: string) {
  const templateId = `crm_workflow_template_${workspaceId}_standard`;
  await db.batch([
    db.prepare(`
      INSERT OR IGNORE INTO crm_workflow_templates (
        id, workspace_id, name, description, applies_to, status, version, is_default
      ) VALUES (?, ?, 'Standard client workflow', 'A practical booking-to-event workflow that can be edited for this business.', 'job', 'active', 1, 1)
    `).bind(templateId, workspaceId),
    ...[
      ["confirm", "Confirm booking details", "Check the accepted service, date, venue and client details.", "task", "booking_date", 0, "high", 10],
      ["questionnaire", "Send client questionnaire", "Assign the relevant questionnaire and confirm portal access.", "email", "event_date", -90, "normal", 20],
      ["final_details", "Review final details", "Confirm schedule, suppliers, access and any final requirements.", "call", "event_date", -14, "high", 30],
      ["prepare", "Prepare event brief", "Review the full Job workspace and prepare the operational brief.", "task", "event_date", -2, "high", 40],
      ["follow_up", "Post-event follow-up", "Record follow-up actions and start the delivery workflow.", "task", "event_date", 2, "normal", 50],
    ].map(([key, name, description, taskType, relativeTo, offsetDays, priority, sortOrder]) => db.prepare(`
      INSERT OR IGNORE INTO crm_workflow_template_steps (
        id, workspace_id, template_id, name, description, task_type, relative_to,
        offset_days, priority, sort_order, required
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(`crm_workflow_step_${workspaceId}_${key}`, workspaceId, templateId, name, description, taskType, relativeTo, offsetDays, priority, sortOrder)),
  ]);
}

async function templateRows(db: D1Db, workspaceId: string) {
  await ensureWorkflowWorkspaceSetup(db, workspaceId);
  const [templates, steps] = await Promise.all([
    db.prepare(`SELECT * FROM crm_workflow_templates WHERE workspace_id = ? ORDER BY is_default DESC, status = 'active' DESC, name COLLATE NOCASE`).bind(workspaceId).all(),
    db.prepare(`SELECT * FROM crm_workflow_template_steps WHERE workspace_id = ? ORDER BY template_id, sort_order, name COLLATE NOCASE`).bind(workspaceId).all(),
  ]);
  const byTemplate = new Map<string, any[]>();
  for (const row of steps.results || []) {
    const id = text(row.template_id);
    if (!byTemplate.has(id)) byTemplate.set(id, []);
    byTemplate.get(id)!.push(hydrateStep(row));
  }
  return (templates.results || []).map((row: any) => hydrateTemplate(row, byTemplate.get(text(row.id)) || []));
}

export async function getWorkflowOverview(db: D1Db, actor: WorkflowActor, includeBookings: boolean) {
  requirePermission(actor, "crm:read");
  const [templates, tasks, jobs] = await Promise.all([
    templateRows(db, actor.workspaceId),
    includeBookings
      ? db.prepare(`
      SELECT task.* FROM crm_tasks task
      WHERE task.workspace_id = ? AND task.status <> 'cancelled'
      ORDER BY CASE WHEN task.status = 'pending' THEN 0 ELSE 1 END,
               CASE WHEN trim(task.due_at) = '' THEN 1 ELSE 0 END,
               task.due_at, task.created_at DESC
      LIMIT 300
    `).bind(actor.workspaceId).all()
      : Promise.resolve({ results: [] }),
    includeBookings
      ? db.prepare(`SELECT id, reference, title, event_date FROM crm_jobs WHERE workspace_id = ? AND status <> 'archived' ORDER BY event_date, created_at DESC`).bind(actor.workspaceId).all()
      : Promise.resolve({ results: [] }),
  ]);
  return {
    templates,
    tasks: (tasks.results || []).map(hydrateTask),
    jobs: (jobs.results || []).map((row: any) => ({ id: text(row.id), reference: text(row.reference), title: text(row.title), eventDate: text(row.event_date) })),
  };
}

export async function getWorkflowTemplate(db: D1Db, actor: WorkflowActor, templateIdInput: unknown) {
  requirePermission(actor, "crm:read");
  const templateId = text(templateIdInput);
  const row = await db.prepare(`SELECT * FROM crm_workflow_templates WHERE workspace_id = ? AND id = ? LIMIT 1`).bind(actor.workspaceId, templateId).first();
  if (!row) throw httpError("Workflow template not found.", 404);
  const steps = await db.prepare(`SELECT * FROM crm_workflow_template_steps WHERE workspace_id = ? AND template_id = ? ORDER BY sort_order, name COLLATE NOCASE`).bind(actor.workspaceId, templateId).all();
  return hydrateTemplate(row, (steps.results || []).map(hydrateStep));
}

function cleanSteps(input: any[]) {
  return (Array.isArray(input) ? input : []).map((step, index) => ({
    id: text(step?.id) || `crm_workflow_step_${crypto.randomUUID()}`,
    name: text(step?.name) || `Task ${index + 1}`,
    description: text(step?.description),
    taskType: ["task", "email", "call", "meeting", "milestone"].includes(text(step?.taskType)) ? text(step.taskType) : "task",
    relativeTo: text(step?.relativeTo) === "booking_date" ? "booking_date" : "event_date",
    offsetDays: integer(step?.offsetDays),
    priority: ["low", "normal", "high", "urgent"].includes(text(step?.priority)) ? text(step.priority) : "normal",
    sortOrder: (index + 1) * 10,
    required: step?.required !== false,
  })).slice(0, 100);
}

export async function createWorkflowTemplate(db: D1Db, actor: WorkflowActor, input: any) {
  requirePermission(actor, "crm:manage");
  const templateId = `crm_workflow_template_${crypto.randomUUID()}`;
  const name = text(input?.name) || "New workflow";
  const steps = cleanSteps(input?.steps || []);
  const duplicate = await db.prepare(`SELECT id FROM crm_workflow_templates WHERE workspace_id = ? AND lower(name) = lower(?) LIMIT 1`).bind(actor.workspaceId, name).first();
  if (duplicate) throw httpError("A workflow template with that name already exists.", 409);
  const statements = [db.prepare(`
    INSERT INTO crm_workflow_templates (
      id, workspace_id, name, description, applies_to, status, version, is_default
    ) VALUES (?, ?, ?, ?, 'job', ?, 1, 0)
  `).bind(templateId, actor.workspaceId, name, text(input?.description), text(input?.status) === "active" ? "active" : "draft")];
  for (const step of steps) statements.push(db.prepare(`
    INSERT INTO crm_workflow_template_steps (
      id, workspace_id, template_id, name, description, task_type, relative_to,
      offset_days, priority, sort_order, required
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(step.id, actor.workspaceId, templateId, step.name, step.description, step.taskType, step.relativeTo, step.offsetDays, step.priority, step.sortOrder, step.required ? 1 : 0));
  await db.batch(statements);
  return getWorkflowTemplate(db, actor, templateId);
}

export async function saveWorkflowTemplate(db: D1Db, actor: WorkflowActor, templateIdInput: unknown, input: any) {
  requirePermission(actor, "crm:manage");
  const current = await getWorkflowTemplate(db, actor, templateIdInput);
  const templateId = current.id;
  const name = text(input?.name ?? current.name) || current.name;
  const status = ["draft", "active", "archived"].includes(text(input?.status)) ? text(input.status) : current.status;
  const makeDefault = Boolean(input?.default);
  const steps = cleanSteps(input?.steps ?? current.steps);
  const duplicate = await db.prepare(`SELECT id FROM crm_workflow_templates WHERE workspace_id = ? AND lower(name) = lower(?) AND id <> ? LIMIT 1`).bind(actor.workspaceId, name, templateId).first();
  if (duplicate) throw httpError("A workflow template with that name already exists.", 409);
  const statements: any[] = [];
  if (makeDefault) statements.push(db.prepare(`UPDATE crm_workflow_templates SET is_default = 0, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ? AND id <> ?`).bind(actor.workspaceId, templateId));
  statements.push(db.prepare(`
    UPDATE crm_workflow_templates SET name = ?, description = ?, status = ?, version = version + 1,
      is_default = ?, updated_at = CURRENT_TIMESTAMP
    WHERE workspace_id = ? AND id = ?
  `).bind(name, text(input?.description ?? current.description), status, makeDefault && status === "active" ? 1 : 0, actor.workspaceId, templateId));
  statements.push(db.prepare(`DELETE FROM crm_workflow_template_steps WHERE workspace_id = ? AND template_id = ?`).bind(actor.workspaceId, templateId));
  for (const step of steps) statements.push(db.prepare(`
    INSERT INTO crm_workflow_template_steps (
      id, workspace_id, template_id, name, description, task_type, relative_to,
      offset_days, priority, sort_order, required
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(step.id, actor.workspaceId, templateId, step.name, step.description, step.taskType, step.relativeTo, step.offsetDays, step.priority, step.sortOrder, step.required ? 1 : 0));
  await db.batch(statements);
  return getWorkflowTemplate(db, actor, templateId);
}

export async function archiveWorkflowTemplate(db: D1Db, actor: WorkflowActor, templateIdInput: unknown) {
  requirePermission(actor, "crm:manage");
  const template = await getWorkflowTemplate(db, actor, templateIdInput);
  await db.prepare(`UPDATE crm_workflow_templates SET status = 'archived', is_default = 0, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ? AND id = ?`).bind(actor.workspaceId, template.id).run();
  return getWorkflowTemplate(db, actor, template.id);
}

async function fetchTemplateForApply(db: D1Db, workspaceId: string, templateIdInput?: unknown) {
  await ensureWorkflowWorkspaceSetup(db, workspaceId);
  const templateId = text(templateIdInput);
  const row = templateId
    ? await db.prepare(`SELECT * FROM crm_workflow_templates WHERE workspace_id = ? AND id = ? AND status = 'active' LIMIT 1`).bind(workspaceId, templateId).first()
    : await db.prepare(`SELECT * FROM crm_workflow_templates WHERE workspace_id = ? AND status = 'active' ORDER BY is_default DESC, name LIMIT 1`).bind(workspaceId).first();
  if (!row) throw httpError("No active workflow template is available for this business.", 409);
  const steps = await db.prepare(`SELECT * FROM crm_workflow_template_steps WHERE workspace_id = ? AND template_id = ? ORDER BY sort_order, name`).bind(workspaceId, text(row.id)).all();
  return { row, steps: steps.results || [] };
}

export async function applyWorkflowToJob(db: D1Db, actor: WorkflowActor, jobIdInput: unknown, templateIdInput?: unknown) {
  requirePermission(actor, "crm:manage");
  const jobId = text(jobIdInput);
  const job = await db.prepare(`SELECT * FROM crm_jobs WHERE workspace_id = ? AND id = ? LIMIT 1`).bind(actor.workspaceId, jobId).first();
  if (!job) throw httpError("Job not found.", 404);
  const active = await db.prepare(`SELECT id FROM crm_job_workflows WHERE workspace_id = ? AND job_id = ? AND status = 'active' LIMIT 1`).bind(actor.workspaceId, jobId).first();
  if (active) throw httpError("This Job already has an active workflow. Complete or cancel it before applying another.", 409);
  const { row: template, steps } = await fetchTemplateForApply(db, actor.workspaceId, templateIdInput);
  const workflowId = `crm_job_workflow_${crypto.randomUUID()}`;
  const snapshot = steps.map((row: any) => hydrateStep(row));
  const statements: any[] = [db.prepare(`
    INSERT INTO crm_job_workflows (
      id, workspace_id, job_id, template_id, template_name, template_version,
      snapshot_json, status, applied_by_user_id, applied_by_email, applied_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(workflowId, actor.workspaceId, jobId, text(template.id), text(template.name), Number(template.version || 1), JSON.stringify(snapshot), text(actor.userId) || null, lower(actor.email))];
  for (const row of steps) {
    const baseDate = text(row.relative_to) === "booking_date" ? (text(job.booking_date) || text(job.created_at).slice(0, 10)) : text(job.event_date);
    statements.push(db.prepare(`
      INSERT INTO crm_tasks (
        id, workspace_id, job_id, workflow_id, template_step_id, title, description,
        task_type, status, priority, due_at, assigned_user_id, created_by_user_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      `crm_task_${crypto.randomUUID()}`, actor.workspaceId, jobId, workflowId, text(row.id), text(row.name), text(row.description),
      text(row.task_type || "task"), text(row.priority || "normal"), dateAtOffset(baseDate, Number(row.offset_days || 0)),
      text(job.assigned_user_id) || null, text(actor.userId) || null,
    ));
  }
  await db.batch(statements);
  await recordActivity(db, actor, { workspaceId: actor.workspaceId, jobId, eventType: "workflow.applied", summary: `Applied ${text(template.name)} and created ${steps.length} tasks.`, metadata: { workflowId, templateId: text(template.id) } });
  return getJobWorkflowWorkspace(db, actor, jobId);
}

export async function applyDefaultWorkflowToJob(db: D1Db, actor: WorkflowActor, jobIdInput: unknown) {
  try { return await applyWorkflowToJob(db, actor, jobIdInput); }
  catch (error: any) {
    if (error?.statusCode === 409 && /already has an active workflow/i.test(error?.message || "")) return null;
    throw error;
  }
}

async function maybeCompleteWorkflow(db: D1Db, actor: WorkflowActor, workflowId: string, jobId: string) {
  if (!workflowId) return;
  const row = await db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
    FROM crm_tasks WHERE workspace_id = ? AND workflow_id = ? AND status <> 'cancelled'
  `).bind(actor.workspaceId, workflowId).first();
  const total = Number(row?.total || 0);
  if (total > 0 && Number(row?.pending || 0) === 0 && Number(row?.completed || 0) === total) {
    await db.prepare(`UPDATE crm_job_workflows SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE workspace_id = ? AND id = ? AND status = 'active'`).bind(actor.workspaceId, workflowId).run();
    await recordActivity(db, actor, { workspaceId: actor.workspaceId, jobId, eventType: "workflow.completed", summary: "Completed the active Job workflow.", metadata: { workflowId } });
  }
}

export async function createJobTask(db: D1Db, actor: WorkflowActor, jobIdInput: unknown, input: any) {
  requirePermission(actor, "crm:manage");
  const jobId = text(jobIdInput);
  const job = await db.prepare(`SELECT id FROM crm_jobs WHERE workspace_id = ? AND id = ? LIMIT 1`).bind(actor.workspaceId, jobId).first();
  if (!job) throw httpError("Job not found.", 404);
  const title = text(input?.title);
  if (!title) throw httpError("Enter a task title.");
  const taskId = `crm_task_${crypto.randomUUID()}`;
  await db.prepare(`
    INSERT INTO crm_tasks (
      id, workspace_id, job_id, title, description, task_type, status, priority,
      due_at, assigned_user_id, created_by_user_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    taskId, actor.workspaceId, jobId, title, text(input?.description),
    ["task", "email", "call", "meeting", "milestone"].includes(text(input?.taskType)) ? text(input.taskType) : "task",
    ["low", "normal", "high", "urgent"].includes(text(input?.priority)) ? text(input.priority) : "normal",
    text(input?.dueAt), text(input?.assignedUserId) || null, text(actor.userId) || null,
  ).run();
  await recordActivity(db, actor, { workspaceId: actor.workspaceId, jobId, eventType: "task.created", summary: `Created task: ${title}.`, metadata: { taskId } });
  return getJobWorkflowWorkspace(db, actor, jobId);
}

export async function updateJobTask(db: D1Db, actor: WorkflowActor, jobIdInput: unknown, taskIdInput: unknown, input: any) {
  requirePermission(actor, "crm:manage");
  const jobId = text(jobIdInput);
  const taskId = text(taskIdInput);
  const current = await db.prepare(`SELECT * FROM crm_tasks WHERE workspace_id = ? AND job_id = ? AND id = ? LIMIT 1`).bind(actor.workspaceId, jobId, taskId).first();
  if (!current) throw httpError("Task not found.", 404);
  const status = ["pending", "completed", "cancelled"].includes(text(input?.status)) ? text(input.status) : text(current.status);
  const title = text(input?.title ?? current.title);
  if (!title) throw httpError("Enter a task title.");

  const photographyDeliveryMilestone =
    text(current.task_type) === "milestone"
    && title.trim().toLowerCase()
      === "client photos delivered";

  const deliveryJob =
    photographyDeliveryMilestone
      ? await db.prepare(`
          SELECT id, status
          FROM crm_jobs
          WHERE workspace_id = ?
            AND id = ?
          LIMIT 1
        `).bind(
          actor.workspaceId,
          jobId,
        ).first()
      : null;

  const deliveryJobStatus =
    text(deliveryJob?.status);

  if (
    photographyDeliveryMilestone
    && !deliveryJob
  ) {
    throw httpError(
      "Job not found.",
      404,
    );
  }

  if (
    photographyDeliveryMilestone
    && status === "completed"
    && ["cancelled", "archived"].includes(
      deliveryJobStatus,
    )
  ) {
    throw httpError(
      "A cancelled or archived Job cannot be completed from final delivery.",
      409,
    );
  }

  await db.prepare(`
    UPDATE crm_tasks SET title = ?, description = ?, task_type = ?, status = ?, priority = ?, due_at = ?,
      assigned_user_id = ?, completed_by_user_id = CASE WHEN ? = 'completed' THEN ? ELSE NULL END,
      completed_at = CASE WHEN ? = 'completed' THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE NULL END,
      updated_at = CURRENT_TIMESTAMP
    WHERE workspace_id = ? AND job_id = ? AND id = ?
  `).bind(
    title, text(input?.description ?? current.description),
    ["task", "email", "call", "meeting", "milestone"].includes(text(input?.taskType)) ? text(input.taskType) : text(current.task_type),
    status,
    ["low", "normal", "high", "urgent"].includes(text(input?.priority)) ? text(input.priority) : text(current.priority),
    text(input?.dueAt ?? current.due_at), text(input?.assignedUserId ?? current.assigned_user_id) || null,
    status, text(actor.userId) || null, status,
    actor.workspaceId, jobId, taskId,
  ).run();

  if (
    photographyDeliveryMilestone
    && status !== text(current.status)
  ) {
    if (
      status === "completed"
      && deliveryJobStatus !== "completed"
    ) {
      await db.prepare(`
        UPDATE crm_jobs
        SET status = 'completed',
            updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = ?
          AND id = ?
      `).bind(
        actor.workspaceId,
        jobId,
      ).run();

      await recordActivity(
        db,
        actor,
        {
          workspaceId:
            actor.workspaceId,
          jobId,
          eventType:
            "job.completed",
          summary:
            "Completed the Job after final client photo delivery.",
          metadata: {
            taskId,
            source:
              "photography_final_delivery",
          },
        },
      );
    } else if (
      status === "pending"
      && deliveryJobStatus === "completed"
    ) {
      await db.prepare(`
        UPDATE crm_jobs
        SET status = 'active',
            updated_at = CURRENT_TIMESTAMP
        WHERE workspace_id = ?
          AND id = ?
      `).bind(
        actor.workspaceId,
        jobId,
      ).run();

      await recordActivity(
        db,
        actor,
        {
          workspaceId:
            actor.workspaceId,
          jobId,
          eventType:
            "job.reactivated",
          summary:
            "Reactivated the Job after reopening final client photo delivery.",
          metadata: {
            taskId,
            source:
              "photography_final_delivery",
          },
        },
      );
    }
  }

  if (status !== text(current.status)) {
    await recordActivity(db, actor, { workspaceId: actor.workspaceId, jobId, eventType: `task.${status}`, summary: `${status === "completed" ? "Completed" : status === "cancelled" ? "Cancelled" : "Reopened"} task: ${title}.`, metadata: { taskId } });
  }
  await maybeCompleteWorkflow(db, actor, text(current.workflow_id), jobId);
  return getJobWorkflowWorkspace(db, actor, jobId);
}

export async function logJobCommunication(db: D1Db, actor: WorkflowActor, jobIdInput: unknown, input: any) {
  requirePermission(actor, "crm:manage");
  const jobId = text(jobIdInput);
  const job = await db.prepare(`SELECT id, enquiry_id FROM crm_jobs WHERE workspace_id = ? AND id = ? LIMIT 1`).bind(actor.workspaceId, jobId).first();
  if (!job) throw httpError("Job not found.", 404);
  const channel = ["email", "phone", "sms", "meeting", "note"].includes(text(input?.channel)) ? text(input.channel) : "note";
  const direction = ["inbound", "outbound", "internal"].includes(text(input?.direction)) ? text(input.direction) : channel === "note" ? "internal" : "outbound";
  const body = text(input?.body);
  const subject = text(input?.subject);
  const contactId = text(input?.contactId);
  if (!body && !subject) throw httpError("Enter communication details.");
  if (contactId) {
    const linkedContact = await db.prepare(`
      SELECT 1 FROM crm_job_contacts
      WHERE workspace_id = ? AND job_id = ? AND contact_id = ?
      LIMIT 1
    `).bind(actor.workspaceId, jobId, contactId).first();
    if (!linkedContact) throw httpError("The selected client is not linked to this Job.", 404);
  }
  const communicationId = `crm_communication_${crypto.randomUUID()}`;
  await db.prepare(`
    INSERT INTO crm_communications (
      id, workspace_id, contact_id, enquiry_id, job_id, channel, direction,
      subject, body, status, occurred_at, actor_user_id, actor_email, metadata_json,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'logged', COALESCE(NULLIF(?, ''), CURRENT_TIMESTAMP), ?, ?, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    communicationId, actor.workspaceId, contactId || null, text(job.enquiry_id) || null, jobId,
    channel, direction, subject, body, text(input?.occurredAt), text(actor.userId) || null, lower(actor.email),
  ).run();
  await recordActivity(db, actor, { workspaceId: actor.workspaceId, jobId, eventType: "communication.logged", summary: `Logged ${channel} communication${subject ? `: ${subject}` : "."}`, metadata: { communicationId, channel, direction } });
  return getJobWorkflowWorkspace(db, actor, jobId);
}

async function workflowAttemptedProvider(
  db: D1Db,
  actor: CrmEmailDeliveryActor,
): Promise<"resend" | "gmail" | "smtp"> {
  try {
    const settings =
      await getCrmEmailSettings(
        db,
        {
          ...actor,
          permissions: [
            ...new Set([
              ...(actor.permissions || []),
              "crm:read",
            ]),
          ],
        },
      );

    if (
      settings.deliveryMode
      === "google"
    ) {
      return "gmail";
    }

    if (
      settings.deliveryMode
      === "smtp"
    ) {
      return "smtp";
    }

    return "resend";
  } catch {
    return "resend";
  }
}

export async function sendJobEmail(
  db: D1Db,
  env: WorkflowEmailEnv,
  actor: WorkflowActor,
  jobIdInput: unknown,
  input: any,
) {
  requirePermission(
    actor,
    "crm:manage",
  );

  const jobId =
    text(jobIdInput);

  const contactId =
    text(input?.contactId);

  const subject =
    text(input?.subject);

  const body =
    text(input?.body);

  if (!contactId) {
    throw httpError(
      "Choose a client for this email.",
    );
  }

  if (!subject) {
    throw httpError(
      "Enter an email subject.",
    );
  }

  if (!body) {
    throw httpError(
      "Enter an email message.",
    );
  }

  const row =
    await db.prepare(`
      SELECT
        job.id AS job_id,
        job.enquiry_id,
        contact.id AS contact_id,
        contact.email,
        contact.display_name,
        COALESCE(
          settings.business_name,
          ?
        ) AS business_name
      FROM crm_jobs job
      JOIN crm_job_contacts relation
        ON relation.job_id = job.id
        AND relation.workspace_id =
          job.workspace_id
      JOIN crm_contacts contact
        ON contact.id =
          relation.contact_id
        AND contact.workspace_id =
          job.workspace_id
      LEFT JOIN workspace_settings settings
        ON settings.workspace_id =
          job.workspace_id
      WHERE job.workspace_id = ?
        AND job.id = ?
        AND contact.id = ?
      LIMIT 1
    `).bind(
      text(
        actor.businessName
        || "WedPlanned",
      ),
      actor.workspaceId,
      jobId,
      contactId,
    ).first();

  if (!row) {
    throw httpError(
      "The selected client is not linked to this Job.",
      404,
    );
  }

  if (!validEmail(row.email)) {
    throw httpError(
      "The selected client does not have a valid email address.",
      409,
    );
  }

  const deliveryActor:
    CrmEmailDeliveryActor = {
      ...actor,
      businessName:
        text(
          row.business_name
          || actor.businessName
          || "WedPlanned",
        ),
    };

  let attemptedProvider =
    await workflowAttemptedProvider(
      db,
      deliveryActor,
    );

  const communicationId =
    `crm_communication_${crypto.randomUUID()}`;

  try {
    const delivery =
      await sendCrmEmail(
        db,
        env,
        deliveryActor,
        {
          to:
            text(row.email),
          subject,
          body,
          businessName:
            text(row.business_name),
        },
      );

    attemptedProvider =
      delivery.provider;

    await db.prepare(`
      INSERT INTO crm_communications (
        id,
        workspace_id,
        contact_id,
        enquiry_id,
        job_id,
        channel,
        direction,
        subject,
        body,
        status,
        provider,
        provider_message_id,
        occurred_at,
        actor_user_id,
        actor_email,
        metadata_json,
        created_at,
        updated_at
      ) VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        'email',
        'outbound',
        ?,
        ?,
        'sent',
        ?,
        ?,
        CURRENT_TIMESTAMP,
        ?,
        ?,
        ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `).bind(
      communicationId,
      actor.workspaceId,
      contactId,
      text(row.enquiry_id) || null,
      jobId,
      subject,
      body,
      delivery.provider,
      delivery.providerMessageId,
      text(actor.userId) || null,
      lower(actor.email),
      JSON.stringify({
        to:
          text(row.email),
        provider:
          delivery.provider,
        deliveryMode:
          delivery.deliveryMode,
      }),
    ).run();

    await recordActivity(
      db,
      actor,
      {
        workspaceId:
          actor.workspaceId,
        jobId,
        eventType:
          "communication.email_sent",
        summary:
          `Sent email to ${
            text(row.display_name)
            || text(row.email)
          }: ${subject}.`,
        metadata: {
          communicationId,
          provider:
            delivery.provider,
          providerMessageId:
            delivery.providerMessageId,
        },
      },
    );
  } catch (error: any) {
    await db.prepare(`
      INSERT INTO crm_communications (
        id,
        workspace_id,
        contact_id,
        enquiry_id,
        job_id,
        channel,
        direction,
        subject,
        body,
        status,
        provider,
        occurred_at,
        actor_user_id,
        actor_email,
        metadata_json,
        created_at,
        updated_at
      ) VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        'email',
        'outbound',
        ?,
        ?,
        'failed',
        ?,
        CURRENT_TIMESTAMP,
        ?,
        ?,
        ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `).bind(
      communicationId,
      actor.workspaceId,
      contactId,
      text(row.enquiry_id) || null,
      jobId,
      subject,
      body,
      attemptedProvider,
      text(actor.userId) || null,
      lower(actor.email),
      JSON.stringify({
        to:
          text(row.email),
        provider:
          attemptedProvider,
        error:
          text(error?.message),
      }),
    ).run();

    throw error;
  }

  return getJobWorkflowWorkspace(
    db,
    actor,
    jobId,
  );
}


export async function getJobWorkflowWorkspace(db: D1Db, actor: WorkflowActor, jobIdInput: unknown) {
  requirePermission(actor, "crm:read");
  const jobId = text(jobIdInput);
  const job = await db.prepare(`SELECT id FROM crm_jobs WHERE workspace_id = ? AND id = ? LIMIT 1`).bind(actor.workspaceId, jobId).first();
  if (!job) throw httpError("Job not found.", 404);
  const [workflow, tasks, communications, templates] = await Promise.all([
    db.prepare(`SELECT * FROM crm_job_workflows WHERE workspace_id = ? AND job_id = ? ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END, applied_at DESC LIMIT 1`).bind(actor.workspaceId, jobId).first(),
    db.prepare(`SELECT * FROM crm_tasks WHERE workspace_id = ? AND job_id = ? ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END, CASE WHEN trim(due_at) = '' THEN 1 ELSE 0 END, due_at, created_at`).bind(actor.workspaceId, jobId).all(),
    db.prepare(`
      SELECT communication.*, contact.display_name AS contact_name, contact.email AS contact_email
      FROM crm_communications communication
      LEFT JOIN crm_contacts contact ON contact.id = communication.contact_id AND contact.workspace_id = communication.workspace_id
      WHERE communication.workspace_id = ? AND communication.job_id = ?
      ORDER BY communication.occurred_at DESC, communication.created_at DESC
      LIMIT 200
    `).bind(actor.workspaceId, jobId).all(),
    templateRows(db, actor.workspaceId),
  ]);
  const taskItems = (tasks.results || []).map(hydrateTask);
  const pending = taskItems.filter((item: any) => item.status === "pending");
  const completed = taskItems.filter((item: any) => item.status === "completed");
  return {
    workflow: workflow ? {
      id: text(workflow.id), templateId: text(workflow.template_id), templateName: text(workflow.template_name),
      templateVersion: Number(workflow.template_version || 1), status: text(workflow.status),
      appliedAt: workflow.applied_at, completedAt: workflow.completed_at || undefined,
      snapshot: safeJson(workflow.snapshot_json, []),
    } : null,
    tasks: taskItems,
    taskStats: { total: taskItems.filter((item: any) => item.status !== "cancelled").length, pending: pending.length, completed: completed.length, overdue: pending.filter((item: any) => item.dueAt && item.dueAt < new Date().toISOString().slice(0, 10)).length },
    communications: (communications.results || []).map(hydrateCommunication),
    workflowTemplates: templates.filter((item: any) => item.status === "active"),
  };
}

function mergeVariables(value: string, variables: Record<string, string>) {
  return value.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_match, key) => variables[lower(key)] ?? "");
}

export async function sendLeadAutoresponder(db: D1Db, env: WorkflowEmailEnv, workspaceId: string, result: any, input: any) {
  const recipient = lower(input?.email);
  if (!result?.reference || !validEmail(recipient)) return { sent: false };
  const row = await db.prepare(`
    SELECT settings.autoresponder_enabled, settings.autoresponder_subject, settings.autoresponder_message,
      COALESCE(workspace_settings.business_name, workspace.name, 'WedPlanned') AS business_name,
      enquiry.id AS enquiry_id, contact.id AS contact_id
    FROM crm_lead_form_settings settings
    JOIN workspaces workspace ON workspace.id = settings.workspace_id
    LEFT JOIN workspace_settings ON workspace_settings.workspace_id = settings.workspace_id
    LEFT JOIN crm_enquiries enquiry ON enquiry.workspace_id = settings.workspace_id AND enquiry.reference = ?
    LEFT JOIN crm_enquiry_contacts relation ON relation.enquiry_id = enquiry.id AND relation.workspace_id = enquiry.workspace_id AND relation.role = 'primary'
    LEFT JOIN crm_contacts contact ON contact.id = relation.contact_id AND contact.workspace_id = enquiry.workspace_id
    WHERE settings.workspace_id = ?
    LIMIT 1
  `).bind(text(result.reference), workspaceId).first();
  if (!row || !Boolean(row.autoresponder_enabled)) return { sent: false };
  const variables = {
    first_name: text(input?.firstName),
    last_name: text(input?.lastName),
    reference: text(result.reference),
    business_name: text(row.business_name),
    event_date: text(input?.eventDate || "Date TBC"),
    venue: text(input?.venueText || "Venue TBC"),
  };
  const subject = mergeVariables(text(row.autoresponder_subject || "We have received your enquiry"), variables);
  const body = mergeVariables(text(row.autoresponder_message || "Thank you for getting in touch."), variables);
  const deliveryActor:
    CrmEmailDeliveryActor = {
      workspaceId,
      businessName:
        text(
          row.business_name
          || "WedPlanned",
        ),
      accessMode:
        "system",
      permissions: [
        "crm:read",
        "crm:manage",
      ],
    };

  let attemptedProvider =
    await workflowAttemptedProvider(
      db,
      deliveryActor,
    );

  const communicationId =
    `crm_communication_${crypto.randomUUID()}`;
  try {
    const delivery =
      await sendCrmEmail(
        db,
        env,
        deliveryActor,
        {
          to:
            recipient,
          subject,
          body,
          businessName:
            text(row.business_name),
        },
      );

    attemptedProvider =
      delivery.provider;

    const providerMessageId =
      delivery.providerMessageId;
    await db.prepare(`
      INSERT INTO crm_communications (
        id, workspace_id, contact_id, enquiry_id, channel, direction, subject, body,
        status, provider, provider_message_id, occurred_at, actor_email, metadata_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'email', 'outbound', ?, ?, 'sent', ?, ?, CURRENT_TIMESTAMP, '', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(communicationId, workspaceId, text(row.contact_id) || null, text(row.enquiry_id) || null, subject, body, delivery.provider, providerMessageId, JSON.stringify({ to: recipient, automated: true, kind: "lead_autoresponder", provider: delivery.provider, deliveryMode: delivery.deliveryMode })).run();
    return { sent: true, provider: delivery.provider, providerMessageId };
  } catch (error: any) {
    await db.prepare(`
      INSERT INTO crm_communications (
        id, workspace_id, contact_id, enquiry_id, channel, direction, subject, body,
        status, provider, occurred_at, actor_email, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'email', 'outbound', ?, ?, 'failed', ?, CURRENT_TIMESTAMP, '', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(communicationId, workspaceId, text(row.contact_id) || null, text(row.enquiry_id) || null, subject, body, attemptedProvider, JSON.stringify({ to: recipient, automated: true, kind: "lead_autoresponder", provider: attemptedProvider, error: text(error?.message) })).run();
    return { sent: false, provider: attemptedProvider, error: text(error?.message) };
  }
}
