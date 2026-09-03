-- v1.10.13a Gate 2A: subscription model and entitlement resolver foundation.
-- Schema 51 -> 52.
--
-- This migration introduces WedPlanned-owned commercial plans and
-- workspace subscription state without activating Stripe Billing.
--
-- IMPORTANT:
-- - workspace_entitlements remains the workspace-specific override layer.
-- - Stripe Price IDs map to internal WedPlanned plans; they never grant
--   application access directly.
-- - Existing workspaces receive one hidden compatibility plan so this
--   foundation is access-neutral until paid enforcement is introduced.
-- - No Stripe Customer, Product, Price or Subscription is created here.

CREATE TABLE platform_plans (
  id TEXT PRIMARY KEY,
  plan_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  plan_type TEXT NOT NULL DEFAULT 'commercial'
    CHECK (
      plan_type IN (
        'commercial',
        'internal',
        'promotional'
      )
    ),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (
      status IN (
        'active',
        'archived'
      )
    ),
  is_public INTEGER NOT NULL DEFAULT 0
    CHECK (
      is_public IN (0, 1)
    ),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE platform_plan_entitlements (
  plan_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1
    CHECK (
      enabled IN (0, 1)
    ),
  limit_value INTEGER,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (plan_id, feature_key),
  FOREIGN KEY (plan_id)
    REFERENCES platform_plans(id)
    ON DELETE CASCADE,
  FOREIGN KEY (feature_key)
    REFERENCES platform_features(feature_key)
);

CREATE INDEX idx_platform_plan_entitlements_feature
ON platform_plan_entitlements (
  feature_key,
  plan_id
);

CREATE TABLE platform_plan_prices (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'stripe'
    CHECK (
      provider IN (
        'stripe'
      )
    ),
  provider_product_id TEXT NOT NULL DEFAULT '',
  provider_price_id TEXT NOT NULL DEFAULT '',
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
  currency TEXT NOT NULL DEFAULT 'GBP',
  unit_amount_minor INTEGER NOT NULL DEFAULT 0
    CHECK (
      unit_amount_minor >= 0
    ),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (
      status IN (
        'draft',
        'active',
        'grandfathered',
        'retired'
      )
    ),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id)
    REFERENCES platform_plans(id)
);

CREATE UNIQUE INDEX idx_platform_plan_prices_provider_price
ON platform_plan_prices (
  provider,
  provider_price_id
)
WHERE trim(provider_price_id) <> '';

CREATE INDEX idx_platform_plan_prices_plan
ON platform_plan_prices (
  plan_id,
  status,
  billing_interval
);

CREATE TABLE workspace_billing_customers (
  workspace_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'stripe'
    CHECK (
      provider IN (
        'stripe'
      )
    ),
  provider_customer_id TEXT NOT NULL DEFAULT '',
  last_synced_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_workspace_billing_customers_provider_customer
ON workspace_billing_customers (
  provider,
  provider_customer_id
)
WHERE trim(provider_customer_id) <> '';

CREATE TABLE workspace_subscriptions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_price_id TEXT,
  provider TEXT NOT NULL DEFAULT 'stripe'
    CHECK (
      provider IN (
        'stripe',
        'internal'
      )
    ),
  provider_subscription_id TEXT NOT NULL DEFAULT '',
  provider_price_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL
    CHECK (
      status IN (
        'trialing',
        'active',
        'past_due',
        'cancelled',
        'expired',
        'complimentary'
      )
    ),
  billing_interval TEXT NOT NULL DEFAULT 'none'
    CHECK (
      billing_interval IN (
        'none',
        'month',
        'year'
      )
    ),
  current_period_start TEXT,
  current_period_end TEXT,
  trial_start TEXT,
  trial_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0
    CHECK (
      cancel_at_period_end IN (0, 1)
    ),
  cancel_at TEXT,
  cancelled_at TEXT,
  ended_at TEXT,
  past_due_since TEXT,
  grace_expires_at TEXT,
  last_invoice_paid_at TEXT,
  last_invoice_payment_failed_at TEXT,
  last_provider_event_id TEXT NOT NULL DEFAULT '',
  last_synced_at TEXT,
  is_current INTEGER NOT NULL DEFAULT 1
    CHECK (
      is_current IN (0, 1)
    ),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,
  FOREIGN KEY (plan_id)
    REFERENCES platform_plans(id),
  FOREIGN KEY (plan_price_id)
    REFERENCES platform_plan_prices(id)
);

CREATE UNIQUE INDEX idx_workspace_subscriptions_current
ON workspace_subscriptions (
  workspace_id
)
WHERE is_current = 1;

CREATE UNIQUE INDEX idx_workspace_subscriptions_provider_subscription
ON workspace_subscriptions (
  provider,
  provider_subscription_id
)
WHERE trim(provider_subscription_id) <> '';

CREATE INDEX idx_workspace_subscriptions_workspace_history
ON workspace_subscriptions (
  workspace_id,
  created_at DESC
);

CREATE INDEX idx_workspace_subscriptions_status
ON workspace_subscriptions (
  status,
  grace_expires_at,
  current_period_end
);

-- Hidden access-neutral compatibility plan. It preserves the feature set
-- already enabled for existing workspaces while the resolver is introduced.
INSERT OR IGNORE INTO platform_plans (
  id,
  plan_key,
  name,
  description,
  plan_type,
  status,
  is_public,
  sort_order,
  metadata_json
) VALUES (
  'plan_compatibility_full_access',
  'compatibility-full-access',
  'Compatibility full access',
  'Hidden migration plan preserving pre-subscription WedPlanned access.',
  'internal',
  'active',
  0,
  9999,
  '{"release":"v1.10.13a","gate":"2A","compatibility":true}'
);

INSERT OR IGNORE INTO platform_plan_entitlements (
  plan_id,
  feature_key,
  enabled,
  limit_value,
  metadata_json
)
SELECT
  'plan_compatibility_full_access',
  feature_key,
  1,
  NULL,
  '{"release":"v1.10.13a","gate":"2A","compatibility":true}'
FROM platform_features
WHERE status = 'active';

-- Existing workspaces get a non-Stripe complimentary assignment only.
-- This is a migration compatibility state, not a commercial tier.
INSERT INTO workspace_subscriptions (
  id,
  workspace_id,
  plan_id,
  provider,
  status,
  billing_interval,
  is_current,
  metadata_json
)
SELECT
  'subscription_compat_' || id,
  id,
  'plan_compatibility_full_access',
  'internal',
  'complimentary',
  'none',
  1,
  '{"release":"v1.10.13a","gate":"2A","compatibility":true}'
FROM workspaces workspace
WHERE NOT EXISTS (
  SELECT 1
  FROM workspace_subscriptions subscription
  WHERE subscription.workspace_id = workspace.id
    AND subscription.is_current = 1
);

INSERT INTO schema_meta (
  key,
  value,
  updated_at
)
VALUES (
  'schema_version',
  '52',
  CURRENT_TIMESTAMP
)
ON CONFLICT(key)
DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
