-- v1.9.8a final UI refinement: distinct operational record-card surfaces.
-- Additive only.

ALTER TABLE platform_module_configurations
  ADD COLUMN record_background_color TEXT NOT NULL DEFAULT '#FFFFFF';

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '34', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
