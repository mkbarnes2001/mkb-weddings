-- v1.5.6 — Client Gallery Photo Ordering
-- Adds persistent gallery sort preferences and capture-time metadata without
-- changing canonical asset identity or duplicating files.

CREATE TABLE IF NOT EXISTS client_gallery_display_settings (
  gallery_id TEXT PRIMARY KEY,
  sort_mode TEXT NOT NULL DEFAULT 'custom'
    CHECK (sort_mode IN ('custom', 'capture_time', 'filename')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id)
);

CREATE TABLE IF NOT EXISTS asset_capture_metadata (
  asset_id TEXT PRIMARY KEY,
  captured_at TEXT NOT NULL,
  capture_source TEXT NOT NULL DEFAULT 'created_at_fallback'
    CHECK (capture_source IN ('exif', 'file_modified', 'created_at_fallback', 'manual')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_asset_capture_metadata_time
  ON asset_capture_metadata(captured_at, asset_id);

INSERT OR IGNORE INTO client_gallery_display_settings (gallery_id, sort_mode, updated_at)
SELECT id, 'custom', CURRENT_TIMESTAMP
FROM client_galleries;

-- Existing assets may no longer retain EXIF after legacy processing. Give them
-- a deterministic fallback; future private uploads replace this with EXIF or
-- the source file's modification timestamp when available.
INSERT OR IGNORE INTO asset_capture_metadata (asset_id, captured_at, capture_source, updated_at)
SELECT id, REPLACE(created_at, ' ', 'T'), 'created_at_fallback', CURRENT_TIMESTAMP
FROM assets;

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '19', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
