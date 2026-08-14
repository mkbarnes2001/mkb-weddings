-- v1.10.9a — Commercial Templates, Quote Builder & Email Delivery Foundation
-- Schema 40 -> 41
--
-- Adds workspace-owned reusable quote templates, global template add-ons,
-- reusable email templates, workspace email-delivery settings and encrypted
-- credential storage.
--
-- Existing quote/version/acceptance tables are intentionally unchanged.
-- Sent and accepted quote snapshots remain immutable.

CREATE TABLE crm_quote_templates (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  client_introduction TEXT NOT NULL DEFAULT '',
  client_notes TEXT NOT NULL DEFAULT '',

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),

  version INTEGER NOT NULL DEFAULT 1
    CHECK (version >= 1),

  is_default INTEGER NOT NULL DEFAULT 0
    CHECK (is_default IN (0, 1)),

  expiry_days INTEGER NOT NULL DEFAULT 14
    CHECK (expiry_days >= 0),

  discount_type TEXT NOT NULL DEFAULT 'none'
    CHECK (discount_type IN ('none', 'fixed', 'percentage')),

  discount_value INTEGER NOT NULL DEFAULT 0
    CHECK (discount_value >= 0),

  tax_treatment TEXT NOT NULL DEFAULT 'none'
    CHECK (tax_treatment IN ('none', 'inclusive', 'exclusive')),

  tax_rate_basis_points INTEGER NOT NULL DEFAULT 0
    CHECK (tax_rate_basis_points >= 0),

  contract_template_id TEXT,
  questionnaire_template_id TEXT,

  payment_schedule_json TEXT NOT NULL DEFAULT '{}',

  auto_create_invoice INTEGER NOT NULL DEFAULT 1
    CHECK (auto_create_invoice IN (0, 1)),

  created_by_user_id TEXT,
  updated_by_user_id TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (workspace_id, name),

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (contract_template_id)
    REFERENCES crm_contract_templates(id)
    ON DELETE SET NULL,

  FOREIGN KEY (questionnaire_template_id)
    REFERENCES crm_questionnaire_templates(id)
    ON DELETE SET NULL,

  FOREIGN KEY (created_by_user_id)
    REFERENCES platform_users(id),

  FOREIGN KEY (updated_by_user_id)
    REFERENCES platform_users(id)
);

CREATE INDEX idx_crm_quote_templates_workspace_status
  ON crm_quote_templates(workspace_id, status, is_default, name);


CREATE TABLE crm_quote_template_packages (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  package_id TEXT NOT NULL,

  display_order INTEGER NOT NULL DEFAULT 0,

  recommended INTEGER NOT NULL DEFAULT 0
    CHECK (recommended IN (0, 1)),

  override_json TEXT NOT NULL DEFAULT '{}',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (template_id, package_id),

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (template_id)
    REFERENCES crm_quote_templates(id)
    ON DELETE CASCADE,

  FOREIGN KEY (package_id)
    REFERENCES crm_packages(id)
);

CREATE INDEX idx_crm_quote_template_packages_template
  ON crm_quote_template_packages(
    workspace_id,
    template_id,
    display_order
  );


CREATE TABLE crm_quote_template_addons (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  addon_id TEXT NOT NULL,

  display_order INTEGER NOT NULL DEFAULT 0,

  default_selected INTEGER NOT NULL DEFAULT 0
    CHECK (default_selected IN (0, 1)),

  override_json TEXT NOT NULL DEFAULT '{}',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (template_id, addon_id),

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (template_id)
    REFERENCES crm_quote_templates(id)
    ON DELETE CASCADE,

  FOREIGN KEY (addon_id)
    REFERENCES crm_addons(id)
);

CREATE INDEX idx_crm_quote_template_addons_template
  ON crm_quote_template_addons(
    workspace_id,
    template_id,
    display_order
  );


CREATE TABLE crm_email_templates (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',

  purpose TEXT NOT NULL DEFAULT 'general'
    CHECK (
      purpose IN (
        'general',
        'quote',
        'booking',
        'questionnaire',
        'invoice',
        'autoresponder'
      )
    ),

  subject_template TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',

  attachments_json TEXT NOT NULL DEFAULT '[]',

  append_signature INTEGER NOT NULL DEFAULT 1
    CHECK (append_signature IN (0, 1)),

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),

  version INTEGER NOT NULL DEFAULT 1
    CHECK (version >= 1),

  is_default INTEGER NOT NULL DEFAULT 0
    CHECK (is_default IN (0, 1)),

  created_by_user_id TEXT,
  updated_by_user_id TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (workspace_id, purpose, name),

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (created_by_user_id)
    REFERENCES platform_users(id),

  FOREIGN KEY (updated_by_user_id)
    REFERENCES platform_users(id)
);

CREATE INDEX idx_crm_email_templates_workspace_purpose
  ON crm_email_templates(
    workspace_id,
    purpose,
    status,
    is_default,
    name
  );


CREATE TABLE crm_email_credentials (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  provider TEXT NOT NULL
    CHECK (provider IN ('google', 'smtp')),

  algorithm TEXT NOT NULL DEFAULT 'AES-GCM'
    CHECK (algorithm = 'AES-GCM'),

  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,

  key_version INTEGER NOT NULL DEFAULT 1
    CHECK (key_version >= 1),

  metadata_json TEXT NOT NULL DEFAULT '{}',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (workspace_id, provider),

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_crm_email_credentials_workspace
  ON crm_email_credentials(workspace_id, provider);


CREATE TABLE crm_email_settings (
  workspace_id TEXT PRIMARY KEY,

  delivery_mode TEXT NOT NULL DEFAULT 'managed'
    CHECK (delivery_mode IN ('managed', 'google', 'smtp')),

  sender_name TEXT NOT NULL DEFAULT '',
  sender_email TEXT NOT NULL DEFAULT '',
  reply_to_email TEXT NOT NULL DEFAULT '',

  signature_enabled INTEGER NOT NULL DEFAULT 1
    CHECK (signature_enabled IN (0, 1)),

  signature_json TEXT NOT NULL DEFAULT '{}',

  google_email TEXT NOT NULL DEFAULT '',

  smtp_host TEXT NOT NULL DEFAULT '',
  smtp_port INTEGER NOT NULL DEFAULT 587
    CHECK (smtp_port > 0 AND smtp_port <= 65535 AND smtp_port <> 25),

  smtp_security TEXT NOT NULL DEFAULT 'starttls'
    CHECK (smtp_security IN ('tls', 'starttls')),

  smtp_username TEXT NOT NULL DEFAULT '',

  credential_id TEXT,

  last_tested_at TEXT,

  last_test_status TEXT NOT NULL DEFAULT ''
    CHECK (last_test_status IN ('', 'passed', 'failed')),

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (credential_id)
    REFERENCES crm_email_credentials(id)
    ON DELETE SET NULL
);

CREATE INDEX idx_crm_email_settings_delivery
  ON crm_email_settings(delivery_mode, last_test_status);


INSERT INTO schema_meta (
  key,
  value,
  updated_at
)
VALUES (
  'schema_version',
  '41',
  CURRENT_TIMESTAMP
)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
