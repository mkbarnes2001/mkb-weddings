-- v1.10.12a: platform-controlled Admin header appearance.
-- Additive platform-owned settings only.
-- Defaults preserve the current Admin UI v2 appearance.

ALTER TABLE platform_branding_settings
  ADD COLUMN admin_header_style TEXT NOT NULL DEFAULT 'divider'
  CHECK (admin_header_style IN ('flat', 'divider', 'panel'));

ALTER TABLE platform_branding_settings
  ADD COLUMN admin_header_density TEXT NOT NULL DEFAULT 'compact'
  CHECK (admin_header_density IN ('compact', 'standard'));

ALTER TABLE platform_branding_settings
  ADD COLUMN admin_header_title_size TEXT NOT NULL DEFAULT 'medium'
  CHECK (admin_header_title_size IN ('small', 'medium', 'large'));

ALTER TABLE platform_branding_settings
  ADD COLUMN admin_header_shadow TEXT NOT NULL DEFAULT 'off'
  CHECK (admin_header_shadow IN ('off', 'subtle'));

ALTER TABLE platform_branding_settings
  ADD COLUMN admin_header_description TEXT NOT NULL DEFAULT 'show'
  CHECK (admin_header_description IN ('show', 'hide'));

ALTER TABLE platform_branding_settings
  ADD COLUMN admin_header_description_size TEXT NOT NULL DEFAULT 'small'
  CHECK (admin_header_description_size IN ('small', 'standard'));

ALTER TABLE platform_branding_settings
  ADD COLUMN admin_header_action_size TEXT NOT NULL DEFAULT 'compact'
  CHECK (admin_header_action_size IN ('compact', 'standard'));

ALTER TABLE platform_branding_settings
  ADD COLUMN admin_status_size TEXT NOT NULL DEFAULT 'compact'
  CHECK (admin_status_size IN ('compact', 'standard'));

ALTER TABLE platform_branding_settings
  ADD COLUMN admin_page_spacing TEXT NOT NULL DEFAULT 'compact'
  CHECK (admin_page_spacing IN ('compact', 'standard'));

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '46', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
