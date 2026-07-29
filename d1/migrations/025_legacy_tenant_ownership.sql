-- v1.8.2: Legacy tenant ownership migration.
-- Additive ownership columns only. Existing MKB URLs and R2 objects are unchanged.
-- Runtime services must resolve workspace ownership from authenticated membership
-- (Admin) or verified public domain (public site); client-supplied workspace IDs
-- are never authoritative.

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

-- Explicitly backfill every pre-v1.8.2 legacy row to the existing MKB tenant.
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
