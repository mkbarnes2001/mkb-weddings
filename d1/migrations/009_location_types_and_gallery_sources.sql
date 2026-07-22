-- v0.9.5 — Location Intelligence & Unified Image Destinations
-- Separates location intelligence from gallery presentation and adds workspace-configurable
-- location types that may optionally power the public Location Gallery.

CREATE TABLE IF NOT EXISTS location_types (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  type_key TEXT NOT NULL,
  label TEXT NOT NULL,
  plural_label TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  gallery_eligible INTEGER NOT NULL DEFAULT 0 CHECK (gallery_eligible IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  system INTEGER NOT NULL DEFAULT 0 CHECK (system IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, type_key),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE INDEX IF NOT EXISTS idx_location_types_workspace
  ON location_types(workspace_id, enabled, sort_order, label);

-- Seed standard geography/destination types for MKB. All remain available for location
-- intelligence, while County is the only public gallery source enabled initially so the
-- existing Explore by County behaviour is preserved.
INSERT OR IGNORE INTO location_types (
  id, workspace_id, type_key, label, plural_label,
  enabled, gallery_eligible, sort_order, system
) VALUES
  ('location_type_mkb_county',      'workspace_mkb_weddings', 'county',      'County',           'Counties',           1, 1, 10, 1),
  ('location_type_mkb_region',      'workspace_mkb_weddings', 'region',      'Region',           'Regions',            1, 0, 20, 1),
  ('location_type_mkb_state',       'workspace_mkb_weddings', 'state',       'State / Province', 'States / Provinces',  1, 0, 30, 1),
  ('location_type_mkb_country',     'workspace_mkb_weddings', 'country',     'Country',          'Countries',          1, 0, 40, 1),
  ('location_type_mkb_city',        'workspace_mkb_weddings', 'city',        'City / Town',      'Cities / Towns',      1, 0, 50, 1),
  ('location_type_mkb_destination', 'workspace_mkb_weddings', 'destination', 'Destination',      'Destinations',        1, 0, 60, 1),
  ('location_type_mkb_custom',      'workspace_mkb_weddings', 'custom',      'Custom area',      'Custom areas',        1, 0, 70, 1);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '9', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
