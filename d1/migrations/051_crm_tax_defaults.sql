-- v1.10.12a: workspace tax defaults and historical tax labelling.
-- Schema 50 -> 51.
--
-- The existing quote/invoice tax engine remains authoritative
-- for treatment, rate, calculated tax and final totals.
--
-- These fields only provide workspace defaults for new quotes.
-- Business tax/VAT registration remains owned by the business
-- profile and is not duplicated in WedCRM.

ALTER TABLE crm_booking_settings
  ADD COLUMN default_tax_treatment TEXT NOT NULL DEFAULT 'none'
  CHECK (
    default_tax_treatment IN (
      'none',
      'inclusive',
      'exclusive'
    )
  );

ALTER TABLE crm_booking_settings
  ADD COLUMN default_tax_rate_basis_points INTEGER NOT NULL DEFAULT 0
  CHECK (
    default_tax_rate_basis_points >= 0
    AND default_tax_rate_basis_points <= 10000
  );

ALTER TABLE crm_booking_settings
  ADD COLUMN tax_label TEXT NOT NULL DEFAULT 'Tax'
  CHECK (
    length(trim(tax_label)) >= 1
    AND length(trim(tax_label)) <= 40
  );

INSERT INTO schema_meta (
  key,
  value,
  updated_at
)
VALUES (
  'schema_version',
  '51',
  CURRENT_TIMESTAMP
)
ON CONFLICT(key)
DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
