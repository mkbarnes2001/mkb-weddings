-- Photography Intelligence v0.7.2
-- Wedding/story draft -> published D1 cutover.
-- No explicit BEGIN/COMMIT: wrangler D1 execute handles the import safely.

ALTER TABLE weddings ADD COLUMN published_json TEXT NOT NULL DEFAULT '';
ALTER TABLE weddings ADD COLUMN published_at TEXT;

CREATE TABLE IF NOT EXISTS published_story_images (
  wedding_slug TEXT NOT NULL,
  asset_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover INTEGER NOT NULL DEFAULT 0 CHECK (is_cover IN (0, 1)),
  PRIMARY KEY (wedding_slug, asset_key)
);

CREATE INDEX IF NOT EXISTS idx_published_story_images_order
  ON published_story_images(wedding_slug, sort_order);

-- Existing stories that are already live become the initial immutable
-- published snapshot. Future admin saves only change document_json until
-- Publish is pressed.
UPDATE weddings
SET
  published_json = document_json,
  published_at = COALESCE(story_published_at, updated_at)
WHERE story_enabled = 1
  AND story_status = 'published'
  AND published_json = '';

-- Snapshot the currently-live story image selections separately from the
-- editable draft story_images table.
INSERT OR REPLACE INTO published_story_images (
  wedding_slug,
  asset_key,
  sort_order,
  is_cover
)
SELECT
  si.wedding_slug,
  si.asset_key,
  si.sort_order,
  si.is_cover
FROM story_images si
JOIN weddings w ON w.slug = si.wedding_slug
WHERE w.story_enabled = 1
  AND w.story_status = 'published';

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '3', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
