-- v1.10.13a Gate 2D1: subscription billing write ledger foundation.
-- Schema 52 -> 53.
--
-- This migration adds provider-neutral operational ledgers for future
-- WedPlanned platform-subscription Checkout and verified provider events.
--
-- IMPORTANT:
-- - These tables belong only to WedPlanned platform subscription billing.
-- - They are separate from WedCRM connected-account client payments and
--   from the Print Store commerce payment event ledger.
-- - Checkout-attempt state is operational only and never grants access.
-- - Provider events become authoritative only after signature verification
--   in a later webhook gate.
-- - No Stripe Customer, Product, Price, Checkout Session or Subscription is
--   created by this migration.
-- - Raw provider payloads and card/payment-method data are not stored.

CREATE TABLE workspace_subscription_checkout_attempts (
  id TEXT PRIMARY KEY,

  workspace_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_price_id TEXT NOT NULL,
  requested_by_user_id TEXT,

  provider TEXT NOT NULL DEFAULT 'stripe'
    CHECK (
      provider IN (
        'stripe'
      )
    ),

  provider_checkout_id TEXT NOT NULL DEFAULT '',
  idempotency_key TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'created'
    CHECK (
      status IN (
        'created',
        'open',
        'completed',
        'expired',
        'cancelled',
        'failed'
      )
    ),

  currency TEXT NOT NULL DEFAULT 'GBP'
    CHECK (
      length(trim(currency)) = 3
    ),

  unit_amount_minor INTEGER NOT NULL DEFAULT 0
    CHECK (
      unit_amount_minor >= 0
    ),

  billing_interval TEXT NOT NULL
    CHECK (
      billing_interval IN (
        'month',
        'year'
      )
    ),

  interval_count INTEGER NOT NULL DEFAULT 1
    CHECK (
      interval_count > 0
    ),

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

  FOREIGN KEY (plan_id)
    REFERENCES platform_plans(id),

  FOREIGN KEY (plan_price_id)
    REFERENCES platform_plan_prices(id),

  FOREIGN KEY (requested_by_user_id)
    REFERENCES platform_users(id)
    ON DELETE SET NULL
);

CREATE UNIQUE INDEX
idx_workspace_subscription_checkout_attempts_idempotency
ON workspace_subscription_checkout_attempts (
  workspace_id,
  idempotency_key
);

CREATE UNIQUE INDEX
idx_workspace_subscription_checkout_attempts_provider_checkout
ON workspace_subscription_checkout_attempts (
  provider,
  provider_checkout_id
)
WHERE trim(provider_checkout_id) <> '';

CREATE INDEX
idx_workspace_subscription_checkout_attempts_workspace
ON workspace_subscription_checkout_attempts (
  workspace_id,
  status,
  created_at DESC
);

CREATE INDEX
idx_workspace_subscription_checkout_attempts_price
ON workspace_subscription_checkout_attempts (
  workspace_id,
  plan_price_id,
  status,
  created_at DESC
);


-- Signed Stripe Billing webhook processing will use this table as its
-- provider-event idempotency and audit boundary. Gate 2D1 only creates the
-- durable shape; no webhook route is activated yet.
CREATE TABLE subscription_provider_events (
  id TEXT PRIMARY KEY,

  workspace_id TEXT,
  subscription_id TEXT,
  checkout_attempt_id TEXT,

  provider TEXT NOT NULL DEFAULT 'stripe'
    CHECK (
      provider IN (
        'stripe'
      )
    ),

  provider_event_id TEXT NOT NULL
    CHECK (
      length(trim(provider_event_id)) > 0
    ),

  event_type TEXT NOT NULL
    CHECK (
      length(trim(event_type)) > 0
    ),

  livemode INTEGER NOT NULL DEFAULT 0
    CHECK (
      livemode IN (0, 1)
    ),

  provider_account_id TEXT NOT NULL DEFAULT '',
  provider_customer_id TEXT NOT NULL DEFAULT '',
  provider_subscription_id TEXT NOT NULL DEFAULT '',
  provider_invoice_id TEXT NOT NULL DEFAULT '',

  payload_sha256 TEXT NOT NULL DEFAULT ''
    CHECK (
      trim(payload_sha256) = ''
      OR length(trim(payload_sha256)) = 64
    ),

  status TEXT NOT NULL DEFAULT 'received'
    CHECK (
      status IN (
        'received',
        'processed',
        'ignored',
        'failed'
      )
    ),

  failure_code TEXT NOT NULL DEFAULT '',
  failure_message TEXT NOT NULL DEFAULT '',

  provider_created_at TEXT,
  processed_at TEXT,

  metadata_json TEXT NOT NULL DEFAULT '{}',

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  FOREIGN KEY (subscription_id)
    REFERENCES workspace_subscriptions(id)
    ON DELETE SET NULL,

  FOREIGN KEY (checkout_attempt_id)
    REFERENCES workspace_subscription_checkout_attempts(id)
    ON DELETE SET NULL
);

CREATE UNIQUE INDEX
idx_subscription_provider_events_provider_event
ON subscription_provider_events (
  provider,
  provider_event_id
);

CREATE INDEX
idx_subscription_provider_events_workspace
ON subscription_provider_events (
  workspace_id,
  status,
  created_at DESC
);

CREATE INDEX
idx_subscription_provider_events_subscription
ON subscription_provider_events (
  provider,
  provider_subscription_id,
  created_at DESC
)
WHERE trim(provider_subscription_id) <> '';

CREATE INDEX
idx_subscription_provider_events_checkout
ON subscription_provider_events (
  checkout_attempt_id,
  created_at DESC
)
WHERE checkout_attempt_id IS NOT NULL;

INSERT INTO schema_meta (
  key,
  value,
  updated_at
)
VALUES (
  'schema_version',
  '53',
  CURRENT_TIMESTAMP
)
ON CONFLICT(key)
DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
