-- Photography Intelligence / MKB Weddings
-- D1 schema v13
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



-- v0.9.5 — Location Intelligence & Unified Image Destinations
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

CREATE TABLE IF NOT EXISTS migration_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  migration_key TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '9', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;

-- v1.0.0 — Workspace Asset Library Foundation
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  legacy_asset_key TEXT NOT NULL DEFAULT '',
  image_id TEXT NOT NULL DEFAULT '',
  original_filename TEXT NOT NULL DEFAULT '',
  filename TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT '',
  width INTEGER,
  height INTEGER,
  checksum TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT '',
  source_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_legacy_key
  ON assets(workspace_id, legacy_asset_key)
  WHERE legacy_asset_key <> '';
CREATE INDEX IF NOT EXISTS idx_assets_workspace ON assets(workspace_id, status, updated_at, filename);
CREATE INDEX IF NOT EXISTS idx_assets_image_id ON assets(workspace_id, image_id);

CREATE TABLE IF NOT EXISTS asset_files (
  asset_id TEXT NOT NULL,
  variant TEXT NOT NULL CHECK (variant IN ('original', 'web', 'thumb', 'preview', 'watermarked')),
  storage_key TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT '',
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  access_level TEXT NOT NULL DEFAULT 'public' CHECK (access_level IN ('private', 'controlled', 'public')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'processing', 'failed', 'deleted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (asset_id, variant),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_asset_files_access ON asset_files(variant, access_level, status);

CREATE TABLE IF NOT EXISTS asset_wedding_links (
  asset_id TEXT NOT NULL,
  wedding_slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  PRIMARY KEY (asset_id, wedding_slug),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (wedding_slug) REFERENCES weddings(slug)
);
CREATE INDEX IF NOT EXISTS idx_asset_wedding_links_wedding ON asset_wedding_links(wedding_slug, sort_order, asset_id);

CREATE TABLE IF NOT EXISTS asset_venue_links (
  asset_id TEXT NOT NULL,
  venue_slug TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  PRIMARY KEY (asset_id, venue_slug),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (venue_slug) REFERENCES venues(slug)
);
CREATE INDEX IF NOT EXISTS idx_asset_venue_links_venue ON asset_venue_links(venue_slug, sort_order, asset_id);

CREATE TABLE IF NOT EXISTS asset_moment_links (
  asset_id TEXT NOT NULL,
  moment_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'legacy',
  PRIMARY KEY (asset_id, moment_id),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (moment_id) REFERENCES moments(id)
);
CREATE INDEX IF NOT EXISTS idx_asset_moment_links_moment ON asset_moment_links(moment_id, sort_order, asset_id);

CREATE TABLE IF NOT EXISTS asset_gallery_links (
  asset_id TEXT NOT NULL,
  gallery_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
  source TEXT NOT NULL DEFAULT 'legacy',
  PRIMARY KEY (asset_id, gallery_id),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (gallery_id) REFERENCES custom_collections(id)
);
CREATE INDEX IF NOT EXISTS idx_asset_gallery_links_gallery ON asset_gallery_links(gallery_id, hidden, sort_order, asset_id);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '10', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;

-- v1.1.0 — Private Client Galleries Foundation
CREATE TABLE IF NOT EXISTS client_galleries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  wedding_slug TEXT,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  client_name TEXT NOT NULL DEFAULT '',
  client_email TEXT NOT NULL DEFAULT '',
  intro TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'archived')),
  access_token TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL DEFAULT '',
  expires_at TEXT,
  allow_favourites INTEGER NOT NULL DEFAULT 1 CHECK (allow_favourites IN (0, 1)),
  allow_downloads INTEGER NOT NULL DEFAULT 0 CHECK (allow_downloads IN (0, 1)),
  cover_asset_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, slug),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (wedding_slug) REFERENCES weddings(slug),
  FOREIGN KEY (cover_asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_client_galleries_workspace ON client_galleries(workspace_id, status, updated_at, title);
CREATE INDEX IF NOT EXISTS idx_client_galleries_wedding ON client_galleries(workspace_id, wedding_slug, status);

CREATE TABLE IF NOT EXISTS client_gallery_assets (
  gallery_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (gallery_id, asset_id),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_client_gallery_assets_gallery ON client_gallery_assets(gallery_id, hidden, sort_order, asset_id);
CREATE INDEX IF NOT EXISTS idx_client_gallery_assets_asset ON client_gallery_assets(asset_id, gallery_id);

CREATE TABLE IF NOT EXISTS client_gallery_favourites (
  gallery_id TEXT NOT NULL,
  visitor_key TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (gallery_id, visitor_key, asset_id),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_client_gallery_favourites_gallery ON client_gallery_favourites(gallery_id, visitor_key, created_at);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '11', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
-- v1.2.0 — Private Original Upload & Secure Delivery
-- Adds resumable multipart upload state and download audit records.
-- Private originals are stored in a dedicated private R2 bucket and are never
-- exposed through public object URLs.

CREATE TABLE IF NOT EXISTS asset_upload_sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  gallery_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  client_fingerprint TEXT NOT NULL DEFAULT '',
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  file_size INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  private_storage_key TEXT NOT NULL,
  multipart_upload_id TEXT NOT NULL,
  part_size INTEGER NOT NULL DEFAULT 8388608,
  uploaded_parts_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'uploading', 'processing', 'complete', 'failed', 'aborted')),
  error_message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_asset_upload_sessions_gallery
  ON asset_upload_sessions(gallery_id, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_asset_upload_sessions_resume
  ON asset_upload_sessions(workspace_id, gallery_id, client_fingerprint, status);

CREATE TABLE IF NOT EXISTS asset_download_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  gallery_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  visitor_key TEXT NOT NULL DEFAULT '',
  delivery TEXT NOT NULL DEFAULT 'original'
    CHECK (delivery IN ('original', 'web', 'zip')),
  bytes_sent INTEGER NOT NULL DEFAULT 0,
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_asset_download_events_gallery
  ON asset_download_events(gallery_id, created_at, asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_download_events_asset
  ON asset_download_events(asset_id, created_at);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '12', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;

-- v1.3.0 — Unified Wedding Workspace & Preview Sets
CREATE TABLE IF NOT EXISTS wedding_preview_sets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  wedding_slug TEXT NOT NULL,
  slug TEXT NOT NULL DEFAULT 'wedding-day-previews',
  name TEXT NOT NULL DEFAULT 'Wedding Day Previews',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, wedding_slug, slug),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (wedding_slug) REFERENCES weddings(slug)
);
CREATE INDEX IF NOT EXISTS idx_wedding_preview_sets_wedding
  ON wedding_preview_sets(workspace_id, wedding_slug, status);

CREATE TABLE IF NOT EXISTS wedding_preview_assets (
  preview_set_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (preview_set_id, asset_id),
  FOREIGN KEY (preview_set_id) REFERENCES wedding_preview_sets(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_wedding_preview_assets_order
  ON wedding_preview_assets(preview_set_id, sort_order, asset_id);
CREATE INDEX IF NOT EXISTS idx_wedding_preview_assets_asset
  ON wedding_preview_assets(asset_id, preview_set_id);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '13', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;

-- v1.4.0 — Gallery Visitor Identity & Permissions
CREATE TABLE IF NOT EXISTS client_gallery_access_settings (
  gallery_id TEXT PRIMARY KEY,
  require_email INTEGER NOT NULL DEFAULT 0 CHECK (require_email IN (0, 1)),
  allow_guest_downloads INTEGER NOT NULL DEFAULT 0 CHECK (allow_guest_downloads IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id)
);

CREATE TABLE IF NOT EXISTS client_gallery_contacts (
  gallery_id TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'client',
  allow_original_downloads INTEGER NOT NULL DEFAULT 1 CHECK (allow_original_downloads IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (gallery_id, email_normalized),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id)
);
CREATE INDEX IF NOT EXISTS idx_client_gallery_contacts_gallery
  ON client_gallery_contacts(gallery_id, status, email_normalized);

CREATE TABLE IF NOT EXISTS client_gallery_visitors (
  gallery_id TEXT NOT NULL,
  visitor_key TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  email_normalized TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  visit_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (gallery_id, visitor_key),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id)
);
CREATE INDEX IF NOT EXISTS idx_client_gallery_visitors_email
  ON client_gallery_visitors(gallery_id, email_normalized, last_seen_at);

INSERT OR IGNORE INTO client_gallery_access_settings (gallery_id, require_email, allow_guest_downloads)
SELECT id, 0, 0 FROM client_galleries;

INSERT OR IGNORE INTO client_gallery_contacts (
  gallery_id, email_normalized, email, display_name, role, allow_original_downloads, status
)
SELECT id, lower(trim(client_email)), trim(client_email), trim(client_name), 'primary_client', 1, 'active'
FROM client_galleries
WHERE trim(client_email) <> '';

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '14', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;

-- v1.5.0 — Client Selections & Shortlists
CREATE TABLE IF NOT EXISTS client_gallery_selection_requests (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL,
  name TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  min_images INTEGER NOT NULL DEFAULT 0,
  max_images INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id)
);
CREATE INDEX IF NOT EXISTS idx_client_gallery_selection_requests_gallery
  ON client_gallery_selection_requests(gallery_id, status, sort_order, created_at);

CREATE TABLE IF NOT EXISTS client_gallery_selections (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  gallery_id TEXT NOT NULL,
  visitor_key TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  email_normalized TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (request_id, visitor_key),
  FOREIGN KEY (request_id) REFERENCES client_gallery_selection_requests(id),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id)
);
CREATE INDEX IF NOT EXISTS idx_client_gallery_selections_gallery
  ON client_gallery_selections(gallery_id, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_client_gallery_selections_email
  ON client_gallery_selections(gallery_id, email_normalized, updated_at);

CREATE TABLE IF NOT EXISTS client_gallery_selection_assets (
  selection_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  selected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (selection_id, asset_id),
  FOREIGN KEY (selection_id) REFERENCES client_gallery_selections(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_client_gallery_selection_assets_selection
  ON client_gallery_selection_assets(selection_id, sort_order, selected_at);
CREATE INDEX IF NOT EXISTS idx_client_gallery_selection_assets_asset
  ON client_gallery_selection_assets(asset_id, selection_id);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '15', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
-- v1.5.1 — Persistent Client Identity & Magic-Link Sign-In
-- Adds workspace-level verified client identities, secure one-time email links,
-- persistent sessions and device/visitor links used to sync favourites across devices.

CREATE TABLE IF NOT EXISTS client_identities (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  verified_at TEXT,
  last_authenticated_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, email_normalized),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_client_identities_workspace_email
  ON client_identities(workspace_id, email_normalized, status);

CREATE TABLE IF NOT EXISTS client_identity_gallery_visitors (
  gallery_id TEXT NOT NULL,
  visitor_key TEXT NOT NULL,
  identity_id TEXT NOT NULL,
  linked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (gallery_id, visitor_key),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id),
  FOREIGN KEY (identity_id) REFERENCES client_identities(id)
);
CREATE INDEX IF NOT EXISTS idx_client_identity_gallery_visitors_identity
  ON client_identity_gallery_visitors(identity_id, gallery_id, last_seen_at);

CREATE TABLE IF NOT EXISTS client_identity_magic_links (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL,
  gallery_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  visitor_key TEXT NOT NULL DEFAULT '',
  return_path TEXT NOT NULL DEFAULT '/',
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (identity_id) REFERENCES client_identities(id),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id)
);
CREATE INDEX IF NOT EXISTS idx_client_identity_magic_links_identity
  ON client_identity_magic_links(identity_id, gallery_id, created_at);
CREATE INDEX IF NOT EXISTS idx_client_identity_magic_links_expiry
  ON client_identity_magic_links(expires_at, consumed_at);

CREATE TABLE IF NOT EXISTS client_identity_sessions (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (identity_id) REFERENCES client_identities(id)
);
CREATE INDEX IF NOT EXISTS idx_client_identity_sessions_identity
  ON client_identity_sessions(identity_id, expires_at, revoked_at);
CREATE INDEX IF NOT EXISTS idx_client_identity_sessions_token
  ON client_identity_sessions(token_hash, expires_at, revoked_at);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '16', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
