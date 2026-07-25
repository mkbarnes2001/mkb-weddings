-- v1.5.5 — Client Gallery Branding
-- Per-gallery visual identity with safe theme tokens and optional custom logo.

CREATE TABLE IF NOT EXISTS client_gallery_branding (
  gallery_id TEXT PRIMARY KEY,
  logo_mode TEXT NOT NULL DEFAULT 'workspace'
    CHECK (logo_mode IN ('workspace', 'custom', 'hidden')),
  custom_logo_url TEXT NOT NULL DEFAULT '',
  custom_logo_storage_key TEXT NOT NULL DEFAULT '',
  accent_color TEXT NOT NULL DEFAULT '',
  background_color TEXT NOT NULL DEFAULT '',
  surface_color TEXT NOT NULL DEFAULT '',
  text_color TEXT NOT NULL DEFAULT '',
  heading_font TEXT NOT NULL DEFAULT 'editorial'
    CHECK (heading_font IN ('editorial', 'modern', 'classic')),
  show_studio_name INTEGER NOT NULL DEFAULT 1
    CHECK (show_studio_name IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id)
);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '18', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
