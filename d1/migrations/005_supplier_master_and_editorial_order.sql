-- Photography Intelligence v0.8.0
-- Supplier master database plus editorial ordering/visibility for venues and wedding stories.
-- Run once against the production D1 database before deploying v0.8.0.

ALTER TABLE venues ADD COLUMN gallery_visible INTEGER NOT NULL DEFAULT 1 CHECK (gallery_visible IN (0, 1));
ALTER TABLE venues ADD COLUMN gallery_sort_order INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_venues_gallery_order
  ON venues(gallery_visible, gallery_sort_order, name);

ALTER TABLE weddings ADD COLUMN story_sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE weddings ADD COLUMN story_list_visible INTEGER NOT NULL DEFAULT 1 CHECK (story_list_visible IN (0, 1));
CREATE INDEX IF NOT EXISTS idx_weddings_story_order
  ON weddings(story_enabled, story_status, story_list_visible, story_sort_order);

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
CREATE INDEX IF NOT EXISTS idx_wedding_supplier_links_wedding
  ON wedding_supplier_links(wedding_slug, sort_order);
CREATE INDEX IF NOT EXISTS idx_wedding_supplier_links_supplier
  ON wedding_supplier_links(supplier_id, wedding_slug);

-- Seed one master supplier per distinct legacy supplier name.
INSERT INTO suppliers (
  id, name, display_name, category, website, instagram, status, created_at, updated_at
)
SELECT
  'supplier_' || lower(hex(randomblob(16))),
  MIN(TRIM(name)),
  MIN(TRIM(name)),
  MIN(TRIM(role)),
  MAX(TRIM(website)),
  MAX(TRIM(instagram)),
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM wedding_suppliers
WHERE TRIM(name) <> ''
GROUP BY lower(TRIM(name));

-- Link existing wedding supplier rows to the new reusable master records.
INSERT OR IGNORE INTO wedding_supplier_links (wedding_slug, supplier_id, role, sort_order)
SELECT
  ws.wedding_slug,
  s.id,
  ws.role,
  ws.sort_order
FROM wedding_suppliers ws
JOIN suppliers s ON lower(TRIM(s.name)) = lower(TRIM(ws.name))
WHERE TRIM(ws.name) <> '';

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '5', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
