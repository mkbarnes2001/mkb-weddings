-- v1.8.1: Professional identity, invitation acceptance, sessions and server-owned tenant context.
-- Additive only. Existing MKB Admin access remains available until WEDPLANNED_AUTH_ENFORCED=true.

ALTER TABLE platform_users ADD COLUMN verified_at TEXT;
ALTER TABLE platform_users ADD COLUMN last_authenticated_at TEXT;
ALTER TABLE platform_users ADD COLUMN last_login_method TEXT NOT NULL DEFAULT '';

ALTER TABLE business_memberships ADD COLUMN invited_by_user_id TEXT;
ALTER TABLE business_memberships ADD COLUMN invitation_last_sent_at TEXT;

CREATE TABLE IF NOT EXISTS platform_auth_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  membership_id TEXT,
  email_normalized TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'invitation')),
  token_hash TEXT NOT NULL UNIQUE,
  return_path TEXT NOT NULL DEFAULT '/admin',
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  revoked_at TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'sent', 'manual', 'failed')),
  delivery_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES platform_users(id),
  FOREIGN KEY (membership_id) REFERENCES business_memberships(id)
);
CREATE INDEX IF NOT EXISTS idx_platform_auth_links_email
  ON platform_auth_links(email_normalized, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_auth_links_expiry
  ON platform_auth_links(expires_at, consumed_at, revoked_at);

CREATE TABLE IF NOT EXISTS platform_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  active_workspace_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES platform_users(id),
  FOREIGN KEY (active_workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_user
  ON platform_sessions(user_id, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_workspace
  ON platform_sessions(active_workspace_id, revoked_at, expires_at);

-- Carry any legacy workspace memberships into the neutral WedPlanned identity model.
INSERT OR IGNORE INTO platform_users (
  id, email_normalized, email, display_name, platform_role, status,
  verified_at, created_at, updated_at
)
SELECT
  'user_' || lower(hex(randomblob(16))),
  lower(trim(wm.user_email)),
  trim(wm.user_email),
  '',
  'member',
  CASE WHEN wm.status = 'disabled' THEN 'disabled' ELSE 'active' END,
  CASE WHEN wm.status = 'active' THEN CURRENT_TIMESTAMP ELSE NULL END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM workspace_memberships wm
WHERE trim(wm.user_email) <> '';

INSERT OR IGNORE INTO business_memberships (
  id, workspace_id, user_id, email_normalized, email, display_name,
  job_title, role, status, permissions_json, invited_at, accepted_at,
  created_at, updated_at
)
SELECT
  'membership_' || lower(hex(randomblob(16))),
  wm.workspace_id,
  pu.id,
  lower(trim(wm.user_email)),
  trim(wm.user_email),
  '',
  '',
  CASE wm.role
    WHEN 'owner' THEN 'owner'
    WHEN 'admin' THEN 'admin'
    WHEN 'editor' THEN 'content'
    WHEN 'viewer' THEN 'viewer'
    ELSE 'staff'
  END,
  CASE wm.status
    WHEN 'disabled' THEN 'disabled'
    WHEN 'invited' THEN 'invited'
    ELSE 'active'
  END,
  '{}',
  CASE WHEN wm.status = 'invited' THEN wm.created_at ELSE NULL END,
  CASE WHEN wm.status = 'active' THEN wm.created_at ELSE NULL END,
  wm.created_at,
  CURRENT_TIMESTAMP
FROM workspace_memberships wm
JOIN platform_users pu ON pu.email_normalized = lower(trim(wm.user_email));

-- If the existing MKB workspace has a contact email but no owner membership,
-- make that verified business contact the initial owner candidate.
INSERT OR IGNORE INTO platform_users (
  id, email_normalized, email, display_name, platform_role, status,
  created_at, updated_at
)
SELECT
  'user_' || lower(hex(randomblob(16))),
  lower(trim(ws.contact_email)),
  trim(ws.contact_email),
  ws.business_name,
  'member',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM workspace_settings ws
WHERE trim(ws.contact_email) <> '' AND instr(ws.contact_email, '@') > 1;

INSERT OR IGNORE INTO business_memberships (
  id, workspace_id, user_id, email_normalized, email, display_name,
  role, status, permissions_json, accepted_at, created_at, updated_at
)
SELECT
  'membership_' || lower(hex(randomblob(16))),
  ws.workspace_id,
  pu.id,
  lower(trim(ws.contact_email)),
  trim(ws.contact_email),
  ws.business_name,
  'owner',
  'active',
  '{}',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM workspace_settings ws
JOIN platform_users pu ON pu.email_normalized = lower(trim(ws.contact_email))
WHERE trim(ws.contact_email) <> ''
  AND instr(ws.contact_email, '@') > 1
  AND NOT EXISTS (
    SELECT 1 FROM business_memberships bm
    WHERE bm.workspace_id = ws.workspace_id AND bm.role = 'owner' AND bm.status = 'active'
  );

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '24', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
