-- v1.0.0 — Workspace Asset Library Foundation
-- Additive canonical asset registry. Existing images/gallery tables remain authoritative
-- during the compatibility phase; no R2 objects are copied or renamed.

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  legacy_asset_key TEXT NOT NULL DEFAULT '',
  image_id TEXT NOT NULL DEFAULT '',
  original_filename TEXT NOT NULL DEFAULT '',
  filename TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT '',
  width INTEGER,
  height INTEGER,
  checksum TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT '',
  source_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_legacy_key
  ON assets(workspace_id, legacy_asset_key)
  WHERE legacy_asset_key <> '';
CREATE INDEX IF NOT EXISTS idx_assets_workspace
  ON assets(workspace_id, status, updated_at, filename);
CREATE INDEX IF NOT EXISTS idx_assets_image_id
  ON assets(workspace_id, image_id);

CREATE TABLE IF NOT EXISTS asset_files (
  asset_id TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('original', 'web', 'thumb', 'preview', 'watermarked')),
  storage_key TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT '',
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  access_level TEXT NOT NULL DEFAULT 'public' CHECK (access_level IN ('private', 'controlled', 'public')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'processing', 'failed', 'deleted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (asset_id, variant),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_asset_files_access
  ON asset_files(variant, access_level, status);

CREATE TABLE IF NOT EXISTS asset_wedding_links (
  asset_id TEXT NOT NULL,
  wedding_slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  PRIMARY KEY (asset_id, wedding_slug),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (wedding_slug) REFERENCES weddings(slug)
);
CREATE INDEX IF NOT EXISTS idx_asset_wedding_links_wedding
  ON asset_wedding_links(wedding_slug, sort_order, asset_id);

CREATE TABLE IF NOT EXISTS asset_venue_links (
  asset_id TEXT NOT NULL,
  venue_slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  PRIMARY KEY (asset_id, venue_slug),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (venue_slug) REFERENCES venues(slug)
);
CREATE INDEX IF NOT EXISTS idx_asset_venue_links_venue
  ON asset_venue_links(venue_slug, sort_order, asset_id);

CREATE TABLE IF NOT EXISTS asset_moment_links (
  asset_id TEXT NOT NULL,
  moment_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'legacy',
  PRIMARY KEY (asset_id, moment_id),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (moment_id) REFERENCES moments(id)
);
CREATE INDEX IF NOT EXISTS idx_asset_moment_links_moment
  ON asset_moment_links(moment_id, sort_order, asset_id);

CREATE TABLE IF NOT EXISTS asset_gallery_links (
  asset_id TEXT NOT NULL,
  gallery_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
  source TEXT NOT NULL DEFAULT 'legacy',
  PRIMARY KEY (asset_id, gallery_id),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (gallery_id) REFERENCES custom_collections(id)
);
CREATE INDEX IF NOT EXISTS idx_asset_gallery_links_gallery
  ON asset_gallery_links(gallery_id, hidden, sort_order, asset_id);

-- Register every existing public image without copying or renaming any R2 object.
INSERT OR IGNORE INTO assets (
  id, workspace_id, legacy_asset_key, image_id, original_filename, filename,
  mime_type, width, height, checksum, source_type, source_json, status,
  created_at, updated_at
)
SELECT
  'asset:' || i.asset_key,
  COALESCE((SELECT value FROM schema_meta WHERE key = 'default_workspace_id'), 'workspace_mkb_weddings'),
  i.asset_key,
  i.image_id,
  i.filename,
  i.filename,
  '',
  i.width,
  i.height,
  '',
  i.source_type,
  i.source_json,
  'active',
  CURRENT_TIMESTAMP,
  i.updated_at
FROM images i;

-- Existing "full" files are processed public/web derivatives, not private originals.
INSERT OR IGNORE INTO asset_files (
  asset_id, variant, storage_key, url, mime_type, width, height,
  access_level, status, created_at, updated_at
)
SELECT
  'asset:' || i.asset_key,
  'web',
  '',
  i.full_src,
  '',
  i.width,
  i.height,
  'public',
  'active',
  CURRENT_TIMESTAMP,
  i.updated_at
FROM images i
WHERE TRIM(i.full_src) <> '';

INSERT OR IGNORE INTO asset_files (
  asset_id, variant, storage_key, url, mime_type, width, height,
  access_level, status, created_at, updated_at
)
SELECT
  'asset:' || i.asset_key,
  'thumb',
  '',
  i.thumb_src,
  '',
  NULL,
  NULL,
  'public',
  'active',
  CURRENT_TIMESTAMP,
  i.updated_at
FROM images i
WHERE TRIM(i.thumb_src) <> '';

-- Snapshot current relationships. Existing gallery managers remain authoritative until
-- the controlled cutover to unified memberships.
INSERT OR IGNORE INTO asset_wedding_links (asset_id, wedding_slug, sort_order, is_primary)
SELECT 'asset:' || wi.asset_key, wi.wedding_slug, wi.sort_order, 1
FROM wedding_images wi
JOIN images i ON i.asset_key = wi.asset_key
JOIN weddings w ON w.slug = wi.wedding_slug;

INSERT OR IGNORE INTO asset_venue_links (asset_id, venue_slug, sort_order, is_primary)
SELECT 'asset:' || vi.asset_key, vi.venue_slug, vi.sort_order, 1
FROM venue_images vi
JOIN images i ON i.asset_key = vi.asset_key
JOIN venues v ON v.slug = vi.venue_slug;

INSERT OR IGNORE INTO asset_gallery_links (asset_id, gallery_id, sort_order, hidden, source)
SELECT 'asset:' || ci.asset_key, ci.collection_id, ci.sort_order, ci.hidden, 'legacy'
FROM collection_images ci
JOIN images i ON i.asset_key = ci.asset_key
JOIN custom_collections cc ON cc.id = ci.collection_id;

INSERT OR IGNORE INTO asset_moment_links (asset_id, moment_id, sort_order, source)
SELECT DISTINCT
  'asset:' || vi.asset_key,
  m.id,
  vi.sort_order,
  'legacy'
FROM venue_images vi
JOIN images i ON i.asset_key = vi.asset_key
JOIN json_each(CASE WHEN json_valid(vi.moments_json) THEN vi.moments_json ELSE '[]' END) j
JOIN moments m
  ON CAST(j.value AS TEXT) = m.id
  OR lower(TRIM(CAST(j.value AS TEXT))) = lower(TRIM(m.slug))
  OR lower(TRIM(CAST(j.value AS TEXT))) = lower(TRIM(m.name));

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '10', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
