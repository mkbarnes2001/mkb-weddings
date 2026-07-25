-- v1.6.0 — Print Store Foundation
-- Workspace-owned catalogue, price lists, Client Gallery store settings,
-- carts, crop choices, order snapshots and provider-neutral payment events.

CREATE TABLE IF NOT EXISTS commerce_products (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'prints',
  fulfilment_type TEXT NOT NULL DEFAULT 'print'
    CHECK (fulfilment_type IN ('print', 'wall_art', 'album', 'digital', 'other')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  lab_connector_key TEXT NOT NULL DEFAULT '',
  lab_product_code TEXT NOT NULL DEFAULT '',
  requires_crop INTEGER NOT NULL DEFAULT 1 CHECK (requires_crop IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_products_workspace
  ON commerce_products(workspace_id, status, sort_order, name);

CREATE TABLE IF NOT EXISTS commerce_product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  sku TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  width_mm INTEGER NOT NULL DEFAULT 0,
  height_mm INTEGER NOT NULL DEFAULT 0,
  orientation TEXT NOT NULL DEFAULT 'any'
    CHECK (orientation IN ('any', 'landscape', 'portrait', 'square')),
  finish TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES commerce_products(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_product_variants_product
  ON commerce_product_variants(product_id, status, sort_order, name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_commerce_product_variants_sku
  ON commerce_product_variants(product_id, sku)
  WHERE trim(sku) <> '';

CREATE TABLE IF NOT EXISTS commerce_price_lists (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  tax_inclusive INTEGER NOT NULL DEFAULT 1 CHECK (tax_inclusive IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_price_lists_workspace
  ON commerce_price_lists(workspace_id, status, is_default DESC, name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_commerce_price_lists_default
  ON commerce_price_lists(workspace_id)
  WHERE is_default = 1 AND status <> 'archived';

CREATE TABLE IF NOT EXISTS commerce_price_list_items (
  price_list_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  retail_price_minor INTEGER NOT NULL DEFAULT 0 CHECK (retail_price_minor >= 0),
  studio_cost_minor INTEGER NOT NULL DEFAULT 0 CHECK (studio_cost_minor >= 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (price_list_id, variant_id),
  FOREIGN KEY (price_list_id) REFERENCES commerce_price_lists(id),
  FOREIGN KEY (variant_id) REFERENCES commerce_product_variants(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_price_list_items_variant
  ON commerce_price_list_items(variant_id, price_list_id, active);

CREATE TABLE IF NOT EXISTS client_gallery_store_settings (
  gallery_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  price_list_id TEXT,
  allow_crop INTEGER NOT NULL DEFAULT 1 CHECK (allow_crop IN (0, 1)),
  require_photographer_approval INTEGER NOT NULL DEFAULT 1 CHECK (require_photographer_approval IN (0, 1)),
  minimum_order_minor INTEGER NOT NULL DEFAULT 0 CHECK (minimum_order_minor >= 0),
  intro TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id),
  FOREIGN KEY (price_list_id) REFERENCES commerce_price_lists(id)
);

CREATE TABLE IF NOT EXISTS commerce_carts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  gallery_id TEXT NOT NULL,
  visitor_key TEXT NOT NULL DEFAULT '',
  identity_id TEXT,
  email TEXT NOT NULL DEFAULT '',
  email_normalized TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'GBP',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'converted', 'abandoned')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id),
  FOREIGN KEY (identity_id) REFERENCES client_identities(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_carts_gallery_visitor
  ON commerce_carts(gallery_id, visitor_key, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_commerce_carts_identity
  ON commerce_carts(identity_id, gallery_id, status, updated_at);

CREATE TABLE IF NOT EXISTS commerce_cart_items (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_minor INTEGER NOT NULL DEFAULT 0 CHECK (unit_price_minor >= 0),
  crop_json TEXT NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cart_id) REFERENCES commerce_carts(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (variant_id) REFERENCES commerce_product_variants(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_cart_items_cart
  ON commerce_cart_items(cart_id, created_at, id);

CREATE TABLE IF NOT EXISTS commerce_orders (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  gallery_id TEXT NOT NULL,
  cart_id TEXT,
  identity_id TEXT,
  order_number TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL DEFAULT '',
  email_normalized TEXT NOT NULL DEFAULT '',
  client_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'awaiting_payment', 'paid', 'in_review', 'approved', 'in_fulfilment', 'fulfilled', 'cancelled', 'refunded')),
  currency TEXT NOT NULL DEFAULT 'GBP',
  subtotal_minor INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_minor >= 0),
  shipping_minor INTEGER NOT NULL DEFAULT 0 CHECK (shipping_minor >= 0),
  tax_minor INTEGER NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
  total_minor INTEGER NOT NULL DEFAULT 0 CHECK (total_minor >= 0),
  payment_provider TEXT NOT NULL DEFAULT 'manual',
  payment_reference TEXT NOT NULL DEFAULT '',
  lab_connector_key TEXT NOT NULL DEFAULT '',
  lab_reference TEXT NOT NULL DEFAULT '',
  client_notes TEXT NOT NULL DEFAULT '',
  internal_notes TEXT NOT NULL DEFAULT '',
  submitted_at TEXT,
  approved_at TEXT,
  fulfilled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (gallery_id) REFERENCES client_galleries(id),
  FOREIGN KEY (cart_id) REFERENCES commerce_carts(id),
  FOREIGN KEY (identity_id) REFERENCES client_identities(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_orders_workspace
  ON commerce_orders(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commerce_orders_gallery
  ON commerce_orders(gallery_id, created_at DESC);

CREATE TABLE IF NOT EXISTS commerce_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  sku TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_minor INTEGER NOT NULL DEFAULT 0 CHECK (unit_price_minor >= 0),
  studio_cost_minor INTEGER NOT NULL DEFAULT 0 CHECK (studio_cost_minor >= 0),
  line_total_minor INTEGER NOT NULL DEFAULT 0 CHECK (line_total_minor >= 0),
  lab_connector_key TEXT NOT NULL DEFAULT '',
  lab_product_code TEXT NOT NULL DEFAULT '',
  crop_json TEXT NOT NULL DEFAULT '{}',
  fulfilment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (fulfilment_status IN ('pending', 'approved', 'submitted', 'fulfilled', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES commerce_orders(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  FOREIGN KEY (product_id) REFERENCES commerce_products(id),
  FOREIGN KEY (variant_id) REFERENCES commerce_product_variants(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_order_items_order
  ON commerce_order_items(order_id, created_at, id);

CREATE TABLE IF NOT EXISTS commerce_payment_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  amount_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES commerce_orders(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_commerce_payment_events_provider
  ON commerce_payment_events(provider, provider_event_id)
  WHERE trim(provider_event_id) <> '';
CREATE INDEX IF NOT EXISTS idx_commerce_payment_events_order
  ON commerce_payment_events(order_id, created_at DESC);

INSERT OR IGNORE INTO client_gallery_store_settings (gallery_id, enabled, allow_crop, require_photographer_approval)
SELECT id, 0, 1, 1 FROM client_galleries;

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '20', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
