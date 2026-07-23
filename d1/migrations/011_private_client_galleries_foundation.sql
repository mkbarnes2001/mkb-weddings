-- v1.1.0 — Private Client Galleries Foundation
-- Adds workspace-owned private gallery records and asset memberships.
-- No existing assets or public gallery records are modified.

CREATE TABLE IF NOT EXISTS client_galleries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  wedding_slug TEXT,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  client_name TEXT NOT NULL DEFAULT '',
  client_email TEXT NOT NULL DEFAULT '',
  intro TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'archived')),
  access_token TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL DEFAULT '',
  expires_at TEXT,
  allow_favourites INTEGER NOT NULL DEFAULT 1 CHECK (allow_favourites IN (0, 1)),
  allow_downloads INTEGER NOT NULL DEFAULT 0 CHECK (allow_downloads IN (0, 1)),
  cover_asset_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, slug),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (wedding_slug) REFERENCES weddings(slug),
  FOREIGN KEY (cover_asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_client_galleries_workspace
  ON client_galleries(workspace_id, status, updated_at, title);
CREATE INDEX IF NOT EXISTS idx_client_galleries_wedding
  ON client_galleries(workspace_id, wedding_slug, status);

CREATE TABLE IF NOT EXISTS client_gallery_assets (
  gallery_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (gallery_id, asset_id),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_client_gallery_assets_gallery
  ON client_gallery_assets(gallery_id, hidden, sort_order, asset_id);
CREATE INDEX IF NOT EXISTS idx_client_gallery_assets_asset
  ON client_gallery_assets(asset_id, gallery_id);

CREATE TABLE IF NOT EXISTS client_gallery_favourites (
  gallery_id TEXT NOT NULL,
  visitor_key TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (gallery_id, visitor_key, asset_id),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_client_gallery_favourites_gallery
  ON client_gallery_favourites(gallery_id, visitor_key, created_at);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '11', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
