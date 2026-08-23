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
