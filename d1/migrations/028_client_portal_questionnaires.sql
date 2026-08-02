-- v1.9.1a: Client portal and questionnaires.
-- Adds workspace-owned questionnaire templates and versioned instances,
-- authenticated client access to Jobs, one-time portal invitations,
-- structured autosaved responses and private questionnaire attachments.

CREATE TABLE IF NOT EXISTS crm_questionnaire_templates (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  schema_json TEXT NOT NULL DEFAULT '[]',
  created_by_user_id TEXT,
  updated_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (created_by_user_id) REFERENCES platform_users(id),
  FOREIGN KEY (updated_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_questionnaire_templates_workspace
  ON crm_questionnaire_templates(workspace_id, status, updated_at DESC, name);

CREATE TABLE IF NOT EXISTS crm_questionnaire_instances (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  template_id TEXT,
  assigned_contact_id TEXT,
  title TEXT NOT NULL,
  introduction TEXT NOT NULL DEFAULT '',
  schema_json TEXT NOT NULL DEFAULT '[]',
  template_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'opened', 'in_progress', 'completed', 'archived')),
  due_at TEXT,
  sent_at TEXT,
  opened_at TEXT,
  completed_at TEXT,
  last_saved_at TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (job_id) REFERENCES crm_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES crm_questionnaire_templates(id),
  FOREIGN KEY (assigned_contact_id) REFERENCES crm_contacts(id),
  FOREIGN KEY (created_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_questionnaire_instances_job
  ON crm_questionnaire_instances(workspace_id, job_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_questionnaire_instances_contact
  ON crm_questionnaire_instances(workspace_id, assigned_contact_id, status, due_at);

CREATE TABLE IF NOT EXISTS crm_questionnaire_responses (
  instance_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  field_key TEXT NOT NULL,
  value_json TEXT NOT NULL DEFAULT 'null',
  updated_by_identity_id TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (instance_id, field_key),
  FOREIGN KEY (instance_id) REFERENCES crm_questionnaire_instances(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (updated_by_identity_id) REFERENCES client_identities(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_questionnaire_responses_workspace
  ON crm_questionnaire_responses(workspace_id, instance_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS crm_questionnaire_files (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  instance_id TEXT NOT NULL,
  field_key TEXT NOT NULL,
  identity_id TEXT,
  storage_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (instance_id) REFERENCES crm_questionnaire_instances(id) ON DELETE CASCADE,
  FOREIGN KEY (identity_id) REFERENCES client_identities(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_questionnaire_files_instance
  ON crm_questionnaire_files(workspace_id, instance_id, field_key, status, uploaded_at DESC);

CREATE TABLE IF NOT EXISTS crm_job_client_access (
  job_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  identity_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'primary' CHECK (role IN ('primary', 'partner', 'participant')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  invited_at TEXT,
  accepted_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (job_id, identity_id),
  FOREIGN KEY (job_id) REFERENCES crm_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id),
  FOREIGN KEY (identity_id) REFERENCES client_identities(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_job_client_access_identity
  ON crm_job_client_access(workspace_id, identity_id, status, job_id);
CREATE INDEX IF NOT EXISTS idx_crm_job_client_access_contact
  ON crm_job_client_access(workspace_id, contact_id, status, job_id);

CREATE TABLE IF NOT EXISTS crm_portal_invitations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  identity_id TEXT NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  return_path TEXT NOT NULL DEFAULT '/client-portal',
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (job_id) REFERENCES crm_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id),
  FOREIGN KEY (identity_id) REFERENCES client_identities(id),
  FOREIGN KEY (created_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_portal_invitations_identity
  ON crm_portal_invitations(workspace_id, identity_id, job_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_portal_invitations_expiry
  ON crm_portal_invitations(expires_at, consumed_at);

-- Every relationship remains within one workspace.
CREATE TRIGGER IF NOT EXISTS trg_crm_questionnaire_instance_workspace_insert
BEFORE INSERT ON crm_questionnaire_instances
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR (
  NEW.template_id IS NOT NULL AND trim(NEW.template_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_questionnaire_templates template
    WHERE template.id = NEW.template_id AND template.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.assigned_contact_id IS NOT NULL AND trim(NEW.assigned_contact_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_contacts contact
    WHERE contact.id = NEW.assigned_contact_id AND contact.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM questionnaire instance workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_questionnaire_instance_workspace_update
BEFORE UPDATE OF job_id, template_id, assigned_contact_id, workspace_id ON crm_questionnaire_instances
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR (
  NEW.template_id IS NOT NULL AND trim(NEW.template_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_questionnaire_templates template
    WHERE template.id = NEW.template_id AND template.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.assigned_contact_id IS NOT NULL AND trim(NEW.assigned_contact_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_contacts contact
    WHERE contact.id = NEW.assigned_contact_id AND contact.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM questionnaire instance workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_questionnaire_response_workspace_insert
BEFORE INSERT ON crm_questionnaire_responses
WHEN NOT EXISTS (
  SELECT 1 FROM crm_questionnaire_instances instance
  WHERE instance.id = NEW.instance_id AND instance.workspace_id = NEW.workspace_id
) OR (
  NEW.updated_by_identity_id IS NOT NULL AND trim(NEW.updated_by_identity_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM client_identities identity
    WHERE identity.id = NEW.updated_by_identity_id AND identity.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM questionnaire response workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_questionnaire_response_workspace_update
BEFORE UPDATE OF instance_id, updated_by_identity_id, workspace_id ON crm_questionnaire_responses
WHEN NOT EXISTS (
  SELECT 1 FROM crm_questionnaire_instances instance
  WHERE instance.id = NEW.instance_id AND instance.workspace_id = NEW.workspace_id
) OR (
  NEW.updated_by_identity_id IS NOT NULL AND trim(NEW.updated_by_identity_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM client_identities identity
    WHERE identity.id = NEW.updated_by_identity_id AND identity.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM questionnaire response workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_questionnaire_file_workspace_insert
BEFORE INSERT ON crm_questionnaire_files
WHEN NOT EXISTS (
  SELECT 1 FROM crm_questionnaire_instances instance
  WHERE instance.id = NEW.instance_id AND instance.workspace_id = NEW.workspace_id
) OR (
  NEW.identity_id IS NOT NULL AND trim(NEW.identity_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM client_identities identity
    WHERE identity.id = NEW.identity_id AND identity.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM questionnaire file workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_client_access_workspace_insert
BEFORE INSERT ON crm_job_client_access
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM crm_contacts contact
  WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM client_identities identity
  WHERE identity.id = NEW.identity_id AND identity.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM job client access workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_client_access_workspace_update
BEFORE UPDATE OF job_id, contact_id, identity_id, workspace_id ON crm_job_client_access
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM crm_contacts contact
  WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM client_identities identity
  WHERE identity.id = NEW.identity_id AND identity.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM job client access workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_portal_invitation_workspace_insert
BEFORE INSERT ON crm_portal_invitations
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM crm_contacts contact
  WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM client_identities identity
  WHERE identity.id = NEW.identity_id AND identity.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM portal invitation workspace mismatch');
END;

-- Seed one editable starter questionnaire per existing workspace.
INSERT OR IGNORE INTO crm_questionnaire_templates (
  id, workspace_id, name, description, status, version, schema_json
)
SELECT
  'crm_questionnaire_template_' || id || '_pre_wedding',
  id,
  'Pre-wedding questionnaire',
  'Collect the practical details needed to prepare for the wedding day.',
  'active',
  1,
  '[{"id":"couple_names","type":"short_text","label":"Couple names","help":"Confirm how you would like your names shown.","required":true,"options":[]},{"id":"morning_prep","type":"long_text","label":"Morning preparation address","help":"Include postcode and any access details.","required":true,"options":[]},{"id":"ceremony_details","type":"long_text","label":"Ceremony details","help":"Venue, address, start time and officiant if known.","required":true,"options":[]},{"id":"reception_details","type":"long_text","label":"Reception and key timings","help":"Meal, speeches, first dance and any unusual events.","required":false,"options":[]},{"id":"supplier_notes","type":"long_text","label":"Supplier team","help":"Add any known supplier names for now. Supplier Master matching follows in v1.9.1b.","required":false,"options":[]},{"id":"photography_priorities","type":"long_text","label":"Photography priorities","help":"Tell us about important people, moments or restrictions.","required":false,"options":[]},{"id":"reference_files","type":"file","label":"Reference photographs or documents","help":"Optional files up to 10 MB each.","required":false,"options":[]}]'
FROM workspaces;

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '28', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
