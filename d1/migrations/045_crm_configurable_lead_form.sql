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
