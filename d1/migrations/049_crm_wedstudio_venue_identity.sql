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
