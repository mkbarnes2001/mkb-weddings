-- v1.4.0 — Gallery Visitor Identity & Permissions
-- Adds email-gated gallery access, authorised download contacts and visitor tracking.
-- Existing galleries remain backward-compatible: require_email defaults off and
-- allow_downloads retains its previous gallery-wide behaviour until email gating is enabled.

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

-- Existing primary client emails become authorised full-resolution contacts.
INSERT OR IGNORE INTO client_gallery_contacts (
  gallery_id, email_normalized, email, display_name, role, allow_original_downloads, status
)
SELECT
  id,
  lower(trim(client_email)),
  trim(client_email),
  trim(client_name),
  'primary_client',
  1,
  'active'
FROM client_galleries
WHERE trim(client_email) <> '';

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '14', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
