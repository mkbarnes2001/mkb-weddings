-- v1.8.3: WedPlanned platform operations foundation.
-- Adds time-bounded support authority, support audit events, workspace export history,
-- and staged business deletion requests. No workspace data is deleted by this migration.

CREATE TABLE IF NOT EXISTS platform_support_grants (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'read' CHECK (scope IN ('read', 'manage')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  reason TEXT NOT NULL DEFAULT '',
  granted_by_user_id TEXT,
  granted_by_email TEXT NOT NULL DEFAULT '',
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  revoked_by_user_id TEXT,
  revoked_by_email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (granted_by_user_id) REFERENCES platform_users(id),
  FOREIGN KEY (revoked_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_platform_support_grants_workspace
  ON platform_support_grants(workspace_id, status, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_support_grants_active
  ON platform_support_grants(status, expires_at, workspace_id);

CREATE TABLE IF NOT EXISTS platform_support_events (
  id TEXT PRIMARY KEY,
  grant_id TEXT,
  workspace_id TEXT NOT NULL,
  support_user_id TEXT,
  support_email TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT '',
  path TEXT NOT NULL DEFAULT '',
  status_code INTEGER,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (grant_id) REFERENCES platform_support_grants(id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (support_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_platform_support_events_workspace
  ON platform_support_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_support_events_grant
  ON platform_support_events(grant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS workspace_export_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  requested_by_user_id TEXT,
  requested_by_email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  format TEXT NOT NULL DEFAULT 'json' CHECK (format IN ('json')),
  file_name TEXT NOT NULL DEFAULT '',
  table_count INTEGER NOT NULL DEFAULT 0,
  record_count INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (requested_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_workspace_export_events_workspace
  ON workspace_export_events(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS workspace_deletion_requests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  requested_by_user_id TEXT,
  requested_by_email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'executing', 'completed', 'cancelled', 'rejected')),
  reason TEXT NOT NULL DEFAULT '',
  confirmation_name TEXT NOT NULL DEFAULT '',
  scheduled_for TEXT NOT NULL,
  retention_json TEXT NOT NULL DEFAULT '{}',
  cancelled_at TEXT,
  cancelled_by_user_id TEXT,
  cancelled_by_email TEXT NOT NULL DEFAULT '',
  resolved_at TEXT,
  resolved_by_user_id TEXT,
  resolved_by_email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (requested_by_user_id) REFERENCES platform_users(id),
  FOREIGN KEY (cancelled_by_user_id) REFERENCES platform_users(id),
  FOREIGN KEY (resolved_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_workspace_deletion_requests_workspace
  ON workspace_deletion_requests(workspace_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_deletion_requests_open
  ON workspace_deletion_requests(workspace_id)
  WHERE status IN ('requested', 'approved', 'executing');

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '26', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
