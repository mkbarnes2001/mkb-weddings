-- Photography Intelligence v0.7.6.0
-- Generic custom gallery collections foundation.
-- Run once against the production D1 database before deploying the application update.

CREATE TABLE IF NOT EXISTS custom_collections (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  show_on_landing INTEGER NOT NULL DEFAULT 0 CHECK (show_on_landing IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  hero_asset_key TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_custom_collections_public
  ON custom_collections(status, show_on_landing, sort_order);

CREATE TABLE IF NOT EXISTS collection_images (
  collection_id TEXT NOT NULL,
  asset_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
  PRIMARY KEY (collection_id, asset_key)
);

CREATE INDEX IF NOT EXISTS idx_collection_images_order
  ON collection_images(collection_id, hidden, sort_order);

CREATE INDEX IF NOT EXISTS idx_collection_images_asset
  ON collection_images(asset_key);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '4', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
