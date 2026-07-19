-- Photography Intelligence D1 migration 002
-- Adds draft/published separation for venue content.

ALTER TABLE venues ADD COLUMN published_json TEXT NOT NULL DEFAULT '';
ALTER TABLE venues ADD COLUMN published_at TEXT;

UPDATE venues
SET
  published_json = CASE WHEN status = 'published' THEN document_json ELSE '' END,
  published_at = CASE WHEN status = 'published' THEN updated_at ELSE NULL END;

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '2', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
