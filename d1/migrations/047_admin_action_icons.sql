-- v1.10.12a: platform-controlled semantic Admin action icons.
-- Stores explicit icon overrides only. Source defaults remain canonical.

ALTER TABLE platform_branding_settings
  ADD COLUMN admin_action_icons_json TEXT NOT NULL DEFAULT '{}'
  CHECK (
    json_valid(admin_action_icons_json)
    AND length(admin_action_icons_json) <= 12000
  );

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '47', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
