-- v1.9.8a: WedPlanned platform administration and global module appearance.
-- Additive only: module appearance belongs to the platform, not to an individual
-- business workspace. Existing source can safely ignore this table after rollback.

CREATE TABLE IF NOT EXISTS platform_module_configurations (
  module_key TEXT PRIMARY KEY
    CHECK (module_key IN ('crm', 'client-galleries', 'website', 'business')),
  accent_color TEXT NOT NULL DEFAULT '#111111',
  icon_key TEXT NOT NULL DEFAULT '',
  mark_url TEXT NOT NULL DEFAULT '',
  active_button_style TEXT NOT NULL DEFAULT 'solid'
    CHECK (active_button_style IN ('solid', 'soft', 'outline')),
  panel_accent_style TEXT NOT NULL DEFAULT 'edge'
    CHECK (panel_accent_style IN ('edge', 'wash', 'header')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by_user_id TEXT,
  updated_by_email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_platform_module_configurations_order
  ON platform_module_configurations(status, sort_order, module_key);

INSERT OR IGNORE INTO platform_module_configurations
  (module_key, accent_color, icon_key, mark_url, active_button_style, panel_accent_style, sort_order)
VALUES
  ('crm', '#2563EB', 'contact-round', '', 'solid', 'edge', 10),
  ('client-galleries', '#7C3AED', 'images', '', 'soft', 'wash', 20),
  ('website', '#0F766E', 'globe-2', '', 'solid', 'edge', 30),
  ('business', '#B45309', 'briefcase-business', '', 'outline', 'header', 40);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '32', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
