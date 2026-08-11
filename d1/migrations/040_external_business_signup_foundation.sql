-- v1.10.7a: External business onboarding and signup foundation.
-- Stages a short-lived public signup request before any workspace,
-- professional account or owner membership is provisioned.
--
-- Security boundary:
-- - verification tokens are stored as SHA-256 hashes only;
-- - request fingerprints are hashed before storage;
-- - raw verification tokens and raw IP addresses are never persisted;
-- - a workspace is linked only after verified provisioning succeeds.

CREATE TABLE IF NOT EXISTS platform_signup_requests (
  id TEXT PRIMARY KEY,

  email_normalized TEXT NOT NULL,
  email TEXT NOT NULL,

  owner_display_name TEXT NOT NULL DEFAULT '',
  business_name TEXT NOT NULL,
  requested_slug TEXT NOT NULL DEFAULT '',

  token_hash TEXT NOT NULL UNIQUE,
  request_fingerprint TEXT NOT NULL DEFAULT '',

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'verified',
        'provisioned',
        'failed'
      )
    ),

  delivery_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      delivery_status IN (
        'pending',
        'sent',
        'failed'
      )
    ),

  delivery_error TEXT NOT NULL DEFAULT '',
  failure_reason TEXT NOT NULL DEFAULT '',

  expires_at TEXT NOT NULL,

  consumed_at TEXT,
  verified_at TEXT,
  provisioned_at TEXT,

  workspace_id TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS
idx_platform_signup_requests_email_recent
ON platform_signup_requests(
  email_normalized,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS
idx_platform_signup_requests_fingerprint_recent
ON platform_signup_requests(
  request_fingerprint,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS
idx_platform_signup_requests_status_expiry
ON platform_signup_requests(
  status,
  expires_at
);

CREATE INDEX IF NOT EXISTS
idx_platform_signup_requests_workspace
ON platform_signup_requests(
  workspace_id
)
WHERE workspace_id IS NOT NULL;

INSERT INTO schema_meta (
  key,
  value
)
VALUES (
  'schema_version',
  '40'
)
ON CONFLICT(key)
DO UPDATE SET
  value = excluded.value;
