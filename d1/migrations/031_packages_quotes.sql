-- v1.9.3a: Configurable packages, quotes and client portal acceptance.
-- Adds workspace-owned package/add-on catalogues, immutable quote versions,
-- secure pre-booking portal access and audited quote-to-Job conversion.

CREATE TABLE IF NOT EXISTS crm_packages (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'wedding',
  internal_code TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  price_amount INTEGER NOT NULL DEFAULT 0 CHECK (price_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  coverage_minutes INTEGER CHECK (coverage_minutes IS NULL OR coverage_minutes >= 0),
  deliverables_json TEXT NOT NULL DEFAULT '[]',
  included_items_json TEXT NOT NULL DEFAULT '[]',
  client_notes TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  recommended INTEGER NOT NULL DEFAULT 0 CHECK (recommended IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'archived')),
  image_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_packages_workspace
  ON crm_packages(workspace_id, status, service_type, display_order, name COLLATE NOCASE);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_packages_workspace_code
  ON crm_packages(workspace_id, internal_code)
  WHERE trim(internal_code) <> '';

CREATE TABLE IF NOT EXISTS crm_addons (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_amount INTEGER NOT NULL DEFAULT 0 CHECK (price_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  service_type TEXT NOT NULL DEFAULT 'wedding',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'archived')),
  display_order INTEGER NOT NULL DEFAULT 0,
  availability_scope TEXT NOT NULL DEFAULT 'all' CHECK (availability_scope IN ('all', 'selected')),
  minimum_quantity INTEGER NOT NULL DEFAULT 0 CHECK (minimum_quantity >= 0),
  maximum_quantity INTEGER NOT NULL DEFAULT 1 CHECK (maximum_quantity >= minimum_quantity),
  requirement TEXT NOT NULL DEFAULT 'optional' CHECK (requirement IN ('optional', 'recommended', 'mandatory')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_addons_workspace
  ON crm_addons(workspace_id, status, service_type, display_order, name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS crm_package_addons (
  workspace_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  addon_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (package_id, addon_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (package_id) REFERENCES crm_packages(id) ON DELETE CASCADE,
  FOREIGN KEY (addon_id) REFERENCES crm_addons(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_crm_package_addons_workspace
  ON crm_package_addons(workspace_id, addon_id, package_id);

CREATE TABLE IF NOT EXISTS crm_quotes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  enquiry_id TEXT NOT NULL,
  primary_contact_id TEXT NOT NULL,
  reference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'superseded')),
  current_version_id TEXT,
  accepted_version_id TEXT,
  accepted_job_id TEXT,
  currency TEXT NOT NULL DEFAULT 'GBP',
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, reference),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id),
  FOREIGN KEY (primary_contact_id) REFERENCES crm_contacts(id),
  FOREIGN KEY (created_by_user_id) REFERENCES platform_users(id),
  FOREIGN KEY (accepted_job_id) REFERENCES crm_jobs(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_quotes_workspace_status
  ON crm_quotes(workspace_id, status, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_quotes_enquiry_unique
  ON crm_quotes(workspace_id, enquiry_id);
CREATE INDEX IF NOT EXISTS idx_crm_quotes_enquiry
  ON crm_quotes(workspace_id, enquiry_id, created_at DESC);

CREATE TABLE IF NOT EXISTS crm_quote_versions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  quote_id TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1 CHECK (version_number > 0),
  previous_version_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'superseded')),
  client_notes TEXT NOT NULL DEFAULT '',
  internal_notes TEXT NOT NULL DEFAULT '',
  expires_at TEXT,
  discount_type TEXT NOT NULL DEFAULT 'none' CHECK (discount_type IN ('none', 'fixed', 'percentage')),
  discount_value INTEGER NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  tax_treatment TEXT NOT NULL DEFAULT 'none' CHECK (tax_treatment IN ('none', 'inclusive', 'exclusive')),
  tax_rate_basis_points INTEGER NOT NULL DEFAULT 0 CHECK (tax_rate_basis_points >= 0),
  subtotal_amount INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  discount_amount INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount INTEGER NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount INTEGER NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  sent_at TEXT,
  viewed_at TEXT,
  accepted_at TEXT,
  declined_at TEXT,
  provider TEXT NOT NULL DEFAULT '',
  provider_message_id TEXT NOT NULL DEFAULT '',
  failure_reason TEXT NOT NULL DEFAULT '',
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (quote_id, version_number),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (quote_id) REFERENCES crm_quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (previous_version_id) REFERENCES crm_quote_versions(id),
  FOREIGN KEY (created_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_quote_versions_quote
  ON crm_quote_versions(workspace_id, quote_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_crm_quote_versions_status
  ON crm_quote_versions(workspace_id, status, expires_at, updated_at DESC);

CREATE TABLE IF NOT EXISTS crm_quote_options (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  package_id TEXT,
  option_type TEXT NOT NULL DEFAULT 'catalogue' CHECK (option_type IN ('catalogue', 'bespoke')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  service_type TEXT NOT NULL DEFAULT 'wedding',
  internal_code TEXT NOT NULL DEFAULT '',
  base_price_amount INTEGER NOT NULL DEFAULT 0 CHECK (base_price_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  coverage_minutes INTEGER CHECK (coverage_minutes IS NULL OR coverage_minutes >= 0),
  deliverables_json TEXT NOT NULL DEFAULT '[]',
  included_items_json TEXT NOT NULL DEFAULT '[]',
  client_notes TEXT NOT NULL DEFAULT '',
  recommended INTEGER NOT NULL DEFAULT 0 CHECK (recommended IN (0, 1)),
  display_order INTEGER NOT NULL DEFAULT 0,
  package_snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (version_id) REFERENCES crm_quote_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES crm_packages(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_quote_options_version
  ON crm_quote_options(workspace_id, version_id, display_order, name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS crm_quote_option_items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'custom' CHECK (item_type IN ('included', 'custom')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_amount INTEGER NOT NULL DEFAULT 0 CHECK (unit_price_amount >= 0),
  display_order INTEGER NOT NULL DEFAULT 0,
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (version_id) REFERENCES crm_quote_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES crm_quote_options(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_crm_quote_option_items_option
  ON crm_quote_option_items(workspace_id, option_id, display_order);

CREATE TABLE IF NOT EXISTS crm_quote_option_addons (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  addon_id TEXT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  unit_price_amount INTEGER NOT NULL DEFAULT 0 CHECK (unit_price_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  minimum_quantity INTEGER NOT NULL DEFAULT 0 CHECK (minimum_quantity >= 0),
  maximum_quantity INTEGER NOT NULL DEFAULT 1 CHECK (maximum_quantity >= minimum_quantity),
  default_quantity INTEGER NOT NULL DEFAULT 0 CHECK (default_quantity >= 0 AND default_quantity <= maximum_quantity),
  requirement TEXT NOT NULL DEFAULT 'optional' CHECK (requirement IN ('optional', 'recommended', 'mandatory')),
  display_order INTEGER NOT NULL DEFAULT 0,
  addon_snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (version_id) REFERENCES crm_quote_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES crm_quote_options(id) ON DELETE CASCADE,
  FOREIGN KEY (addon_id) REFERENCES crm_addons(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_quote_option_addons_option
  ON crm_quote_option_addons(workspace_id, option_id, display_order, name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS crm_quote_client_access (
  quote_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  identity_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  invited_at TEXT,
  last_viewed_at TEXT,
  accepted_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (quote_id, identity_id),
  FOREIGN KEY (quote_id) REFERENCES crm_quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id),
  FOREIGN KEY (identity_id) REFERENCES client_identities(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_quote_client_access_identity
  ON crm_quote_client_access(workspace_id, identity_id, status, quote_id);

CREATE TABLE IF NOT EXISTS crm_quote_invitations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  quote_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  identity_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  return_path TEXT NOT NULL DEFAULT '/client-portal',
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (quote_id) REFERENCES crm_quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES crm_quote_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id),
  FOREIGN KEY (identity_id) REFERENCES client_identities(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_quote_invitations_identity
  ON crm_quote_invitations(workspace_id, identity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_quote_invitations_expiry
  ON crm_quote_invitations(expires_at, consumed_at);

CREATE TABLE IF NOT EXISTS crm_quote_acceptances (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  quote_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  identity_id TEXT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('client', 'admin')),
  actor_user_id TEXT,
  actor_email TEXT NOT NULL DEFAULT '',
  accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  client_ip_hash TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  subtotal_amount INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  selected_package_snapshot_json TEXT NOT NULL DEFAULT '{}',
  selected_addons_snapshot_json TEXT NOT NULL DEFAULT '[]',
  audit_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (quote_id),
  UNIQUE (version_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (quote_id) REFERENCES crm_quotes(id),
  FOREIGN KEY (version_id) REFERENCES crm_quote_versions(id),
  FOREIGN KEY (option_id) REFERENCES crm_quote_options(id),
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id),
  FOREIGN KEY (identity_id) REFERENCES client_identities(id),
  FOREIGN KEY (actor_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_quote_acceptances_workspace
  ON crm_quote_acceptances(workspace_id, accepted_at DESC);

CREATE TABLE IF NOT EXISTS crm_quote_acceptance_addons (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  acceptance_id TEXT NOT NULL,
  quote_option_addon_id TEXT NOT NULL,
  addon_id TEXT,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_amount INTEGER NOT NULL DEFAULT 0,
  line_total_amount INTEGER NOT NULL DEFAULT 0,
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (acceptance_id) REFERENCES crm_quote_acceptances(id) ON DELETE CASCADE,
  FOREIGN KEY (quote_option_addon_id) REFERENCES crm_quote_option_addons(id),
  FOREIGN KEY (addon_id) REFERENCES crm_addons(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_quote_acceptance_addons
  ON crm_quote_acceptance_addons(workspace_id, acceptance_id);

ALTER TABLE crm_jobs ADD COLUMN quote_id TEXT;
ALTER TABLE crm_jobs ADD COLUMN quote_version_id TEXT;
ALTER TABLE crm_jobs ADD COLUMN quote_reference TEXT NOT NULL DEFAULT '';
ALTER TABLE crm_jobs ADD COLUMN quote_version_number INTEGER;
ALTER TABLE crm_jobs ADD COLUMN accepted_quote_at TEXT;
ALTER TABLE crm_jobs ADD COLUMN booking_subtotal INTEGER;
ALTER TABLE crm_jobs ADD COLUMN booking_discount INTEGER;
ALTER TABLE crm_jobs ADD COLUMN booking_tax INTEGER;
ALTER TABLE crm_jobs ADD COLUMN package_snapshot_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE crm_jobs ADD COLUMN addons_snapshot_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE crm_jobs ADD COLUMN quote_snapshot_json TEXT NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_jobs_quote
  ON crm_jobs(workspace_id, quote_id)
  WHERE quote_id IS NOT NULL AND trim(quote_id) <> '';

ALTER TABLE crm_communications ADD COLUMN quote_id TEXT;
ALTER TABLE crm_communications ADD COLUMN quote_version_id TEXT;
ALTER TABLE crm_communications ADD COLUMN failure_reason TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_crm_communications_quote
  ON crm_communications(workspace_id, quote_id, occurred_at DESC);

-- Workspace relationship guards.
CREATE TRIGGER IF NOT EXISTS trg_crm_package_addon_workspace_insert
BEFORE INSERT ON crm_package_addons
WHEN NOT EXISTS (SELECT 1 FROM crm_packages p WHERE p.id = NEW.package_id AND p.workspace_id = NEW.workspace_id)
  OR NOT EXISTS (SELECT 1 FROM crm_addons a WHERE a.id = NEW.addon_id AND a.workspace_id = NEW.workspace_id)
BEGIN SELECT RAISE(ABORT, 'CRM package add-on workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_workspace_insert
BEFORE INSERT ON crm_quotes
WHEN NOT EXISTS (SELECT 1 FROM crm_enquiries e WHERE e.id = NEW.enquiry_id AND e.workspace_id = NEW.workspace_id)
  OR NOT EXISTS (SELECT 1 FROM crm_contacts c WHERE c.id = NEW.primary_contact_id AND c.workspace_id = NEW.workspace_id)
BEGIN SELECT RAISE(ABORT, 'CRM quote workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_workspace_update
BEFORE UPDATE OF workspace_id, enquiry_id, primary_contact_id, current_version_id, accepted_version_id, accepted_job_id ON crm_quotes
WHEN NOT EXISTS (SELECT 1 FROM crm_enquiries e WHERE e.id = NEW.enquiry_id AND e.workspace_id = NEW.workspace_id)
  OR NOT EXISTS (SELECT 1 FROM crm_contacts c WHERE c.id = NEW.primary_contact_id AND c.workspace_id = NEW.workspace_id)
  OR (NEW.current_version_id IS NOT NULL AND trim(NEW.current_version_id) <> '' AND NOT EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = NEW.current_version_id AND v.workspace_id = NEW.workspace_id AND v.quote_id = NEW.id))
  OR (NEW.accepted_version_id IS NOT NULL AND trim(NEW.accepted_version_id) <> '' AND NOT EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = NEW.accepted_version_id AND v.workspace_id = NEW.workspace_id AND v.quote_id = NEW.id))
  OR (NEW.accepted_job_id IS NOT NULL AND trim(NEW.accepted_job_id) <> '' AND NOT EXISTS (SELECT 1 FROM crm_jobs j WHERE j.id = NEW.accepted_job_id AND j.workspace_id = NEW.workspace_id AND (j.quote_id = NEW.id OR j.enquiry_id = NEW.enquiry_id)))
BEGIN SELECT RAISE(ABORT, 'CRM quote workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_version_workspace_insert
BEFORE INSERT ON crm_quote_versions
WHEN NOT EXISTS (SELECT 1 FROM crm_quotes q WHERE q.id = NEW.quote_id AND q.workspace_id = NEW.workspace_id)
  OR (NEW.previous_version_id IS NOT NULL AND trim(NEW.previous_version_id) <> '' AND NOT EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = NEW.previous_version_id AND v.workspace_id = NEW.workspace_id AND v.quote_id = NEW.quote_id))
BEGIN SELECT RAISE(ABORT, 'CRM quote version workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_option_workspace_insert
BEFORE INSERT ON crm_quote_options
WHEN NOT EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = NEW.version_id AND v.workspace_id = NEW.workspace_id)
  OR (NEW.package_id IS NOT NULL AND trim(NEW.package_id) <> '' AND NOT EXISTS (SELECT 1 FROM crm_packages p WHERE p.id = NEW.package_id AND p.workspace_id = NEW.workspace_id))
BEGIN SELECT RAISE(ABORT, 'CRM quote option workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_option_item_workspace_insert
BEFORE INSERT ON crm_quote_option_items
WHEN NOT EXISTS (SELECT 1 FROM crm_quote_options o WHERE o.id = NEW.option_id AND o.workspace_id = NEW.workspace_id AND o.version_id = NEW.version_id)
BEGIN SELECT RAISE(ABORT, 'CRM quote option item workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_option_addon_workspace_insert
BEFORE INSERT ON crm_quote_option_addons
WHEN NOT EXISTS (SELECT 1 FROM crm_quote_options o WHERE o.id = NEW.option_id AND o.workspace_id = NEW.workspace_id AND o.version_id = NEW.version_id)
  OR (NEW.addon_id IS NOT NULL AND trim(NEW.addon_id) <> '' AND NOT EXISTS (SELECT 1 FROM crm_addons a WHERE a.id = NEW.addon_id AND a.workspace_id = NEW.workspace_id))
BEGIN SELECT RAISE(ABORT, 'CRM quote option add-on workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_access_workspace_insert
BEFORE INSERT ON crm_quote_client_access
WHEN NOT EXISTS (SELECT 1 FROM crm_quotes q WHERE q.id = NEW.quote_id AND q.workspace_id = NEW.workspace_id AND q.primary_contact_id = NEW.contact_id)
  OR NOT EXISTS (SELECT 1 FROM client_identities i WHERE i.id = NEW.identity_id AND i.workspace_id = NEW.workspace_id)
BEGIN SELECT RAISE(ABORT, 'CRM quote client access workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_invitation_workspace_insert
BEFORE INSERT ON crm_quote_invitations
WHEN NOT EXISTS (SELECT 1 FROM crm_quotes q WHERE q.id = NEW.quote_id AND q.workspace_id = NEW.workspace_id AND q.primary_contact_id = NEW.contact_id AND q.current_version_id = NEW.version_id)
  OR NOT EXISTS (SELECT 1 FROM crm_quote_client_access a WHERE a.quote_id = NEW.quote_id AND a.workspace_id = NEW.workspace_id AND a.identity_id = NEW.identity_id AND a.status = 'active')
BEGIN SELECT RAISE(ABORT, 'CRM quote invitation workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_acceptance_workspace_insert
BEFORE INSERT ON crm_quote_acceptances
WHEN NOT EXISTS (SELECT 1 FROM crm_quotes q WHERE q.id = NEW.quote_id AND q.workspace_id = NEW.workspace_id AND q.primary_contact_id = NEW.contact_id AND q.current_version_id = NEW.version_id)
  OR NOT EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = NEW.version_id AND v.workspace_id = NEW.workspace_id AND v.quote_id = NEW.quote_id)
  OR NOT EXISTS (SELECT 1 FROM crm_quote_options o WHERE o.id = NEW.option_id AND o.workspace_id = NEW.workspace_id AND o.version_id = NEW.version_id)
  OR (NEW.identity_id IS NOT NULL AND trim(NEW.identity_id) <> '' AND NOT EXISTS (SELECT 1 FROM client_identities i WHERE i.id = NEW.identity_id AND i.workspace_id = NEW.workspace_id))
BEGIN SELECT RAISE(ABORT, 'CRM quote acceptance workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_acceptance_addon_workspace_insert
BEFORE INSERT ON crm_quote_acceptance_addons
WHEN NOT EXISTS (
  SELECT 1 FROM crm_quote_acceptances a
  JOIN crm_quote_option_addons o ON o.id = NEW.quote_option_addon_id
    AND o.workspace_id = a.workspace_id AND o.version_id = a.version_id AND o.option_id = a.option_id
  WHERE a.id = NEW.acceptance_id AND a.workspace_id = NEW.workspace_id
)
BEGIN SELECT RAISE(ABORT, 'CRM quote acceptance add-on workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_acceptance_addon_late_insert
BEFORE INSERT ON crm_quote_acceptance_addons
WHEN NOT EXISTS (SELECT 1 FROM crm_quote_acceptance_addons existing WHERE existing.id = NEW.id)
  AND EXISTS (
    SELECT 1 FROM crm_quote_acceptances a
    JOIN crm_quote_versions v ON v.id = a.version_id AND v.workspace_id = a.workspace_id
    WHERE a.id = NEW.acceptance_id AND a.workspace_id = NEW.workspace_id AND v.status = 'accepted'
  )
BEGIN SELECT RAISE(ABORT, 'Quote acceptance add-ons are immutable'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_acceptance_immutable_update
BEFORE UPDATE ON crm_quote_acceptances
BEGIN SELECT RAISE(ABORT, 'Quote acceptances are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_acceptance_immutable_delete
BEFORE DELETE ON crm_quote_acceptances
BEGIN SELECT RAISE(ABORT, 'Quote acceptances are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_acceptance_addon_immutable_update
BEFORE UPDATE ON crm_quote_acceptance_addons
BEGIN SELECT RAISE(ABORT, 'Quote acceptance add-ons are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_acceptance_addon_immutable_delete
BEFORE DELETE ON crm_quote_acceptance_addons
BEGIN SELECT RAISE(ABORT, 'Quote acceptance add-ons are immutable'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_quote_workspace_insert
BEFORE INSERT ON crm_jobs
WHEN NEW.quote_id IS NOT NULL AND trim(NEW.quote_id) <> '' AND NOT EXISTS (
  SELECT 1 FROM crm_quotes q WHERE q.id = NEW.quote_id AND q.workspace_id = NEW.workspace_id AND q.current_version_id = NEW.quote_version_id
)
BEGIN SELECT RAISE(ABORT, 'CRM Job quote workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_quote_workspace_update
BEFORE UPDATE OF workspace_id, quote_id, quote_version_id ON crm_jobs
WHEN NEW.quote_id IS NOT NULL AND trim(NEW.quote_id) <> '' AND NOT EXISTS (
  SELECT 1 FROM crm_quotes q WHERE q.id = NEW.quote_id AND q.workspace_id = NEW.workspace_id AND (q.current_version_id = NEW.quote_version_id OR q.accepted_version_id = NEW.quote_version_id)
)
BEGIN SELECT RAISE(ABORT, 'CRM Job quote workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_communication_quote_workspace_insert
BEFORE INSERT ON crm_communications
WHEN NEW.quote_id IS NOT NULL AND trim(NEW.quote_id) <> '' AND NOT EXISTS (
  SELECT 1 FROM crm_quotes q WHERE q.id = NEW.quote_id AND q.workspace_id = NEW.workspace_id
    AND (NEW.quote_version_id IS NULL OR trim(NEW.quote_version_id) = '' OR EXISTS (
      SELECT 1 FROM crm_quote_versions v WHERE v.id = NEW.quote_version_id AND v.quote_id = q.id AND v.workspace_id = q.workspace_id
    ))
)
BEGIN SELECT RAISE(ABORT, 'CRM communication quote workspace mismatch'); END;

-- Sent and accepted quote versions are immutable except for controlled lifecycle timestamps/status.
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_version_locked_delete
BEFORE DELETE ON crm_quote_versions
WHEN OLD.status <> 'draft'
BEGIN SELECT RAISE(ABORT, 'Sent quote versions cannot be deleted'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_version_status_transition
BEFORE UPDATE OF status ON crm_quote_versions
WHEN NOT (
  NEW.status = OLD.status
  OR (OLD.status = 'draft' AND NEW.status = 'sent')
  OR (OLD.status IN ('sent', 'viewed') AND NEW.status IN ('viewed', 'accepted', 'declined', 'expired', 'superseded'))
  OR (OLD.status IN ('declined', 'expired') AND NEW.status = 'superseded')
)
BEGIN SELECT RAISE(ABORT, 'Invalid quote version status transition'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_version_accepted_immutable
BEFORE UPDATE ON crm_quote_versions
WHEN OLD.status = 'accepted'
BEGIN SELECT RAISE(ABORT, 'Accepted quote versions are immutable'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_accepted_immutable
BEFORE UPDATE ON crm_quotes
WHEN OLD.status = 'accepted'
BEGIN SELECT RAISE(ABORT, 'Accepted quotes are immutable'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_version_locked_content
BEFORE UPDATE OF client_notes, internal_notes, expires_at, discount_type, discount_value,
  tax_treatment, tax_rate_basis_points, currency, snapshot_json ON crm_quote_versions
WHEN OLD.status <> 'draft'
BEGIN SELECT RAISE(ABORT, 'Sent quote versions are immutable'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_version_locked_totals
BEFORE UPDATE OF subtotal_amount, discount_amount, tax_amount, total_amount ON crm_quote_versions
WHEN OLD.status <> 'draft' AND NOT (OLD.status IN ('sent', 'viewed') AND NEW.status = 'accepted')
BEGIN SELECT RAISE(ABORT, 'Sent quote totals are immutable'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_option_locked_update
BEFORE UPDATE ON crm_quote_options
WHEN EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = OLD.version_id AND v.status <> 'draft')
BEGIN SELECT RAISE(ABORT, 'Sent quote options are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_option_locked_delete
BEFORE DELETE ON crm_quote_options
WHEN EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = OLD.version_id AND v.status <> 'draft')
BEGIN SELECT RAISE(ABORT, 'Sent quote options are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_item_locked_update
BEFORE UPDATE ON crm_quote_option_items
WHEN EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = OLD.version_id AND v.status <> 'draft')
BEGIN SELECT RAISE(ABORT, 'Sent quote line items are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_item_locked_delete
BEFORE DELETE ON crm_quote_option_items
WHEN EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = OLD.version_id AND v.status <> 'draft')
BEGIN SELECT RAISE(ABORT, 'Sent quote line items are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_addon_locked_update
BEFORE UPDATE ON crm_quote_option_addons
WHEN EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = OLD.version_id AND v.status <> 'draft')
BEGIN SELECT RAISE(ABORT, 'Sent quote add-ons are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_addon_locked_delete
BEFORE DELETE ON crm_quote_option_addons
WHEN EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = OLD.version_id AND v.status <> 'draft')
BEGIN SELECT RAISE(ABORT, 'Sent quote add-ons are immutable'); END;


CREATE TRIGGER IF NOT EXISTS trg_crm_quote_option_locked_insert
BEFORE INSERT ON crm_quote_options
WHEN EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = NEW.version_id AND v.status <> 'draft')
BEGIN SELECT RAISE(ABORT, 'Sent quote options are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_item_locked_insert
BEFORE INSERT ON crm_quote_option_items
WHEN EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = NEW.version_id AND v.status <> 'draft')
BEGIN SELECT RAISE(ABORT, 'Sent quote line items are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_addon_locked_insert
BEFORE INSERT ON crm_quote_option_addons
WHEN EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = NEW.version_id AND v.status <> 'draft')
BEGIN SELECT RAISE(ABORT, 'Sent quote add-ons are immutable'); END;

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '31', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
