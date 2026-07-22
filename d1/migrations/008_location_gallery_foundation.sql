-- v0.9.3 — Location Gallery Foundation
-- Generalises the MKB county gallery into a workspace-configurable location gallery.
-- Existing /wedding-photographer URLs remain valid for MKB Weddings.

CREATE TABLE IF NOT EXISTS location_gallery_settings (
  workspace_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  landing_title TEXT NOT NULL DEFAULT 'Explore by Location',
  gallery_title TEXT NOT NULL DEFAULT 'Wedding Photography by Location',
  card_description TEXT NOT NULL DEFAULT 'Browse wedding galleries by location',
  singular_label TEXT NOT NULL DEFAULT 'Location',
  plural_label TEXT NOT NULL DEFAULT 'Locations',
  grouping_level TEXT NOT NULL DEFAULT 'custom',
  public_base_path TEXT NOT NULL DEFAULT '/gallery/locations',
  intro TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  hero_image_url TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE IF NOT EXISTS location_areas (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  area_type TEXT NOT NULL DEFAULT 'custom',
  parent_id TEXT,
  country TEXT NOT NULL DEFAULT '',
  country_code TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  show_on_landing INTEGER NOT NULL DEFAULT 1 CHECK (show_on_landing IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  hero_image_url TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  intro TEXT NOT NULL DEFAULT '',
  document_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, slug),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (parent_id) REFERENCES location_areas(id)
);
CREATE INDEX IF NOT EXISTS idx_location_areas_workspace
  ON location_areas(workspace_id, status, show_on_landing, sort_order, name);
CREATE INDEX IF NOT EXISTS idx_location_areas_type
  ON location_areas(workspace_id, area_type, name);

CREATE TABLE IF NOT EXISTS venue_location_links (
  location_id TEXT NOT NULL,
  venue_slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  primary_location INTEGER NOT NULL DEFAULT 0 CHECK (primary_location IN (0, 1)),
  PRIMARY KEY (location_id, venue_slug),
  FOREIGN KEY (location_id) REFERENCES location_areas(id),
  FOREIGN KEY (venue_slug) REFERENCES venues(slug)
);
CREATE INDEX IF NOT EXISTS idx_venue_location_links_venue
  ON venue_location_links(venue_slug, location_id);

-- Preserve the current MKB public presentation and SEO route.
INSERT OR IGNORE INTO location_gallery_settings (
  workspace_id,
  enabled,
  landing_title,
  gallery_title,
  card_description,
  singular_label,
  plural_label,
  grouping_level,
  public_base_path,
  intro,
  seo_title,
  seo_description,
  hero_image_url
) VALUES (
  'workspace_mkb_weddings',
  1,
  'Explore by County',
  'Northern Ireland & Ireland Wedding Photography',
  'Browse wedding galleries by county',
  'County',
  'Counties',
  'county',
  '/wedding-photographer',
  'Browse real wedding photography by county across Northern Ireland and Ireland. Use these galleries to explore the various venues within each county.',
  'Wedding Photographer by County | Northern Ireland & Ireland | MKB Weddings',
  'Browse real wedding photography by county across Northern Ireland and Ireland. Use these galleries to explore the various venues within each county.',
  'https://images.mkbweddings.co.uk/full/Slieve%20donard%20hotel/couple%20portraits/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-94_2000.webp'
);

-- Seed location areas from the existing county intelligence table.
INSERT OR IGNORE INTO location_areas (
  id,
  workspace_id,
  slug,
  name,
  area_type,
  country,
  country_code,
  status,
  show_on_landing,
  sort_order,
  seo_title,
  seo_description,
  document_json,
  created_at,
  updated_at
)
SELECT
  'location_mkb_' || slug,
  'workspace_mkb_weddings',
  slug,
  CASE WHEN TRIM(county) <> '' THEN county ELSE slug END,
  'county',
  country,
  country_code,
  'active',
  1,
  0,
  seo_title,
  seo_description,
  document_json,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM counties
WHERE TRIM(slug) <> '';

-- Preserve existing county → venue relationships as explicit links.
INSERT OR IGNORE INTO venue_location_links (
  location_id,
  venue_slug,
  sort_order,
  primary_location
)
SELECT
  location.id,
  venue.slug,
  venue.gallery_sort_order,
  1
FROM location_areas location
JOIN venues venue
  ON lower(TRIM(venue.county)) = lower(TRIM(location.name))
WHERE location.workspace_id = 'workspace_mkb_weddings'
  AND location.area_type = 'county';

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '8', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
