-- MKB Intelligence v1.6.1 — Stripe hosted checkout and payment lifecycle

ALTER TABLE commerce_orders ADD COLUMN requires_photographer_approval INTEGER NOT NULL DEFAULT 1
  CHECK (requires_photographer_approval IN (0, 1));
ALTER TABLE commerce_orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid', 'processing', 'paid', 'failed', 'expired', 'refunded'));
ALTER TABLE commerce_orders ADD COLUMN checkout_session_id TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_orders ADD COLUMN checkout_attempt INTEGER NOT NULL DEFAULT 0 CHECK (checkout_attempt >= 0);
ALTER TABLE commerce_orders ADD COLUMN payment_intent_id TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_orders ADD COLUMN paid_at TEXT;
ALTER TABLE commerce_orders ADD COLUMN payment_failed_at TEXT;
ALTER TABLE commerce_orders ADD COLUMN refunded_at TEXT;
ALTER TABLE commerce_orders ADD COLUMN shipping_name TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_orders ADD COLUMN shipping_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_orders ADD COLUMN shipping_address_json TEXT NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS idx_commerce_orders_checkout_session
  ON commerce_orders(checkout_session_id)
  WHERE trim(checkout_session_id) <> '';
CREATE INDEX IF NOT EXISTS idx_commerce_orders_payment_status
  ON commerce_orders(workspace_id, payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commerce_orders_payment_intent
  ON commerce_orders(payment_intent_id)
  WHERE trim(payment_intent_id) <> '';

UPDATE commerce_orders
SET
  requires_photographer_approval = CASE WHEN status = 'in_review' THEN 1 ELSE requires_photographer_approval END,
  payment_status = CASE
    WHEN status IN ('paid', 'in_review', 'approved', 'in_fulfilment', 'fulfilled') THEN 'paid'
    WHEN status = 'refunded' THEN 'refunded'
    ELSE 'unpaid'
  END,
  paid_at = CASE
    WHEN status IN ('paid', 'in_review', 'approved', 'in_fulfilment', 'fulfilled') AND paid_at IS NULL
      THEN COALESCE(submitted_at, updated_at, created_at)
    ELSE paid_at
  END,
  refunded_at = CASE
    WHEN status = 'refunded' AND refunded_at IS NULL
      THEN COALESCE(updated_at, submitted_at, created_at)
    ELSE refunded_at
  END;

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '21', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
