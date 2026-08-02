-- v1.9.2: Workflow templates, tasks, communication history and lead autoresponders.
-- Adds reusable workspace-owned workflows, Job task generation, structured
-- communication records and configurable acknowledgement emails for public leads.

CREATE TABLE IF NOT EXISTS crm_workflow_templates (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  applies_to TEXT NOT NULL DEFAULT 'job' CHECK (applies_to IN ('job')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, name),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_templates_workspace
  ON crm_workflow_templates(workspace_id, status, is_default DESC, name COLLATE NOCASE);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_workflow_templates_one_default
  ON crm_workflow_templates(workspace_id)
  WHERE is_default = 1 AND status = 'active';

CREATE TABLE IF NOT EXISTS crm_workflow_template_steps (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  task_type TEXT NOT NULL DEFAULT 'task' CHECK (task_type IN ('task', 'email', 'call', 'meeting', 'milestone')),
  relative_to TEXT NOT NULL DEFAULT 'event_date' CHECK (relative_to IN ('booking_date', 'event_date')),
  offset_days INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  required INTEGER NOT NULL DEFAULT 1 CHECK (required IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (template_id) REFERENCES crm_workflow_templates(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_steps_template
  ON crm_workflow_template_steps(workspace_id, template_id, sort_order, name);

CREATE TABLE IF NOT EXISTS crm_job_workflows (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  template_id TEXT,
  template_name TEXT NOT NULL DEFAULT '',
  template_version INTEGER NOT NULL DEFAULT 1,
  snapshot_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  applied_by_user_id TEXT,
  applied_by_email TEXT NOT NULL DEFAULT '',
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (job_id) REFERENCES crm_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES crm_workflow_templates(id),
  FOREIGN KEY (applied_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_job_workflows_job
  ON crm_job_workflows(workspace_id, job_id, status, applied_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_job_workflows_active
  ON crm_job_workflows(workspace_id, job_id)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS crm_tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  job_id TEXT,
  enquiry_id TEXT,
  workflow_id TEXT,
  template_step_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  task_type TEXT NOT NULL DEFAULT 'task' CHECK (task_type IN ('task', 'email', 'call', 'meeting', 'milestone')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_at TEXT NOT NULL DEFAULT '',
  assigned_user_id TEXT,
  created_by_user_id TEXT,
  completed_by_user_id TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (job_id) REFERENCES crm_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id) ON DELETE CASCADE,
  FOREIGN KEY (workflow_id) REFERENCES crm_job_workflows(id) ON DELETE SET NULL,
  FOREIGN KEY (template_step_id) REFERENCES crm_workflow_template_steps(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_user_id) REFERENCES platform_users(id),
  FOREIGN KEY (created_by_user_id) REFERENCES platform_users(id),
  FOREIGN KEY (completed_by_user_id) REFERENCES platform_users(id),
  CHECK (job_id IS NOT NULL OR enquiry_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_workspace_status
  ON crm_tasks(workspace_id, status, due_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_job
  ON crm_tasks(workspace_id, job_id, status, due_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_enquiry
  ON crm_tasks(workspace_id, enquiry_id, status, due_at, created_at DESC);

CREATE TABLE IF NOT EXISTS crm_communications (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  contact_id TEXT,
  enquiry_id TEXT,
  job_id TEXT,
  channel TEXT NOT NULL DEFAULT 'note' CHECK (channel IN ('email', 'phone', 'sms', 'meeting', 'note')),
  direction TEXT NOT NULL DEFAULT 'internal' CHECK (direction IN ('inbound', 'outbound', 'internal')),
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'logged' CHECK (status IN ('draft', 'logged', 'sent', 'failed')),
  provider TEXT NOT NULL DEFAULT '',
  provider_message_id TEXT NOT NULL DEFAULT '',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_user_id TEXT,
  actor_email TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id),
  FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES crm_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES platform_users(id),
  CHECK (contact_id IS NOT NULL OR enquiry_id IS NOT NULL OR job_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_crm_communications_job
  ON crm_communications(workspace_id, job_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_communications_enquiry
  ON crm_communications(workspace_id, enquiry_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_communications_contact
  ON crm_communications(workspace_id, contact_id, occurred_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_crm_workflow_step_workspace_insert
BEFORE INSERT ON crm_workflow_template_steps
WHEN NOT EXISTS (
  SELECT 1 FROM crm_workflow_templates template
  WHERE template.id = NEW.template_id AND template.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM workflow step workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_workflow_step_workspace_update
BEFORE UPDATE OF workspace_id, template_id ON crm_workflow_template_steps
WHEN NOT EXISTS (
  SELECT 1 FROM crm_workflow_templates template
  WHERE template.id = NEW.template_id AND template.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM workflow step workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_workflow_workspace_insert
BEFORE INSERT ON crm_job_workflows
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR (
  NEW.template_id IS NOT NULL AND trim(NEW.template_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_workflow_templates template
    WHERE template.id = NEW.template_id AND template.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM Job workflow workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_workflow_workspace_update
BEFORE UPDATE OF workspace_id, job_id, template_id ON crm_job_workflows
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR (
  NEW.template_id IS NOT NULL AND trim(NEW.template_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_workflow_templates template
    WHERE template.id = NEW.template_id AND template.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM Job workflow workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_task_workspace_insert
BEFORE INSERT ON crm_tasks
WHEN (
  NEW.job_id IS NOT NULL AND trim(NEW.job_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_jobs job WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.enquiry_id IS NOT NULL AND trim(NEW.enquiry_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_enquiries enquiry WHERE enquiry.id = NEW.enquiry_id AND enquiry.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.workflow_id IS NOT NULL AND trim(NEW.workflow_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_job_workflows workflow
    WHERE workflow.id = NEW.workflow_id AND workflow.workspace_id = NEW.workspace_id
      AND (NEW.job_id IS NULL OR workflow.job_id = NEW.job_id)
  )
) OR (
  NEW.template_step_id IS NOT NULL AND trim(NEW.template_step_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_workflow_template_steps step
    WHERE step.id = NEW.template_step_id AND step.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM task workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_task_workspace_update
BEFORE UPDATE OF workspace_id, job_id, enquiry_id, workflow_id, template_step_id ON crm_tasks
WHEN (
  NEW.job_id IS NOT NULL AND trim(NEW.job_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_jobs job WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.enquiry_id IS NOT NULL AND trim(NEW.enquiry_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_enquiries enquiry WHERE enquiry.id = NEW.enquiry_id AND enquiry.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.workflow_id IS NOT NULL AND trim(NEW.workflow_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_job_workflows workflow
    WHERE workflow.id = NEW.workflow_id AND workflow.workspace_id = NEW.workspace_id
      AND (NEW.job_id IS NULL OR workflow.job_id = NEW.job_id)
  )
) OR (
  NEW.template_step_id IS NOT NULL AND trim(NEW.template_step_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_workflow_template_steps step
    WHERE step.id = NEW.template_step_id AND step.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM task workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_communication_workspace_insert
BEFORE INSERT ON crm_communications
WHEN (
  NEW.contact_id IS NOT NULL AND trim(NEW.contact_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_contacts contact WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.enquiry_id IS NOT NULL AND trim(NEW.enquiry_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_enquiries enquiry WHERE enquiry.id = NEW.enquiry_id AND enquiry.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.job_id IS NOT NULL AND trim(NEW.job_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_jobs job WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM communication workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_communication_workspace_update
BEFORE UPDATE OF workspace_id, contact_id, enquiry_id, job_id ON crm_communications
WHEN (
  NEW.contact_id IS NOT NULL AND trim(NEW.contact_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_contacts contact WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.enquiry_id IS NOT NULL AND trim(NEW.enquiry_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_enquiries enquiry WHERE enquiry.id = NEW.enquiry_id AND enquiry.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.job_id IS NOT NULL AND trim(NEW.job_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_jobs job WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM communication workspace mismatch');
END;

ALTER TABLE crm_lead_form_settings ADD COLUMN autoresponder_enabled INTEGER NOT NULL DEFAULT 0 CHECK (autoresponder_enabled IN (0, 1));
ALTER TABLE crm_lead_form_settings ADD COLUMN autoresponder_subject TEXT NOT NULL DEFAULT 'We have received your enquiry';
ALTER TABLE crm_lead_form_settings ADD COLUMN autoresponder_message TEXT NOT NULL DEFAULT 'Thank you for getting in touch. We have received your enquiry and will reply as soon as possible.';

INSERT OR IGNORE INTO crm_workflow_templates (
  id, workspace_id, name, description, applies_to, status, version, is_default
)
SELECT
  'crm_workflow_template_' || id || '_standard',
  id,
  'Standard client workflow',
  'A practical booking-to-event workflow that can be edited for this business.',
  'job',
  'active',
  1,
  1
FROM workspaces;

INSERT OR IGNORE INTO crm_workflow_template_steps (
  id, workspace_id, template_id, name, description, task_type, relative_to, offset_days, priority, sort_order, required
)
SELECT 'crm_workflow_step_' || id || '_confirm', id, 'crm_workflow_template_' || id || '_standard',
       'Confirm booking details', 'Check the accepted service, date, venue and client details.', 'task', 'booking_date', 0, 'high', 10, 1
FROM workspaces;
INSERT OR IGNORE INTO crm_workflow_template_steps (
  id, workspace_id, template_id, name, description, task_type, relative_to, offset_days, priority, sort_order, required
)
SELECT 'crm_workflow_step_' || id || '_questionnaire', id, 'crm_workflow_template_' || id || '_standard',
       'Send client questionnaire', 'Assign the relevant questionnaire and confirm portal access.', 'email', 'event_date', -90, 'normal', 20, 1
FROM workspaces;
INSERT OR IGNORE INTO crm_workflow_template_steps (
  id, workspace_id, template_id, name, description, task_type, relative_to, offset_days, priority, sort_order, required
)
SELECT 'crm_workflow_step_' || id || '_final_details', id, 'crm_workflow_template_' || id || '_standard',
       'Review final details', 'Confirm schedule, suppliers, access and any final requirements.', 'call', 'event_date', -14, 'high', 30, 1
FROM workspaces;
INSERT OR IGNORE INTO crm_workflow_template_steps (
  id, workspace_id, template_id, name, description, task_type, relative_to, offset_days, priority, sort_order, required
)
SELECT 'crm_workflow_step_' || id || '_prepare', id, 'crm_workflow_template_' || id || '_standard',
       'Prepare event brief', 'Review the full Job workspace and prepare the operational brief.', 'task', 'event_date', -2, 'high', 40, 1
FROM workspaces;
INSERT OR IGNORE INTO crm_workflow_template_steps (
  id, workspace_id, template_id, name, description, task_type, relative_to, offset_days, priority, sort_order, required
)
SELECT 'crm_workflow_step_' || id || '_follow_up', id, 'crm_workflow_template_' || id || '_standard',
       'Post-event follow-up', 'Record follow-up actions and start the delivery workflow.', 'task', 'event_date', 2, 'normal', 50, 1
FROM workspaces;

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '30', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
