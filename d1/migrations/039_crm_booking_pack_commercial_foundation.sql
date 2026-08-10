-- v1.10.5a: WedCRM booking pack, contracts and invoicing foundation.
-- Adds workspace-owned commercial configuration, contract version/signature
-- history and invoices with payment schedules and immutable payment records.

CREATE TABLE IF NOT EXISTS crm_booking_settings (
  workspace_id TEXT PRIMARY KEY,

  auto_create_contract INTEGER NOT NULL DEFAULT 1
    CHECK (auto_create_contract IN (0, 1)),

  auto_create_invoice INTEGER NOT NULL DEFAULT 1
    CHECK (auto_create_invoice IN (0, 1)),

  auto_assign_questionnaire INTEGER NOT NULL DEFAULT 0
    CHECK (auto_assign_questionnaire IN (0, 1)),

  default_contract_template_id TEXT,
  default_questionnaire_template_id TEXT,

  deposit_type TEXT NOT NULL DEFAULT 'none'
    CHECK (deposit_type IN ('none', 'fixed', 'percentage')),

  deposit_value INTEGER NOT NULL DEFAULT 0
    CHECK (deposit_value >= 0),

  deposit_due_days_after_acceptance INTEGER NOT NULL DEFAULT 0
    CHECK (deposit_due_days_after_acceptance >= 0),

  final_balance_due_days_before_event INTEGER NOT NULL DEFAULT 30
    CHECK (final_balance_due_days_before_event >= 0),

  questionnaire_due_days_before_event INTEGER NOT NULL DEFAULT 60
    CHECK (questionnaire_due_days_before_event >= 0),

  invoice_notes TEXT NOT NULL DEFAULT '',
  invoice_terms TEXT NOT NULL DEFAULT '',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (default_questionnaire_template_id)
    REFERENCES crm_questionnaire_templates(id)
);

