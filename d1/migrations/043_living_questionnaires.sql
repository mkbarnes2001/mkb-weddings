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
