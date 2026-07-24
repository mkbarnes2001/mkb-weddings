-- v1.3.0 — Unified Wedding Workspace & Preview Sets
-- Adds reusable preview-set records for post-wedding workflows.
-- Canonical assets remain the source of truth; public gallery assignments reference
-- web derivatives only and never expose private original R2 objects.

CREATE TABLE IF NOT EXISTS wedding_preview_sets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  wedding_slug TEXT NOT NULL,
  slug TEXT NOT NULL DEFAULT 'wedding-day-previews',
  name TEXT NOT NULL DEFAULT 'Wedding Day Previews',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, wedding_slug, slug),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (wedding_slug) REFERENCES weddings(slug)
);
CREATE INDEX IF NOT EXISTS idx_wedding_preview_sets_wedding
  ON wedding_preview_sets(workspace_id, wedding_slug, status);

CREATE TABLE IF NOT EXISTS wedding_preview_assets (
  preview_set_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (preview_set_id, asset_id),
  FOREIGN KEY (preview_set_id) REFERENCES wedding_preview_sets(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_wedding_preview_assets_order
  ON wedding_preview_assets(preview_set_id, sort_order, asset_id);
CREATE INDEX IF NOT EXISTS idx_wedding_preview_assets_asset
  ON wedding_preview_assets(asset_id, preview_set_id);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '13', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
