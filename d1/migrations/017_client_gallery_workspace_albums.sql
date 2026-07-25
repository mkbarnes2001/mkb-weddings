-- v1.5.4 — Client Gallery Workspace & Albums
-- Adds optional client-gallery album/section organisation without duplicating assets.

CREATE TABLE IF NOT EXISTS client_gallery_albums (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (gallery_id, slug),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id)
);
CREATE INDEX IF NOT EXISTS idx_client_gallery_albums_gallery
  ON client_gallery_albums(gallery_id, status, sort_order, created_at);

CREATE TABLE IF NOT EXISTS client_gallery_album_assets (
  album_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (album_id, asset_id),
  FOREIGN KEY (album_id) REFERENCES client_gallery_albums(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_client_gallery_album_assets_album
  ON client_gallery_album_assets(album_id, sort_order, created_at);
CREATE INDEX IF NOT EXISTS idx_client_gallery_album_assets_asset
  ON client_gallery_album_assets(asset_id, album_id);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '17', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
