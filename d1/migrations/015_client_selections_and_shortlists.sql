-- v1.5.0 — Client Selections & Shortlists
-- Adds photographer-created selection requests, visitor selections and selected asset memberships.

CREATE TABLE IF NOT EXISTS client_gallery_selection_requests (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL,
  name TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  min_images INTEGER NOT NULL DEFAULT 0,
  max_images INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id)
);
CREATE INDEX IF NOT EXISTS idx_client_gallery_selection_requests_gallery
  ON client_gallery_selection_requests(gallery_id, status, sort_order, created_at);

CREATE TABLE IF NOT EXISTS client_gallery_selections (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  gallery_id TEXT NOT NULL,
  visitor_key TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  email_normalized TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (request_id, visitor_key),
  FOREIGN KEY (request_id) REFERENCES client_gallery_selection_requests(id),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id)
);
CREATE INDEX IF NOT EXISTS idx_client_gallery_selections_gallery
  ON client_gallery_selections(gallery_id, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_client_gallery_selections_email
  ON client_gallery_selections(gallery_id, email_normalized, updated_at);

CREATE TABLE IF NOT EXISTS client_gallery_selection_assets (
  selection_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  selected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (selection_id, asset_id),
  FOREIGN KEY (selection_id) REFERENCES client_gallery_selections(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_client_gallery_selection_assets_selection
  ON client_gallery_selection_assets(selection_id, sort_order, selected_at);
CREATE INDEX IF NOT EXISTS idx_client_gallery_selection_assets_asset
  ON client_gallery_selection_assets(asset_id, selection_id);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '15', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
