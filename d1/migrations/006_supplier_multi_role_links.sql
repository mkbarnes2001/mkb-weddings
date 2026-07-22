-- Photography Intelligence v0.8.0.1
-- Allow the same master supplier to hold multiple roles on the same wedding.
-- Example: one business may provide both Flowers and Decor.
-- Run once after migration 005 if schema_version is currently 5.

CREATE TABLE wedding_supplier_links_v2 (
  wedding_slug TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (wedding_slug, supplier_id, role),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- Rebuild from the preserved legacy wedding_suppliers rows so every role is retained.
INSERT OR IGNORE INTO wedding_supplier_links_v2 (
  wedding_slug,
  supplier_id,
  role,
  sort_order
)
SELECT
  ws.wedding_slug,
  s.id,
  ws.role,
  ws.sort_order
FROM wedding_suppliers ws
JOIN suppliers s
  ON lower(TRIM(s.name)) = lower(TRIM(ws.name))
WHERE TRIM(ws.name) <> '';

DROP TABLE wedding_supplier_links;
ALTER TABLE wedding_supplier_links_v2 RENAME TO wedding_supplier_links;

CREATE INDEX IF NOT EXISTS idx_wedding_supplier_links_wedding
  ON wedding_supplier_links(wedding_slug, sort_order);
CREATE INDEX IF NOT EXISTS idx_wedding_supplier_links_supplier
  ON wedding_supplier_links(supplier_id, wedding_slug);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '6', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
