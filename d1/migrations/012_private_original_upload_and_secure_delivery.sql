-- v1.2.0 — Private Original Upload & Secure Delivery
-- Adds resumable multipart upload state and download audit records.
-- Private originals are stored in a dedicated private R2 bucket and are never
-- exposed through public object URLs.

CREATE TABLE IF NOT EXISTS asset_upload_sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  gallery_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  client_fingerprint TEXT NOT NULL DEFAULT '',
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  file_size INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  private_storage_key TEXT NOT NULL,
  multipart_upload_id TEXT NOT NULL,
  part_size INTEGER NOT NULL DEFAULT 8388608,
  uploaded_parts_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'uploading', 'processing', 'complete', 'failed', 'aborted')),
  error_message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_asset_upload_sessions_gallery
  ON asset_upload_sessions(gallery_id, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_asset_upload_sessions_resume
  ON asset_upload_sessions(workspace_id, gallery_id, client_fingerprint, status);

CREATE TABLE IF NOT EXISTS asset_download_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  gallery_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  visitor_key TEXT NOT NULL DEFAULT '',
  delivery TEXT NOT NULL DEFAULT 'original'
    CHECK (delivery IN ('original', 'web', 'zip')),
  bytes_sent INTEGER NOT NULL DEFAULT 0,
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_asset_download_events_gallery
  ON asset_download_events(gallery_id, created_at, asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_download_events_asset
  ON asset_download_events(asset_id, created_at);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '12', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
