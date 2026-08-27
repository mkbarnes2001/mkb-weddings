-- v1.10.12a Gate 2F: connected payments foundation.
-- Schema 49 -> 50.
--
-- This migration establishes workspace-owned payment configuration,
-- one-use provider connection state and CRM invoice checkout attempts.
--
-- IMPORTANT:
-- - Stripe secret keys and OAuth access tokens are never stored per business.
-- - The connected Stripe account ID is the durable business/provider link.
-- - crm_invoice_payments remains the authoritative financial ledger.
-- - crm_invoice_schedule_items remains the immutable payment obligation.
-- - A verified provider payment may reference a specific schedule_item_id.

CREATE TABLE workspace_payment_settings (
  workspace_id TEXT PRIMARY KEY,

  card_payments_enabled INTEGER NOT NULL DEFAULT 0
    CHECK (
      card_payments_enabled IN (0, 1)
    ),

  bank_transfer_enabled INTEGER NOT NULL DEFAULT 0
    CHECK (
      bank_transfer_enabled IN (0, 1)
    ),

  bank_account_name TEXT NOT NULL DEFAULT '',
  bank_name TEXT NOT NULL DEFAULT '',
  bank_sort_code TEXT NOT NULL DEFAULT '',
  bank_account_number TEXT NOT NULL DEFAULT '',
  bank_iban TEXT NOT NULL DEFAULT '',
  bank_bic TEXT NOT NULL DEFAULT '',
  bank_transfer_instructions TEXT NOT NULL DEFAULT '',

  stripe_connection_status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (
      stripe_connection_status IN (
        'disconnected',
        'pending',
        'restricted',
        'ready'
      )
    ),

  stripe_account_id TEXT NOT NULL DEFAULT '',

  stripe_account_type TEXT NOT NULL DEFAULT 'standard'
    CHECK (
      stripe_account_type IN (
        'standard',
        'express',
        'custom'
      )
    ),

  stripe_country TEXT NOT NULL DEFAULT '',
  stripe_default_currency TEXT NOT NULL DEFAULT '',

  stripe_details_submitted INTEGER NOT NULL DEFAULT 0
    CHECK (
      stripe_details_submitted IN (0, 1)
    ),

  stripe_charges_enabled INTEGER NOT NULL DEFAULT 0
    CHECK (
      stripe_charges_enabled IN (0, 1)
    ),

  stripe_payouts_enabled INTEGER NOT NULL DEFAULT 0
    CHECK (
      stripe_payouts_enabled IN (0, 1)
    ),

  stripe_connected_at TEXT,
  stripe_last_synced_at TEXT,
  stripe_disconnected_at TEXT,

  created_by_user_id TEXT,
  updated_by_user_id TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (created_by_user_id)
    REFERENCES platform_users(id),

  FOREIGN KEY (updated_by_user_id)
    REFERENCES platform_users(id)
);

CREATE UNIQUE INDEX
idx_workspace_payment_settings_stripe_account
ON workspace_payment_settings (
  stripe_account_id
)
WHERE trim(stripe_account_id) <> '';

CREATE INDEX
idx_workspace_payment_settings_stripe_status
ON workspace_payment_settings (
  stripe_connection_status,
  workspace_id
);


-- Short-lived, one-use OAuth / provider-connection state.
-- Only a hash of the browser state value is persisted.
CREATE TABLE payment_provider_connection_states (
  id TEXT PRIMARY KEY,

  workspace_id TEXT NOT NULL,

  user_id TEXT,
  membership_id TEXT NOT NULL DEFAULT '',

  provider TEXT NOT NULL DEFAULT 'stripe'
    CHECK (
      provider IN (
        'stripe'
      )
    ),

  state_hash TEXT NOT NULL,

  return_path TEXT NOT NULL DEFAULT
    '/admin/crm/payment-setup',

  expires_at TEXT NOT NULL,
  consumed_at TEXT,

  metadata_json TEXT NOT NULL DEFAULT '{}',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (user_id)
    REFERENCES platform_users(id),

  UNIQUE (
    provider,
    state_hash
  )
);

CREATE INDEX
idx_payment_provider_connection_states_workspace
ON payment_provider_connection_states (
  workspace_id,
  provider,
  consumed_at,
  expires_at
);


-- Operational provider lifecycle only.
-- Successful settlement is written separately to crm_invoice_payments.
CREATE TABLE crm_invoice_payment_attempts (
  id TEXT PRIMARY KEY,

  workspace_id TEXT NOT NULL,

  invoice_id TEXT NOT NULL,
  schedule_item_id TEXT,

  client_identity_id TEXT,

  provider TEXT NOT NULL DEFAULT 'stripe'
    CHECK (
      provider IN (
        'stripe'
      )
    ),

  provider_account_id TEXT NOT NULL DEFAULT '',
  provider_checkout_id TEXT NOT NULL DEFAULT '',
  provider_payment_id TEXT NOT NULL DEFAULT '',

  idempotency_key TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'created'
    CHECK (
      status IN (
        'created',
        'open',
        'processing',
        'succeeded',
        'failed',
        'expired',
        'cancelled'
      )
    ),

  amount INTEGER NOT NULL
    CHECK (
      amount > 0
    ),

  currency TEXT NOT NULL DEFAULT 'GBP',

  client_email TEXT NOT NULL DEFAULT '',

  failure_code TEXT NOT NULL DEFAULT '',
  failure_message TEXT NOT NULL DEFAULT '',

  expires_at TEXT,
  completed_at TEXT,

  metadata_json TEXT NOT NULL DEFAULT '{}',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (invoice_id)
    REFERENCES crm_invoices(id)
    ON DELETE CASCADE,

  FOREIGN KEY (schedule_item_id)
    REFERENCES crm_invoice_schedule_items(id),

  FOREIGN KEY (client_identity_id)
    REFERENCES client_identities(id)
);

CREATE UNIQUE INDEX
idx_crm_invoice_payment_attempts_idempotency
ON crm_invoice_payment_attempts (
  workspace_id,
  idempotency_key
);

CREATE UNIQUE INDEX
idx_crm_invoice_payment_attempts_checkout
ON crm_invoice_payment_attempts (
  workspace_id,
  provider,
  provider_checkout_id
)
WHERE trim(provider_checkout_id) <> '';

CREATE UNIQUE INDEX
idx_crm_invoice_payment_attempts_payment
ON crm_invoice_payment_attempts (
  workspace_id,
  provider,
  provider_payment_id
)
WHERE trim(provider_payment_id) <> '';

CREATE INDEX
idx_crm_invoice_payment_attempts_invoice
ON crm_invoice_payment_attempts (
  workspace_id,
  invoice_id,
  status,
  created_at DESC
);

CREATE INDEX
idx_crm_invoice_payment_attempts_schedule
ON crm_invoice_payment_attempts (
  workspace_id,
  schedule_item_id,
  status,
  created_at DESC
)
WHERE schedule_item_id IS NOT NULL;


-- Existing workspaces start safely with online collection disabled.
INSERT OR IGNORE INTO workspace_payment_settings (
  workspace_id
)
SELECT id
FROM workspaces;


INSERT INTO schema_meta (
  key,
  value,
  updated_at
)
VALUES (
  'schema_version',
  '50',
  CURRENT_TIMESTAMP
)
ON CONFLICT(key)
DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
