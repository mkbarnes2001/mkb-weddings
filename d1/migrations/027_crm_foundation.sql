-- v1.9.0: WedPlanned CRM foundation.
-- Adds workspace-owned contacts, enquiry pipeline, jobs, activity history and
-- a domain-resolved public lead-form configuration. Accepted enquiries create
-- a Job and link/create the existing Wedding content record.

CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  stage_key TEXT NOT NULL,
  name TEXT NOT NULL,
  stage_type TEXT NOT NULL DEFAULT 'open' CHECK (stage_type IN ('open', 'won', 'lost')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  color_key TEXT NOT NULL DEFAULT 'neutral',
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, stage_key),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_workspace
  ON crm_pipeline_stages(workspace_id, status, sort_order, name);

CREATE TABLE IF NOT EXISTS crm_contacts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  email_normalized TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  marketing_consent INTEGER NOT NULL DEFAULT 0 CHECK (marketing_consent IN (0, 1)),
  privacy_consent_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_contacts_workspace_email
  ON crm_contacts(workspace_id, email_normalized)
  WHERE trim(email_normalized) <> '';
CREATE INDEX IF NOT EXISTS idx_crm_contacts_workspace_name
  ON crm_contacts(workspace_id, status, display_name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS crm_enquiries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  reference TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost', 'archived')),
  source TEXT NOT NULL DEFAULT 'website',
  campaign TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL DEFAULT 'wedding',
  event_date TEXT NOT NULL DEFAULT '',
  date_flexibility TEXT NOT NULL DEFAULT '',
  venue_text TEXT NOT NULL DEFAULT '',
  venue_id TEXT NOT NULL DEFAULT '',
  venue_slug TEXT NOT NULL DEFAULT '',
  service_interest TEXT NOT NULL DEFAULT '',
  package_interest TEXT NOT NULL DEFAULT '',
  budget_min INTEGER,
  budget_max INTEGER,
  currency TEXT NOT NULL DEFAULT 'GBP',
  notes TEXT NOT NULL DEFAULT '',
  assigned_user_id TEXT,
  consent_json TEXT NOT NULL DEFAULT '{}',
  request_fingerprint TEXT NOT NULL DEFAULT '',
  contacted_at TEXT,
  qualified_at TEXT,
  won_at TEXT,
  lost_at TEXT,
  lost_reason TEXT NOT NULL DEFAULT '',
  accepted_job_id TEXT,
  converted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, reference),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (stage_id) REFERENCES crm_pipeline_stages(id),
  FOREIGN KEY (assigned_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_enquiries_workspace_stage
  ON crm_enquiries(workspace_id, status, stage_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_enquiries_workspace_event_date
  ON crm_enquiries(workspace_id, event_date, status);
CREATE INDEX IF NOT EXISTS idx_crm_enquiries_fingerprint
  ON crm_enquiries(workspace_id, request_fingerprint, created_at DESC);

CREATE TABLE IF NOT EXISTS crm_enquiry_contacts (
  enquiry_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('primary', 'partner', 'planner', 'venue_contact', 'billing', 'participant')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (enquiry_id, contact_id, role),
  FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_enquiry_contacts_workspace
  ON crm_enquiry_contacts(workspace_id, contact_id, enquiry_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_enquiry_contacts_single_role
  ON crm_enquiry_contacts(workspace_id, enquiry_id, role)
  WHERE role IN ('primary', 'partner');

CREATE TABLE IF NOT EXISTS crm_jobs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  reference TEXT NOT NULL,
  enquiry_id TEXT,
  job_type TEXT NOT NULL DEFAULT 'wedding',
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('provisional', 'booked', 'active', 'completed', 'cancelled', 'archived')),
  title TEXT NOT NULL DEFAULT '',
  booking_date TEXT NOT NULL DEFAULT '',
  event_date TEXT NOT NULL DEFAULT '',
  service_name TEXT NOT NULL DEFAULT '',
  package_name TEXT NOT NULL DEFAULT '',
  value_amount INTEGER,
  currency TEXT NOT NULL DEFAULT 'GBP',
  assigned_user_id TEXT,
  venue_text TEXT NOT NULL DEFAULT '',
  venue_id TEXT NOT NULL DEFAULT '',
  venue_slug TEXT NOT NULL DEFAULT '',
  client_portal_status TEXT NOT NULL DEFAULT 'not_invited' CHECK (client_portal_status IN ('not_invited', 'invited', 'active', 'closed')),
  wedding_slug TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, reference),
  UNIQUE (workspace_id, enquiry_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id),
  FOREIGN KEY (assigned_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_jobs_workspace_status
  ON crm_jobs(workspace_id, status, event_date, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_jobs_wedding
  ON crm_jobs(workspace_id, wedding_slug);

CREATE TABLE IF NOT EXISTS crm_job_contacts (
  job_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('primary', 'partner', 'planner', 'venue_contact', 'billing', 'participant')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (job_id, contact_id, role),
  FOREIGN KEY (job_id) REFERENCES crm_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_job_contacts_workspace
  ON crm_job_contacts(workspace_id, contact_id, job_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_job_contacts_single_role
  ON crm_job_contacts(workspace_id, job_id, role)
  WHERE role IN ('primary', 'partner');

CREATE TABLE IF NOT EXISTS crm_activities (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'enquiry', 'job')),
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  actor_user_id TEXT,
  actor_email TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (actor_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_activities_entity
  ON crm_activities(workspace_id, entity_type, entity_id, created_at DESC);

-- Relationship triggers enforce that linked CRM rows belong to the same workspace.
CREATE TRIGGER IF NOT EXISTS trg_crm_enquiry_stage_workspace_insert
BEFORE INSERT ON crm_enquiries
WHEN NOT EXISTS (
  SELECT 1 FROM crm_pipeline_stages stage
  WHERE stage.id = NEW.stage_id AND stage.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM enquiry stage workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_enquiry_stage_workspace_update
BEFORE UPDATE OF stage_id, workspace_id ON crm_enquiries
WHEN NOT EXISTS (
  SELECT 1 FROM crm_pipeline_stages stage
  WHERE stage.id = NEW.stage_id AND stage.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM enquiry stage workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_enquiry_contact_workspace_insert
BEFORE INSERT ON crm_enquiry_contacts
WHEN NOT EXISTS (
  SELECT 1 FROM crm_enquiries enquiry
  WHERE enquiry.id = NEW.enquiry_id AND enquiry.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM crm_contacts contact
  WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM enquiry contact workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_enquiry_contact_workspace_update
BEFORE UPDATE OF enquiry_id, contact_id, workspace_id ON crm_enquiry_contacts
WHEN NOT EXISTS (
  SELECT 1 FROM crm_enquiries enquiry
  WHERE enquiry.id = NEW.enquiry_id AND enquiry.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM crm_contacts contact
  WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM enquiry contact workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_enquiry_workspace_insert
BEFORE INSERT ON crm_jobs
WHEN NEW.enquiry_id IS NOT NULL AND trim(NEW.enquiry_id) <> '' AND NOT EXISTS (
  SELECT 1 FROM crm_enquiries enquiry
  WHERE enquiry.id = NEW.enquiry_id AND enquiry.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM job enquiry workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_enquiry_workspace_update
BEFORE UPDATE OF enquiry_id, workspace_id ON crm_jobs
WHEN NEW.enquiry_id IS NOT NULL AND trim(NEW.enquiry_id) <> '' AND NOT EXISTS (
  SELECT 1 FROM crm_enquiries enquiry
  WHERE enquiry.id = NEW.enquiry_id AND enquiry.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM job enquiry workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_contact_workspace_insert
BEFORE INSERT ON crm_job_contacts
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM crm_contacts contact
  WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM job contact workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_contact_workspace_update
BEFORE UPDATE OF job_id, contact_id, workspace_id ON crm_job_contacts
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM crm_contacts contact
  WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM job contact workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_enquiry_accepted_job_workspace
BEFORE UPDATE OF accepted_job_id, workspace_id ON crm_enquiries
WHEN NEW.accepted_job_id IS NOT NULL AND trim(NEW.accepted_job_id) <> '' AND NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.accepted_job_id AND job.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM accepted job workspace mismatch');
END;

CREATE TABLE IF NOT EXISTS crm_lead_form_settings (
  workspace_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  public_path TEXT NOT NULL DEFAULT '/enquire',
  default_service TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT 'Tell us about your wedding',
  intro TEXT NOT NULL DEFAULT 'Share the key details and we will be in touch.',
  thank_you_title TEXT NOT NULL DEFAULT 'Thank you',
  thank_you_message TEXT NOT NULL DEFAULT 'Your enquiry has been received. We will be in touch soon.',
  notification_email TEXT NOT NULL DEFAULT '',
  privacy_text TEXT NOT NULL DEFAULT 'I agree that my details may be used to respond to this enquiry.',
  consent_required INTEGER NOT NULL DEFAULT 1 CHECK (consent_required IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

INSERT OR IGNORE INTO crm_pipeline_stages (id, workspace_id, stage_key, name, stage_type, sort_order, color_key, is_default)
SELECT 'crm_stage_' || id || '_new', id, 'new', 'New enquiry', 'open', 10, 'blue', 1 FROM workspaces;
INSERT OR IGNORE INTO crm_pipeline_stages (id, workspace_id, stage_key, name, stage_type, sort_order, color_key)
SELECT 'crm_stage_' || id || '_contacted', id, 'contacted', 'Contacted', 'open', 20, 'violet' FROM workspaces;
INSERT OR IGNORE INTO crm_pipeline_stages (id, workspace_id, stage_key, name, stage_type, sort_order, color_key)
SELECT 'crm_stage_' || id || '_qualified', id, 'qualified', 'Qualified', 'open', 30, 'amber' FROM workspaces;
INSERT OR IGNORE INTO crm_pipeline_stages (id, workspace_id, stage_key, name, stage_type, sort_order, color_key)
SELECT 'crm_stage_' || id || '_proposal', id, 'proposal', 'Proposal / quote sent', 'open', 40, 'orange' FROM workspaces;
INSERT OR IGNORE INTO crm_pipeline_stages (id, workspace_id, stage_key, name, stage_type, sort_order, color_key)
SELECT 'crm_stage_' || id || '_awaiting', id, 'awaiting', 'Awaiting decision', 'open', 50, 'pink' FROM workspaces;
INSERT OR IGNORE INTO crm_pipeline_stages (id, workspace_id, stage_key, name, stage_type, sort_order, color_key)
SELECT 'crm_stage_' || id || '_accepted', id, 'accepted', 'Accepted', 'won', 60, 'green' FROM workspaces;
INSERT OR IGNORE INTO crm_pipeline_stages (id, workspace_id, stage_key, name, stage_type, sort_order, color_key)
SELECT 'crm_stage_' || id || '_lost', id, 'lost', 'Lost / unavailable', 'lost', 70, 'red' FROM workspaces;

INSERT OR IGNORE INTO crm_lead_form_settings (
  workspace_id, enabled, default_service, title, intro, notification_email, privacy_text
)
SELECT
  ws.workspace_id,
  CASE WHEN ws.workspace_id = 'workspace_mkb_weddings' THEN 1 ELSE 0 END,
  CASE WHEN ws.workspace_id = 'workspace_mkb_weddings' THEN 'Wedding photography' ELSE '' END,
  'Tell us about your wedding',
  'Share your date, venue and plans. We normally reply within 24 hours.',
  COALESCE(NULLIF(ws.contact_email, ''), ''),
  'I agree that my details may be used to respond to this enquiry.'
FROM workspace_settings ws;

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '27', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
