-- v1.10.10a: WedCRM lead workspace and client journey foundation.
-- Adds only the durable state required by the refreshed Lead/Job workspace:
-- explicit quote presentation type, catalogue/quote imagery snapshots,
-- email engagement tracking fields and general Job-scoped client files.

ALTER TABLE crm_quote_templates
ADD COLUMN quote_type TEXT NOT NULL DEFAULT 'pick_and_choose'
CHECK (quote_type IN ('pick_and_choose', 'fixed'));

ALTER TABLE crm_quotes
ADD COLUMN quote_type TEXT NOT NULL DEFAULT 'pick_and_choose'
CHECK (quote_type IN ('pick_and_choose', 'fixed'));

ALTER TABLE crm_addons
ADD COLUMN image_url TEXT NOT NULL DEFAULT '';

-- Quote rows already snapshot mutable catalogue content such as names,
-- descriptions and pricing. Snapshot imagery alongside that content so a
-- later catalogue-image change does not alter an already-issued quote.
ALTER TABLE crm_quote_options
ADD COLUMN image_url TEXT NOT NULL DEFAULT '';

ALTER TABLE crm_quote_option_addons
ADD COLUMN image_url TEXT NOT NULL DEFAULT '';

-- Delivery state remains in crm_communications.status. These additive fields
-- represent engagement with an outbound email without changing the stable
-- draft/logged/sent/failed status contract.
ALTER TABLE crm_communications
ADD COLUMN open_tracking_token_hash TEXT NOT NULL DEFAULT '';

ALTER TABLE crm_communications
ADD COLUMN delivered_at TEXT;

ALTER TABLE crm_communications
ADD COLUMN opened_at TEXT;

ALTER TABLE crm_communications
ADD COLUMN clicked_at TEXT;

CREATE UNIQUE INDEX idx_crm_communications_open_tracking_token
  ON crm_communications(open_tracking_token_hash)
  WHERE trim(open_tracking_token_hash) <> '';

CREATE INDEX idx_crm_communications_enquiry_engagement
  ON crm_communications(
    workspace_id,
    enquiry_id,
    direction,
    channel,
    occurred_at DESC
  );

-- General Job files are deliberately separate from questionnaire uploads.
-- They use the existing private R2 storage model and become available after
-- a Lead has converted to a Job.
CREATE TABLE crm_job_files (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  identity_id TEXT,
  actor_user_id TEXT,
  source TEXT NOT NULL DEFAULT 'client'
    CHECK (source IN ('client', 'workspace')),
  storage_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size INTEGER NOT NULL DEFAULT 0
    CHECK (file_size >= 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'deleted')),
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, storage_key),
  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id),
  FOREIGN KEY (job_id)
    REFERENCES crm_jobs(id)
    ON DELETE CASCADE,
  FOREIGN KEY (identity_id)
    REFERENCES client_identities(id),
  FOREIGN KEY (actor_user_id)
    REFERENCES platform_users(id),
  CHECK (
    source = 'workspace'
    OR identity_id IS NOT NULL
  )
);

CREATE INDEX idx_crm_job_files_job
  ON crm_job_files(
    workspace_id,
    job_id,
    status,
    uploaded_at DESC
  );

CREATE INDEX idx_crm_job_files_identity
  ON crm_job_files(
    workspace_id,
    identity_id,
    status,
    uploaded_at DESC
  );

-- The normal foreign key guarantees that the Job exists. This trigger also
-- guarantees that the Job belongs to the same workspace as the file row.
CREATE TRIGGER trg_crm_job_file_workspace_insert
BEFORE INSERT ON crm_job_files
WHEN NOT EXISTS (
  SELECT 1
  FROM crm_jobs AS job
  WHERE job.id = NEW.job_id
    AND job.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM job file workspace mismatch'
  );
END;

CREATE TRIGGER trg_crm_job_file_workspace_update
BEFORE UPDATE OF workspace_id, job_id ON crm_job_files
WHEN NOT EXISTS (
  SELECT 1
  FROM crm_jobs AS job
  WHERE job.id = NEW.job_id
    AND job.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM job file workspace mismatch'
  );
END;

INSERT INTO schema_meta (
  key,
  value,
  updated_at
)
VALUES (
  'schema_version',
  '42',
  CURRENT_TIMESTAMP
)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
