-- v1.10.1a hotfix1: surface-aware platform and module wordmarks.
-- Additive only. Existing wordmark_url remains the light-background wordmark.

ALTER TABLE platform_module_configurations
  ADD COLUMN dark_wordmark_url TEXT NOT NULL DEFAULT '';

ALTER TABLE platform_branding_settings
  ADD COLUMN dark_wordmark_url TEXT NOT NULL DEFAULT '';

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '36', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
