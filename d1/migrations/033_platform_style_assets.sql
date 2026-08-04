-- v1.9.8a refinement: stable sidebar controls, richer module surfaces and
-- a platform-owned logo/icon library. Additive only.

ALTER TABLE platform_module_configurations
  ADD COLUMN page_background_color TEXT NOT NULL DEFAULT '#F5F3EF';

ALTER TABLE platform_module_configurations
  ADD COLUMN section_background_color TEXT NOT NULL DEFAULT '#FFFFFF';

CREATE TABLE IF NOT EXISTS platform_brand_assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL
    CHECK (asset_type IN ('logo', 'icon')),
  storage_key TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  uploaded_by_user_id TEXT,
  uploaded_by_email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by_user_id) REFERENCES platform_users(id)
);

CREATE INDEX IF NOT EXISTS idx_platform_brand_assets_status_type
  ON platform_brand_assets(status, asset_type, name);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '33', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
