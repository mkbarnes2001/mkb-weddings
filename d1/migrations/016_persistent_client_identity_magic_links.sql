-- v1.5.1 — Persistent Client Identity & Magic-Link Sign-In
-- Adds workspace-level verified client identities, secure one-time email links,
-- persistent sessions and device/visitor links used to sync favourites across devices.

CREATE TABLE IF NOT EXISTS client_identities (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  verified_at TEXT,
  last_authenticated_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, email_normalized),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_client_identities_workspace_email
  ON client_identities(workspace_id, email_normalized, status);

CREATE TABLE IF NOT EXISTS client_identity_gallery_visitors (
  gallery_id TEXT NOT NULL,
  visitor_key TEXT NOT NULL,
  identity_id TEXT NOT NULL,
  linked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (gallery_id, visitor_key),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id),
  FOREIGN KEY (identity_id) REFERENCES client_identities(id)
);
CREATE INDEX IF NOT EXISTS idx_client_identity_gallery_visitors_identity
  ON client_identity_gallery_visitors(identity_id, gallery_id, last_seen_at);

CREATE TABLE IF NOT EXISTS client_identity_magic_links (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL,
  gallery_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  visitor_key TEXT NOT NULL DEFAULT '',
  return_path TEXT NOT NULL DEFAULT '/',
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (identity_id) REFERENCES client_identities(id),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id)
);
CREATE INDEX IF NOT EXISTS idx_client_identity_magic_links_identity
  ON client_identity_magic_links(identity_id, gallery_id, created_at);
CREATE INDEX IF NOT EXISTS idx_client_identity_magic_links_expiry
  ON client_identity_magic_links(expires_at, consumed_at);

CREATE TABLE IF NOT EXISTS client_identity_sessions (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (identity_id) REFERENCES client_identities(id)
);
CREATE INDEX IF NOT EXISTS idx_client_identity_sessions_identity
  ON client_identity_sessions(identity_id, expires_at, revoked_at);
CREATE INDEX IF NOT EXISTS idx_client_identity_sessions_token
  ON client_identity_sessions(token_hash, expires_at, revoked_at);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '16', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