CREATE TABLE IF NOT EXISTS crm_contract_templates (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',

  content_json TEXT NOT NULL DEFAULT '[]',
  signature_message TEXT NOT NULL DEFAULT '',

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_crm_contract_templates_workspace_name
ON crm_contract_templates(
  workspace_id,
  name COLLATE NOCASE
);

CREATE INDEX IF NOT EXISTS
idx_crm_contract_templates_workspace_status
ON crm_contract_templates(
  workspace_id,
  status,
  updated_at DESC
);

CREATE TABLE IF NOT EXISTS crm_contracts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  job_id TEXT NOT NULL,
  primary_contact_id TEXT,
  template_id TEXT,

  quote_acceptance_id TEXT,

  source_kind TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_kind IN ('manual', 'accepted_quote')),

  source_id TEXT NOT NULL DEFAULT '',

  reference TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (
      status IN (
        'draft',
        'sent',
        'viewed',
        'signed',
        'void'
      )
    ),

  current_version_id TEXT,
  signed_version_id TEXT,

  created_by_user_id TEXT,

  sent_at TEXT,
  viewed_at TEXT,
  signed_at TEXT,
  voided_at TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (job_id)
    REFERENCES crm_jobs(id),

  FOREIGN KEY (primary_contact_id)
    REFERENCES crm_contacts(id),

  FOREIGN KEY (template_id)
    REFERENCES crm_contract_templates(id),

  FOREIGN KEY (quote_acceptance_id)
    REFERENCES crm_quote_acceptances(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_crm_contracts_workspace_reference
ON crm_contracts(
  workspace_id,
  reference
);

CREATE INDEX IF NOT EXISTS
idx_crm_contracts_workspace_job
ON crm_contracts(
  workspace_id,
  job_id,
  created_at DESC
);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_crm_contracts_acceptance_source
ON crm_contracts(
  workspace_id,
  quote_acceptance_id
)
WHERE quote_acceptance_id IS NOT NULL
  AND trim(quote_acceptance_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS
idx_crm_contracts_source
ON crm_contracts(
  workspace_id,
  source_kind,
  source_id
)
WHERE trim(source_id) <> '';

CREATE TABLE IF NOT EXISTS crm_contract_versions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  contract_id TEXT NOT NULL,

  version_number INTEGER NOT NULL
    CHECK (version_number >= 1),

  previous_version_id TEXT,

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (
      status IN (
        'draft',
        'sent',
        'viewed',
        'signed',
        'superseded',
        'void'
      )
    ),

  title TEXT NOT NULL DEFAULT '',
  content_json TEXT NOT NULL DEFAULT '[]',

  business_snapshot_json TEXT NOT NULL DEFAULT '{}',
  client_snapshot_json TEXT NOT NULL DEFAULT '{}',
  booking_snapshot_json TEXT NOT NULL DEFAULT '{}',
  terms_snapshot_json TEXT NOT NULL DEFAULT '{}',

  required_signatures INTEGER NOT NULL DEFAULT 1
    CHECK (required_signatures >= 1),

  created_by_user_id TEXT,

  sent_at TEXT,
  viewed_at TEXT,
  signed_at TEXT,
  superseded_at TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (
    contract_id,
    version_number
  ),

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (contract_id)
    REFERENCES crm_contracts(id)
    ON DELETE CASCADE,

  FOREIGN KEY (previous_version_id)
    REFERENCES crm_contract_versions(id)
);

CREATE INDEX IF NOT EXISTS
idx_crm_contract_versions_contract
ON crm_contract_versions(
  workspace_id,
  contract_id,
  version_number DESC
);

CREATE TABLE IF NOT EXISTS crm_contract_signatures (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  contract_id TEXT NOT NULL,
  version_id TEXT NOT NULL,

  contact_id TEXT,
  identity_id TEXT,

  actor_type TEXT NOT NULL DEFAULT 'client'
    CHECK (
      actor_type IN (
        'client',
        'admin',
        'imported'
      )
    ),

  actor_user_id TEXT,
  actor_email TEXT NOT NULL DEFAULT '',

  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,

  signature_text TEXT NOT NULL,
  consent_text TEXT NOT NULL DEFAULT '',

  ip_address TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  audit_json TEXT NOT NULL DEFAULT '{}',

  signed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (contract_id)
    REFERENCES crm_contracts(id),

  FOREIGN KEY (version_id)
    REFERENCES crm_contract_versions(id),

  FOREIGN KEY (contact_id)
    REFERENCES crm_contacts(id),

  FOREIGN KEY (identity_id)
    REFERENCES client_identities(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_crm_contract_signatures_contact
ON crm_contract_signatures(
  version_id,
  contact_id
)
WHERE contact_id IS NOT NULL
  AND trim(contact_id) <> '';

CREATE INDEX IF NOT EXISTS
idx_crm_contract_signatures_contract
ON crm_contract_signatures(
  workspace_id,
  contract_id,
  signed_at DESC
);

CREATE TABLE IF NOT EXISTS crm_invoice_sequences (
  workspace_id TEXT PRIMARY KEY,

  prefix TEXT NOT NULL DEFAULT 'INV',
  next_number INTEGER NOT NULL DEFAULT 1
    CHECK (next_number >= 1),

  padding INTEGER NOT NULL DEFAULT 4
    CHECK (padding BETWEEN 1 AND 12),

  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_invoices (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  job_id TEXT NOT NULL,
  primary_contact_id TEXT,

  quote_id TEXT,
  quote_version_id TEXT,
  quote_acceptance_id TEXT,

  source_kind TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_kind IN ('manual', 'accepted_quote')),

  source_id TEXT NOT NULL DEFAULT '',

  reference TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (
      status IN (
        'draft',
        'issued',
        'part_paid',
        'paid',
        'void'
      )
    ),

  currency TEXT NOT NULL DEFAULT 'GBP',

  issue_date TEXT,
  due_date TEXT,

  subtotal_amount INTEGER NOT NULL DEFAULT 0
    CHECK (subtotal_amount >= 0),

  discount_amount INTEGER NOT NULL DEFAULT 0
    CHECK (discount_amount >= 0),

  tax_amount INTEGER NOT NULL DEFAULT 0
    CHECK (tax_amount >= 0),

  total_amount INTEGER NOT NULL DEFAULT 0
    CHECK (total_amount >= 0),

  business_snapshot_json TEXT NOT NULL DEFAULT '{}',
  client_snapshot_json TEXT NOT NULL DEFAULT '{}',
  booking_snapshot_json TEXT NOT NULL DEFAULT '{}',

  notes TEXT NOT NULL DEFAULT '',
  terms TEXT NOT NULL DEFAULT '',

  created_by_user_id TEXT,

  issued_at TEXT,
  sent_at TEXT,
  paid_at TEXT,
  voided_at TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (job_id)
    REFERENCES crm_jobs(id),

  FOREIGN KEY (primary_contact_id)
    REFERENCES crm_contacts(id),

  FOREIGN KEY (quote_id)
    REFERENCES crm_quotes(id),

  FOREIGN KEY (quote_version_id)
    REFERENCES crm_quote_versions(id),

  FOREIGN KEY (quote_acceptance_id)
    REFERENCES crm_quote_acceptances(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_crm_invoices_workspace_reference
ON crm_invoices(
  workspace_id,
  reference
);

CREATE INDEX IF NOT EXISTS
idx_crm_invoices_workspace_job
ON crm_invoices(
  workspace_id,
  job_id,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS
idx_crm_invoices_workspace_status
ON crm_invoices(
  workspace_id,
  status,
  due_date,
  created_at DESC
);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_crm_invoices_acceptance_source
ON crm_invoices(
  workspace_id,
  quote_acceptance_id
)
WHERE quote_acceptance_id IS NOT NULL
  AND trim(quote_acceptance_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS
idx_crm_invoices_source
ON crm_invoices(
  workspace_id,
  source_kind,
  source_id
)
WHERE trim(source_id) <> '';

CREATE TABLE IF NOT EXISTS crm_invoice_items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  invoice_id TEXT NOT NULL,

  item_type TEXT NOT NULL DEFAULT 'custom'
    CHECK (
      item_type IN (
        'package',
        'addon',
        'custom'
      )
    ),

  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',

  quantity INTEGER NOT NULL DEFAULT 1
    CHECK (quantity >= 1),

  unit_price_amount INTEGER NOT NULL DEFAULT 0
    CHECK (unit_price_amount >= 0),

  line_total_amount INTEGER NOT NULL DEFAULT 0
    CHECK (line_total_amount >= 0),

  display_order INTEGER NOT NULL DEFAULT 0,

  source_snapshot_json TEXT NOT NULL DEFAULT '{}',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (invoice_id)
    REFERENCES crm_invoices(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS
idx_crm_invoice_items_invoice
ON crm_invoice_items(
  workspace_id,
  invoice_id,
  display_order,
  created_at
);

CREATE TABLE IF NOT EXISTS crm_invoice_schedule_items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  invoice_id TEXT NOT NULL,

  schedule_type TEXT NOT NULL DEFAULT 'custom'
    CHECK (
      schedule_type IN (
        'deposit',
        'instalment',
        'final',
        'custom'
      )
    ),

  label TEXT NOT NULL,

  amount INTEGER NOT NULL DEFAULT 0
    CHECK (amount >= 0),

  due_date TEXT,

  display_order INTEGER NOT NULL DEFAULT 0,

  metadata_json TEXT NOT NULL DEFAULT '{}',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (invoice_id)
    REFERENCES crm_invoices(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS
idx_crm_invoice_schedule_invoice
ON crm_invoice_schedule_items(
  workspace_id,
  invoice_id,
  display_order,
  due_date
);

CREATE INDEX IF NOT EXISTS
idx_crm_invoice_schedule_due
ON crm_invoice_schedule_items(
  workspace_id,
  due_date
)
WHERE due_date IS NOT NULL
  AND trim(due_date) <> '';

CREATE TABLE IF NOT EXISTS crm_invoice_payments (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  invoice_id TEXT NOT NULL,
  schedule_item_id TEXT,

  payment_type TEXT NOT NULL DEFAULT 'payment'
    CHECK (
      payment_type IN (
        'payment',
        'refund'
      )
    ),

  amount INTEGER NOT NULL
    CHECK (amount > 0),

  currency TEXT NOT NULL DEFAULT 'GBP',

  method TEXT NOT NULL DEFAULT 'manual'
    CHECK (
      method IN (
        'manual',
        'bank_transfer',
        'cash',
        'card',
        'stripe',
        'other'
      )
    ),

  reference TEXT NOT NULL DEFAULT '',

  provider TEXT NOT NULL DEFAULT '',
  provider_payment_id TEXT NOT NULL DEFAULT '',

  notes TEXT NOT NULL DEFAULT '',

  recorded_by_user_id TEXT,
  recorded_by_email TEXT NOT NULL DEFAULT '',

  paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  metadata_json TEXT NOT NULL DEFAULT '{}',

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (invoice_id)
    REFERENCES crm_invoices(id),

  FOREIGN KEY (schedule_item_id)
    REFERENCES crm_invoice_schedule_items(id)
);

CREATE INDEX IF NOT EXISTS
idx_crm_invoice_payments_invoice
ON crm_invoice_payments(
  workspace_id,
  invoice_id,
  paid_at DESC,
  created_at DESC
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_invoice_payments_provider ON crm_invoice_payments (workspace_id, provider, provider_payment_id)
WHERE trim(provider) <> ''
  AND trim(provider_payment_id) <> '';

-- Seed commercial configuration for every workspace that exists at upgrade time.
INSERT OR IGNORE INTO crm_booking_settings (
  workspace_id
)
SELECT id
FROM workspaces;

INSERT OR IGNORE INTO crm_invoice_sequences (
  workspace_id
)
SELECT id
FROM workspaces;

-- Booking settings may only reference templates owned by the same workspace.
CREATE TRIGGER IF NOT EXISTS
trg_crm_booking_settings_workspace_insert
BEFORE INSERT ON crm_booking_settings
WHEN
  (
    NEW.default_contract_template_id IS NOT NULL
    AND trim(NEW.default_contract_template_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contract_templates template
      WHERE template.id = NEW.default_contract_template_id
        AND template.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.default_questionnaire_template_id IS NOT NULL
    AND trim(NEW.default_questionnaire_template_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_questionnaire_templates template
      WHERE template.id = NEW.default_questionnaire_template_id
        AND template.workspace_id = NEW.workspace_id
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM booking settings workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_booking_settings_workspace_update
BEFORE UPDATE OF
  workspace_id,
  default_contract_template_id,
  default_questionnaire_template_id
ON crm_booking_settings
WHEN
  (
    NEW.default_contract_template_id IS NOT NULL
    AND trim(NEW.default_contract_template_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contract_templates template
      WHERE template.id = NEW.default_contract_template_id
        AND template.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.default_questionnaire_template_id IS NOT NULL
    AND trim(NEW.default_questionnaire_template_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_questionnaire_templates template
      WHERE template.id = NEW.default_questionnaire_template_id
        AND template.workspace_id = NEW.workspace_id
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM booking settings workspace mismatch'
  );
END;

-- Contract relationships must all remain inside one workspace.
CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_workspace_insert
BEFORE INSERT ON crm_contracts
WHEN
  NOT EXISTS (
    SELECT 1
    FROM crm_jobs job
    WHERE job.id = NEW.job_id
      AND job.workspace_id = NEW.workspace_id
  )
  OR
  (
    NEW.primary_contact_id IS NOT NULL
    AND trim(NEW.primary_contact_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contacts contact
      WHERE contact.id = NEW.primary_contact_id
        AND contact.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.template_id IS NOT NULL
    AND trim(NEW.template_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contract_templates template
      WHERE template.id = NEW.template_id
        AND template.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.quote_acceptance_id IS NOT NULL
    AND trim(NEW.quote_acceptance_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_quote_acceptances acceptance
      JOIN crm_quotes quote
        ON quote.id = acceptance.quote_id
       AND quote.workspace_id = acceptance.workspace_id
      JOIN crm_jobs job
        ON job.id = NEW.job_id
       AND job.workspace_id = NEW.workspace_id
      WHERE acceptance.id = NEW.quote_acceptance_id
        AND acceptance.workspace_id = NEW.workspace_id
        AND job.quote_id = quote.id
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM contract workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_workspace_update
BEFORE UPDATE OF
  workspace_id,
  job_id,
  primary_contact_id,
  template_id,
  quote_acceptance_id,
  current_version_id,
  signed_version_id
ON crm_contracts
WHEN
  NOT EXISTS (
    SELECT 1
    FROM crm_jobs job
    WHERE job.id = NEW.job_id
      AND job.workspace_id = NEW.workspace_id
  )
  OR
  (
    NEW.primary_contact_id IS NOT NULL
    AND trim(NEW.primary_contact_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contacts contact
      WHERE contact.id = NEW.primary_contact_id
        AND contact.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.template_id IS NOT NULL
    AND trim(NEW.template_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contract_templates template
      WHERE template.id = NEW.template_id
        AND template.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.current_version_id IS NOT NULL
    AND trim(NEW.current_version_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contract_versions version
      WHERE version.id = NEW.current_version_id
        AND version.workspace_id = NEW.workspace_id
        AND version.contract_id = NEW.id
    )
  )
  OR
  (
    NEW.signed_version_id IS NOT NULL
    AND trim(NEW.signed_version_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contract_versions version
      WHERE version.id = NEW.signed_version_id
        AND version.workspace_id = NEW.workspace_id
        AND version.contract_id = NEW.id
        AND version.status = 'signed'
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM contract workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_version_workspace_insert
BEFORE INSERT ON crm_contract_versions
WHEN
  NOT EXISTS (
    SELECT 1
    FROM crm_contracts contract
    WHERE contract.id = NEW.contract_id
      AND contract.workspace_id = NEW.workspace_id
  )
  OR
  (
    NEW.previous_version_id IS NOT NULL
    AND trim(NEW.previous_version_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contract_versions previous
      WHERE previous.id = NEW.previous_version_id
        AND previous.workspace_id = NEW.workspace_id
        AND previous.contract_id = NEW.contract_id
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM contract version workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_signature_workspace_insert
BEFORE INSERT ON crm_contract_signatures
WHEN
  NOT EXISTS (
    SELECT 1
    FROM crm_contract_versions version
    JOIN crm_contracts contract
      ON contract.id = version.contract_id
     AND contract.workspace_id = version.workspace_id
    WHERE version.id = NEW.version_id
      AND version.workspace_id = NEW.workspace_id
      AND contract.id = NEW.contract_id
      AND version.status IN ('sent', 'viewed')
  )
  OR
  (
    NEW.contact_id IS NOT NULL
    AND trim(NEW.contact_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contacts contact
      WHERE contact.id = NEW.contact_id
        AND contact.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.identity_id IS NOT NULL
    AND trim(NEW.identity_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM client_identities identity
      WHERE identity.id = NEW.identity_id
        AND identity.workspace_id = NEW.workspace_id
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM contract signature workspace mismatch'
  );
END;

-- Sent contract document content is immutable.
CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_version_locked_content
BEFORE UPDATE OF
  title,
  content_json,
  business_snapshot_json,
  client_snapshot_json,
  booking_snapshot_json,
  terms_snapshot_json,
  required_signatures
ON crm_contract_versions
WHEN OLD.status <> 'draft'
BEGIN
  SELECT RAISE(
    ABORT,
    'Sent contract versions are immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_version_locked_delete
BEFORE DELETE ON crm_contract_versions
WHEN OLD.status <> 'draft'
BEGIN
  SELECT RAISE(
    ABORT,
    'Sent contract versions cannot be deleted'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_signature_immutable_update
BEFORE UPDATE ON crm_contract_signatures
BEGIN
  SELECT RAISE(
    ABORT,
    'Contract signatures are immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_signature_immutable_delete
BEFORE DELETE ON crm_contract_signatures
BEGIN
  SELECT RAISE(
    ABORT,
    'Contract signatures are immutable'
  );
END;

-- Invoice relationships must remain inside one workspace.
CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_workspace_insert
BEFORE INSERT ON crm_invoices
WHEN
  NOT EXISTS (
    SELECT 1
    FROM crm_jobs job
    WHERE job.id = NEW.job_id
      AND job.workspace_id = NEW.workspace_id
  )
  OR
  (
    NEW.primary_contact_id IS NOT NULL
    AND trim(NEW.primary_contact_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contacts contact
      WHERE contact.id = NEW.primary_contact_id
        AND contact.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.quote_id IS NOT NULL
    AND trim(NEW.quote_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_quotes quote
      WHERE quote.id = NEW.quote_id
        AND quote.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.quote_version_id IS NOT NULL
    AND trim(NEW.quote_version_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_quote_versions version
      WHERE version.id = NEW.quote_version_id
        AND version.workspace_id = NEW.workspace_id
        AND (
          NEW.quote_id IS NULL
          OR trim(NEW.quote_id) = ''
          OR version.quote_id = NEW.quote_id
        )
    )
  )
  OR
  (
    NEW.quote_acceptance_id IS NOT NULL
    AND trim(NEW.quote_acceptance_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_quote_acceptances acceptance
      WHERE acceptance.id = NEW.quote_acceptance_id
        AND acceptance.workspace_id = NEW.workspace_id
        AND (
          NEW.quote_id IS NULL
          OR trim(NEW.quote_id) = ''
          OR acceptance.quote_id = NEW.quote_id
        )
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_workspace_update
BEFORE UPDATE OF
  workspace_id,
  job_id,
  primary_contact_id,
  quote_id,
  quote_version_id,
  quote_acceptance_id
ON crm_invoices
WHEN
  NOT EXISTS (
    SELECT 1
    FROM crm_jobs job
    WHERE job.id = NEW.job_id
      AND job.workspace_id = NEW.workspace_id
  )
  OR
  (
    NEW.primary_contact_id IS NOT NULL
    AND trim(NEW.primary_contact_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contacts contact
      WHERE contact.id = NEW.primary_contact_id
        AND contact.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.quote_id IS NOT NULL
    AND trim(NEW.quote_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_quotes quote
      WHERE quote.id = NEW.quote_id
        AND quote.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.quote_version_id IS NOT NULL
    AND trim(NEW.quote_version_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_quote_versions version
      WHERE version.id = NEW.quote_version_id
        AND version.workspace_id = NEW.workspace_id
        AND (
          NEW.quote_id IS NULL
          OR trim(NEW.quote_id) = ''
          OR version.quote_id = NEW.quote_id
        )
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_item_workspace_insert
BEFORE INSERT ON crm_invoice_items
WHEN NOT EXISTS (
  SELECT 1
  FROM crm_invoices invoice
  WHERE invoice.id = NEW.invoice_id
    AND invoice.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice item workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_schedule_workspace_insert
BEFORE INSERT ON crm_invoice_schedule_items
WHEN NOT EXISTS (
  SELECT 1
  FROM crm_invoices invoice
  WHERE invoice.id = NEW.invoice_id
    AND invoice.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice schedule workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_payment_workspace_insert
BEFORE INSERT ON crm_invoice_payments
WHEN
  NOT EXISTS (
    SELECT 1
    FROM crm_invoices invoice
    WHERE invoice.id = NEW.invoice_id
      AND invoice.workspace_id = NEW.workspace_id
      AND invoice.status IN (
        'issued',
        'part_paid',
        'paid'
      )
  )
  OR
  (
    NEW.schedule_item_id IS NOT NULL
    AND trim(NEW.schedule_item_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_invoice_schedule_items schedule
      WHERE schedule.id = NEW.schedule_item_id
        AND schedule.workspace_id = NEW.workspace_id
        AND schedule.invoice_id = NEW.invoice_id
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice payment workspace mismatch'
  );
END;

-- Once an invoice is issued, its commercial document is immutable.
CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_locked_content
BEFORE UPDATE OF
  job_id,
  primary_contact_id,
  quote_id,
  quote_version_id,
  quote_acceptance_id,
  source_kind,
  source_id,
  reference,
  currency,
  issue_date,
  due_date,
  subtotal_amount,
  discount_amount,
  tax_amount,
  total_amount,
  business_snapshot_json,
  client_snapshot_json,
  booking_snapshot_json,
  notes,
  terms
ON crm_invoices
WHEN OLD.status <> 'draft'
BEGIN
  SELECT RAISE(
    ABORT,
    'Issued invoice content is immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_item_locked_insert
BEFORE INSERT ON crm_invoice_items
WHEN EXISTS (
  SELECT 1
  FROM crm_invoices invoice
  WHERE invoice.id = NEW.invoice_id
    AND invoice.status <> 'draft'
)
BEGIN
  SELECT RAISE(
    ABORT,
    'Issued invoice items are immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_item_locked_update
BEFORE UPDATE ON crm_invoice_items
WHEN EXISTS (
  SELECT 1
  FROM crm_invoices invoice
  WHERE invoice.id = OLD.invoice_id
    AND invoice.status <> 'draft'
)
BEGIN
  SELECT RAISE(
    ABORT,
    'Issued invoice items are immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_item_locked_delete
BEFORE DELETE ON crm_invoice_items
WHEN EXISTS (
  SELECT 1
  FROM crm_invoices invoice
  WHERE invoice.id = OLD.invoice_id
    AND invoice.status <> 'draft'
)
BEGIN
  SELECT RAISE(
    ABORT,
    'Issued invoice items are immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_schedule_locked_insert
BEFORE INSERT ON crm_invoice_schedule_items
WHEN EXISTS (
  SELECT 1
  FROM crm_invoices invoice
  WHERE invoice.id = NEW.invoice_id
    AND invoice.status <> 'draft'
)
BEGIN
  SELECT RAISE(
    ABORT,
    'Issued invoice payment schedules are immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_schedule_locked_update
BEFORE UPDATE ON crm_invoice_schedule_items
WHEN EXISTS (
  SELECT 1
  FROM crm_invoices invoice
  WHERE invoice.id = OLD.invoice_id
    AND invoice.status <> 'draft'
)
BEGIN
  SELECT RAISE(
    ABORT,
    'Issued invoice payment schedules are immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_schedule_locked_delete
BEFORE DELETE ON crm_invoice_schedule_items
WHEN EXISTS (
  SELECT 1
  FROM crm_invoices invoice
  WHERE invoice.id = OLD.invoice_id
    AND invoice.status <> 'draft'
)
BEGIN
  SELECT RAISE(
    ABORT,
    'Issued invoice payment schedules are immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_payment_immutable_update
BEFORE UPDATE ON crm_invoice_payments
BEGIN
  SELECT RAISE(
    ABORT,
    'Invoice payments are immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_payment_immutable_delete
BEFORE DELETE ON crm_invoice_payments
BEGIN
  SELECT RAISE(
    ABORT,
    'Invoice payments are immutable'
  );
END;


-- v1.10.5a tenant relationship update hardening.
-- Workspace ownership is immutable after creation, and draft
-- commercial relationships must remain inside their owning tenant.

CREATE TRIGGER IF NOT EXISTS
trg_crm_booking_settings_workspace_immutable
BEFORE UPDATE OF workspace_id
ON crm_booking_settings
WHEN NEW.workspace_id <> OLD.workspace_id
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM booking settings workspace is immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_template_workspace_immutable
BEFORE UPDATE OF workspace_id
ON crm_contract_templates
WHEN NEW.workspace_id <> OLD.workspace_id
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM contract template workspace is immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_workspace_immutable
BEFORE UPDATE OF workspace_id
ON crm_contracts
WHEN NEW.workspace_id <> OLD.workspace_id
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM contract workspace is immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_acceptance_workspace_update
BEFORE UPDATE OF
  job_id,
  quote_acceptance_id
ON crm_contracts
WHEN
  NEW.quote_acceptance_id IS NOT NULL
  AND trim(NEW.quote_acceptance_id) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM crm_quote_acceptances acceptance
    JOIN crm_quotes quote
      ON quote.id = acceptance.quote_id
     AND quote.workspace_id = acceptance.workspace_id
    JOIN crm_jobs job
      ON job.id = NEW.job_id
     AND job.workspace_id = NEW.workspace_id
    WHERE acceptance.id = NEW.quote_acceptance_id
      AND acceptance.workspace_id = NEW.workspace_id
      AND job.quote_id = quote.id
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM contract acceptance workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_version_workspace_update
BEFORE UPDATE OF
  workspace_id,
  contract_id,
  previous_version_id
ON crm_contract_versions
WHEN
  NEW.workspace_id <> OLD.workspace_id
  OR NOT EXISTS (
    SELECT 1
    FROM crm_contracts contract
    WHERE contract.id = NEW.contract_id
      AND contract.workspace_id = NEW.workspace_id
  )
  OR
  (
    NEW.previous_version_id IS NOT NULL
    AND trim(NEW.previous_version_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contract_versions previous
      WHERE previous.id = NEW.previous_version_id
        AND previous.workspace_id = NEW.workspace_id
        AND previous.contract_id = NEW.contract_id
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM contract version workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_sequence_workspace_immutable
BEFORE UPDATE OF workspace_id
ON crm_invoice_sequences
WHEN NEW.workspace_id <> OLD.workspace_id
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice sequence workspace is immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_workspace_immutable
BEFORE UPDATE OF workspace_id
ON crm_invoices
WHEN NEW.workspace_id <> OLD.workspace_id
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice workspace is immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_job_quote_insert
BEFORE INSERT ON crm_invoices
WHEN
  NEW.quote_id IS NOT NULL
  AND trim(NEW.quote_id) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM crm_jobs job
    JOIN crm_quotes quote
      ON quote.id = NEW.quote_id
     AND quote.workspace_id = NEW.workspace_id
    WHERE job.id = NEW.job_id
      AND job.workspace_id = NEW.workspace_id
      AND job.quote_id = quote.id
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice Job quote mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_job_quote_update
BEFORE UPDATE OF
  job_id,
  quote_id
ON crm_invoices
WHEN
  NEW.quote_id IS NOT NULL
  AND trim(NEW.quote_id) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM crm_jobs job
    JOIN crm_quotes quote
      ON quote.id = NEW.quote_id
     AND quote.workspace_id = NEW.workspace_id
    WHERE job.id = NEW.job_id
      AND job.workspace_id = NEW.workspace_id
      AND job.quote_id = quote.id
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice Job quote mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_acceptance_workspace_update
BEFORE UPDATE OF
  job_id,
  quote_id,
  quote_acceptance_id
ON crm_invoices
WHEN
  NEW.quote_acceptance_id IS NOT NULL
  AND trim(NEW.quote_acceptance_id) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM crm_quote_acceptances acceptance
    JOIN crm_quotes quote
      ON quote.id = acceptance.quote_id
     AND quote.workspace_id = acceptance.workspace_id
    JOIN crm_jobs job
      ON job.id = NEW.job_id
     AND job.workspace_id = NEW.workspace_id
    WHERE acceptance.id = NEW.quote_acceptance_id
      AND acceptance.workspace_id = NEW.workspace_id
      AND (
        NEW.quote_id IS NULL
        OR trim(NEW.quote_id) = ''
        OR quote.id = NEW.quote_id
      )
      AND job.quote_id = quote.id
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice acceptance workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_acceptance_job_insert
BEFORE INSERT ON crm_invoices
WHEN
  NEW.quote_acceptance_id IS NOT NULL
  AND trim(NEW.quote_acceptance_id) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM crm_quote_acceptances acceptance
    JOIN crm_quotes quote
      ON quote.id = acceptance.quote_id
     AND quote.workspace_id = acceptance.workspace_id
    JOIN crm_jobs job
      ON job.id = NEW.job_id
     AND job.workspace_id = NEW.workspace_id
    WHERE acceptance.id = NEW.quote_acceptance_id
      AND acceptance.workspace_id = NEW.workspace_id
      AND (
        NEW.quote_id IS NULL
        OR trim(NEW.quote_id) = ''
        OR quote.id = NEW.quote_id
      )
      AND job.quote_id = quote.id
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice acceptance Job mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_item_workspace_update
BEFORE UPDATE OF
  workspace_id,
  invoice_id
ON crm_invoice_items
WHEN
  NEW.workspace_id <> OLD.workspace_id
  OR NOT EXISTS (
    SELECT 1
    FROM crm_invoices invoice
    WHERE invoice.id = NEW.invoice_id
      AND invoice.workspace_id = NEW.workspace_id
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice item workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_schedule_workspace_update
BEFORE UPDATE OF
  workspace_id,
  invoice_id
ON crm_invoice_schedule_items
WHEN
  NEW.workspace_id <> OLD.workspace_id
  OR NOT EXISTS (
    SELECT 1
    FROM crm_invoices invoice
    WHERE invoice.id = NEW.invoice_id
      AND invoice.workspace_id = NEW.workspace_id
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice schedule workspace mismatch'
  );
END;

INSERT INTO schema_meta (
  key,
  value
)
VALUES (
  'schema_version',
  '39'
)
ON CONFLICT(key)
DO UPDATE SET
  value = excluded.value;
