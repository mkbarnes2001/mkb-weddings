-- v1.10.1a hotfix3: global Admin typography and module navigation appearance.
-- Platform-owned only. Defaults preserve the existing live appearance.

ALTER TABLE platform_branding_settings
  ADD COLUMN admin_font_scale INTEGER NOT NULL DEFAULT 100
  CHECK (admin_font_scale BETWEEN 75 AND 140);

ALTER TABLE platform_branding_settings
  ADD COLUMN admin_heading_font_scale INTEGER NOT NULL DEFAULT 100
  CHECK (admin_heading_font_scale BETWEEN 75 AND 140);

ALTER TABLE platform_branding_settings
  ADD COLUMN admin_button_font_scale INTEGER NOT NULL DEFAULT 100
  CHECK (admin_button_font_scale BETWEEN 75 AND 140);

ALTER TABLE platform_branding_settings
  ADD COLUMN admin_navigation_font_scale INTEGER NOT NULL DEFAULT 100
  CHECK (admin_navigation_font_scale BETWEEN 75 AND 140);

ALTER TABLE platform_branding_settings
  ADD COLUMN admin_meta_font_scale INTEGER NOT NULL DEFAULT 100
  CHECK (admin_meta_font_scale BETWEEN 75 AND 140);

ALTER TABLE platform_branding_settings
  ADD COLUMN page_header_logo_scale INTEGER NOT NULL DEFAULT 100
  CHECK (page_header_logo_scale BETWEEN 75 AND 140);

ALTER TABLE platform_branding_settings
  ADD COLUMN sidebar_logo_scale INTEGER NOT NULL DEFAULT 100
  CHECK (sidebar_logo_scale BETWEEN 75 AND 140);

ALTER TABLE platform_branding_settings
  ADD COLUMN mobile_logo_scale INTEGER NOT NULL DEFAULT 100
  CHECK (mobile_logo_scale BETWEEN 75 AND 140);

ALTER TABLE platform_module_configurations
  ADD COLUMN desktop_nav_background_color TEXT NOT NULL DEFAULT '';

ALTER TABLE platform_module_configurations
  ADD COLUMN desktop_nav_text_color TEXT NOT NULL DEFAULT '';

ALTER TABLE platform_module_configurations
  ADD COLUMN desktop_nav_button_color TEXT NOT NULL DEFAULT '';

ALTER TABLE platform_module_configurations
  ADD COLUMN desktop_nav_active_color TEXT NOT NULL DEFAULT '';

ALTER TABLE platform_module_configurations
  ADD COLUMN desktop_nav_active_text_color TEXT NOT NULL DEFAULT '';

ALTER TABLE platform_module_configurations
  ADD COLUMN mobile_nav_background_color TEXT NOT NULL DEFAULT '';

ALTER TABLE platform_module_configurations
  ADD COLUMN mobile_nav_text_color TEXT NOT NULL DEFAULT '';

ALTER TABLE platform_module_configurations
  ADD COLUMN mobile_nav_button_color TEXT NOT NULL DEFAULT '';

ALTER TABLE platform_module_configurations
  ADD COLUMN mobile_nav_active_color TEXT NOT NULL DEFAULT '';

ALTER TABLE platform_module_configurations
  ADD COLUMN mobile_nav_active_text_color TEXT NOT NULL DEFAULT '';

ALTER TABLE platform_module_configurations
  ADD COLUMN module_font_scale INTEGER NOT NULL DEFAULT 100
  CHECK (module_font_scale BETWEEN 75 AND 140);

ALTER TABLE platform_module_configurations
  ADD COLUMN heading_font_scale INTEGER NOT NULL DEFAULT 100
  CHECK (heading_font_scale BETWEEN 75 AND 140);

ALTER TABLE platform_module_configurations
  ADD COLUMN button_font_scale INTEGER NOT NULL DEFAULT 100
  CHECK (button_font_scale BETWEEN 75 AND 140);

ALTER TABLE platform_module_configurations
  ADD COLUMN navigation_font_scale INTEGER NOT NULL DEFAULT 100
  CHECK (navigation_font_scale BETWEEN 75 AND 140);

ALTER TABLE platform_module_configurations
  ADD COLUMN page_header_logo_scale INTEGER NOT NULL DEFAULT 100
  CHECK (page_header_logo_scale BETWEEN 75 AND 140);

ALTER TABLE platform_module_configurations
  ADD COLUMN sidebar_logo_scale INTEGER NOT NULL DEFAULT 100
  CHECK (sidebar_logo_scale BETWEEN 75 AND 140);

ALTER TABLE platform_module_configurations
  ADD COLUMN mobile_logo_scale INTEGER NOT NULL DEFAULT 100
  CHECK (mobile_logo_scale BETWEEN 75 AND 140);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '37', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
