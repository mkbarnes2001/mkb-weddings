-- v1.9.1b: Supplier questionnaire integration and Job workspace improvements.
-- Adds workspace-owned supplier review records generated from completed client
-- questionnaires. Existing Supplier Master selections link automatically to the
-- accepted Wedding; unlisted suppliers enter an approval queue.

CREATE TABLE IF NOT EXISTS crm_supplier_submissions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  wedding_slug TEXT NOT NULL DEFAULT '',
  instance_id TEXT NOT NULL,
  field_key TEXT NOT NULL,
  response_index INTEGER NOT NULL DEFAULT 0,
  contact_id TEXT,
  role TEXT NOT NULL DEFAULT 'Supplier',
  supplier_id TEXT,
  proposed_name TEXT NOT NULL DEFAULT '',
  proposed_website TEXT NOT NULL DEFAULT '',
  proposed_instagram TEXT NOT NULL DEFAULT '',
  proposed_email TEXT NOT NULL DEFAULT '',
  proposed_phone TEXT NOT NULL DEFAULT '',
  proposed_location TEXT NOT NULL DEFAULT '',
  proposed_county TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'linked', 'approved', 'rejected')),
  resolved_supplier_id TEXT,
  review_notes TEXT NOT NULL DEFAULT '',
  reviewed_by_user_id TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (instance_id, field_key, response_index),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (job_id) REFERENCES crm_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (instance_id) REFERENCES crm_questionnaire_instances(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (resolved_supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (reviewed_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_supplier_submissions_job
  ON crm_supplier_submissions(workspace_id, job_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_supplier_submissions_review
  ON crm_supplier_submissions(workspace_id, status, proposed_name COLLATE NOCASE);

CREATE TRIGGER IF NOT EXISTS trg_crm_supplier_submission_workspace_insert
BEFORE INSERT ON crm_supplier_submissions
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM crm_questionnaire_instances instance
  WHERE instance.id = NEW.instance_id
    AND instance.workspace_id = NEW.workspace_id
    AND instance.job_id = NEW.job_id
) OR (
  NEW.contact_id IS NOT NULL AND trim(NEW.contact_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_contacts contact
    WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.supplier_id IS NOT NULL AND trim(NEW.supplier_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM suppliers supplier
    WHERE supplier.id = NEW.supplier_id AND supplier.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.resolved_supplier_id IS NOT NULL AND trim(NEW.resolved_supplier_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM suppliers supplier
    WHERE supplier.id = NEW.resolved_supplier_id AND supplier.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM supplier submission workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_supplier_submission_workspace_update
BEFORE UPDATE OF workspace_id, job_id, instance_id, contact_id, supplier_id, resolved_supplier_id ON crm_supplier_submissions
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM crm_questionnaire_instances instance
  WHERE instance.id = NEW.instance_id
    AND instance.workspace_id = NEW.workspace_id
    AND instance.job_id = NEW.job_id
) OR (
  NEW.contact_id IS NOT NULL AND trim(NEW.contact_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_contacts contact
    WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.supplier_id IS NOT NULL AND trim(NEW.supplier_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM suppliers supplier
    WHERE supplier.id = NEW.supplier_id AND supplier.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.resolved_supplier_id IS NOT NULL AND trim(NEW.resolved_supplier_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM suppliers supplier
    WHERE supplier.id = NEW.resolved_supplier_id AND supplier.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM supplier submission workspace mismatch');
END;

-- Upgrade the untouched starter supplier-notes question to a structured Supplier Master field.
UPDATE crm_questionnaire_templates
SET schema_json = replace(
      schema_json,
      '{"id":"supplier_notes","type":"long_text","label":"Supplier team","help":"Add any known supplier names for now. Supplier Master matching follows in v1.9.1b.","required":false,"options":[]}',
      '{"id":"supplier_team","type":"supplier","label":"Supplier team","help":"Choose suppliers already listed or add a supplier for approval.","required":false,"options":[],"supplierRole":"Supplier","supplierCategory":"","allowUnlisted":true,"multiple":true}'
    ),
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE schema_json LIKE '%"id":"supplier_notes","type":"long_text"%';

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '29', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
