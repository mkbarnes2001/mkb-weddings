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

-- v1.5.4 — Client Gallery Workspace & Albums
CREATE TABLE IF NOT EXISTS client_gallery_albums (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (gallery_id, slug),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id)
);
CREATE INDEX IF NOT EXISTS idx_client_gallery_albums_gallery
  ON client_gallery_albums(gallery_id, status, sort_order, created_at);

CREATE TABLE IF NOT EXISTS client_gallery_album_assets (
  album_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (album_id, asset_id),
  FOREIGN KEY (album_id) REFERENCES client_gallery_albums(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_client_gallery_album_assets_album
  ON client_gallery_album_assets(album_id, sort_order, created_at);
CREATE INDEX IF NOT EXISTS idx_client_gallery_album_assets_asset
  ON client_gallery_album_assets(asset_id, album_id);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '17', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
-- v1.5.5 — Client Gallery Branding
-- Per-gallery visual identity with safe theme tokens and optional custom logo.

CREATE TABLE IF NOT EXISTS client_gallery_branding (
  gallery_id TEXT PRIMARY KEY,
  logo_mode TEXT NOT NULL DEFAULT 'workspace'
    CHECK (logo_mode IN ('workspace', 'custom', 'hidden')),
  custom_logo_url TEXT NOT NULL DEFAULT '',
  custom_logo_storage_key TEXT NOT NULL DEFAULT '',
  accent_color TEXT NOT NULL DEFAULT '',
  background_color TEXT NOT NULL DEFAULT '',
  surface_color TEXT NOT NULL DEFAULT '',
  text_color TEXT NOT NULL DEFAULT '',
  heading_font TEXT NOT NULL DEFAULT 'editorial'
    CHECK (heading_font IN ('editorial', 'modern', 'classic')),
  show_studio_name INTEGER NOT NULL DEFAULT 1
    CHECK (show_studio_name IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id)
);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '18', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;

-- v1.5.6 — Client Gallery Photo Ordering
CREATE TABLE IF NOT EXISTS client_gallery_display_settings (
  gallery_id TEXT PRIMARY KEY,
  sort_mode TEXT NOT NULL DEFAULT 'custom'
    CHECK (sort_mode IN ('custom', 'capture_time', 'filename')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id)
);

CREATE TABLE IF NOT EXISTS asset_capture_metadata (
  asset_id TEXT PRIMARY KEY,
  captured_at TEXT NOT NULL,
  capture_source TEXT NOT NULL DEFAULT 'created_at_fallback'
    CHECK (capture_source IN ('exif', 'file_modified', 'created_at_fallback', 'manual')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_asset_capture_metadata_time
  ON asset_capture_metadata(captured_at, asset_id);

INSERT OR IGNORE INTO client_gallery_display_settings (gallery_id, sort_mode, updated_at)
SELECT id, 'custom', CURRENT_TIMESTAMP
FROM client_galleries;

INSERT OR IGNORE INTO asset_capture_metadata (asset_id, captured_at, capture_source, updated_at)
SELECT id, REPLACE(created_at, ' ', 'T'), 'created_at_fallback', CURRENT_TIMESTAMP
FROM assets;

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '19', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
-- v1.6.0 — Print Store Foundation
-- Workspace-owned catalogue, price lists, Client Gallery store settings,
-- carts, crop choices, order snapshots and provider-neutral payment events.

CREATE TABLE IF NOT EXISTS commerce_products (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'prints',
  fulfilment_type TEXT NOT NULL DEFAULT 'print'
    CHECK (fulfilment_type IN ('print', 'wall_art', 'album', 'digital', 'other')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  lab_connector_key TEXT NOT NULL DEFAULT '',
  lab_product_code TEXT NOT NULL DEFAULT '',
  requires_crop INTEGER NOT NULL DEFAULT 1 CHECK (requires_crop IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_products_workspace
  ON commerce_products(workspace_id, status, sort_order, name);

CREATE TABLE IF NOT EXISTS commerce_product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  sku TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  width_mm INTEGER NOT NULL DEFAULT 0,
  height_mm INTEGER NOT NULL DEFAULT 0,
  orientation TEXT NOT NULL DEFAULT 'any'
    CHECK (orientation IN ('any', 'landscape', 'portrait', 'square')),
  finish TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  lab_sku TEXT NOT NULL DEFAULT '',
  lab_attributes_json TEXT NOT NULL DEFAULT '{}',
  lab_print_area TEXT NOT NULL DEFAULT 'default',
  lab_sizing TEXT NOT NULL DEFAULT 'fillPrintArea',
  recommended_width_px INTEGER NOT NULL DEFAULT 0,
  recommended_height_px INTEGER NOT NULL DEFAULT 0,
  lab_mapping_status TEXT NOT NULL DEFAULT 'unverified',
  lab_mapping_checked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES commerce_products(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_product_variants_product
  ON commerce_product_variants(product_id, status, sort_order, name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_commerce_product_variants_sku
  ON commerce_product_variants(product_id, sku)
  WHERE trim(sku) <> '';

CREATE TABLE IF NOT EXISTS commerce_price_lists (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  tax_inclusive INTEGER NOT NULL DEFAULT 1 CHECK (tax_inclusive IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_price_lists_workspace
  ON commerce_price_lists(workspace_id, status, is_default DESC, name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_commerce_price_lists_default
  ON commerce_price_lists(workspace_id)
  WHERE is_default = 1 AND status <> 'archived';

CREATE TABLE IF NOT EXISTS commerce_price_list_items (
  price_list_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  retail_price_minor INTEGER NOT NULL DEFAULT 0 CHECK (retail_price_minor >= 0),
  studio_cost_minor INTEGER NOT NULL DEFAULT 0 CHECK (studio_cost_minor >= 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (price_list_id, variant_id),
  FOREIGN KEY (price_list_id) REFERENCES commerce_price_lists(id),
  FOREIGN KEY (variant_id) REFERENCES commerce_product_variants(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_price_list_items_variant
  ON commerce_price_list_items(variant_id, price_list_id, active);

CREATE TABLE IF NOT EXISTS client_gallery_store_settings (
  gallery_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  price_list_id TEXT,
  allow_crop INTEGER NOT NULL DEFAULT 1 CHECK (allow_crop IN (0, 1)),
  require_photographer_approval INTEGER NOT NULL DEFAULT 1 CHECK (require_photographer_approval IN (0, 1)),
  minimum_order_minor INTEGER NOT NULL DEFAULT 0 CHECK (minimum_order_minor >= 0),
  intro TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id),
  FOREIGN KEY (price_list_id) REFERENCES commerce_price_lists(id)
);

CREATE TABLE IF NOT EXISTS commerce_carts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  gallery_id TEXT NOT NULL,
  visitor_key TEXT NOT NULL DEFAULT '',
  identity_id TEXT,
  email TEXT NOT NULL DEFAULT '',
  email_normalized TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'GBP',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'converted', 'abandoned')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id),
  FOREIGN KEY (identity_id) REFERENCES client_identities(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_carts_gallery_visitor
  ON commerce_carts(gallery_id, visitor_key, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_commerce_carts_identity
  ON commerce_carts(identity_id, gallery_id, status, updated_at);

CREATE TABLE IF NOT EXISTS commerce_cart_items (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_minor INTEGER NOT NULL DEFAULT 0 CHECK (unit_price_minor >= 0),
  crop_json TEXT NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cart_id) REFERENCES commerce_carts(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (variant_id) REFERENCES commerce_product_variants(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_cart_items_cart
  ON commerce_cart_items(cart_id, created_at, id);

CREATE TABLE IF NOT EXISTS commerce_orders (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  gallery_id TEXT NOT NULL,
  cart_id TEXT,
  identity_id TEXT,
  order_number TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL DEFAULT '',
  email_normalized TEXT NOT NULL DEFAULT '',
  client_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'awaiting_payment', 'paid', 'in_review', 'approved', 'in_fulfilment', 'fulfilled', 'cancelled', 'refunded')),
  currency TEXT NOT NULL DEFAULT 'GBP',
  subtotal_minor INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_minor >= 0),
  shipping_minor INTEGER NOT NULL DEFAULT 0 CHECK (shipping_minor >= 0),
  tax_minor INTEGER NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
  total_minor INTEGER NOT NULL DEFAULT 0 CHECK (total_minor >= 0),
  payment_provider TEXT NOT NULL DEFAULT 'manual',
  payment_reference TEXT NOT NULL DEFAULT '',
  requires_photographer_approval INTEGER NOT NULL DEFAULT 1
    CHECK (requires_photographer_approval IN (0, 1)),
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'processing', 'paid', 'failed', 'expired', 'refunded')),
  checkout_session_id TEXT NOT NULL DEFAULT '',
  checkout_attempt INTEGER NOT NULL DEFAULT 0 CHECK (checkout_attempt >= 0),
  payment_intent_id TEXT NOT NULL DEFAULT '',
  paid_at TEXT,
  payment_failed_at TEXT,
  refunded_at TEXT,
  shipping_name TEXT NOT NULL DEFAULT '',
  shipping_phone TEXT NOT NULL DEFAULT '',
  shipping_address_json TEXT NOT NULL DEFAULT '{}',
  lab_connector_key TEXT NOT NULL DEFAULT '',
  lab_reference TEXT NOT NULL DEFAULT '',
  client_notes TEXT NOT NULL DEFAULT '',
  internal_notes TEXT NOT NULL DEFAULT '',
  submitted_at TEXT,
  approved_at TEXT,
  fulfilled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id),
  FOREIGN KEY (cart_id) REFERENCES commerce_carts(id),
  FOREIGN KEY (identity_id) REFERENCES client_identities(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_orders_workspace
  ON commerce_orders(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commerce_orders_gallery
  ON commerce_orders(gallery_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_commerce_orders_checkout_session
  ON commerce_orders(checkout_session_id)
  WHERE trim(checkout_session_id) <> '';
CREATE INDEX IF NOT EXISTS idx_commerce_orders_payment_status
  ON commerce_orders(workspace_id, payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commerce_orders_payment_intent
  ON commerce_orders(payment_intent_id)
  WHERE trim(payment_intent_id) <> '';

CREATE TABLE IF NOT EXISTS commerce_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  sku TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_minor INTEGER NOT NULL DEFAULT 0 CHECK (unit_price_minor >= 0),
  studio_cost_minor INTEGER NOT NULL DEFAULT 0 CHECK (studio_cost_minor >= 0),
  line_total_minor INTEGER NOT NULL DEFAULT 0 CHECK (line_total_minor >= 0),
  lab_connector_key TEXT NOT NULL DEFAULT '',
  lab_product_code TEXT NOT NULL DEFAULT '',
  lab_sku TEXT NOT NULL DEFAULT '',
  lab_attributes_json TEXT NOT NULL DEFAULT '{}',
  lab_print_area TEXT NOT NULL DEFAULT 'default',
  lab_sizing TEXT NOT NULL DEFAULT 'fillPrintArea',
  recommended_width_px INTEGER NOT NULL DEFAULT 0,
  recommended_height_px INTEGER NOT NULL DEFAULT 0,
  crop_json TEXT NOT NULL DEFAULT '{}',
  fulfilment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (fulfilment_status IN ('pending', 'approved', 'submitted', 'fulfilled', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES commerce_orders(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (product_id) REFERENCES commerce_products(id),
  FOREIGN KEY (variant_id) REFERENCES commerce_product_variants(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_order_items_order
  ON commerce_order_items(order_id, created_at, id);

CREATE TABLE IF NOT EXISTS commerce_payment_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  amount_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES commerce_orders(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_commerce_payment_events_provider
  ON commerce_payment_events(provider, provider_event_id)
  WHERE trim(provider_event_id) <> '';
CREATE INDEX IF NOT EXISTS idx_commerce_payment_events_order
  ON commerce_payment_events(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS commerce_print_assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  order_item_id TEXT NOT NULL UNIQUE,
  asset_id TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL UNIQUE,
  token_expires_at TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  width_px INTEGER NOT NULL DEFAULT 0,
  height_px INTEGER NOT NULL DEFAULT 0,
  source_width_px INTEGER NOT NULL DEFAULT 0,
  source_height_px INTEGER NOT NULL DEFAULT 0,
  file_size INTEGER NOT NULL DEFAULT 0,
  crop_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'prepared'
    CHECK (status IN ('prepared', 'submitted', 'revoked', 'error')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (order_item_id) REFERENCES commerce_order_items(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_print_assets_workspace
  ON commerce_print_assets(workspace_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_commerce_print_assets_token
  ON commerce_print_assets(access_token, token_expires_at);

CREATE TABLE IF NOT EXISTS commerce_lab_submissions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_order_id TEXT NOT NULL DEFAULT '',
  provider_outcome TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'quoted', 'submitted', 'in_progress', 'complete', 'cancelled', 'error')),
  shipping_method TEXT NOT NULL DEFAULT 'Budget',
  quote_amount_minor INTEGER NOT NULL DEFAULT 0,
  quote_currency TEXT NOT NULL DEFAULT 'GBP',
  request_json TEXT NOT NULL DEFAULT '{}',
  response_json TEXT NOT NULL DEFAULT '{}',
  last_error TEXT NOT NULL DEFAULT '',
  submitted_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (order_id) REFERENCES commerce_orders(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_lab_submissions_order
  ON commerce_lab_submissions(order_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_commerce_lab_submissions_provider_order
  ON commerce_lab_submissions(provider, provider_order_id)
  WHERE trim(provider_order_id) <> '';

CREATE TABLE IF NOT EXISTS commerce_lab_submission_items (
  submission_id TEXT NOT NULL,
  order_item_id TEXT NOT NULL,
  provider_item_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (submission_id, order_item_id),
  FOREIGN KEY (submission_id) REFERENCES commerce_lab_submissions(id),
  FOREIGN KEY (order_item_id) REFERENCES commerce_order_items(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_lab_submission_items_order_item
  ON commerce_lab_submission_items(order_item_id, status);

CREATE TABLE IF NOT EXISTS commerce_lab_events (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES commerce_lab_submissions(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_commerce_lab_events_provider
  ON commerce_lab_events(provider, provider_event_id)
  WHERE trim(provider_event_id) <> '';
CREATE INDEX IF NOT EXISTS idx_commerce_lab_events_submission
  ON commerce_lab_events(submission_id, created_at DESC);

INSERT OR IGNORE INTO client_gallery_store_settings (gallery_id, enabled, allow_crop, require_photographer_approval)
SELECT id, 0, 1, 1 FROM client_galleries;

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '22', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;

-- v1.8.0: WedPlanned commercial platform foundation.
CREATE TABLE IF NOT EXISTS platform_users (
  id TEXT PRIMARY KEY,
  email_normalized TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  platform_role TEXT NOT NULL DEFAULT 'member' CHECK (platform_role IN ('member', 'support', 'platform_admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
  last_signed_in_at TEXT,
  verified_at TEXT,
  last_authenticated_at TEXT,
  last_login_method TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_platform_users_status ON platform_users(status, email_normalized);

CREATE TABLE IF NOT EXISTS business_profiles (
  workspace_id TEXT PRIMARY KEY,
  public_name TEXT NOT NULL DEFAULT '',
  legal_name TEXT NOT NULL DEFAULT '',
  marketplace_slug TEXT NOT NULL DEFAULT '',
  business_type TEXT NOT NULL DEFAULT 'sole_trader' CHECK (business_type IN ('sole_trader', 'partnership', 'limited_company', 'charity', 'other')),
  summary TEXT NOT NULL DEFAULT '',
  year_established INTEGER,
  registration_country TEXT NOT NULL DEFAULT 'GB',
  company_number TEXT NOT NULL DEFAULT '',
  tax_number TEXT NOT NULL DEFAULT '',
  onboarding_status TEXT NOT NULL DEFAULT 'foundation' CHECK (onboarding_status IN ('foundation', 'profile', 'payments', 'ready', 'suspended')),
  marketplace_status TEXT NOT NULL DEFAULT 'private' CHECK (marketplace_status IN ('private', 'draft', 'review', 'published', 'suspended')),
  facebook TEXT NOT NULL DEFAULT '',
  tiktok TEXT NOT NULL DEFAULT '',
  linkedin TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_profiles_marketplace_slug ON business_profiles(marketplace_slug) WHERE trim(marketplace_slug) <> '';

CREATE TABLE IF NOT EXISTS business_memberships (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT,
  email_normalized TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  job_title TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'manager', 'content', 'finance', 'staff', 'viewer')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('active', 'invited', 'disabled')),
  permissions_json TEXT NOT NULL DEFAULT '{}',
  invited_at TEXT,
  accepted_at TEXT,
  last_active_at TEXT,
  invited_by_user_id TEXT,
  invitation_last_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, email_normalized),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_business_memberships_workspace ON business_memberships(workspace_id, status, role);
CREATE INDEX IF NOT EXISTS idx_business_memberships_user ON business_memberships(user_id, status);


CREATE TABLE IF NOT EXISTS platform_auth_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  membership_id TEXT,
  email_normalized TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'invitation')),
  token_hash TEXT NOT NULL UNIQUE,
  return_path TEXT NOT NULL DEFAULT '/admin',
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  revoked_at TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'manual', 'failed')),
  delivery_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES platform_users(id),
  FOREIGN KEY (membership_id) REFERENCES business_memberships(id)
);
CREATE INDEX IF NOT EXISTS idx_platform_auth_links_email ON platform_auth_links(email_normalized, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_auth_links_expiry ON platform_auth_links(expires_at, consumed_at, revoked_at);

CREATE TABLE IF NOT EXISTS platform_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  active_workspace_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES platform_users(id),
  FOREIGN KEY (active_workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_user ON platform_sessions(user_id, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_workspace ON platform_sessions(active_workspace_id, revoked_at, expires_at);

CREATE TABLE IF NOT EXISTS platform_categories (
  category_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT 'Wedding services',
  description TEXT NOT NULL DEFAULT '',
  icon_key TEXT NOT NULL DEFAULT 'sparkles',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_platform_categories_order ON platform_categories(status, group_name, sort_order, name);

CREATE TABLE IF NOT EXISTS business_category_links (
  workspace_id TEXT NOT NULL,
  category_key TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  profile_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, category_key),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (category_key) REFERENCES platform_categories(category_key)
);
CREATE INDEX IF NOT EXISTS idx_business_category_links_workspace ON business_category_links(workspace_id, status, is_primary DESC);

CREATE TABLE IF NOT EXISTS business_service_areas (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  label TEXT NOT NULL,
  area_type TEXT NOT NULL DEFAULT 'region' CHECK (area_type IN ('local', 'city', 'county', 'region', 'country', 'destination', 'remote', 'custom')),
  country_code TEXT NOT NULL DEFAULT 'GB',
  region_code TEXT NOT NULL DEFAULT '',
  radius_miles INTEGER,
  remote_available INTEGER NOT NULL DEFAULT 0 CHECK (remote_available IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_business_service_areas_workspace ON business_service_areas(workspace_id, status, sort_order, label);

CREATE TABLE IF NOT EXISTS platform_features (
  feature_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  unit_label TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_entitlements (
  workspace_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'plan' CHECK (source IN ('plan', 'trial', 'manual', 'internal')),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  limit_value INTEGER,
  starts_at TEXT,
  ends_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, feature_key),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (feature_key) REFERENCES platform_features(feature_key)
);
CREATE INDEX IF NOT EXISTS idx_workspace_entitlements_workspace ON workspace_entitlements(workspace_id, enabled, feature_key);

CREATE TABLE IF NOT EXISTS platform_audit_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  actor_user_id TEXT,
  actor_email TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (actor_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_platform_audit_events_workspace ON platform_audit_events(workspace_id, created_at DESC);

INSERT OR IGNORE INTO business_profiles (workspace_id, public_name, legal_name, marketplace_slug, business_type, summary, registration_country, onboarding_status, marketplace_status)
VALUES ('workspace_mkb_weddings', 'MKB Weddings', 'MKB Weddings', 'mkb-weddings', 'sole_trader', 'Wedding photography, galleries and content operated as the first WedPlanned business.', 'GB', 'foundation', 'private');

INSERT OR IGNORE INTO platform_categories (category_key, name, group_name, description, icon_key, sort_order) VALUES
('venue', 'Wedding venue', 'Places and planning', 'Venues, hotels, estates and ceremony locations.', 'building', 10),
('planner', 'Wedding planner', 'Places and planning', 'Wedding planning, coordination and on-the-day management.', 'calendar-check', 20),
('photographer', 'Photographer', 'Photo and film', 'Wedding photography and image delivery.', 'camera', 30),
('videographer', 'Videographer', 'Photo and film', 'Wedding films, highlights and cinematic coverage.', 'video', 40),
('content-creator', 'Wedding content creator', 'Photo and film', 'Short-form behind-the-scenes wedding content.', 'smartphone', 50),
('florist', 'Florist', 'Design and styling', 'Wedding flowers, installations and floral styling.', 'flower-2', 60),
('decor-styling', 'Decor and styling', 'Design and styling', 'Venue styling, decor, props and installations.', 'sparkles', 70),
('stationery', 'Stationery and signage', 'Design and styling', 'Invitations, stationery, signage and printed details.', 'notebook-tabs', 80),
('caterer', 'Caterer', 'Food and drink', 'Wedding catering and food service.', 'utensils', 90),
('cake', 'Cake maker', 'Food and drink', 'Wedding cakes, desserts and favours.', 'cake-slice', 100),
('bar', 'Bar and drinks', 'Food and drink', 'Mobile bars, drinks service and beverage suppliers.', 'wine', 110),
('band', 'Live band', 'Entertainment', 'Live wedding bands and musicians.', 'music-2', 120),
('dj', 'DJ', 'Entertainment', 'Wedding DJs, sound and evening entertainment.', 'disc-3', 130),
('entertainment', 'Entertainment', 'Entertainment', 'Performers, magicians, photo booths and guest entertainment.', 'party-popper', 140),
('celebrant', 'Celebrant', 'Ceremony', 'Wedding celebrants and personalised ceremonies.', 'heart-handshake', 150),
('officiant', 'Officiant', 'Ceremony', 'Religious and civil ceremony professionals.', 'book-open', 160),
('hair', 'Hair stylist', 'Beauty and attire', 'Bridal and wedding-party hair styling.', 'scissors', 170),
('makeup', 'Makeup artist', 'Beauty and attire', 'Bridal and wedding-party makeup.', 'brush', 180),
('attire', 'Wedding attire', 'Beauty and attire', 'Dresses, suits, accessories and alterations.', 'shirt', 190),
('jewellery', 'Jewellery', 'Beauty and attire', 'Wedding rings, jewellery and accessories.', 'gem', 200),
('transport', 'Wedding transport', 'Travel and accommodation', 'Cars, coaches and specialist wedding transport.', 'car-front', 210),
('accommodation', 'Accommodation', 'Travel and accommodation', 'Guest accommodation and wedding stays.', 'bed-double', 220),
('rentals', 'Hire and rentals', 'Services', 'Furniture, equipment, marquees and wedding hire.', 'package-open', 230),
('other', 'Other wedding professional', 'Services', 'A wedding service not covered by another category.', 'briefcase-business', 999);

INSERT OR IGNORE INTO business_category_links (workspace_id, category_key, is_primary, status)
VALUES ('workspace_mkb_weddings', 'photographer', 1, 'active');

INSERT OR IGNORE INTO platform_features (feature_key, name, description, unit_label, sort_order) VALUES
('business-profile', 'Business profile', 'Business identity, categories and service areas.', '', 10),
('team', 'Team members', 'Role-based access for business staff.', 'members', 20),
('crm', 'CRM', 'Contacts, enquiries, tasks and pipelines.', 'contacts', 30),
('bookings', 'Bookings', 'Services, availability, quotes and bookings.', 'bookings', 40),
('contracts', 'Contracts', 'Digital agreements and signatures.', 'contracts', 50),
('invoices', 'Invoices', 'Invoices, payment schedules and balances.', 'invoices', 60),
('connected-payments', 'Connected payments', 'Business-owned Stripe payments through WedPlanned.', 'payments', 70),
('marketplace', 'Marketplace profile', 'Public supplier discovery and advertising.', '', 80),
('content-tools', 'Content tools', 'Business content, social and collaborative real weddings.', '', 90),
('client-portal', 'Client portal', 'Private couple and client workspaces.', 'portals', 100),
('client-galleries', 'Client galleries', 'Private galleries, selections and delivery.', 'galleries', 110),
('print-store', 'Print store', 'Print ordering, payments and fulfilment.', 'orders', 120),
('analytics', 'Analytics', 'Business, marketing and conversion reporting.', '', 130);

INSERT OR IGNORE INTO workspace_entitlements (workspace_id, feature_key, source, enabled, limit_value)
SELECT 'workspace_mkb_weddings', feature_key, 'internal', 1, NULL FROM platform_features;

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '24', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;

-- v1.8.2: Legacy tenant ownership migration.
-- Additive ownership columns only. Existing MKB URLs and R2 objects are unchanged.
-- Runtime services resolve workspace ownership from authenticated membership
-- (Admin) or verified public domain (public site).
ALTER TABLE venues ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'workspace_mkb_weddings';
ALTER TABLE weddings ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'workspace_mkb_weddings';
ALTER TABLE images ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'workspace_mkb_weddings';
ALTER TABLE venue_images ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'workspace_mkb_weddings';
ALTER TABLE wedding_images ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'workspace_mkb_weddings';
ALTER TABLE story_images ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'workspace_mkb_weddings';
ALTER TABLE published_story_images ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'workspace_mkb_weddings';
ALTER TABLE wedding_suppliers ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'workspace_mkb_weddings';
ALTER TABLE suppliers ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'workspace_mkb_weddings';
ALTER TABLE wedding_supplier_links ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'workspace_mkb_weddings';
ALTER TABLE moments ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'workspace_mkb_weddings';
ALTER TABLE custom_collections ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'workspace_mkb_weddings';
ALTER TABLE collection_images ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'workspace_mkb_weddings';
ALTER TABLE content_pages ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'workspace_mkb_weddings';
ALTER TABLE asset_wedding_links ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'workspace_mkb_weddings';
ALTER TABLE asset_venue_links ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'workspace_mkb_weddings';
ALTER TABLE asset_moment_links ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'workspace_mkb_weddings';
ALTER TABLE asset_gallery_links ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'workspace_mkb_weddings';

UPDATE venues SET workspace_id = 'workspace_mkb_weddings' WHERE workspace_id = '' OR workspace_id IS NULL;
UPDATE weddings SET workspace_id = 'workspace_mkb_weddings' WHERE workspace_id = '' OR workspace_id IS NULL;
UPDATE images SET workspace_id = 'workspace_mkb_weddings' WHERE workspace_id = '' OR workspace_id IS NULL;
UPDATE venue_images SET workspace_id = 'workspace_mkb_weddings' WHERE workspace_id = '' OR workspace_id IS NULL;
UPDATE wedding_images SET workspace_id = 'workspace_mkb_weddings' WHERE workspace_id = '' OR workspace_id IS NULL;
UPDATE story_images SET workspace_id = 'workspace_mkb_weddings' WHERE workspace_id = '' OR workspace_id IS NULL;
UPDATE published_story_images SET workspace_id = 'workspace_mkb_weddings' WHERE workspace_id = '' OR workspace_id IS NULL;
UPDATE wedding_suppliers SET workspace_id = 'workspace_mkb_weddings' WHERE workspace_id = '' OR workspace_id IS NULL;
UPDATE suppliers SET workspace_id = 'workspace_mkb_weddings' WHERE workspace_id = '' OR workspace_id IS NULL;
UPDATE wedding_supplier_links SET workspace_id = 'workspace_mkb_weddings' WHERE workspace_id = '' OR workspace_id IS NULL;
UPDATE moments SET workspace_id = 'workspace_mkb_weddings' WHERE workspace_id = '' OR workspace_id IS NULL;
UPDATE custom_collections SET workspace_id = 'workspace_mkb_weddings' WHERE workspace_id = '' OR workspace_id IS NULL;
UPDATE collection_images SET workspace_id = 'workspace_mkb_weddings' WHERE workspace_id = '' OR workspace_id IS NULL;
UPDATE content_pages SET workspace_id = 'workspace_mkb_weddings' WHERE workspace_id = '' OR workspace_id IS NULL;
UPDATE asset_wedding_links SET workspace_id = 'workspace_mkb_weddings' WHERE workspace_id = '' OR workspace_id IS NULL;
UPDATE asset_venue_links SET workspace_id = 'workspace_mkb_weddings' WHERE workspace_id = '' OR workspace_id IS NULL;
UPDATE asset_moment_links SET workspace_id = 'workspace_mkb_weddings' WHERE workspace_id = '' OR workspace_id IS NULL;
UPDATE asset_gallery_links SET workspace_id = 'workspace_mkb_weddings' WHERE workspace_id = '' OR workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_venues_workspace ON venues(workspace_id, status, name);
CREATE INDEX IF NOT EXISTS idx_venues_workspace_slug ON venues(workspace_id, slug);
CREATE INDEX IF NOT EXISTS idx_weddings_workspace ON weddings(workspace_id, status, wedding_date);
CREATE INDEX IF NOT EXISTS idx_weddings_workspace_slug ON weddings(workspace_id, slug);
CREATE INDEX IF NOT EXISTS idx_images_workspace ON images(workspace_id, wedding_slug, filename);
CREATE INDEX IF NOT EXISTS idx_venue_images_workspace ON venue_images(workspace_id, venue_slug, included, sort_order);
CREATE INDEX IF NOT EXISTS idx_wedding_images_workspace ON wedding_images(workspace_id, wedding_slug, sort_order);
CREATE INDEX IF NOT EXISTS idx_story_images_workspace ON story_images(workspace_id, wedding_slug, sort_order);
CREATE INDEX IF NOT EXISTS idx_published_story_images_workspace ON published_story_images(workspace_id, wedding_slug, sort_order);
CREATE INDEX IF NOT EXISTS idx_wedding_suppliers_workspace ON wedding_suppliers(workspace_id, wedding_slug, sort_order);
CREATE INDEX IF NOT EXISTS idx_suppliers_workspace ON suppliers(workspace_id, status, name);
CREATE INDEX IF NOT EXISTS idx_wedding_supplier_links_workspace ON wedding_supplier_links(workspace_id, wedding_slug, sort_order);
CREATE INDEX IF NOT EXISTS idx_moments_workspace ON moments(workspace_id, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_custom_collections_workspace ON custom_collections(workspace_id, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_collection_images_workspace ON collection_images(workspace_id, collection_id, hidden, sort_order);
CREATE INDEX IF NOT EXISTS idx_content_pages_workspace ON content_pages(workspace_id, slug);
CREATE INDEX IF NOT EXISTS idx_asset_wedding_links_workspace ON asset_wedding_links(workspace_id, wedding_slug, sort_order);
CREATE INDEX IF NOT EXISTS idx_asset_venue_links_workspace ON asset_venue_links(workspace_id, venue_slug, sort_order);
CREATE INDEX IF NOT EXISTS idx_asset_moment_links_workspace ON asset_moment_links(workspace_id, moment_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_asset_gallery_links_workspace ON asset_gallery_links(workspace_id, gallery_id, hidden, sort_order);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '25', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
-- v1.8.3: WedPlanned platform operations foundation.
-- Adds time-bounded support authority, support audit events, workspace export history,
-- and staged business deletion requests. No workspace data is deleted by this migration.

CREATE TABLE IF NOT EXISTS platform_support_grants (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'read' CHECK (scope IN ('read', 'manage')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  reason TEXT NOT NULL DEFAULT '',
  granted_by_user_id TEXT,
  granted_by_email TEXT NOT NULL DEFAULT '',
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  revoked_by_user_id TEXT,
  revoked_by_email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (granted_by_user_id) REFERENCES platform_users(id),
  FOREIGN KEY (revoked_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_platform_support_grants_workspace
  ON platform_support_grants(workspace_id, status, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_support_grants_active
  ON platform_support_grants(status, expires_at, workspace_id);

CREATE TABLE IF NOT EXISTS platform_support_events (
  id TEXT PRIMARY KEY,
  grant_id TEXT,
  workspace_id TEXT NOT NULL,
  support_user_id TEXT,
  support_email TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT '',
  path TEXT NOT NULL DEFAULT '',
  status_code INTEGER,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (grant_id) REFERENCES platform_support_grants(id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (support_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_platform_support_events_workspace
  ON platform_support_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_support_events_grant
  ON platform_support_events(grant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS workspace_export_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  requested_by_user_id TEXT,
  requested_by_email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  format TEXT NOT NULL DEFAULT 'json' CHECK (format IN ('json')),
  file_name TEXT NOT NULL DEFAULT '',
  table_count INTEGER NOT NULL DEFAULT 0,
  record_count INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (requested_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_workspace_export_events_workspace
  ON workspace_export_events(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS workspace_deletion_requests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  requested_by_user_id TEXT,
  requested_by_email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'executing', 'completed', 'cancelled', 'rejected')),
  reason TEXT NOT NULL DEFAULT '',
  confirmation_name TEXT NOT NULL DEFAULT '',
  scheduled_for TEXT NOT NULL,
  retention_json TEXT NOT NULL DEFAULT '{}',
  cancelled_at TEXT,
  cancelled_by_user_id TEXT,
  cancelled_by_email TEXT NOT NULL DEFAULT '',
  resolved_at TEXT,
  resolved_by_user_id TEXT,
  resolved_by_email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (requested_by_user_id) REFERENCES platform_users(id),
  FOREIGN KEY (cancelled_by_user_id) REFERENCES platform_users(id),
  FOREIGN KEY (resolved_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_workspace_deletion_requests_workspace
  ON workspace_deletion_requests(workspace_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_deletion_requests_open
  ON workspace_deletion_requests(workspace_id)
  WHERE status IN ('requested', 'approved', 'executing');

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '26', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
-- v1.9.0: WedPlanned CRM foundation.
-- Adds workspace-owned contacts, enquiry pipeline, jobs, activity history and
-- a domain-resolved public lead-form configuration. Accepted enquiries create
-- a Job and link/create the existing Wedding content record.

CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  stage_key TEXT NOT NULL,
  name TEXT NOT NULL,
  stage_type TEXT NOT NULL DEFAULT 'open' CHECK (stage_type IN ('open', 'won', 'lost')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  color_key TEXT NOT NULL DEFAULT 'neutral',
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, stage_key),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_workspace
  ON crm_pipeline_stages(workspace_id, status, sort_order, name);

CREATE TABLE IF NOT EXISTS crm_contacts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  email_normalized TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  marketing_consent INTEGER NOT NULL DEFAULT 0 CHECK (marketing_consent IN (0, 1)),
  privacy_consent_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_contacts_workspace_email
  ON crm_contacts(workspace_id, email_normalized)
  WHERE trim(email_normalized) <> '';
CREATE INDEX IF NOT EXISTS idx_crm_contacts_workspace_name
  ON crm_contacts(workspace_id, status, display_name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS crm_enquiries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  reference TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost', 'archived')),
  source TEXT NOT NULL DEFAULT 'website',
  campaign TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL DEFAULT 'wedding',
  event_date TEXT NOT NULL DEFAULT '',
  date_flexibility TEXT NOT NULL DEFAULT '',
  venue_text TEXT NOT NULL DEFAULT '',
  venue_id TEXT NOT NULL DEFAULT '',
  venue_slug TEXT NOT NULL DEFAULT '',
  service_interest TEXT NOT NULL DEFAULT '',
  package_interest TEXT NOT NULL DEFAULT '',
  budget_min INTEGER,
  budget_max INTEGER,
  currency TEXT NOT NULL DEFAULT 'GBP',
  notes TEXT NOT NULL DEFAULT '',
  assigned_user_id TEXT,
  consent_json TEXT NOT NULL DEFAULT '{}',
  request_fingerprint TEXT NOT NULL DEFAULT '',
  contacted_at TEXT,
  qualified_at TEXT,
  won_at TEXT,
  lost_at TEXT,
  lost_reason TEXT NOT NULL DEFAULT '',
  accepted_job_id TEXT,
  converted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, reference),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (stage_id) REFERENCES crm_pipeline_stages(id),
  FOREIGN KEY (assigned_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_enquiries_workspace_stage
  ON crm_enquiries(workspace_id, status, stage_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_enquiries_workspace_event_date
  ON crm_enquiries(workspace_id, event_date, status);
CREATE INDEX IF NOT EXISTS idx_crm_enquiries_fingerprint
  ON crm_enquiries(workspace_id, request_fingerprint, created_at DESC);

CREATE TABLE IF NOT EXISTS crm_enquiry_contacts (
  enquiry_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('primary', 'partner', 'planner', 'venue_contact', 'billing', 'participant')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (enquiry_id, contact_id, role),
  FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_enquiry_contacts_workspace
  ON crm_enquiry_contacts(workspace_id, contact_id, enquiry_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_enquiry_contacts_single_role
  ON crm_enquiry_contacts(workspace_id, enquiry_id, role)
  WHERE role IN ('primary', 'partner');

CREATE TABLE IF NOT EXISTS crm_jobs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  reference TEXT NOT NULL,
  enquiry_id TEXT,
  job_type TEXT NOT NULL DEFAULT 'wedding',
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('provisional', 'booked', 'active', 'completed', 'cancelled', 'archived')),
  title TEXT NOT NULL DEFAULT '',
  booking_date TEXT NOT NULL DEFAULT '',
  event_date TEXT NOT NULL DEFAULT '',
  service_name TEXT NOT NULL DEFAULT '',
  package_name TEXT NOT NULL DEFAULT '',
  value_amount INTEGER,
  currency TEXT NOT NULL DEFAULT 'GBP',
  assigned_user_id TEXT,
  venue_text TEXT NOT NULL DEFAULT '',
  venue_id TEXT NOT NULL DEFAULT '',
  venue_slug TEXT NOT NULL DEFAULT '',
  client_portal_status TEXT NOT NULL DEFAULT 'not_invited' CHECK (client_portal_status IN ('not_invited', 'invited', 'active', 'closed')),
  wedding_slug TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, reference),
  UNIQUE (workspace_id, enquiry_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id),
  FOREIGN KEY (assigned_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_jobs_workspace_status
  ON crm_jobs(workspace_id, status, event_date, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_jobs_wedding
  ON crm_jobs(workspace_id, wedding_slug);

CREATE TABLE IF NOT EXISTS crm_job_contacts (
  job_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('primary', 'partner', 'planner', 'venue_contact', 'billing', 'participant')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (job_id, contact_id, role),
  FOREIGN KEY (job_id) REFERENCES crm_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_job_contacts_workspace
  ON crm_job_contacts(workspace_id, contact_id, job_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_job_contacts_single_role
  ON crm_job_contacts(workspace_id, job_id, role)
  WHERE role IN ('primary', 'partner');

CREATE TABLE IF NOT EXISTS crm_activities (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'enquiry', 'job')),
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  actor_user_id TEXT,
  actor_email TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (actor_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_activities_entity
  ON crm_activities(workspace_id, entity_type, entity_id, created_at DESC);

-- Relationship triggers enforce that linked CRM rows belong to the same workspace.
CREATE TRIGGER IF NOT EXISTS trg_crm_enquiry_stage_workspace_insert
BEFORE INSERT ON crm_enquiries
WHEN NOT EXISTS (
  SELECT 1 FROM crm_pipeline_stages stage
  WHERE stage.id = NEW.stage_id AND stage.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM enquiry stage workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_enquiry_stage_workspace_update
BEFORE UPDATE OF stage_id, workspace_id ON crm_enquiries
WHEN NOT EXISTS (
  SELECT 1 FROM crm_pipeline_stages stage
  WHERE stage.id = NEW.stage_id AND stage.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM enquiry stage workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_enquiry_contact_workspace_insert
BEFORE INSERT ON crm_enquiry_contacts
WHEN NOT EXISTS (
  SELECT 1 FROM crm_enquiries enquiry
  WHERE enquiry.id = NEW.enquiry_id AND enquiry.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM crm_contacts contact
  WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM enquiry contact workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_enquiry_contact_workspace_update
BEFORE UPDATE OF enquiry_id, contact_id, workspace_id ON crm_enquiry_contacts
WHEN NOT EXISTS (
  SELECT 1 FROM crm_enquiries enquiry
  WHERE enquiry.id = NEW.enquiry_id AND enquiry.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM crm_contacts contact
  WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM enquiry contact workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_enquiry_workspace_insert
BEFORE INSERT ON crm_jobs
WHEN NEW.enquiry_id IS NOT NULL AND trim(NEW.enquiry_id) <> '' AND NOT EXISTS (
  SELECT 1 FROM crm_enquiries enquiry
  WHERE enquiry.id = NEW.enquiry_id AND enquiry.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM job enquiry workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_enquiry_workspace_update
BEFORE UPDATE OF enquiry_id, workspace_id ON crm_jobs
WHEN NEW.enquiry_id IS NOT NULL AND trim(NEW.enquiry_id) <> '' AND NOT EXISTS (
  SELECT 1 FROM crm_enquiries enquiry
  WHERE enquiry.id = NEW.enquiry_id AND enquiry.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM job enquiry workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_contact_workspace_insert
BEFORE INSERT ON crm_job_contacts
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM crm_contacts contact
  WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM job contact workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_contact_workspace_update
BEFORE UPDATE OF job_id, contact_id, workspace_id ON crm_job_contacts
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM crm_contacts contact
  WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM job contact workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_enquiry_accepted_job_workspace
BEFORE UPDATE OF accepted_job_id, workspace_id ON crm_enquiries
WHEN NEW.accepted_job_id IS NOT NULL AND trim(NEW.accepted_job_id) <> '' AND NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.accepted_job_id AND job.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM accepted job workspace mismatch');
END;

CREATE TABLE IF NOT EXISTS crm_lead_form_settings (
  workspace_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  public_path TEXT NOT NULL DEFAULT '/enquire',
  default_service TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT 'Tell us about your wedding',
  intro TEXT NOT NULL DEFAULT 'Share the key details and we will be in touch.',
  thank_you_title TEXT NOT NULL DEFAULT 'Thank you',
  thank_you_message TEXT NOT NULL DEFAULT 'Your enquiry has been received. We will be in touch soon.',
  notification_email TEXT NOT NULL DEFAULT '',
  privacy_text TEXT NOT NULL DEFAULT 'I agree that my details may be used to respond to this enquiry.',
  consent_required INTEGER NOT NULL DEFAULT 1 CHECK (consent_required IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

INSERT OR IGNORE INTO crm_pipeline_stages (id, workspace_id, stage_key, name, stage_type, sort_order, color_key, is_default)
SELECT 'crm_stage_' || id || '_new', id, 'new', 'New enquiry', 'open', 10, 'blue', 1 FROM workspaces;
INSERT OR IGNORE INTO crm_pipeline_stages (id, workspace_id, stage_key, name, stage_type, sort_order, color_key)
SELECT 'crm_stage_' || id || '_contacted', id, 'contacted', 'Contacted', 'open', 20, 'violet' FROM workspaces;
INSERT OR IGNORE INTO crm_pipeline_stages (id, workspace_id, stage_key, name, stage_type, sort_order, color_key)
SELECT 'crm_stage_' || id || '_qualified', id, 'qualified', 'Qualified', 'open', 30, 'amber' FROM workspaces;
INSERT OR IGNORE INTO crm_pipeline_stages (id, workspace_id, stage_key, name, stage_type, sort_order, color_key)
SELECT 'crm_stage_' || id || '_proposal', id, 'proposal', 'Proposal / quote sent', 'open', 40, 'orange' FROM workspaces;
INSERT OR IGNORE INTO crm_pipeline_stages (id, workspace_id, stage_key, name, stage_type, sort_order, color_key)
SELECT 'crm_stage_' || id || '_awaiting', id, 'awaiting', 'Awaiting decision', 'open', 50, 'pink' FROM workspaces;
INSERT OR IGNORE INTO crm_pipeline_stages (id, workspace_id, stage_key, name, stage_type, sort_order, color_key)
SELECT 'crm_stage_' || id || '_accepted', id, 'accepted', 'Accepted', 'won', 60, 'green' FROM workspaces;
INSERT OR IGNORE INTO crm_pipeline_stages (id, workspace_id, stage_key, name, stage_type, sort_order, color_key)
SELECT 'crm_stage_' || id || '_lost', id, 'lost', 'Lost / unavailable', 'lost', 70, 'red' FROM workspaces;

INSERT OR IGNORE INTO crm_lead_form_settings (
  workspace_id, enabled, default_service, title, intro, notification_email, privacy_text
)
SELECT
  ws.workspace_id,
  CASE WHEN ws.workspace_id = 'workspace_mkb_weddings' THEN 1 ELSE 0 END,
  CASE WHEN ws.workspace_id = 'workspace_mkb_weddings' THEN 'Wedding photography' ELSE '' END,
  'Tell us about your wedding',
  'Share your date, venue and plans. We normally reply within 24 hours.',
  COALESCE(NULLIF(ws.contact_email, ''), ''),
  'I agree that my details may be used to respond to this enquiry.'
FROM workspace_settings ws;

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '27', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
-- v1.9.1a: Client portal and questionnaires.
-- Adds workspace-owned questionnaire templates and versioned instances,
-- authenticated client access to Jobs, one-time portal invitations,
-- structured autosaved responses and private questionnaire attachments.

CREATE TABLE IF NOT EXISTS crm_questionnaire_templates (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  schema_json TEXT NOT NULL DEFAULT '[]',
  created_by_user_id TEXT,
  updated_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (created_by_user_id) REFERENCES platform_users(id),
  FOREIGN KEY (updated_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_questionnaire_templates_workspace
  ON crm_questionnaire_templates(workspace_id, status, updated_at DESC, name);

CREATE TABLE IF NOT EXISTS crm_questionnaire_instances (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  template_id TEXT,
  assigned_contact_id TEXT,
  title TEXT NOT NULL,
  introduction TEXT NOT NULL DEFAULT '',
  schema_json TEXT NOT NULL DEFAULT '[]',
  template_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'opened', 'in_progress', 'completed', 'archived')),
  due_at TEXT,
  sent_at TEXT,
  opened_at TEXT,
  completed_at TEXT,
  last_saved_at TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (job_id) REFERENCES crm_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES crm_questionnaire_templates(id),
  FOREIGN KEY (assigned_contact_id) REFERENCES crm_contacts(id),
  FOREIGN KEY (created_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_questionnaire_instances_job
  ON crm_questionnaire_instances(workspace_id, job_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_questionnaire_instances_contact
  ON crm_questionnaire_instances(workspace_id, assigned_contact_id, status, due_at);

CREATE TABLE IF NOT EXISTS crm_questionnaire_responses (
  instance_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  field_key TEXT NOT NULL,
  value_json TEXT NOT NULL DEFAULT 'null',
  updated_by_identity_id TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (instance_id, field_key),
  FOREIGN KEY (instance_id) REFERENCES crm_questionnaire_instances(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (updated_by_identity_id) REFERENCES client_identities(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_questionnaire_responses_workspace
  ON crm_questionnaire_responses(workspace_id, instance_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS crm_questionnaire_files (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  instance_id TEXT NOT NULL,
  field_key TEXT NOT NULL,
  identity_id TEXT,
  storage_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (instance_id) REFERENCES crm_questionnaire_instances(id) ON DELETE CASCADE,
  FOREIGN KEY (identity_id) REFERENCES client_identities(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_questionnaire_files_instance
  ON crm_questionnaire_files(workspace_id, instance_id, field_key, status, uploaded_at DESC);

CREATE TABLE IF NOT EXISTS crm_job_client_access (
  job_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  identity_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'primary' CHECK (role IN ('primary', 'partner', 'participant')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  invited_at TEXT,
  accepted_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (job_id, identity_id),
  FOREIGN KEY (job_id) REFERENCES crm_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id),
  FOREIGN KEY (identity_id) REFERENCES client_identities(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_job_client_access_identity
  ON crm_job_client_access(workspace_id, identity_id, status, job_id);
CREATE INDEX IF NOT EXISTS idx_crm_job_client_access_contact
  ON crm_job_client_access(workspace_id, contact_id, status, job_id);

CREATE TABLE IF NOT EXISTS crm_portal_invitations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  identity_id TEXT NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  return_path TEXT NOT NULL DEFAULT '/client-portal',
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (job_id) REFERENCES crm_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id),
  FOREIGN KEY (identity_id) REFERENCES client_identities(id),
  FOREIGN KEY (created_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_portal_invitations_identity
  ON crm_portal_invitations(workspace_id, identity_id, job_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_portal_invitations_expiry
  ON crm_portal_invitations(expires_at, consumed_at);

-- Every relationship remains within one workspace.
CREATE TRIGGER IF NOT EXISTS trg_crm_questionnaire_instance_workspace_insert
BEFORE INSERT ON crm_questionnaire_instances
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR (
  NEW.template_id IS NOT NULL AND trim(NEW.template_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_questionnaire_templates template
    WHERE template.id = NEW.template_id AND template.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.assigned_contact_id IS NOT NULL AND trim(NEW.assigned_contact_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_contacts contact
    WHERE contact.id = NEW.assigned_contact_id AND contact.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM questionnaire instance workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_questionnaire_instance_workspace_update
BEFORE UPDATE OF job_id, template_id, assigned_contact_id, workspace_id ON crm_questionnaire_instances
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR (
  NEW.template_id IS NOT NULL AND trim(NEW.template_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_questionnaire_templates template
    WHERE template.id = NEW.template_id AND template.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.assigned_contact_id IS NOT NULL AND trim(NEW.assigned_contact_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_contacts contact
    WHERE contact.id = NEW.assigned_contact_id AND contact.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM questionnaire instance workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_questionnaire_response_workspace_insert
BEFORE INSERT ON crm_questionnaire_responses
WHEN NOT EXISTS (
  SELECT 1 FROM crm_questionnaire_instances instance
  WHERE instance.id = NEW.instance_id AND instance.workspace_id = NEW.workspace_id
) OR (
  NEW.updated_by_identity_id IS NOT NULL AND trim(NEW.updated_by_identity_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM client_identities identity
    WHERE identity.id = NEW.updated_by_identity_id AND identity.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM questionnaire response workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_questionnaire_response_workspace_update
BEFORE UPDATE OF instance_id, updated_by_identity_id, workspace_id ON crm_questionnaire_responses
WHEN NOT EXISTS (
  SELECT 1 FROM crm_questionnaire_instances instance
  WHERE instance.id = NEW.instance_id AND instance.workspace_id = NEW.workspace_id
) OR (
  NEW.updated_by_identity_id IS NOT NULL AND trim(NEW.updated_by_identity_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM client_identities identity
    WHERE identity.id = NEW.updated_by_identity_id AND identity.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM questionnaire response workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_questionnaire_file_workspace_insert
BEFORE INSERT ON crm_questionnaire_files
WHEN NOT EXISTS (
  SELECT 1 FROM crm_questionnaire_instances instance
  WHERE instance.id = NEW.instance_id AND instance.workspace_id = NEW.workspace_id
) OR (
  NEW.identity_id IS NOT NULL AND trim(NEW.identity_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM client_identities identity
    WHERE identity.id = NEW.identity_id AND identity.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM questionnaire file workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_client_access_workspace_insert
BEFORE INSERT ON crm_job_client_access
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM crm_contacts contact
  WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM client_identities identity
  WHERE identity.id = NEW.identity_id AND identity.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM job client access workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_client_access_workspace_update
BEFORE UPDATE OF job_id, contact_id, identity_id, workspace_id ON crm_job_client_access
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM crm_contacts contact
  WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM client_identities identity
  WHERE identity.id = NEW.identity_id AND identity.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM job client access workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_portal_invitation_workspace_insert
BEFORE INSERT ON crm_portal_invitations
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM crm_contacts contact
  WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM client_identities identity
  WHERE identity.id = NEW.identity_id AND identity.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM portal invitation workspace mismatch');
END;

-- Seed one editable starter questionnaire per existing workspace.
INSERT OR IGNORE INTO crm_questionnaire_templates (
  id, workspace_id, name, description, status, version, schema_json
)
SELECT
  'crm_questionnaire_template_' || id || '_pre_wedding',
  id,
  'Pre-wedding questionnaire',
  'Collect the practical details needed to prepare for the wedding day.',
  'active',
  1,
  '[{"id":"couple_names","type":"short_text","label":"Couple names","help":"Confirm how you would like your names shown.","required":true,"options":[]},{"id":"morning_prep","type":"long_text","label":"Morning preparation address","help":"Include postcode and any access details.","required":true,"options":[]},{"id":"ceremony_details","type":"long_text","label":"Ceremony details","help":"Venue, address, start time and officiant if known.","required":true,"options":[]},{"id":"reception_details","type":"long_text","label":"Reception and key timings","help":"Meal, speeches, first dance and any unusual events.","required":false,"options":[]},{"id":"supplier_notes","type":"long_text","label":"Supplier team","help":"Add any known supplier names for now. Supplier Master matching follows in v1.9.1b.","required":false,"options":[]},{"id":"photography_priorities","type":"long_text","label":"Photography priorities","help":"Tell us about important people, moments or restrictions.","required":false,"options":[]},{"id":"reference_files","type":"file","label":"Reference photographs or documents","help":"Optional files up to 10 MB each.","required":false,"options":[]}]'
FROM workspaces;

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '28', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
-- v1.9.1b: Supplier questionnaire integration and Job workspace improvements.
-- Adds workspace-owned supplier review records generated from completed client
-- questionnaires. Existing Supplier Master selections link automatically to the
-- accepted Wedding; unlisted suppliers enter an approval queue.

CREATE TABLE IF NOT EXISTS crm_supplier_submissions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  wedding_slug TEXT NOT NULL DEFAULT '',
  instance_id TEXT NOT NULL,
  field_key TEXT NOT NULL,
  response_index INTEGER NOT NULL DEFAULT 0,
  contact_id TEXT,
  role TEXT NOT NULL DEFAULT 'Supplier',
  supplier_id TEXT,
  proposed_name TEXT NOT NULL DEFAULT '',
  proposed_website TEXT NOT NULL DEFAULT '',
  proposed_instagram TEXT NOT NULL DEFAULT '',
  proposed_email TEXT NOT NULL DEFAULT '',
  proposed_phone TEXT NOT NULL DEFAULT '',
  proposed_location TEXT NOT NULL DEFAULT '',
  proposed_county TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'linked', 'approved', 'rejected')),
  resolved_supplier_id TEXT,
  review_notes TEXT NOT NULL DEFAULT '',
  reviewed_by_user_id TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (instance_id, field_key, response_index),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (job_id) REFERENCES crm_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (instance_id) REFERENCES crm_questionnaire_instances(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (resolved_supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (reviewed_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_supplier_submissions_job
  ON crm_supplier_submissions(workspace_id, job_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_supplier_submissions_review
  ON crm_supplier_submissions(workspace_id, status, proposed_name COLLATE NOCASE);

CREATE TRIGGER IF NOT EXISTS trg_crm_supplier_submission_workspace_insert
BEFORE INSERT ON crm_supplier_submissions
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM crm_questionnaire_instances instance
  WHERE instance.id = NEW.instance_id
    AND instance.workspace_id = NEW.workspace_id
    AND instance.job_id = NEW.job_id
) OR (
  NEW.contact_id IS NOT NULL AND trim(NEW.contact_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_contacts contact
    WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.supplier_id IS NOT NULL AND trim(NEW.supplier_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM suppliers supplier
    WHERE supplier.id = NEW.supplier_id AND supplier.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.resolved_supplier_id IS NOT NULL AND trim(NEW.resolved_supplier_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM suppliers supplier
    WHERE supplier.id = NEW.resolved_supplier_id AND supplier.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM supplier submission workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_supplier_submission_workspace_update
BEFORE UPDATE OF workspace_id, job_id, instance_id, contact_id, supplier_id, resolved_supplier_id ON crm_supplier_submissions
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR NOT EXISTS (
  SELECT 1 FROM crm_questionnaire_instances instance
  WHERE instance.id = NEW.instance_id
    AND instance.workspace_id = NEW.workspace_id
    AND instance.job_id = NEW.job_id
) OR (
  NEW.contact_id IS NOT NULL AND trim(NEW.contact_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_contacts contact
    WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.supplier_id IS NOT NULL AND trim(NEW.supplier_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM suppliers supplier
    WHERE supplier.id = NEW.supplier_id AND supplier.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.resolved_supplier_id IS NOT NULL AND trim(NEW.resolved_supplier_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM suppliers supplier
    WHERE supplier.id = NEW.resolved_supplier_id AND supplier.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM supplier submission workspace mismatch');
END;

-- Upgrade the untouched starter supplier-notes question to a structured Supplier Master field.
UPDATE crm_questionnaire_templates
SET schema_json = replace(
      schema_json,
      '{"id":"supplier_notes","type":"long_text","label":"Supplier team","help":"Add any known supplier names for now. Supplier Master matching follows in v1.9.1b.","required":false,"options":[]}',
      '{"id":"supplier_team","type":"supplier","label":"Supplier team","help":"Choose suppliers already listed or add a supplier for approval.","required":false,"options":[],"supplierRole":"Supplier","supplierCategory":"","allowUnlisted":true,"multiple":true}'
    ),
    version = version + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE schema_json LIKE '%"id":"supplier_notes","type":"long_text"%';

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '29', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
-- v1.9.2: Workflow templates, tasks, communication history and lead autoresponders.
-- Adds reusable workspace-owned workflows, Job task generation, structured
-- communication records and configurable acknowledgement emails for public leads.

CREATE TABLE IF NOT EXISTS crm_workflow_templates (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  applies_to TEXT NOT NULL DEFAULT 'job' CHECK (applies_to IN ('job')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, name),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_templates_workspace
  ON crm_workflow_templates(workspace_id, status, is_default DESC, name COLLATE NOCASE);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_workflow_templates_one_default
  ON crm_workflow_templates(workspace_id)
  WHERE is_default = 1 AND status = 'active';

CREATE TABLE IF NOT EXISTS crm_workflow_template_steps (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  task_type TEXT NOT NULL DEFAULT 'task' CHECK (task_type IN ('task', 'email', 'call', 'meeting', 'milestone')),
  relative_to TEXT NOT NULL DEFAULT 'event_date' CHECK (relative_to IN ('booking_date', 'event_date')),
  offset_days INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  required INTEGER NOT NULL DEFAULT 1 CHECK (required IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (template_id) REFERENCES crm_workflow_templates(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_steps_template
  ON crm_workflow_template_steps(workspace_id, template_id, sort_order, name);

CREATE TABLE IF NOT EXISTS crm_job_workflows (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  template_id TEXT,
  template_name TEXT NOT NULL DEFAULT '',
  template_version INTEGER NOT NULL DEFAULT 1,
  snapshot_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  applied_by_user_id TEXT,
  applied_by_email TEXT NOT NULL DEFAULT '',
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (job_id) REFERENCES crm_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES crm_workflow_templates(id),
  FOREIGN KEY (applied_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_job_workflows_job
  ON crm_job_workflows(workspace_id, job_id, status, applied_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_job_workflows_active
  ON crm_job_workflows(workspace_id, job_id)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS crm_tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  job_id TEXT,
  enquiry_id TEXT,
  workflow_id TEXT,
  template_step_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  task_type TEXT NOT NULL DEFAULT 'task' CHECK (task_type IN ('task', 'email', 'call', 'meeting', 'milestone')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_at TEXT NOT NULL DEFAULT '',
  assigned_user_id TEXT,
  created_by_user_id TEXT,
  completed_by_user_id TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (job_id) REFERENCES crm_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id) ON DELETE CASCADE,
  FOREIGN KEY (workflow_id) REFERENCES crm_job_workflows(id) ON DELETE SET NULL,
  FOREIGN KEY (template_step_id) REFERENCES crm_workflow_template_steps(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_user_id) REFERENCES platform_users(id),
  FOREIGN KEY (created_by_user_id) REFERENCES platform_users(id),
  FOREIGN KEY (completed_by_user_id) REFERENCES platform_users(id),
  CHECK (job_id IS NOT NULL OR enquiry_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_workspace_status
  ON crm_tasks(workspace_id, status, due_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_job
  ON crm_tasks(workspace_id, job_id, status, due_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_enquiry
  ON crm_tasks(workspace_id, enquiry_id, status, due_at, created_at DESC);

CREATE TABLE IF NOT EXISTS crm_communications (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  contact_id TEXT,
  enquiry_id TEXT,
  job_id TEXT,
  channel TEXT NOT NULL DEFAULT 'note' CHECK (channel IN ('email', 'phone', 'sms', 'meeting', 'note')),
  direction TEXT NOT NULL DEFAULT 'internal' CHECK (direction IN ('inbound', 'outbound', 'internal')),
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'logged' CHECK (status IN ('draft', 'logged', 'sent', 'failed')),
  provider TEXT NOT NULL DEFAULT '',
  provider_message_id TEXT NOT NULL DEFAULT '',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_user_id TEXT,
  actor_email TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id),
  FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES crm_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES platform_users(id),
  CHECK (contact_id IS NOT NULL OR enquiry_id IS NOT NULL OR job_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_crm_communications_job
  ON crm_communications(workspace_id, job_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_communications_enquiry
  ON crm_communications(workspace_id, enquiry_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_communications_contact
  ON crm_communications(workspace_id, contact_id, occurred_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_crm_workflow_step_workspace_insert
BEFORE INSERT ON crm_workflow_template_steps
WHEN NOT EXISTS (
  SELECT 1 FROM crm_workflow_templates template
  WHERE template.id = NEW.template_id AND template.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM workflow step workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_workflow_step_workspace_update
BEFORE UPDATE OF workspace_id, template_id ON crm_workflow_template_steps
WHEN NOT EXISTS (
  SELECT 1 FROM crm_workflow_templates template
  WHERE template.id = NEW.template_id AND template.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(ABORT, 'CRM workflow step workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_workflow_workspace_insert
BEFORE INSERT ON crm_job_workflows
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR (
  NEW.template_id IS NOT NULL AND trim(NEW.template_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_workflow_templates template
    WHERE template.id = NEW.template_id AND template.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM Job workflow workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_workflow_workspace_update
BEFORE UPDATE OF workspace_id, job_id, template_id ON crm_job_workflows
WHEN NOT EXISTS (
  SELECT 1 FROM crm_jobs job
  WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
) OR (
  NEW.template_id IS NOT NULL AND trim(NEW.template_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_workflow_templates template
    WHERE template.id = NEW.template_id AND template.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM Job workflow workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_task_workspace_insert
BEFORE INSERT ON crm_tasks
WHEN (
  NEW.job_id IS NOT NULL AND trim(NEW.job_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_jobs job WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.enquiry_id IS NOT NULL AND trim(NEW.enquiry_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_enquiries enquiry WHERE enquiry.id = NEW.enquiry_id AND enquiry.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.workflow_id IS NOT NULL AND trim(NEW.workflow_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_job_workflows workflow
    WHERE workflow.id = NEW.workflow_id AND workflow.workspace_id = NEW.workspace_id
      AND (NEW.job_id IS NULL OR workflow.job_id = NEW.job_id)
  )
) OR (
  NEW.template_step_id IS NOT NULL AND trim(NEW.template_step_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_workflow_template_steps step
    WHERE step.id = NEW.template_step_id AND step.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM task workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_task_workspace_update
BEFORE UPDATE OF workspace_id, job_id, enquiry_id, workflow_id, template_step_id ON crm_tasks
WHEN (
  NEW.job_id IS NOT NULL AND trim(NEW.job_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_jobs job WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.enquiry_id IS NOT NULL AND trim(NEW.enquiry_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_enquiries enquiry WHERE enquiry.id = NEW.enquiry_id AND enquiry.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.workflow_id IS NOT NULL AND trim(NEW.workflow_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_job_workflows workflow
    WHERE workflow.id = NEW.workflow_id AND workflow.workspace_id = NEW.workspace_id
      AND (NEW.job_id IS NULL OR workflow.job_id = NEW.job_id)
  )
) OR (
  NEW.template_step_id IS NOT NULL AND trim(NEW.template_step_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_workflow_template_steps step
    WHERE step.id = NEW.template_step_id AND step.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM task workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_communication_workspace_insert
BEFORE INSERT ON crm_communications
WHEN (
  NEW.contact_id IS NOT NULL AND trim(NEW.contact_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_contacts contact WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.enquiry_id IS NOT NULL AND trim(NEW.enquiry_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_enquiries enquiry WHERE enquiry.id = NEW.enquiry_id AND enquiry.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.job_id IS NOT NULL AND trim(NEW.job_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_jobs job WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM communication workspace mismatch');
END;

CREATE TRIGGER IF NOT EXISTS trg_crm_communication_workspace_update
BEFORE UPDATE OF workspace_id, contact_id, enquiry_id, job_id ON crm_communications
WHEN (
  NEW.contact_id IS NOT NULL AND trim(NEW.contact_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_contacts contact WHERE contact.id = NEW.contact_id AND contact.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.enquiry_id IS NOT NULL AND trim(NEW.enquiry_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_enquiries enquiry WHERE enquiry.id = NEW.enquiry_id AND enquiry.workspace_id = NEW.workspace_id
  )
) OR (
  NEW.job_id IS NOT NULL AND trim(NEW.job_id) <> '' AND NOT EXISTS (
    SELECT 1 FROM crm_jobs job WHERE job.id = NEW.job_id AND job.workspace_id = NEW.workspace_id
  )
)
BEGIN
  SELECT RAISE(ABORT, 'CRM communication workspace mismatch');
END;

ALTER TABLE crm_lead_form_settings ADD COLUMN autoresponder_enabled INTEGER NOT NULL DEFAULT 0 CHECK (autoresponder_enabled IN (0, 1));
ALTER TABLE crm_lead_form_settings ADD COLUMN autoresponder_subject TEXT NOT NULL DEFAULT 'We have received your enquiry';
ALTER TABLE crm_lead_form_settings ADD COLUMN autoresponder_message TEXT NOT NULL DEFAULT 'Thank you for getting in touch. We have received your enquiry and will reply as soon as possible.';

INSERT OR IGNORE INTO crm_workflow_templates (
  id, workspace_id, name, description, applies_to, status, version, is_default
)
SELECT
  'crm_workflow_template_' || id || '_standard',
  id,
  'Standard client workflow',
  'A practical booking-to-event workflow that can be edited for this business.',
  'job',
  'active',
  1,
  1
FROM workspaces;

INSERT OR IGNORE INTO crm_workflow_template_steps (
  id, workspace_id, template_id, name, description, task_type, relative_to, offset_days, priority, sort_order, required
)
SELECT 'crm_workflow_step_' || id || '_confirm', id, 'crm_workflow_template_' || id || '_standard',
       'Confirm booking details', 'Check the accepted service, date, venue and client details.', 'task', 'booking_date', 0, 'high', 10, 1
FROM workspaces;
INSERT OR IGNORE INTO crm_workflow_template_steps (
  id, workspace_id, template_id, name, description, task_type, relative_to, offset_days, priority, sort_order, required
)
SELECT 'crm_workflow_step_' || id || '_questionnaire', id, 'crm_workflow_template_' || id || '_standard',
       'Send client questionnaire', 'Assign the relevant questionnaire and confirm portal access.', 'email', 'event_date', -90, 'normal', 20, 1
FROM workspaces;
INSERT OR IGNORE INTO crm_workflow_template_steps (
  id, workspace_id, template_id, name, description, task_type, relative_to, offset_days, priority, sort_order, required
)
SELECT 'crm_workflow_step_' || id || '_final_details', id, 'crm_workflow_template_' || id || '_standard',
       'Review final details', 'Confirm schedule, suppliers, access and any final requirements.', 'call', 'event_date', -14, 'high', 30, 1
FROM workspaces;
INSERT OR IGNORE INTO crm_workflow_template_steps (
  id, workspace_id, template_id, name, description, task_type, relative_to, offset_days, priority, sort_order, required
)
SELECT 'crm_workflow_step_' || id || '_prepare', id, 'crm_workflow_template_' || id || '_standard',
       'Prepare event brief', 'Review the full Job workspace and prepare the operational brief.', 'task', 'event_date', -2, 'high', 40, 1
FROM workspaces;
INSERT OR IGNORE INTO crm_workflow_template_steps (
  id, workspace_id, template_id, name, description, task_type, relative_to, offset_days, priority, sort_order, required
)
SELECT 'crm_workflow_step_' || id || '_follow_up', id, 'crm_workflow_template_' || id || '_standard',
       'Post-event follow-up', 'Record follow-up actions and start the delivery workflow.', 'task', 'event_date', 2, 'normal', 50, 1
FROM workspaces;

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '30', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;

-- v1.9.3a: Configurable packages, quotes and client portal acceptance.
-- Adds workspace-owned package/add-on catalogues, immutable quote versions,
-- secure pre-booking portal access and audited quote-to-Job conversion.

CREATE TABLE IF NOT EXISTS crm_packages (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'wedding',
  internal_code TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  price_amount INTEGER NOT NULL DEFAULT 0 CHECK (price_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  coverage_minutes INTEGER CHECK (coverage_minutes IS NULL OR coverage_minutes >= 0),
  deliverables_json TEXT NOT NULL DEFAULT '[]',
  included_items_json TEXT NOT NULL DEFAULT '[]',
  client_notes TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  recommended INTEGER NOT NULL DEFAULT 0 CHECK (recommended IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'archived')),
  image_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_packages_workspace
  ON crm_packages(workspace_id, status, service_type, display_order, name COLLATE NOCASE);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_packages_workspace_code
  ON crm_packages(workspace_id, internal_code)
  WHERE trim(internal_code) <> '';

CREATE TABLE IF NOT EXISTS crm_addons (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_amount INTEGER NOT NULL DEFAULT 0 CHECK (price_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  service_type TEXT NOT NULL DEFAULT 'wedding',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'archived')),
  display_order INTEGER NOT NULL DEFAULT 0,
  availability_scope TEXT NOT NULL DEFAULT 'all' CHECK (availability_scope IN ('all', 'selected')),
  minimum_quantity INTEGER NOT NULL DEFAULT 0 CHECK (minimum_quantity >= 0),
  maximum_quantity INTEGER NOT NULL DEFAULT 1 CHECK (maximum_quantity >= minimum_quantity),
  requirement TEXT NOT NULL DEFAULT 'optional' CHECK (requirement IN ('optional', 'recommended', 'mandatory')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_addons_workspace
  ON crm_addons(workspace_id, status, service_type, display_order, name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS crm_package_addons (
  workspace_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  addon_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (package_id, addon_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (package_id) REFERENCES crm_packages(id) ON DELETE CASCADE,
  FOREIGN KEY (addon_id) REFERENCES crm_addons(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_crm_package_addons_workspace
  ON crm_package_addons(workspace_id, addon_id, package_id);

CREATE TABLE IF NOT EXISTS crm_quotes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  enquiry_id TEXT NOT NULL,
  primary_contact_id TEXT NOT NULL,
  reference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'superseded')),
  current_version_id TEXT,
  accepted_version_id TEXT,
  accepted_job_id TEXT,
  currency TEXT NOT NULL DEFAULT 'GBP',
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, reference),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (enquiry_id) REFERENCES crm_enquiries(id),
  FOREIGN KEY (primary_contact_id) REFERENCES crm_contacts(id),
  FOREIGN KEY (created_by_user_id) REFERENCES platform_users(id),
  FOREIGN KEY (accepted_job_id) REFERENCES crm_jobs(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_quotes_workspace_status
  ON crm_quotes(workspace_id, status, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_quotes_enquiry_unique
  ON crm_quotes(workspace_id, enquiry_id);
CREATE INDEX IF NOT EXISTS idx_crm_quotes_enquiry
  ON crm_quotes(workspace_id, enquiry_id, created_at DESC);

CREATE TABLE IF NOT EXISTS crm_quote_versions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  quote_id TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1 CHECK (version_number > 0),
  previous_version_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'superseded')),
  client_notes TEXT NOT NULL DEFAULT '',
  internal_notes TEXT NOT NULL DEFAULT '',
  expires_at TEXT,
  discount_type TEXT NOT NULL DEFAULT 'none' CHECK (discount_type IN ('none', 'fixed', 'percentage')),
  discount_value INTEGER NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  tax_treatment TEXT NOT NULL DEFAULT 'none' CHECK (tax_treatment IN ('none', 'inclusive', 'exclusive')),
  tax_rate_basis_points INTEGER NOT NULL DEFAULT 0 CHECK (tax_rate_basis_points >= 0),
  subtotal_amount INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  discount_amount INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount INTEGER NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount INTEGER NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  sent_at TEXT,
  viewed_at TEXT,
  accepted_at TEXT,
  declined_at TEXT,
  provider TEXT NOT NULL DEFAULT '',
  provider_message_id TEXT NOT NULL DEFAULT '',
  failure_reason TEXT NOT NULL DEFAULT '',
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (quote_id, version_number),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (quote_id) REFERENCES crm_quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (previous_version_id) REFERENCES crm_quote_versions(id),
  FOREIGN KEY (created_by_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_quote_versions_quote
  ON crm_quote_versions(workspace_id, quote_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_crm_quote_versions_status
  ON crm_quote_versions(workspace_id, status, expires_at, updated_at DESC);

CREATE TABLE IF NOT EXISTS crm_quote_options (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  package_id TEXT,
  option_type TEXT NOT NULL DEFAULT 'catalogue' CHECK (option_type IN ('catalogue', 'bespoke')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  service_type TEXT NOT NULL DEFAULT 'wedding',
  internal_code TEXT NOT NULL DEFAULT '',
  base_price_amount INTEGER NOT NULL DEFAULT 0 CHECK (base_price_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  coverage_minutes INTEGER CHECK (coverage_minutes IS NULL OR coverage_minutes >= 0),
  deliverables_json TEXT NOT NULL DEFAULT '[]',
  included_items_json TEXT NOT NULL DEFAULT '[]',
  client_notes TEXT NOT NULL DEFAULT '',
  recommended INTEGER NOT NULL DEFAULT 0 CHECK (recommended IN (0, 1)),
  display_order INTEGER NOT NULL DEFAULT 0,
  package_snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (version_id) REFERENCES crm_quote_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES crm_packages(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_quote_options_version
  ON crm_quote_options(workspace_id, version_id, display_order, name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS crm_quote_option_items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'custom' CHECK (item_type IN ('included', 'custom')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_amount INTEGER NOT NULL DEFAULT 0 CHECK (unit_price_amount >= 0),
  display_order INTEGER NOT NULL DEFAULT 0,
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (version_id) REFERENCES crm_quote_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES crm_quote_options(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_crm_quote_option_items_option
  ON crm_quote_option_items(workspace_id, option_id, display_order);

CREATE TABLE IF NOT EXISTS crm_quote_option_addons (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  addon_id TEXT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  unit_price_amount INTEGER NOT NULL DEFAULT 0 CHECK (unit_price_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  minimum_quantity INTEGER NOT NULL DEFAULT 0 CHECK (minimum_quantity >= 0),
  maximum_quantity INTEGER NOT NULL DEFAULT 1 CHECK (maximum_quantity >= minimum_quantity),
  default_quantity INTEGER NOT NULL DEFAULT 0 CHECK (default_quantity >= 0 AND default_quantity <= maximum_quantity),
  requirement TEXT NOT NULL DEFAULT 'optional' CHECK (requirement IN ('optional', 'recommended', 'mandatory')),
  display_order INTEGER NOT NULL DEFAULT 0,
  addon_snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (version_id) REFERENCES crm_quote_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES crm_quote_options(id) ON DELETE CASCADE,
  FOREIGN KEY (addon_id) REFERENCES crm_addons(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_quote_option_addons_option
  ON crm_quote_option_addons(workspace_id, option_id, display_order, name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS crm_quote_client_access (
  quote_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  identity_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  invited_at TEXT,
  last_viewed_at TEXT,
  accepted_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (quote_id, identity_id),
  FOREIGN KEY (quote_id) REFERENCES crm_quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id),
  FOREIGN KEY (identity_id) REFERENCES client_identities(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_quote_client_access_identity
  ON crm_quote_client_access(workspace_id, identity_id, status, quote_id);

CREATE TABLE IF NOT EXISTS crm_quote_invitations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  quote_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  identity_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  return_path TEXT NOT NULL DEFAULT '/client-portal',
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (quote_id) REFERENCES crm_quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES crm_quote_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id),
  FOREIGN KEY (identity_id) REFERENCES client_identities(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_quote_invitations_identity
  ON crm_quote_invitations(workspace_id, identity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_quote_invitations_expiry
  ON crm_quote_invitations(expires_at, consumed_at);

CREATE TABLE IF NOT EXISTS crm_quote_acceptances (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  quote_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  identity_id TEXT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('client', 'admin')),
  actor_user_id TEXT,
  actor_email TEXT NOT NULL DEFAULT '',
  accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  client_ip_hash TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  subtotal_amount INTEGER NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  selected_package_snapshot_json TEXT NOT NULL DEFAULT '{}',
  selected_addons_snapshot_json TEXT NOT NULL DEFAULT '[]',
  audit_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (quote_id),
  UNIQUE (version_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (quote_id) REFERENCES crm_quotes(id),
  FOREIGN KEY (version_id) REFERENCES crm_quote_versions(id),
  FOREIGN KEY (option_id) REFERENCES crm_quote_options(id),
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id),
  FOREIGN KEY (identity_id) REFERENCES client_identities(id),
  FOREIGN KEY (actor_user_id) REFERENCES platform_users(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_quote_acceptances_workspace
  ON crm_quote_acceptances(workspace_id, accepted_at DESC);

CREATE TABLE IF NOT EXISTS crm_quote_acceptance_addons (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  acceptance_id TEXT NOT NULL,
  quote_option_addon_id TEXT NOT NULL,
  addon_id TEXT,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_amount INTEGER NOT NULL DEFAULT 0,
  line_total_amount INTEGER NOT NULL DEFAULT 0,
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (acceptance_id) REFERENCES crm_quote_acceptances(id) ON DELETE CASCADE,
  FOREIGN KEY (quote_option_addon_id) REFERENCES crm_quote_option_addons(id),
  FOREIGN KEY (addon_id) REFERENCES crm_addons(id)
);
CREATE INDEX IF NOT EXISTS idx_crm_quote_acceptance_addons
  ON crm_quote_acceptance_addons(workspace_id, acceptance_id);

ALTER TABLE crm_jobs ADD COLUMN quote_id TEXT;
ALTER TABLE crm_jobs ADD COLUMN quote_version_id TEXT;
ALTER TABLE crm_jobs ADD COLUMN quote_reference TEXT NOT NULL DEFAULT '';
ALTER TABLE crm_jobs ADD COLUMN quote_version_number INTEGER;
ALTER TABLE crm_jobs ADD COLUMN accepted_quote_at TEXT;
ALTER TABLE crm_jobs ADD COLUMN booking_subtotal INTEGER;
ALTER TABLE crm_jobs ADD COLUMN booking_discount INTEGER;
ALTER TABLE crm_jobs ADD COLUMN booking_tax INTEGER;
ALTER TABLE crm_jobs ADD COLUMN package_snapshot_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE crm_jobs ADD COLUMN addons_snapshot_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE crm_jobs ADD COLUMN quote_snapshot_json TEXT NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_jobs_quote
  ON crm_jobs(workspace_id, quote_id)
  WHERE quote_id IS NOT NULL AND trim(quote_id) <> '';

ALTER TABLE crm_communications ADD COLUMN quote_id TEXT;
ALTER TABLE crm_communications ADD COLUMN quote_version_id TEXT;
ALTER TABLE crm_communications ADD COLUMN failure_reason TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_crm_communications_quote
  ON crm_communications(workspace_id, quote_id, occurred_at DESC);

-- Workspace relationship guards.
CREATE TRIGGER IF NOT EXISTS trg_crm_package_addon_workspace_insert
BEFORE INSERT ON crm_package_addons
WHEN NOT EXISTS (SELECT 1 FROM crm_packages p WHERE p.id = NEW.package_id AND p.workspace_id = NEW.workspace_id)
  OR NOT EXISTS (SELECT 1 FROM crm_addons a WHERE a.id = NEW.addon_id AND a.workspace_id = NEW.workspace_id)
BEGIN SELECT RAISE(ABORT, 'CRM package add-on workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_workspace_insert
BEFORE INSERT ON crm_quotes
WHEN NOT EXISTS (SELECT 1 FROM crm_enquiries e WHERE e.id = NEW.enquiry_id AND e.workspace_id = NEW.workspace_id)
  OR NOT EXISTS (SELECT 1 FROM crm_contacts c WHERE c.id = NEW.primary_contact_id AND c.workspace_id = NEW.workspace_id)
BEGIN SELECT RAISE(ABORT, 'CRM quote workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_workspace_update
BEFORE UPDATE OF workspace_id, enquiry_id, primary_contact_id, current_version_id, accepted_version_id, accepted_job_id ON crm_quotes
WHEN NOT EXISTS (SELECT 1 FROM crm_enquiries e WHERE e.id = NEW.enquiry_id AND e.workspace_id = NEW.workspace_id)
  OR NOT EXISTS (SELECT 1 FROM crm_contacts c WHERE c.id = NEW.primary_contact_id AND c.workspace_id = NEW.workspace_id)
  OR (NEW.current_version_id IS NOT NULL AND trim(NEW.current_version_id) <> '' AND NOT EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = NEW.current_version_id AND v.workspace_id = NEW.workspace_id AND v.quote_id = NEW.id))
  OR (NEW.accepted_version_id IS NOT NULL AND trim(NEW.accepted_version_id) <> '' AND NOT EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = NEW.accepted_version_id AND v.workspace_id = NEW.workspace_id AND v.quote_id = NEW.id))
  OR (NEW.accepted_job_id IS NOT NULL AND trim(NEW.accepted_job_id) <> '' AND NOT EXISTS (SELECT 1 FROM crm_jobs j WHERE j.id = NEW.accepted_job_id AND j.workspace_id = NEW.workspace_id AND (j.quote_id = NEW.id OR j.enquiry_id = NEW.enquiry_id)))
BEGIN SELECT RAISE(ABORT, 'CRM quote workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_version_workspace_insert
BEFORE INSERT ON crm_quote_versions
WHEN NOT EXISTS (SELECT 1 FROM crm_quotes q WHERE q.id = NEW.quote_id AND q.workspace_id = NEW.workspace_id)
  OR (NEW.previous_version_id IS NOT NULL AND trim(NEW.previous_version_id) <> '' AND NOT EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = NEW.previous_version_id AND v.workspace_id = NEW.workspace_id AND v.quote_id = NEW.quote_id))
BEGIN SELECT RAISE(ABORT, 'CRM quote version workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_option_workspace_insert
BEFORE INSERT ON crm_quote_options
WHEN NOT EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = NEW.version_id AND v.workspace_id = NEW.workspace_id)
  OR (NEW.package_id IS NOT NULL AND trim(NEW.package_id) <> '' AND NOT EXISTS (SELECT 1 FROM crm_packages p WHERE p.id = NEW.package_id AND p.workspace_id = NEW.workspace_id))
BEGIN SELECT RAISE(ABORT, 'CRM quote option workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_option_item_workspace_insert
BEFORE INSERT ON crm_quote_option_items
WHEN NOT EXISTS (SELECT 1 FROM crm_quote_options o WHERE o.id = NEW.option_id AND o.workspace_id = NEW.workspace_id AND o.version_id = NEW.version_id)
BEGIN SELECT RAISE(ABORT, 'CRM quote option item workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_option_addon_workspace_insert
BEFORE INSERT ON crm_quote_option_addons
WHEN NOT EXISTS (SELECT 1 FROM crm_quote_options o WHERE o.id = NEW.option_id AND o.workspace_id = NEW.workspace_id AND o.version_id = NEW.version_id)
  OR (NEW.addon_id IS NOT NULL AND trim(NEW.addon_id) <> '' AND NOT EXISTS (SELECT 1 FROM crm_addons a WHERE a.id = NEW.addon_id AND a.workspace_id = NEW.workspace_id))
BEGIN SELECT RAISE(ABORT, 'CRM quote option add-on workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_access_workspace_insert
BEFORE INSERT ON crm_quote_client_access
WHEN NOT EXISTS (SELECT 1 FROM crm_quotes q WHERE q.id = NEW.quote_id AND q.workspace_id = NEW.workspace_id AND q.primary_contact_id = NEW.contact_id)
  OR NOT EXISTS (SELECT 1 FROM client_identities i WHERE i.id = NEW.identity_id AND i.workspace_id = NEW.workspace_id)
BEGIN SELECT RAISE(ABORT, 'CRM quote client access workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_invitation_workspace_insert
BEFORE INSERT ON crm_quote_invitations
WHEN NOT EXISTS (SELECT 1 FROM crm_quotes q WHERE q.id = NEW.quote_id AND q.workspace_id = NEW.workspace_id AND q.primary_contact_id = NEW.contact_id AND q.current_version_id = NEW.version_id)
  OR NOT EXISTS (SELECT 1 FROM crm_quote_client_access a WHERE a.quote_id = NEW.quote_id AND a.workspace_id = NEW.workspace_id AND a.identity_id = NEW.identity_id AND a.status = 'active')
BEGIN SELECT RAISE(ABORT, 'CRM quote invitation workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_acceptance_workspace_insert
BEFORE INSERT ON crm_quote_acceptances
WHEN NOT EXISTS (SELECT 1 FROM crm_quotes q WHERE q.id = NEW.quote_id AND q.workspace_id = NEW.workspace_id AND q.primary_contact_id = NEW.contact_id AND q.current_version_id = NEW.version_id)
  OR NOT EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = NEW.version_id AND v.workspace_id = NEW.workspace_id AND v.quote_id = NEW.quote_id)
  OR NOT EXISTS (SELECT 1 FROM crm_quote_options o WHERE o.id = NEW.option_id AND o.workspace_id = NEW.workspace_id AND o.version_id = NEW.version_id)
  OR (NEW.identity_id IS NOT NULL AND trim(NEW.identity_id) <> '' AND NOT EXISTS (SELECT 1 FROM client_identities i WHERE i.id = NEW.identity_id AND i.workspace_id = NEW.workspace_id))
BEGIN SELECT RAISE(ABORT, 'CRM quote acceptance workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_acceptance_addon_workspace_insert
BEFORE INSERT ON crm_quote_acceptance_addons
WHEN NOT EXISTS (
  SELECT 1 FROM crm_quote_acceptances a
  JOIN crm_quote_option_addons o ON o.id = NEW.quote_option_addon_id
    AND o.workspace_id = a.workspace_id AND o.version_id = a.version_id AND o.option_id = a.option_id
  WHERE a.id = NEW.acceptance_id AND a.workspace_id = NEW.workspace_id
)
BEGIN SELECT RAISE(ABORT, 'CRM quote acceptance add-on workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_acceptance_addon_late_insert
BEFORE INSERT ON crm_quote_acceptance_addons
WHEN NOT EXISTS (SELECT 1 FROM crm_quote_acceptance_addons existing WHERE existing.id = NEW.id)
  AND EXISTS (
    SELECT 1 FROM crm_quote_acceptances a
    JOIN crm_quote_versions v ON v.id = a.version_id AND v.workspace_id = a.workspace_id
    WHERE a.id = NEW.acceptance_id AND a.workspace_id = NEW.workspace_id AND v.status = 'accepted'
  )
BEGIN SELECT RAISE(ABORT, 'Quote acceptance add-ons are immutable'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_acceptance_immutable_update
BEFORE UPDATE ON crm_quote_acceptances
BEGIN SELECT RAISE(ABORT, 'Quote acceptances are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_acceptance_immutable_delete
BEFORE DELETE ON crm_quote_acceptances
BEGIN SELECT RAISE(ABORT, 'Quote acceptances are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_acceptance_addon_immutable_update
BEFORE UPDATE ON crm_quote_acceptance_addons
BEGIN SELECT RAISE(ABORT, 'Quote acceptance add-ons are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_acceptance_addon_immutable_delete
BEFORE DELETE ON crm_quote_acceptance_addons
BEGIN SELECT RAISE(ABORT, 'Quote acceptance add-ons are immutable'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_quote_workspace_insert
BEFORE INSERT ON crm_jobs
WHEN NEW.quote_id IS NOT NULL AND trim(NEW.quote_id) <> '' AND NOT EXISTS (
  SELECT 1 FROM crm_quotes q WHERE q.id = NEW.quote_id AND q.workspace_id = NEW.workspace_id AND q.current_version_id = NEW.quote_version_id
)
BEGIN SELECT RAISE(ABORT, 'CRM Job quote workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_job_quote_workspace_update
BEFORE UPDATE OF workspace_id, quote_id, quote_version_id ON crm_jobs
WHEN NEW.quote_id IS NOT NULL AND trim(NEW.quote_id) <> '' AND NOT EXISTS (
  SELECT 1 FROM crm_quotes q WHERE q.id = NEW.quote_id AND q.workspace_id = NEW.workspace_id AND (q.current_version_id = NEW.quote_version_id OR q.accepted_version_id = NEW.quote_version_id)
)
BEGIN SELECT RAISE(ABORT, 'CRM Job quote workspace mismatch'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_communication_quote_workspace_insert
BEFORE INSERT ON crm_communications
WHEN NEW.quote_id IS NOT NULL AND trim(NEW.quote_id) <> '' AND NOT EXISTS (
  SELECT 1 FROM crm_quotes q WHERE q.id = NEW.quote_id AND q.workspace_id = NEW.workspace_id
    AND (NEW.quote_version_id IS NULL OR trim(NEW.quote_version_id) = '' OR EXISTS (
      SELECT 1 FROM crm_quote_versions v WHERE v.id = NEW.quote_version_id AND v.quote_id = q.id AND v.workspace_id = q.workspace_id
    ))
)
BEGIN SELECT RAISE(ABORT, 'CRM communication quote workspace mismatch'); END;

-- Sent and accepted quote versions are immutable except for controlled lifecycle timestamps/status.
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_version_locked_delete
BEFORE DELETE ON crm_quote_versions
WHEN OLD.status <> 'draft'
BEGIN SELECT RAISE(ABORT, 'Sent quote versions cannot be deleted'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_version_status_transition
BEFORE UPDATE OF status ON crm_quote_versions
WHEN NOT (
  NEW.status = OLD.status
  OR (OLD.status = 'draft' AND NEW.status = 'sent')
  OR (OLD.status IN ('sent', 'viewed') AND NEW.status IN ('viewed', 'accepted', 'declined', 'expired', 'superseded'))
  OR (OLD.status IN ('declined', 'expired') AND NEW.status = 'superseded')
)
BEGIN SELECT RAISE(ABORT, 'Invalid quote version status transition'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_version_accepted_immutable
BEFORE UPDATE ON crm_quote_versions
WHEN OLD.status = 'accepted'
BEGIN SELECT RAISE(ABORT, 'Accepted quote versions are immutable'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_accepted_immutable
BEFORE UPDATE ON crm_quotes
WHEN OLD.status = 'accepted'
BEGIN SELECT RAISE(ABORT, 'Accepted quotes are immutable'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_version_locked_content
BEFORE UPDATE OF client_notes, internal_notes, expires_at, discount_type, discount_value,
  tax_treatment, tax_rate_basis_points, currency, snapshot_json ON crm_quote_versions
WHEN OLD.status <> 'draft'
BEGIN SELECT RAISE(ABORT, 'Sent quote versions are immutable'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_version_locked_totals
BEFORE UPDATE OF subtotal_amount, discount_amount, tax_amount, total_amount ON crm_quote_versions
WHEN OLD.status <> 'draft' AND NOT (OLD.status IN ('sent', 'viewed') AND NEW.status = 'accepted')
BEGIN SELECT RAISE(ABORT, 'Sent quote totals are immutable'); END;

CREATE TRIGGER IF NOT EXISTS trg_crm_quote_option_locked_update
BEFORE UPDATE ON crm_quote_options
WHEN EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = OLD.version_id AND v.status <> 'draft')
BEGIN SELECT RAISE(ABORT, 'Sent quote options are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_option_locked_delete
BEFORE DELETE ON crm_quote_options
WHEN EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = OLD.version_id AND v.status <> 'draft')
BEGIN SELECT RAISE(ABORT, 'Sent quote options are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_item_locked_update
BEFORE UPDATE ON crm_quote_option_items
WHEN EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = OLD.version_id AND v.status <> 'draft')
BEGIN SELECT RAISE(ABORT, 'Sent quote line items are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_item_locked_delete
BEFORE DELETE ON crm_quote_option_items
WHEN EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = OLD.version_id AND v.status <> 'draft')
BEGIN SELECT RAISE(ABORT, 'Sent quote line items are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_addon_locked_update
BEFORE UPDATE ON crm_quote_option_addons
WHEN EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = OLD.version_id AND v.status <> 'draft')
BEGIN SELECT RAISE(ABORT, 'Sent quote add-ons are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_addon_locked_delete
BEFORE DELETE ON crm_quote_option_addons
WHEN EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = OLD.version_id AND v.status <> 'draft')
BEGIN SELECT RAISE(ABORT, 'Sent quote add-ons are immutable'); END;


CREATE TRIGGER IF NOT EXISTS trg_crm_quote_option_locked_insert
BEFORE INSERT ON crm_quote_options
WHEN EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = NEW.version_id AND v.status <> 'draft')
BEGIN SELECT RAISE(ABORT, 'Sent quote options are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_item_locked_insert
BEFORE INSERT ON crm_quote_option_items
WHEN EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = NEW.version_id AND v.status <> 'draft')
BEGIN SELECT RAISE(ABORT, 'Sent quote line items are immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_crm_quote_addon_locked_insert
BEFORE INSERT ON crm_quote_option_addons
WHEN EXISTS (SELECT 1 FROM crm_quote_versions v WHERE v.id = NEW.version_id AND v.status <> 'draft')
BEGIN SELECT RAISE(ABORT, 'Sent quote add-ons are immutable'); END;

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '31', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;

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

-- v1.9.8a refinement: stable sidebar controls, richer module surfaces and
-- a platform-owned logo/icon library. Additive only.

ALTER TABLE platform_module_configurations
  ADD COLUMN page_background_color TEXT NOT NULL DEFAULT '#F5F3EF';

ALTER TABLE platform_module_configurations
  ADD COLUMN section_background_color TEXT NOT NULL DEFAULT '#FFFFFF';

CREATE TABLE IF NOT EXISTS platform_brand_assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL
    CHECK (asset_type IN ('logo', 'icon')),
  storage_key TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  uploaded_by_user_id TEXT,
  uploaded_by_email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by_user_id) REFERENCES platform_users(id)
);

CREATE INDEX IF NOT EXISTS idx_platform_brand_assets_status_type
  ON platform_brand_assets(status, asset_type, name);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '33', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;

-- v1.9.8a final UI refinement: distinct operational record-card surfaces.
-- Additive only.

ALTER TABLE platform_module_configurations
  ADD COLUMN record_background_color TEXT NOT NULL DEFAULT '#FFFFFF';

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '34', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
-- v1.10.1a: exact platform and module branding assets.
-- Additive only. Existing mark_url remains the module icon/mark field.

ALTER TABLE platform_module_configurations
  ADD COLUMN wordmark_url TEXT NOT NULL DEFAULT '';

ALTER TABLE platform_module_configurations
  ADD COLUMN compact_wordmark_url TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS platform_branding_settings (
  id TEXT PRIMARY KEY
    CHECK (id = 'default'),
  platform_name TEXT NOT NULL DEFAULT 'WedPlanned',
  wordmark_url TEXT NOT NULL DEFAULT '',
  compact_wordmark_url TEXT NOT NULL DEFAULT '',
  icon_url TEXT NOT NULL DEFAULT '',
  updated_by_user_id TEXT,
  updated_by_email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by_user_id) REFERENCES platform_users(id)
);

INSERT OR IGNORE INTO platform_branding_settings (
  id,
  platform_name,
  wordmark_url,
  compact_wordmark_url,
  icon_url
) VALUES (
  'default',
  'WedPlanned',
  '',
  '',
  ''
);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '35', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;

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

-- v1.10.3a: WedPlanned public website appearance and publication history.
-- Platform-owned only. No business workspace or tenant association.
-- Draft and published themes are deliberately separated so appearance changes
-- can be previewed safely before they alter the live WedPlanned website.

CREATE TABLE IF NOT EXISTS platform_public_site_appearance (
  id TEXT PRIMARY KEY
    CHECK (id = 'wedplanned'),
  draft_json TEXT NOT NULL DEFAULT '{}',
  published_json TEXT NOT NULL DEFAULT '{}',
  published_version INTEGER NOT NULL DEFAULT 0
    CHECK (published_version >= 0),
  updated_by_user_id TEXT,
  updated_by_email TEXT NOT NULL DEFAULT '',
  published_by_user_id TEXT,
  published_by_email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT,
  FOREIGN KEY (updated_by_user_id) REFERENCES platform_users(id),
  FOREIGN KEY (published_by_user_id) REFERENCES platform_users(id)
);

INSERT OR IGNORE INTO platform_public_site_appearance (
  id,
  draft_json,
  published_json,
  published_version
) VALUES (
  'wedplanned',
  '{}',
  '{}',
  0
);

CREATE TABLE IF NOT EXISTS platform_public_site_appearance_versions (
  id TEXT PRIMARY KEY,
  site_key TEXT NOT NULL DEFAULT 'wedplanned'
    CHECK (site_key = 'wedplanned'),
  version INTEGER NOT NULL
    CHECK (version > 0),
  theme_json TEXT NOT NULL,
  published_by_user_id TEXT,
  published_by_email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (site_key, version),
  FOREIGN KEY (published_by_user_id) REFERENCES platform_users(id)
);

CREATE INDEX IF NOT EXISTS idx_platform_public_site_appearance_versions
  ON platform_public_site_appearance_versions(
    site_key,
    version DESC
  );

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '38', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;

-- v1.10.5a: WedCRM booking pack, contracts and invoicing foundation.
-- Adds workspace-owned commercial configuration, contract version/signature
-- history and invoices with payment schedules and immutable payment records.

CREATE TABLE IF NOT EXISTS crm_booking_settings (
  workspace_id TEXT PRIMARY KEY,

  auto_create_contract INTEGER NOT NULL DEFAULT 1
    CHECK (auto_create_contract IN (0, 1)),

  auto_create_invoice INTEGER NOT NULL DEFAULT 1
    CHECK (auto_create_invoice IN (0, 1)),

  auto_assign_questionnaire INTEGER NOT NULL DEFAULT 0
    CHECK (auto_assign_questionnaire IN (0, 1)),

  default_contract_template_id TEXT,
  default_questionnaire_template_id TEXT,

  deposit_type TEXT NOT NULL DEFAULT 'none'
    CHECK (deposit_type IN ('none', 'fixed', 'percentage')),

  deposit_value INTEGER NOT NULL DEFAULT 0
    CHECK (deposit_value >= 0),

  deposit_due_days_after_acceptance INTEGER NOT NULL DEFAULT 0
    CHECK (deposit_due_days_after_acceptance >= 0),

  final_balance_due_days_before_event INTEGER NOT NULL DEFAULT 30
    CHECK (final_balance_due_days_before_event >= 0),

  questionnaire_due_days_before_event INTEGER NOT NULL DEFAULT 60
    CHECK (questionnaire_due_days_before_event >= 0),

  invoice_notes TEXT NOT NULL DEFAULT '',
  invoice_terms TEXT NOT NULL DEFAULT '',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (default_questionnaire_template_id)
    REFERENCES crm_questionnaire_templates(id)
);

CREATE TABLE IF NOT EXISTS crm_contract_templates (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',

  content_json TEXT NOT NULL DEFAULT '[]',
  signature_message TEXT NOT NULL DEFAULT '',

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_crm_contract_templates_workspace_name
ON crm_contract_templates(
  workspace_id,
  name COLLATE NOCASE
);

CREATE INDEX IF NOT EXISTS
idx_crm_contract_templates_workspace_status
ON crm_contract_templates(
  workspace_id,
  status,
  updated_at DESC
);

CREATE TABLE IF NOT EXISTS crm_contracts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  job_id TEXT NOT NULL,
  primary_contact_id TEXT,
  template_id TEXT,

  quote_acceptance_id TEXT,

  source_kind TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_kind IN ('manual', 'accepted_quote')),

  source_id TEXT NOT NULL DEFAULT '',

  reference TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (
      status IN (
        'draft',
        'sent',
        'viewed',
        'signed',
        'void'
      )
    ),

  current_version_id TEXT,
  signed_version_id TEXT,

  created_by_user_id TEXT,

  sent_at TEXT,
  viewed_at TEXT,
  signed_at TEXT,
  voided_at TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (job_id)
    REFERENCES crm_jobs(id),

  FOREIGN KEY (primary_contact_id)
    REFERENCES crm_contacts(id),

  FOREIGN KEY (template_id)
    REFERENCES crm_contract_templates(id),

  FOREIGN KEY (quote_acceptance_id)
    REFERENCES crm_quote_acceptances(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_crm_contracts_workspace_reference
ON crm_contracts(
  workspace_id,
  reference
);

CREATE INDEX IF NOT EXISTS
idx_crm_contracts_workspace_job
ON crm_contracts(
  workspace_id,
  job_id,
  created_at DESC
);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_crm_contracts_acceptance_source
ON crm_contracts(
  workspace_id,
  quote_acceptance_id
)
WHERE quote_acceptance_id IS NOT NULL
  AND trim(quote_acceptance_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS
idx_crm_contracts_source
ON crm_contracts(
  workspace_id,
  source_kind,
  source_id
)
WHERE trim(source_id) <> '';

CREATE TABLE IF NOT EXISTS crm_contract_versions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  contract_id TEXT NOT NULL,

  version_number INTEGER NOT NULL
    CHECK (version_number >= 1),

  previous_version_id TEXT,

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (
      status IN (
        'draft',
        'sent',
        'viewed',
        'signed',
        'superseded',
        'void'
      )
    ),

  title TEXT NOT NULL DEFAULT '',
  content_json TEXT NOT NULL DEFAULT '[]',

  business_snapshot_json TEXT NOT NULL DEFAULT '{}',
  client_snapshot_json TEXT NOT NULL DEFAULT '{}',
  booking_snapshot_json TEXT NOT NULL DEFAULT '{}',
  terms_snapshot_json TEXT NOT NULL DEFAULT '{}',

  required_signatures INTEGER NOT NULL DEFAULT 1
    CHECK (required_signatures >= 1),

  created_by_user_id TEXT,

  sent_at TEXT,
  viewed_at TEXT,
  signed_at TEXT,
  superseded_at TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (
    contract_id,
    version_number
  ),

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (contract_id)
    REFERENCES crm_contracts(id)
    ON DELETE CASCADE,

  FOREIGN KEY (previous_version_id)
    REFERENCES crm_contract_versions(id)
);

CREATE INDEX IF NOT EXISTS
idx_crm_contract_versions_contract
ON crm_contract_versions(
  workspace_id,
  contract_id,
  version_number DESC
);

CREATE TABLE IF NOT EXISTS crm_contract_signatures (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  contract_id TEXT NOT NULL,
  version_id TEXT NOT NULL,

  contact_id TEXT,
  identity_id TEXT,

  actor_type TEXT NOT NULL DEFAULT 'client'
    CHECK (
      actor_type IN (
        'client',
        'admin',
        'imported'
      )
    ),

  actor_user_id TEXT,
  actor_email TEXT NOT NULL DEFAULT '',

  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,

  signature_text TEXT NOT NULL,
  consent_text TEXT NOT NULL DEFAULT '',

  ip_address TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  audit_json TEXT NOT NULL DEFAULT '{}',

  signed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (contract_id)
    REFERENCES crm_contracts(id),

  FOREIGN KEY (version_id)
    REFERENCES crm_contract_versions(id),

  FOREIGN KEY (contact_id)
    REFERENCES crm_contacts(id),

  FOREIGN KEY (identity_id)
    REFERENCES client_identities(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_crm_contract_signatures_contact
ON crm_contract_signatures(
  version_id,
  contact_id
)
WHERE contact_id IS NOT NULL
  AND trim(contact_id) <> '';

CREATE INDEX IF NOT EXISTS
idx_crm_contract_signatures_contract
ON crm_contract_signatures(
  workspace_id,
  contract_id,
  signed_at DESC
);

CREATE TABLE IF NOT EXISTS crm_invoice_sequences (
  workspace_id TEXT PRIMARY KEY,

  prefix TEXT NOT NULL DEFAULT 'INV',
  next_number INTEGER NOT NULL DEFAULT 1
    CHECK (next_number >= 1),

  padding INTEGER NOT NULL DEFAULT 4
    CHECK (padding BETWEEN 1 AND 12),

  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_invoices (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  job_id TEXT NOT NULL,
  primary_contact_id TEXT,

  quote_id TEXT,
  quote_version_id TEXT,
  quote_acceptance_id TEXT,

  source_kind TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_kind IN ('manual', 'accepted_quote')),

  source_id TEXT NOT NULL DEFAULT '',

  reference TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (
      status IN (
        'draft',
        'issued',
        'part_paid',
        'paid',
        'void'
      )
    ),

  currency TEXT NOT NULL DEFAULT 'GBP',

  issue_date TEXT,
  due_date TEXT,

  subtotal_amount INTEGER NOT NULL DEFAULT 0
    CHECK (subtotal_amount >= 0),

  discount_amount INTEGER NOT NULL DEFAULT 0
    CHECK (discount_amount >= 0),

  tax_amount INTEGER NOT NULL DEFAULT 0
    CHECK (tax_amount >= 0),

  total_amount INTEGER NOT NULL DEFAULT 0
    CHECK (total_amount >= 0),

  business_snapshot_json TEXT NOT NULL DEFAULT '{}',
  client_snapshot_json TEXT NOT NULL DEFAULT '{}',
  booking_snapshot_json TEXT NOT NULL DEFAULT '{}',

  notes TEXT NOT NULL DEFAULT '',
  terms TEXT NOT NULL DEFAULT '',

  created_by_user_id TEXT,

  issued_at TEXT,
  sent_at TEXT,
  paid_at TEXT,
  voided_at TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (job_id)
    REFERENCES crm_jobs(id),

  FOREIGN KEY (primary_contact_id)
    REFERENCES crm_contacts(id),

  FOREIGN KEY (quote_id)
    REFERENCES crm_quotes(id),

  FOREIGN KEY (quote_version_id)
    REFERENCES crm_quote_versions(id),

  FOREIGN KEY (quote_acceptance_id)
    REFERENCES crm_quote_acceptances(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_crm_invoices_workspace_reference
ON crm_invoices(
  workspace_id,
  reference
);

CREATE INDEX IF NOT EXISTS
idx_crm_invoices_workspace_job
ON crm_invoices(
  workspace_id,
  job_id,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS
idx_crm_invoices_workspace_status
ON crm_invoices(
  workspace_id,
  status,
  due_date,
  created_at DESC
);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_crm_invoices_acceptance_source
ON crm_invoices(
  workspace_id,
  quote_acceptance_id
)
WHERE quote_acceptance_id IS NOT NULL
  AND trim(quote_acceptance_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS
idx_crm_invoices_source
ON crm_invoices(
  workspace_id,
  source_kind,
  source_id
)
WHERE trim(source_id) <> '';

CREATE TABLE IF NOT EXISTS crm_invoice_items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  invoice_id TEXT NOT NULL,

  item_type TEXT NOT NULL DEFAULT 'custom'
    CHECK (
      item_type IN (
        'package',
        'addon',
        'custom'
      )
    ),

  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',

  quantity INTEGER NOT NULL DEFAULT 1
    CHECK (quantity >= 1),

  unit_price_amount INTEGER NOT NULL DEFAULT 0
    CHECK (unit_price_amount >= 0),

  line_total_amount INTEGER NOT NULL DEFAULT 0
    CHECK (line_total_amount >= 0),

  display_order INTEGER NOT NULL DEFAULT 0,

  source_snapshot_json TEXT NOT NULL DEFAULT '{}',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (invoice_id)
    REFERENCES crm_invoices(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS
idx_crm_invoice_items_invoice
ON crm_invoice_items(
  workspace_id,
  invoice_id,
  display_order,
  created_at
);

CREATE TABLE IF NOT EXISTS crm_invoice_schedule_items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  invoice_id TEXT NOT NULL,

  schedule_type TEXT NOT NULL DEFAULT 'custom'
    CHECK (
      schedule_type IN (
        'deposit',
        'instalment',
        'final',
        'custom'
      )
    ),

  label TEXT NOT NULL,

  amount INTEGER NOT NULL DEFAULT 0
    CHECK (amount >= 0),

  due_date TEXT,

  display_order INTEGER NOT NULL DEFAULT 0,

  metadata_json TEXT NOT NULL DEFAULT '{}',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (invoice_id)
    REFERENCES crm_invoices(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS
idx_crm_invoice_schedule_invoice
ON crm_invoice_schedule_items(
  workspace_id,
  invoice_id,
  display_order,
  due_date
);

CREATE INDEX IF NOT EXISTS
idx_crm_invoice_schedule_due
ON crm_invoice_schedule_items(
  workspace_id,
  due_date
)
WHERE due_date IS NOT NULL
  AND trim(due_date) <> '';

CREATE TABLE IF NOT EXISTS crm_invoice_payments (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  invoice_id TEXT NOT NULL,
  schedule_item_id TEXT,

  payment_type TEXT NOT NULL DEFAULT 'payment'
    CHECK (
      payment_type IN (
        'payment',
        'refund'
      )
    ),

  amount INTEGER NOT NULL
    CHECK (amount > 0),

  currency TEXT NOT NULL DEFAULT 'GBP',

  method TEXT NOT NULL DEFAULT 'manual'
    CHECK (
      method IN (
        'manual',
        'bank_transfer',
        'cash',
        'card',
        'stripe',
        'other'
      )
    ),

  reference TEXT NOT NULL DEFAULT '',

  provider TEXT NOT NULL DEFAULT '',
  provider_payment_id TEXT NOT NULL DEFAULT '',

  notes TEXT NOT NULL DEFAULT '',

  recorded_by_user_id TEXT,
  recorded_by_email TEXT NOT NULL DEFAULT '',

  paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  metadata_json TEXT NOT NULL DEFAULT '{}',

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (invoice_id)
    REFERENCES crm_invoices(id),

  FOREIGN KEY (schedule_item_id)
    REFERENCES crm_invoice_schedule_items(id)
);

CREATE INDEX IF NOT EXISTS
idx_crm_invoice_payments_invoice
ON crm_invoice_payments(
  workspace_id,
  invoice_id,
  paid_at DESC,
  created_at DESC
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_invoice_payments_provider ON crm_invoice_payments (workspace_id, provider, provider_payment_id)
WHERE trim(provider) <> ''
  AND trim(provider_payment_id) <> '';

-- Seed commercial configuration for every workspace that exists at upgrade time.
INSERT OR IGNORE INTO crm_booking_settings (
  workspace_id
)
SELECT id
FROM workspaces;

INSERT OR IGNORE INTO crm_invoice_sequences (
  workspace_id
)
SELECT id
FROM workspaces;

-- Booking settings may only reference templates owned by the same workspace.
CREATE TRIGGER IF NOT EXISTS
trg_crm_booking_settings_workspace_insert
BEFORE INSERT ON crm_booking_settings
WHEN
  (
    NEW.default_contract_template_id IS NOT NULL
    AND trim(NEW.default_contract_template_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contract_templates template
      WHERE template.id = NEW.default_contract_template_id
        AND template.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.default_questionnaire_template_id IS NOT NULL
    AND trim(NEW.default_questionnaire_template_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_questionnaire_templates template
      WHERE template.id = NEW.default_questionnaire_template_id
        AND template.workspace_id = NEW.workspace_id
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM booking settings workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_booking_settings_workspace_update
BEFORE UPDATE OF
  workspace_id,
  default_contract_template_id,
  default_questionnaire_template_id
ON crm_booking_settings
WHEN
  (
    NEW.default_contract_template_id IS NOT NULL
    AND trim(NEW.default_contract_template_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contract_templates template
      WHERE template.id = NEW.default_contract_template_id
        AND template.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.default_questionnaire_template_id IS NOT NULL
    AND trim(NEW.default_questionnaire_template_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_questionnaire_templates template
      WHERE template.id = NEW.default_questionnaire_template_id
        AND template.workspace_id = NEW.workspace_id
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM booking settings workspace mismatch'
  );
END;

-- Contract relationships must all remain inside one workspace.
CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_workspace_insert
BEFORE INSERT ON crm_contracts
WHEN
  NOT EXISTS (
    SELECT 1
    FROM crm_jobs job
    WHERE job.id = NEW.job_id
      AND job.workspace_id = NEW.workspace_id
  )
  OR
  (
    NEW.primary_contact_id IS NOT NULL
    AND trim(NEW.primary_contact_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contacts contact
      WHERE contact.id = NEW.primary_contact_id
        AND contact.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.template_id IS NOT NULL
    AND trim(NEW.template_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contract_templates template
      WHERE template.id = NEW.template_id
        AND template.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.quote_acceptance_id IS NOT NULL
    AND trim(NEW.quote_acceptance_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_quote_acceptances acceptance
      JOIN crm_quotes quote
        ON quote.id = acceptance.quote_id
       AND quote.workspace_id = acceptance.workspace_id
      JOIN crm_jobs job
        ON job.id = NEW.job_id
       AND job.workspace_id = NEW.workspace_id
      WHERE acceptance.id = NEW.quote_acceptance_id
        AND acceptance.workspace_id = NEW.workspace_id
        AND job.quote_id = quote.id
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM contract workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_workspace_update
BEFORE UPDATE OF
  workspace_id,
  job_id,
  primary_contact_id,
  template_id,
  quote_acceptance_id,
  current_version_id,
  signed_version_id
ON crm_contracts
WHEN
  NOT EXISTS (
    SELECT 1
    FROM crm_jobs job
    WHERE job.id = NEW.job_id
      AND job.workspace_id = NEW.workspace_id
  )
  OR
  (
    NEW.primary_contact_id IS NOT NULL
    AND trim(NEW.primary_contact_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contacts contact
      WHERE contact.id = NEW.primary_contact_id
        AND contact.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.template_id IS NOT NULL
    AND trim(NEW.template_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contract_templates template
      WHERE template.id = NEW.template_id
        AND template.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.current_version_id IS NOT NULL
    AND trim(NEW.current_version_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contract_versions version
      WHERE version.id = NEW.current_version_id
        AND version.workspace_id = NEW.workspace_id
        AND version.contract_id = NEW.id
    )
  )
  OR
  (
    NEW.signed_version_id IS NOT NULL
    AND trim(NEW.signed_version_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contract_versions version
      WHERE version.id = NEW.signed_version_id
        AND version.workspace_id = NEW.workspace_id
        AND version.contract_id = NEW.id
        AND version.status = 'signed'
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM contract workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_version_workspace_insert
BEFORE INSERT ON crm_contract_versions
WHEN
  NOT EXISTS (
    SELECT 1
    FROM crm_contracts contract
    WHERE contract.id = NEW.contract_id
      AND contract.workspace_id = NEW.workspace_id
  )
  OR
  (
    NEW.previous_version_id IS NOT NULL
    AND trim(NEW.previous_version_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contract_versions previous
      WHERE previous.id = NEW.previous_version_id
        AND previous.workspace_id = NEW.workspace_id
        AND previous.contract_id = NEW.contract_id
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM contract version workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_signature_workspace_insert
BEFORE INSERT ON crm_contract_signatures
WHEN
  NOT EXISTS (
    SELECT 1
    FROM crm_contract_versions version
    JOIN crm_contracts contract
      ON contract.id = version.contract_id
     AND contract.workspace_id = version.workspace_id
    WHERE version.id = NEW.version_id
      AND version.workspace_id = NEW.workspace_id
      AND contract.id = NEW.contract_id
      AND version.status IN ('sent', 'viewed')
  )
  OR
  (
    NEW.contact_id IS NOT NULL
    AND trim(NEW.contact_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contacts contact
      WHERE contact.id = NEW.contact_id
        AND contact.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.identity_id IS NOT NULL
    AND trim(NEW.identity_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM client_identities identity
      WHERE identity.id = NEW.identity_id
        AND identity.workspace_id = NEW.workspace_id
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM contract signature workspace mismatch'
  );
END;

-- Sent contract document content is immutable.
CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_version_locked_content
BEFORE UPDATE OF
  title,
  content_json,
  business_snapshot_json,
  client_snapshot_json,
  booking_snapshot_json,
  terms_snapshot_json,
  required_signatures
ON crm_contract_versions
WHEN OLD.status <> 'draft'
BEGIN
  SELECT RAISE(
    ABORT,
    'Sent contract versions are immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_version_locked_delete
BEFORE DELETE ON crm_contract_versions
WHEN OLD.status <> 'draft'
BEGIN
  SELECT RAISE(
    ABORT,
    'Sent contract versions cannot be deleted'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_signature_immutable_update
BEFORE UPDATE ON crm_contract_signatures
BEGIN
  SELECT RAISE(
    ABORT,
    'Contract signatures are immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_signature_immutable_delete
BEFORE DELETE ON crm_contract_signatures
BEGIN
  SELECT RAISE(
    ABORT,
    'Contract signatures are immutable'
  );
END;

-- Invoice relationships must remain inside one workspace.
CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_workspace_insert
BEFORE INSERT ON crm_invoices
WHEN
  NOT EXISTS (
    SELECT 1
    FROM crm_jobs job
    WHERE job.id = NEW.job_id
      AND job.workspace_id = NEW.workspace_id
  )
  OR
  (
    NEW.primary_contact_id IS NOT NULL
    AND trim(NEW.primary_contact_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contacts contact
      WHERE contact.id = NEW.primary_contact_id
        AND contact.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.quote_id IS NOT NULL
    AND trim(NEW.quote_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_quotes quote
      WHERE quote.id = NEW.quote_id
        AND quote.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.quote_version_id IS NOT NULL
    AND trim(NEW.quote_version_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_quote_versions version
      WHERE version.id = NEW.quote_version_id
        AND version.workspace_id = NEW.workspace_id
        AND (
          NEW.quote_id IS NULL
          OR trim(NEW.quote_id) = ''
          OR version.quote_id = NEW.quote_id
        )
    )
  )
  OR
  (
    NEW.quote_acceptance_id IS NOT NULL
    AND trim(NEW.quote_acceptance_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_quote_acceptances acceptance
      WHERE acceptance.id = NEW.quote_acceptance_id
        AND acceptance.workspace_id = NEW.workspace_id
        AND (
          NEW.quote_id IS NULL
          OR trim(NEW.quote_id) = ''
          OR acceptance.quote_id = NEW.quote_id
        )
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_workspace_update
BEFORE UPDATE OF
  workspace_id,
  job_id,
  primary_contact_id,
  quote_id,
  quote_version_id,
  quote_acceptance_id
ON crm_invoices
WHEN
  NOT EXISTS (
    SELECT 1
    FROM crm_jobs job
    WHERE job.id = NEW.job_id
      AND job.workspace_id = NEW.workspace_id
  )
  OR
  (
    NEW.primary_contact_id IS NOT NULL
    AND trim(NEW.primary_contact_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contacts contact
      WHERE contact.id = NEW.primary_contact_id
        AND contact.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.quote_id IS NOT NULL
    AND trim(NEW.quote_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_quotes quote
      WHERE quote.id = NEW.quote_id
        AND quote.workspace_id = NEW.workspace_id
    )
  )
  OR
  (
    NEW.quote_version_id IS NOT NULL
    AND trim(NEW.quote_version_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_quote_versions version
      WHERE version.id = NEW.quote_version_id
        AND version.workspace_id = NEW.workspace_id
        AND (
          NEW.quote_id IS NULL
          OR trim(NEW.quote_id) = ''
          OR version.quote_id = NEW.quote_id
        )
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_item_workspace_insert
BEFORE INSERT ON crm_invoice_items
WHEN NOT EXISTS (
  SELECT 1
  FROM crm_invoices invoice
  WHERE invoice.id = NEW.invoice_id
    AND invoice.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice item workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_schedule_workspace_insert
BEFORE INSERT ON crm_invoice_schedule_items
WHEN NOT EXISTS (
  SELECT 1
  FROM crm_invoices invoice
  WHERE invoice.id = NEW.invoice_id
    AND invoice.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice schedule workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_payment_workspace_insert
BEFORE INSERT ON crm_invoice_payments
WHEN
  NOT EXISTS (
    SELECT 1
    FROM crm_invoices invoice
    WHERE invoice.id = NEW.invoice_id
      AND invoice.workspace_id = NEW.workspace_id
      AND invoice.status IN (
        'issued',
        'part_paid',
        'paid'
      )
  )
  OR
  (
    NEW.schedule_item_id IS NOT NULL
    AND trim(NEW.schedule_item_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_invoice_schedule_items schedule
      WHERE schedule.id = NEW.schedule_item_id
        AND schedule.workspace_id = NEW.workspace_id
        AND schedule.invoice_id = NEW.invoice_id
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice payment workspace mismatch'
  );
END;

-- Once an invoice is issued, its commercial document is immutable.
CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_locked_content
BEFORE UPDATE OF
  job_id,
  primary_contact_id,
  quote_id,
  quote_version_id,
  quote_acceptance_id,
  source_kind,
  source_id,
  reference,
  currency,
  issue_date,
  due_date,
  subtotal_amount,
  discount_amount,
  tax_amount,
  total_amount,
  business_snapshot_json,
  client_snapshot_json,
  booking_snapshot_json,
  notes,
  terms
ON crm_invoices
WHEN OLD.status <> 'draft'
BEGIN
  SELECT RAISE(
    ABORT,
    'Issued invoice content is immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_item_locked_insert
BEFORE INSERT ON crm_invoice_items
WHEN EXISTS (
  SELECT 1
  FROM crm_invoices invoice
  WHERE invoice.id = NEW.invoice_id
    AND invoice.status <> 'draft'
)
BEGIN
  SELECT RAISE(
    ABORT,
    'Issued invoice items are immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_item_locked_update
BEFORE UPDATE ON crm_invoice_items
WHEN EXISTS (
  SELECT 1
  FROM crm_invoices invoice
  WHERE invoice.id = OLD.invoice_id
    AND invoice.status <> 'draft'
)
BEGIN
  SELECT RAISE(
    ABORT,
    'Issued invoice items are immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_item_locked_delete
BEFORE DELETE ON crm_invoice_items
WHEN EXISTS (
  SELECT 1
  FROM crm_invoices invoice
  WHERE invoice.id = OLD.invoice_id
    AND invoice.status <> 'draft'
)
BEGIN
  SELECT RAISE(
    ABORT,
    'Issued invoice items are immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_schedule_locked_insert
BEFORE INSERT ON crm_invoice_schedule_items
WHEN EXISTS (
  SELECT 1
  FROM crm_invoices invoice
  WHERE invoice.id = NEW.invoice_id
    AND invoice.status <> 'draft'
)
BEGIN
  SELECT RAISE(
    ABORT,
    'Issued invoice payment schedules are immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_schedule_locked_update
BEFORE UPDATE ON crm_invoice_schedule_items
WHEN EXISTS (
  SELECT 1
  FROM crm_invoices invoice
  WHERE invoice.id = OLD.invoice_id
    AND invoice.status <> 'draft'
)
BEGIN
  SELECT RAISE(
    ABORT,
    'Issued invoice payment schedules are immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_schedule_locked_delete
BEFORE DELETE ON crm_invoice_schedule_items
WHEN EXISTS (
  SELECT 1
  FROM crm_invoices invoice
  WHERE invoice.id = OLD.invoice_id
    AND invoice.status <> 'draft'
)
BEGIN
  SELECT RAISE(
    ABORT,
    'Issued invoice payment schedules are immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_payment_immutable_update
BEFORE UPDATE ON crm_invoice_payments
BEGIN
  SELECT RAISE(
    ABORT,
    'Invoice payments are immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_payment_immutable_delete
BEFORE DELETE ON crm_invoice_payments
BEGIN
  SELECT RAISE(
    ABORT,
    'Invoice payments are immutable'
  );
END;


-- v1.10.5a tenant relationship update hardening.
-- Workspace ownership is immutable after creation, and draft
-- commercial relationships must remain inside their owning tenant.

CREATE TRIGGER IF NOT EXISTS
trg_crm_booking_settings_workspace_immutable
BEFORE UPDATE OF workspace_id
ON crm_booking_settings
WHEN NEW.workspace_id <> OLD.workspace_id
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM booking settings workspace is immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_template_workspace_immutable
BEFORE UPDATE OF workspace_id
ON crm_contract_templates
WHEN NEW.workspace_id <> OLD.workspace_id
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM contract template workspace is immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_workspace_immutable
BEFORE UPDATE OF workspace_id
ON crm_contracts
WHEN NEW.workspace_id <> OLD.workspace_id
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM contract workspace is immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_acceptance_workspace_update
BEFORE UPDATE OF
  job_id,
  quote_acceptance_id
ON crm_contracts
WHEN
  NEW.quote_acceptance_id IS NOT NULL
  AND trim(NEW.quote_acceptance_id) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM crm_quote_acceptances acceptance
    JOIN crm_quotes quote
      ON quote.id = acceptance.quote_id
     AND quote.workspace_id = acceptance.workspace_id
    JOIN crm_jobs job
      ON job.id = NEW.job_id
     AND job.workspace_id = NEW.workspace_id
    WHERE acceptance.id = NEW.quote_acceptance_id
      AND acceptance.workspace_id = NEW.workspace_id
      AND job.quote_id = quote.id
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM contract acceptance workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_contract_version_workspace_update
BEFORE UPDATE OF
  workspace_id,
  contract_id,
  previous_version_id
ON crm_contract_versions
WHEN
  NEW.workspace_id <> OLD.workspace_id
  OR NOT EXISTS (
    SELECT 1
    FROM crm_contracts contract
    WHERE contract.id = NEW.contract_id
      AND contract.workspace_id = NEW.workspace_id
  )
  OR
  (
    NEW.previous_version_id IS NOT NULL
    AND trim(NEW.previous_version_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM crm_contract_versions previous
      WHERE previous.id = NEW.previous_version_id
        AND previous.workspace_id = NEW.workspace_id
        AND previous.contract_id = NEW.contract_id
    )
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM contract version workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_sequence_workspace_immutable
BEFORE UPDATE OF workspace_id
ON crm_invoice_sequences
WHEN NEW.workspace_id <> OLD.workspace_id
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice sequence workspace is immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_workspace_immutable
BEFORE UPDATE OF workspace_id
ON crm_invoices
WHEN NEW.workspace_id <> OLD.workspace_id
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice workspace is immutable'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_job_quote_insert
BEFORE INSERT ON crm_invoices
WHEN
  NEW.quote_id IS NOT NULL
  AND trim(NEW.quote_id) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM crm_jobs job
    JOIN crm_quotes quote
      ON quote.id = NEW.quote_id
     AND quote.workspace_id = NEW.workspace_id
    WHERE job.id = NEW.job_id
      AND job.workspace_id = NEW.workspace_id
      AND job.quote_id = quote.id
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice Job quote mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_job_quote_update
BEFORE UPDATE OF
  job_id,
  quote_id
ON crm_invoices
WHEN
  NEW.quote_id IS NOT NULL
  AND trim(NEW.quote_id) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM crm_jobs job
    JOIN crm_quotes quote
      ON quote.id = NEW.quote_id
     AND quote.workspace_id = NEW.workspace_id
    WHERE job.id = NEW.job_id
      AND job.workspace_id = NEW.workspace_id
      AND job.quote_id = quote.id
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice Job quote mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_acceptance_workspace_update
BEFORE UPDATE OF
  job_id,
  quote_id,
  quote_acceptance_id
ON crm_invoices
WHEN
  NEW.quote_acceptance_id IS NOT NULL
  AND trim(NEW.quote_acceptance_id) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM crm_quote_acceptances acceptance
    JOIN crm_quotes quote
      ON quote.id = acceptance.quote_id
     AND quote.workspace_id = acceptance.workspace_id
    JOIN crm_jobs job
      ON job.id = NEW.job_id
     AND job.workspace_id = NEW.workspace_id
    WHERE acceptance.id = NEW.quote_acceptance_id
      AND acceptance.workspace_id = NEW.workspace_id
      AND (
        NEW.quote_id IS NULL
        OR trim(NEW.quote_id) = ''
        OR quote.id = NEW.quote_id
      )
      AND job.quote_id = quote.id
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice acceptance workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_acceptance_job_insert
BEFORE INSERT ON crm_invoices
WHEN
  NEW.quote_acceptance_id IS NOT NULL
  AND trim(NEW.quote_acceptance_id) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM crm_quote_acceptances acceptance
    JOIN crm_quotes quote
      ON quote.id = acceptance.quote_id
     AND quote.workspace_id = acceptance.workspace_id
    JOIN crm_jobs job
      ON job.id = NEW.job_id
     AND job.workspace_id = NEW.workspace_id
    WHERE acceptance.id = NEW.quote_acceptance_id
      AND acceptance.workspace_id = NEW.workspace_id
      AND (
        NEW.quote_id IS NULL
        OR trim(NEW.quote_id) = ''
        OR quote.id = NEW.quote_id
      )
      AND job.quote_id = quote.id
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice acceptance Job mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_item_workspace_update
BEFORE UPDATE OF
  workspace_id,
  invoice_id
ON crm_invoice_items
WHEN
  NEW.workspace_id <> OLD.workspace_id
  OR NOT EXISTS (
    SELECT 1
    FROM crm_invoices invoice
    WHERE invoice.id = NEW.invoice_id
      AND invoice.workspace_id = NEW.workspace_id
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice item workspace mismatch'
  );
END;

CREATE TRIGGER IF NOT EXISTS
trg_crm_invoice_schedule_workspace_update
BEFORE UPDATE OF
  workspace_id,
  invoice_id
ON crm_invoice_schedule_items
WHEN
  NEW.workspace_id <> OLD.workspace_id
  OR NOT EXISTS (
    SELECT 1
    FROM crm_invoices invoice
    WHERE invoice.id = NEW.invoice_id
      AND invoice.workspace_id = NEW.workspace_id
  )
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM invoice schedule workspace mismatch'
  );
END;

INSERT INTO schema_meta (
  key,
  value
)
VALUES (
  'schema_version',
  '39'
)
ON CONFLICT(key)
DO UPDATE SET
  value = excluded.value;

-- v1.10.7a: External business onboarding and signup foundation.
-- Stages a short-lived public signup request before any workspace,
-- professional account or owner membership is provisioned.
--
-- Security boundary:
-- - verification tokens are stored as SHA-256 hashes only;
-- - request fingerprints are hashed before storage;
-- - raw verification tokens and raw IP addresses are never persisted;
-- - a workspace is linked only after verified provisioning succeeds.

CREATE TABLE IF NOT EXISTS platform_signup_requests (
  id TEXT PRIMARY KEY,

  email_normalized TEXT NOT NULL,
  email TEXT NOT NULL,

  owner_display_name TEXT NOT NULL DEFAULT '',
  business_name TEXT NOT NULL,
  requested_slug TEXT NOT NULL DEFAULT '',

  token_hash TEXT NOT NULL UNIQUE,
  request_fingerprint TEXT NOT NULL DEFAULT '',

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'verified',
        'provisioned',
        'failed'
      )
    ),

  delivery_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      delivery_status IN (
        'pending',
        'sent',
        'failed'
      )
    ),

  delivery_error TEXT NOT NULL DEFAULT '',
  failure_reason TEXT NOT NULL DEFAULT '',

  expires_at TEXT NOT NULL,

  consumed_at TEXT,
  verified_at TEXT,
  provisioned_at TEXT,

  workspace_id TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS
idx_platform_signup_requests_email_recent
ON platform_signup_requests(
  email_normalized,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS
idx_platform_signup_requests_fingerprint_recent
ON platform_signup_requests(
  request_fingerprint,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS
idx_platform_signup_requests_status_expiry
ON platform_signup_requests(
  status,
  expires_at
);

CREATE INDEX IF NOT EXISTS
idx_platform_signup_requests_workspace
ON platform_signup_requests(
  workspace_id
)
WHERE workspace_id IS NOT NULL;

INSERT INTO schema_meta (
  key,
  value
)
VALUES (
  'schema_version',
  '40'
)
ON CONFLICT(key)
DO UPDATE SET
  value = excluded.value;

-- v1.10.9a — Commercial Templates, Quote Builder & Email Delivery Foundation
-- Schema 40 -> 41
--
-- Adds workspace-owned reusable quote templates, global template add-ons,
-- reusable email templates, workspace email-delivery settings and encrypted
-- credential storage.
--
-- Existing quote/version/acceptance tables are intentionally unchanged.
-- Sent and accepted quote snapshots remain immutable.

CREATE TABLE crm_quote_templates (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  client_introduction TEXT NOT NULL DEFAULT '',
  client_notes TEXT NOT NULL DEFAULT '',

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),

  version INTEGER NOT NULL DEFAULT 1
    CHECK (version >= 1),

  is_default INTEGER NOT NULL DEFAULT 0
    CHECK (is_default IN (0, 1)),

  expiry_days INTEGER NOT NULL DEFAULT 14
    CHECK (expiry_days >= 0),

  discount_type TEXT NOT NULL DEFAULT 'none'
    CHECK (discount_type IN ('none', 'fixed', 'percentage')),

  discount_value INTEGER NOT NULL DEFAULT 0
    CHECK (discount_value >= 0),

  tax_treatment TEXT NOT NULL DEFAULT 'none'
    CHECK (tax_treatment IN ('none', 'inclusive', 'exclusive')),

  tax_rate_basis_points INTEGER NOT NULL DEFAULT 0
    CHECK (tax_rate_basis_points >= 0),

  contract_template_id TEXT,
  questionnaire_template_id TEXT,

  payment_schedule_json TEXT NOT NULL DEFAULT '{}',

  auto_create_invoice INTEGER NOT NULL DEFAULT 1
    CHECK (auto_create_invoice IN (0, 1)),

  created_by_user_id TEXT,
  updated_by_user_id TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (workspace_id, name),

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (contract_template_id)
    REFERENCES crm_contract_templates(id)
    ON DELETE SET NULL,

  FOREIGN KEY (questionnaire_template_id)
    REFERENCES crm_questionnaire_templates(id)
    ON DELETE SET NULL,

  FOREIGN KEY (created_by_user_id)
    REFERENCES platform_users(id),

  FOREIGN KEY (updated_by_user_id)
    REFERENCES platform_users(id)
);

CREATE INDEX idx_crm_quote_templates_workspace_status
  ON crm_quote_templates(workspace_id, status, is_default, name);


CREATE TABLE crm_quote_template_packages (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  package_id TEXT NOT NULL,

  display_order INTEGER NOT NULL DEFAULT 0,

  recommended INTEGER NOT NULL DEFAULT 0
    CHECK (recommended IN (0, 1)),

  override_json TEXT NOT NULL DEFAULT '{}',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (template_id, package_id),

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (template_id)
    REFERENCES crm_quote_templates(id)
    ON DELETE CASCADE,

  FOREIGN KEY (package_id)
    REFERENCES crm_packages(id)
);

CREATE INDEX idx_crm_quote_template_packages_template
  ON crm_quote_template_packages(
    workspace_id,
    template_id,
    display_order
  );


CREATE TABLE crm_quote_template_addons (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  addon_id TEXT NOT NULL,

  display_order INTEGER NOT NULL DEFAULT 0,

  default_selected INTEGER NOT NULL DEFAULT 0
    CHECK (default_selected IN (0, 1)),

  override_json TEXT NOT NULL DEFAULT '{}',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (template_id, addon_id),

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (template_id)
    REFERENCES crm_quote_templates(id)
    ON DELETE CASCADE,

  FOREIGN KEY (addon_id)
    REFERENCES crm_addons(id)
);

CREATE INDEX idx_crm_quote_template_addons_template
  ON crm_quote_template_addons(
    workspace_id,
    template_id,
    display_order
  );


CREATE TABLE crm_email_templates (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',

  purpose TEXT NOT NULL DEFAULT 'general'
    CHECK (
      purpose IN (
        'general',
        'quote',
        'booking',
        'questionnaire',
        'invoice',
        'autoresponder'
      )
    ),

  subject_template TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',

  attachments_json TEXT NOT NULL DEFAULT '[]',

  append_signature INTEGER NOT NULL DEFAULT 1
    CHECK (append_signature IN (0, 1)),

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),

  version INTEGER NOT NULL DEFAULT 1
    CHECK (version >= 1),

  is_default INTEGER NOT NULL DEFAULT 0
    CHECK (is_default IN (0, 1)),

  created_by_user_id TEXT,
  updated_by_user_id TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (workspace_id, purpose, name),

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (created_by_user_id)
    REFERENCES platform_users(id),

  FOREIGN KEY (updated_by_user_id)
    REFERENCES platform_users(id)
);

CREATE INDEX idx_crm_email_templates_workspace_purpose
  ON crm_email_templates(
    workspace_id,
    purpose,
    status,
    is_default,
    name
  );


CREATE TABLE crm_email_credentials (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  provider TEXT NOT NULL
    CHECK (provider IN ('google', 'smtp')),

  algorithm TEXT NOT NULL DEFAULT 'AES-GCM'
    CHECK (algorithm = 'AES-GCM'),

  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,

  key_version INTEGER NOT NULL DEFAULT 1
    CHECK (key_version >= 1),

  metadata_json TEXT NOT NULL DEFAULT '{}',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (workspace_id, provider),

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_crm_email_credentials_workspace
  ON crm_email_credentials(workspace_id, provider);


CREATE TABLE crm_email_settings (
  workspace_id TEXT PRIMARY KEY,

  delivery_mode TEXT NOT NULL DEFAULT 'managed'
    CHECK (delivery_mode IN ('managed', 'google', 'smtp')),

  sender_name TEXT NOT NULL DEFAULT '',
  sender_email TEXT NOT NULL DEFAULT '',
  reply_to_email TEXT NOT NULL DEFAULT '',

  signature_enabled INTEGER NOT NULL DEFAULT 1
    CHECK (signature_enabled IN (0, 1)),

  signature_json TEXT NOT NULL DEFAULT '{}',

  google_email TEXT NOT NULL DEFAULT '',

  smtp_host TEXT NOT NULL DEFAULT '',
  smtp_port INTEGER NOT NULL DEFAULT 587
    CHECK (smtp_port > 0 AND smtp_port <= 65535 AND smtp_port <> 25),

  smtp_security TEXT NOT NULL DEFAULT 'starttls'
    CHECK (smtp_security IN ('tls', 'starttls')),

  smtp_username TEXT NOT NULL DEFAULT '',

  credential_id TEXT,

  last_tested_at TEXT,

  last_test_status TEXT NOT NULL DEFAULT ''
    CHECK (last_test_status IN ('', 'passed', 'failed')),

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (credential_id)
    REFERENCES crm_email_credentials(id)
    ON DELETE SET NULL
);

CREATE INDEX idx_crm_email_settings_delivery
  ON crm_email_settings(delivery_mode, last_test_status);


INSERT INTO schema_meta (
  key,
  value,
  updated_at
)
VALUES (
  'schema_version',
  '41',
  CURRENT_TIMESTAMP
)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;

-- v1.10.10a: WedCRM lead workspace and client journey foundation.
-- Adds only the durable state required by the refreshed Lead/Job workspace:
-- explicit quote presentation type, catalogue/quote imagery snapshots,
-- email engagement tracking fields and general Job-scoped client files.

ALTER TABLE crm_quote_templates
ADD COLUMN quote_type TEXT NOT NULL DEFAULT 'pick_and_choose'
CHECK (quote_type IN ('pick_and_choose', 'fixed'));

ALTER TABLE crm_quotes
ADD COLUMN quote_type TEXT NOT NULL DEFAULT 'pick_and_choose'
CHECK (quote_type IN ('pick_and_choose', 'fixed'));

ALTER TABLE crm_addons
ADD COLUMN image_url TEXT NOT NULL DEFAULT '';

-- Quote rows already snapshot mutable catalogue content such as names,
-- descriptions and pricing. Snapshot imagery alongside that content so a
-- later catalogue-image change does not alter an already-issued quote.
ALTER TABLE crm_quote_options
ADD COLUMN image_url TEXT NOT NULL DEFAULT '';

ALTER TABLE crm_quote_option_addons
ADD COLUMN image_url TEXT NOT NULL DEFAULT '';

-- Delivery state remains in crm_communications.status. These additive fields
-- represent engagement with an outbound email without changing the stable
-- draft/logged/sent/failed status contract.
ALTER TABLE crm_communications
ADD COLUMN open_tracking_token_hash TEXT NOT NULL DEFAULT '';

ALTER TABLE crm_communications
ADD COLUMN delivered_at TEXT;

ALTER TABLE crm_communications
ADD COLUMN opened_at TEXT;

ALTER TABLE crm_communications
ADD COLUMN clicked_at TEXT;

CREATE UNIQUE INDEX idx_crm_communications_open_tracking_token
  ON crm_communications(open_tracking_token_hash)
  WHERE trim(open_tracking_token_hash) <> '';

CREATE INDEX idx_crm_communications_enquiry_engagement
  ON crm_communications(
    workspace_id,
    enquiry_id,
    direction,
    channel,
    occurred_at DESC
  );

-- General Job files are deliberately separate from questionnaire uploads.
-- They use the existing private R2 storage model and become available after
-- a Lead has converted to a Job.
CREATE TABLE crm_job_files (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  identity_id TEXT,
  actor_user_id TEXT,
  source TEXT NOT NULL DEFAULT 'client'
    CHECK (source IN ('client', 'workspace')),
  storage_key TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size INTEGER NOT NULL DEFAULT 0
    CHECK (file_size >= 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'deleted')),
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, storage_key),
  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id),
  FOREIGN KEY (job_id)
    REFERENCES crm_jobs(id)
    ON DELETE CASCADE,
  FOREIGN KEY (identity_id)
    REFERENCES client_identities(id),
  FOREIGN KEY (actor_user_id)
    REFERENCES platform_users(id),
  CHECK (
    source = 'workspace'
    OR identity_id IS NOT NULL
  )
);

CREATE INDEX idx_crm_job_files_job
  ON crm_job_files(
    workspace_id,
    job_id,
    status,
    uploaded_at DESC
  );

CREATE INDEX idx_crm_job_files_identity
  ON crm_job_files(
    workspace_id,
    identity_id,
    status,
    uploaded_at DESC
  );

-- The normal foreign key guarantees that the Job exists. This trigger also
-- guarantees that the Job belongs to the same workspace as the file row.
CREATE TRIGGER trg_crm_job_file_workspace_insert
BEFORE INSERT ON crm_job_files
WHEN NOT EXISTS (
  SELECT 1
  FROM crm_jobs AS job
  WHERE job.id = NEW.job_id
    AND job.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM job file workspace mismatch'
  );
END;

CREATE TRIGGER trg_crm_job_file_workspace_update
BEFORE UPDATE OF workspace_id, job_id ON crm_job_files
WHEN NOT EXISTS (
  SELECT 1
  FROM crm_jobs AS job
  WHERE job.id = NEW.job_id
    AND job.workspace_id = NEW.workspace_id
)
BEGIN
  SELECT RAISE(
    ABORT,
    'CRM job file workspace mismatch'
  );
END;

INSERT INTO schema_meta (
  key,
  value,
  updated_at
)
VALUES (
  'schema_version',
  '42',
  CURRENT_TIMESTAMP
)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;

-- 043_living_questionnaires
-- v1.10.11a — living shared questionnaires.
--
-- Completion is a workflow milestone, not an edit lock.
-- Due dates remain advisory planning targets.
-- Additive attribution allows the same response record to be
-- edited by a client identity or an authorised WedCRM user.

ALTER TABLE crm_questionnaire_instances
  ADD COLUMN last_saved_by_type TEXT NOT NULL DEFAULT ''
    CHECK (
      last_saved_by_type IN (
        '',
        'client',
        'professional'
      )
    );

ALTER TABLE crm_questionnaire_instances
  ADD COLUMN last_saved_by_user_id TEXT;

ALTER TABLE crm_questionnaire_instances
  ADD COLUMN last_saved_by_identity_id TEXT;

ALTER TABLE crm_questionnaire_instances
  ADD COLUMN last_saved_by_label TEXT NOT NULL DEFAULT '';

ALTER TABLE crm_questionnaire_responses
  ADD COLUMN updated_by_user_id TEXT;

INSERT INTO schema_meta (
  key,
  value,
  updated_at
)
VALUES (
  'schema_version',
  '43',
  CURRENT_TIMESTAMP
)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;

-- v1.10.11a refinement: reusable workspace payment schedule presets.
-- Schema 43 -> 44.
--
-- Presets are reusable commercial configuration only.
-- Actual invoice obligations remain immutable invoice schedule rows.
-- Existing crm_booking_settings values remain the legacy/default fallback.

CREATE TABLE crm_payment_schedule_presets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (
      status IN (
        'active',
        'archived'
      )
    ),

  is_default INTEGER NOT NULL DEFAULT 0
    CHECK (
      is_default IN (0, 1)
    ),

  deposit_type TEXT NOT NULL DEFAULT 'none'
    CHECK (
      deposit_type IN (
        'none',
        'fixed',
        'percentage'
      )
    ),

  deposit_value INTEGER NOT NULL DEFAULT 0
    CHECK (
      deposit_value >= 0
    ),

  deposit_due_days_after_acceptance INTEGER NOT NULL DEFAULT 0
    CHECK (
      deposit_due_days_after_acceptance >= 0
    ),

  final_balance_due_days_before_event INTEGER NOT NULL DEFAULT 30
    CHECK (
      final_balance_due_days_before_event >= 0
    ),

  sort_order INTEGER NOT NULL DEFAULT 0,

  created_by_user_id TEXT,
  updated_by_user_id TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (created_by_user_id)
    REFERENCES platform_users(id),

  FOREIGN KEY (updated_by_user_id)
    REFERENCES platform_users(id),

  UNIQUE (
    workspace_id,
    name
  )
);

CREATE INDEX
idx_crm_payment_schedule_presets_workspace
ON crm_payment_schedule_presets (
  workspace_id,
  status,
  sort_order,
  name
);

CREATE UNIQUE INDEX
idx_crm_payment_schedule_presets_default
ON crm_payment_schedule_presets (
  workspace_id
)
WHERE
  status = 'active'
  AND is_default = 1;

-- Preserve each existing workspace's current commercial payment defaults
-- as its first reusable preset.
INSERT INTO crm_payment_schedule_presets (
  id,
  workspace_id,
  name,
  description,
  status,
  is_default,
  deposit_type,
  deposit_value,
  deposit_due_days_after_acceptance,
  final_balance_due_days_before_event,
  sort_order,
  created_at,
  updated_at
)
SELECT
  'crm_payment_schedule_default_' || workspace_id,
  workspace_id,
  'Standard payment schedule',
  'Existing workspace payment defaults.',
  'active',
  1,
  deposit_type,
  deposit_value,
  deposit_due_days_after_acceptance,
  final_balance_due_days_before_event,
  10,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM crm_booking_settings;

INSERT INTO schema_meta (
  key,
  value,
  updated_at
)
VALUES (
  'schema_version',
  '44',
  CURRENT_TIMESTAMP
)
ON CONFLICT(key)
DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
-- v1.10.11a: Configurable public lead forms and structured lead-response snapshots.
-- Existing canonical CRM columns remain authoritative for operational fields.
-- These additive JSON columns persist configurable form definitions, immutable
-- submission-time form/answer snapshots and reusable client address data.

ALTER TABLE crm_lead_form_settings
ADD COLUMN fields_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE crm_contacts
ADD COLUMN address_json TEXT NOT NULL DEFAULT '{}';

ALTER TABLE crm_enquiries
ADD COLUMN lead_form_schema_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE crm_enquiries
ADD COLUMN lead_form_answers_json TEXT NOT NULL DEFAULT '{}';

INSERT INTO schema_meta (
  key,
  value,
  updated_at
)
VALUES (
  'schema_version',
  '45',
  CURRENT_TIMESTAMP
)
ON CONFLICT(key)
DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;

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

-- v1.10.12a: CRM Lead Source continuity (schema 48).

-- `source` remains technical acquisition provenance such as
-- website/manual. `lead_source` is the client/professional-facing
-- answer to "How did you hear about us?".

ALTER TABLE crm_enquiries
ADD COLUMN lead_source TEXT NOT NULL DEFAULT '';

ALTER TABLE crm_jobs
ADD COLUMN lead_source TEXT NOT NULL DEFAULT '';

INSERT INTO schema_meta (
  key,
  value,
  updated_at
)
VALUES (
  'schema_version',
  '48',
  CURRENT_TIMESTAMP
)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;

-- v1.10.12a: CRM / WedStudio venue identity continuity (schema 49).
-- Additive identity foundation only.
--
-- venue_id / venue_slug remain the internal WedStudio relationship.
-- Google Place IDs remain external provenance and must never be used
-- as an internal venue ID or public venue slug.
--
-- Public enquiries do not create WedStudio venue records automatically.
-- Runtime matching and linking are implemented in later guarded gates.

ALTER TABLE crm_enquiries
  ADD COLUMN venue_place_id TEXT NOT NULL DEFAULT '';

ALTER TABLE crm_enquiries
  ADD COLUMN venue_place_json TEXT NOT NULL DEFAULT '{}';

ALTER TABLE crm_jobs
  ADD COLUMN venue_place_id TEXT NOT NULL DEFAULT '';

ALTER TABLE crm_jobs
  ADD COLUMN venue_place_json TEXT NOT NULL DEFAULT '{}';

ALTER TABLE venues
  ADD COLUMN google_place_id TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_workspace_google_place_id
  ON venues(workspace_id, google_place_id)
  WHERE google_place_id <> '';

CREATE INDEX IF NOT EXISTS idx_crm_enquiries_workspace_venue_place_id
  ON crm_enquiries(workspace_id, venue_place_id)
  WHERE venue_place_id <> '';

CREATE INDEX IF NOT EXISTS idx_crm_jobs_workspace_venue_place_id
  ON crm_jobs(workspace_id, venue_place_id)
  WHERE venue_place_id <> '';

INSERT INTO schema_meta (
  key,
  value,
  updated_at
)
VALUES (
  'schema_version',
  '49',
  CURRENT_TIMESTAMP
)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
