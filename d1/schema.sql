-- Photography Intelligence / MKB Weddings
-- D1 schema v5
-- Canonical content store. CSV files are migration inputs only and are not part of the runtime model.

CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS venues (
  slug TEXT PRIMARY KEY,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  town TEXT NOT NULL DEFAULT '',
  county TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  hero_asset_id TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  document_json TEXT NOT NULL,
  published_json TEXT NOT NULL DEFAULT '',
  published_at TEXT,
  gallery_visible INTEGER NOT NULL DEFAULT 1 CHECK (gallery_visible IN (0, 1)),
  gallery_sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_venues_status ON venues(status);
CREATE INDEX IF NOT EXISTS idx_venues_county ON venues(county);
CREATE INDEX IF NOT EXISTS idx_venues_gallery_order ON venues(gallery_visible, gallery_sort_order, name);

CREATE TABLE IF NOT EXISTS counties (
  slug TEXT PRIMARY KEY,
  county TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  country_code TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  document_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weddings (
  slug TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'json',
  title TEXT NOT NULL DEFAULT '',
  couple TEXT NOT NULL DEFAULT '',
  venue TEXT NOT NULL DEFAULT '',
  venue_slug TEXT NOT NULL DEFAULT '',
  venue_id TEXT NOT NULL DEFAULT '',
  wedding_date TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  intro TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  story_enabled INTEGER NOT NULL DEFAULT 0 CHECK (story_enabled IN (0, 1)),
  story_status TEXT NOT NULL DEFAULT 'draft',
  story_published_at TEXT,
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  document_json TEXT NOT NULL,
  published_json TEXT NOT NULL DEFAULT '',
  published_at TEXT,
  story_sort_order INTEGER NOT NULL DEFAULT 0,
  story_list_visible INTEGER NOT NULL DEFAULT 1 CHECK (story_list_visible IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_weddings_venue_slug ON weddings(venue_slug);
CREATE INDEX IF NOT EXISTS idx_weddings_story_public ON weddings(story_enabled, story_status);
CREATE INDEX IF NOT EXISTS idx_weddings_story_order ON weddings(story_enabled, story_status, story_list_visible, story_sort_order);

CREATE TABLE IF NOT EXISTS images (
  asset_key TEXT PRIMARY KEY,
  image_id TEXT NOT NULL DEFAULT '',
  wedding_slug TEXT NOT NULL DEFAULT '',
  filename TEXT NOT NULL,
  full_src TEXT NOT NULL DEFAULT '',
  thumb_src TEXT NOT NULL DEFAULT '',
  alt TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  ai_tags_json TEXT NOT NULL DEFAULT '[]',
  source_type TEXT NOT NULL DEFAULT '',
  source_json TEXT NOT NULL DEFAULT '{}',
  width INTEGER,
  height INTEGER,
  orientation TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_images_image_id ON images(image_id);
CREATE INDEX IF NOT EXISTS idx_images_wedding_slug ON images(wedding_slug);
CREATE INDEX IF NOT EXISTS idx_images_filename ON images(filename);

CREATE TABLE IF NOT EXISTS venue_images (
  venue_slug TEXT NOT NULL,
  asset_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  included INTEGER NOT NULL DEFAULT 1 CHECK (included IN (0, 1)),
  hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
  rating INTEGER NOT NULL DEFAULT 0,
  is_hero INTEGER NOT NULL DEFAULT 0 CHECK (is_hero IN (0, 1)),
  moments_json TEXT NOT NULL DEFAULT '[]',
  display_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (venue_slug, asset_key)
);
CREATE INDEX IF NOT EXISTS idx_venue_images_order ON venue_images(venue_slug, included, sort_order);
CREATE INDEX IF NOT EXISTS idx_venue_images_asset ON venue_images(asset_key);

CREATE TABLE IF NOT EXISTS wedding_images (
  wedding_slug TEXT NOT NULL,
  asset_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover INTEGER NOT NULL DEFAULT 0 CHECK (is_cover IN (0, 1)),
  hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
  rating INTEGER NOT NULL DEFAULT 0,
  collections_json TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (wedding_slug, asset_key)
);
CREATE INDEX IF NOT EXISTS idx_wedding_images_order ON wedding_images(wedding_slug, sort_order);
CREATE INDEX IF NOT EXISTS idx_wedding_images_asset ON wedding_images(asset_key);

CREATE TABLE IF NOT EXISTS story_images (
  wedding_slug TEXT NOT NULL,
  asset_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover INTEGER NOT NULL DEFAULT 0 CHECK (is_cover IN (0, 1)),
  PRIMARY KEY (wedding_slug, asset_key)
);
CREATE INDEX IF NOT EXISTS idx_story_images_order ON story_images(wedding_slug, sort_order);

CREATE TABLE IF NOT EXISTS published_story_images (
  wedding_slug TEXT NOT NULL,
  asset_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover INTEGER NOT NULL DEFAULT 0 CHECK (is_cover IN (0, 1)),
  PRIMARY KEY (wedding_slug, asset_key)
);
CREATE INDEX IF NOT EXISTS idx_published_story_images_order ON published_story_images(wedding_slug, sort_order);

CREATE TABLE IF NOT EXISTS wedding_suppliers (
  wedding_slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  instagram TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (wedding_slug, sort_order, role, name)
);
CREATE INDEX IF NOT EXISTS idx_wedding_suppliers_slug ON wedding_suppliers(wedding_slug, sort_order);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  instagram TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  county TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(category COLLATE NOCASE, status);

CREATE TABLE IF NOT EXISTS wedding_supplier_links (
  wedding_slug TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (wedding_slug, supplier_id, role),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);
CREATE INDEX IF NOT EXISTS idx_wedding_supplier_links_wedding ON wedding_supplier_links(wedding_slug, sort_order);
CREATE INDEX IF NOT EXISTS idx_wedding_supplier_links_supplier ON wedding_supplier_links(supplier_id, wedding_slug);

CREATE TABLE IF NOT EXISTS moments (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  available_for_assignment INTEGER NOT NULL DEFAULT 1 CHECK (available_for_assignment IN (0, 1)),
  show_on_landing INTEGER NOT NULL DEFAULT 1 CHECK (show_on_landing IN (0, 1)),
  card_image_id TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  document_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS custom_collections (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  show_on_landing INTEGER NOT NULL DEFAULT 0 CHECK (show_on_landing IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  hero_asset_key TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_custom_collections_public
  ON custom_collections(status, show_on_landing, sort_order);

CREATE TABLE IF NOT EXISTS collection_images (
  collection_id TEXT NOT NULL,
  asset_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
  PRIMARY KEY (collection_id, asset_key)
);
CREATE INDEX IF NOT EXISTS idx_collection_images_order
  ON collection_images(collection_id, hidden, sort_order);
CREATE INDEX IF NOT EXISTS idx_collection_images_asset
  ON collection_images(asset_key);

CREATE TABLE IF NOT EXISTS content_pages (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  document_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT
);


CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  plan TEXT NOT NULL DEFAULT 'internal',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_settings (
  workspace_id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL DEFAULT '',
  website_url TEXT NOT NULL DEFAULT '',
  admin_hostname TEXT NOT NULL DEFAULT '',
  public_hostname TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  instagram TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  accent_color TEXT NOT NULL DEFAULT '',
  default_country TEXT NOT NULL DEFAULT 'GB',
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  currency TEXT NOT NULL DEFAULT 'GBP',
  document_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE IF NOT EXISTS workspace_domains (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  hostname TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL DEFAULT 'public' CHECK (purpose IN ('public', 'admin', 'gallery', 'api')),
  verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_workspace_domains_workspace ON workspace_domains(workspace_id, purpose);

CREATE TABLE IF NOT EXISTS workspace_memberships (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, user_email),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_workspace_memberships_email ON workspace_memberships(user_email, status);

INSERT OR IGNORE INTO workspaces (id, slug, name, status, plan)
VALUES ('workspace_mkb_weddings', 'mkb-weddings', 'MKB Weddings', 'active', 'internal');

INSERT OR IGNORE INTO workspace_settings (
  workspace_id, business_name, website_url, admin_hostname, public_hostname,
  default_country, timezone, currency
) VALUES (
  'workspace_mkb_weddings',
  'MKB Weddings',
  'https://www.mkbweddings.co.uk',
  'admin.mkbweddings.co.uk',
  'www.mkbweddings.co.uk',
  'GB',
  'Europe/London',
  'GBP'
);

INSERT OR IGNORE INTO workspace_domains (id, workspace_id, hostname, purpose, verified)
VALUES
  ('domain_mkb_public', 'workspace_mkb_weddings', 'www.mkbweddings.co.uk', 'public', 1),
  ('domain_mkb_admin', 'workspace_mkb_weddings', 'admin.mkbweddings.co.uk', 'admin', 1);

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

CREATE TABLE IF NOT EXISTS migration_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  migration_key TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '8', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
