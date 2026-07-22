-- v0.9.0: Commercial workspace foundation.
-- This migration is intentionally additive. Existing MKB tables remain unchanged so the
-- current single-workspace application keeps working while future features become tenant-aware.

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  plan TEXT NOT NULL DEFAULT 'internal',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_settings (
  workspace_id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL DEFAULT '',
  website_url TEXT NOT NULL DEFAULT '',
  admin_hostname TEXT NOT NULL DEFAULT '',
  public_hostname TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  instagram TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  accent_color TEXT NOT NULL DEFAULT '',
  default_country TEXT NOT NULL DEFAULT 'GB',
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  currency TEXT NOT NULL DEFAULT 'GBP',
  document_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE IF NOT EXISTS workspace_domains (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  hostname TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL DEFAULT 'public' CHECK (purpose IN ('public', 'admin', 'gallery', 'api')),
  verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_workspace_domains_workspace ON workspace_domains(workspace_id, purpose);

CREATE TABLE IF NOT EXISTS workspace_memberships (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, user_email),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_workspace_memberships_email ON workspace_memberships(user_email, status);

INSERT OR IGNORE INTO workspaces (id, slug, name, status, plan)
VALUES ('workspace_mkb_weddings', 'mkb-weddings', 'MKB Weddings', 'active', 'internal');

INSERT OR IGNORE INTO workspace_settings (
  workspace_id, business_name, website_url, admin_hostname, public_hostname,
  default_country, timezone, currency
) VALUES (
  'workspace_mkb_weddings',
  'MKB Weddings',
  'https://www.mkbweddings.co.uk',
  'admin.mkbweddings.co.uk',
  'www.mkbweddings.co.uk',
  'GB',
  'Europe/London',
  'GBP'
);

INSERT OR IGNORE INTO workspace_domains (id, workspace_id, hostname, purpose, verified)
VALUES
  ('domain_mkb_public', 'workspace_mkb_weddings', 'www.mkbweddings.co.uk', 'public', 1),
  ('domain_mkb_admin', 'workspace_mkb_weddings', 'admin.mkbweddings.co.uk', 'admin', 1);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('default_workspace_id', 'workspace_mkb_weddings', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '7', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
