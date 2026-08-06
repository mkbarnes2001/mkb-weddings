-- v1.10.1a: exact platform and module branding assets.
-- Additive only. Existing mark_url remains the module icon/mark field.

ALTER TABLE platform_module_configurations
  ADD COLUMN wordmark_url TEXT NOT NULL DEFAULT '';

ALTER TABLE platform_module_configurations
  ADD COLUMN compact_wordmark_url TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS platform_branding_settings (
  id TEXT PRIMARY KEY
    CHECK (id = 'default'),
  platform_name TEXT NOT NULL DEFAULT 'WedPlanned',
  wordmark_url TEXT NOT NULL DEFAULT '',
  compact_wordmark_url TEXT NOT NULL DEFAULT '',
  icon_url TEXT NOT NULL DEFAULT '',
  updated_by_user_id TEXT,
  updated_by_email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by_user_id) REFERENCES platform_users(id)
);

INSERT OR IGNORE INTO platform_branding_settings (
  id,
  platform_name,
  wordmark_url,
  compact_wordmark_url,
  icon_url
) VALUES (
  'default',
  'WedPlanned',
  '',
  '',
  ''
);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '35', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
