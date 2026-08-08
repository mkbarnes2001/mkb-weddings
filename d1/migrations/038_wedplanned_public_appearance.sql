-- v1.10.3a: WedPlanned public website appearance and publication history.
-- Platform-owned only. No business workspace or tenant association.
-- Draft and published themes are deliberately separated so appearance changes
-- can be previewed safely before they alter the live WedPlanned website.

CREATE TABLE IF NOT EXISTS platform_public_site_appearance (
  id TEXT PRIMARY KEY
    CHECK (id = 'wedplanned'),
  draft_json TEXT NOT NULL DEFAULT '{}',
  published_json TEXT NOT NULL DEFAULT '{}',
  published_version INTEGER NOT NULL DEFAULT 0
    CHECK (published_version >= 0),
  updated_by_user_id TEXT,
  updated_by_email TEXT NOT NULL DEFAULT '',
  published_by_user_id TEXT,
  published_by_email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT,
  FOREIGN KEY (updated_by_user_id) REFERENCES platform_users(id),
  FOREIGN KEY (published_by_user_id) REFERENCES platform_users(id)
);

INSERT OR IGNORE INTO platform_public_site_appearance (
  id,
  draft_json,
  published_json,
  published_version
) VALUES (
  'wedplanned',
  '{}',
  '{}',
  0
);

CREATE TABLE IF NOT EXISTS platform_public_site_appearance_versions (
  id TEXT PRIMARY KEY,
  site_key TEXT NOT NULL DEFAULT 'wedplanned'
    CHECK (site_key = 'wedplanned'),
  version INTEGER NOT NULL
    CHECK (version > 0),
  theme_json TEXT NOT NULL,
  published_by_user_id TEXT,
  published_by_email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (site_key, version),
  FOREIGN KEY (published_by_user_id) REFERENCES platform_users(id)
);

CREATE INDEX IF NOT EXISTS idx_platform_public_site_appearance_versions
  ON platform_public_site_appearance_versions(
    site_key,
    version DESC
  );

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '38', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
