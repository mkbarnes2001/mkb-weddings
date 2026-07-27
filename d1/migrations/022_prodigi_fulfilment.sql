-- v1.7.0 — Prodigi Professional Lab Fulfilment
-- Provider-neutral lab submissions, print-ready asset snapshots, callbacks,
-- per-line mapping and manual photographer-controlled submission.

ALTER TABLE commerce_product_variants ADD COLUMN lab_sku TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_product_variants ADD COLUMN lab_attributes_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE commerce_product_variants ADD COLUMN lab_print_area TEXT NOT NULL DEFAULT 'default';
ALTER TABLE commerce_product_variants ADD COLUMN lab_sizing TEXT NOT NULL DEFAULT 'fillPrintArea';
ALTER TABLE commerce_product_variants ADD COLUMN recommended_width_px INTEGER NOT NULL DEFAULT 0;
ALTER TABLE commerce_product_variants ADD COLUMN recommended_height_px INTEGER NOT NULL DEFAULT 0;
ALTER TABLE commerce_product_variants ADD COLUMN lab_mapping_status TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE commerce_product_variants ADD COLUMN lab_mapping_checked_at TEXT;

ALTER TABLE commerce_order_items ADD COLUMN lab_sku TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_order_items ADD COLUMN lab_attributes_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE commerce_order_items ADD COLUMN lab_print_area TEXT NOT NULL DEFAULT 'default';
ALTER TABLE commerce_order_items ADD COLUMN lab_sizing TEXT NOT NULL DEFAULT 'fillPrintArea';
ALTER TABLE commerce_order_items ADD COLUMN recommended_width_px INTEGER NOT NULL DEFAULT 0;
ALTER TABLE commerce_order_items ADD COLUMN recommended_height_px INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS commerce_print_assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  order_item_id TEXT NOT NULL UNIQUE,
  asset_id TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL UNIQUE,
  token_expires_at TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  width_px INTEGER NOT NULL DEFAULT 0,
  height_px INTEGER NOT NULL DEFAULT 0,
  source_width_px INTEGER NOT NULL DEFAULT 0,
  source_height_px INTEGER NOT NULL DEFAULT 0,
  file_size INTEGER NOT NULL DEFAULT 0,
  crop_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'prepared'
    CHECK (status IN ('prepared', 'submitted', 'revoked', 'error')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (order_item_id) REFERENCES commerce_order_items(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_print_assets_workspace
  ON commerce_print_assets(workspace_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_commerce_print_assets_token
  ON commerce_print_assets(access_token, token_expires_at);

CREATE TABLE IF NOT EXISTS commerce_lab_submissions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_order_id TEXT NOT NULL DEFAULT '',
  provider_outcome TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'quoted', 'submitted', 'in_progress', 'complete', 'cancelled', 'error')),
  shipping_method TEXT NOT NULL DEFAULT 'Budget',
  quote_amount_minor INTEGER NOT NULL DEFAULT 0,
  quote_currency TEXT NOT NULL DEFAULT 'GBP',
  request_json TEXT NOT NULL DEFAULT '{}',
  response_json TEXT NOT NULL DEFAULT '{}',
  last_error TEXT NOT NULL DEFAULT '',
  submitted_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (order_id) REFERENCES commerce_orders(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_lab_submissions_order
  ON commerce_lab_submissions(order_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_commerce_lab_submissions_provider_order
  ON commerce_lab_submissions(provider, provider_order_id)
  WHERE trim(provider_order_id) <> '';

CREATE TABLE IF NOT EXISTS commerce_lab_submission_items (
  submission_id TEXT NOT NULL,
  order_item_id TEXT NOT NULL,
  provider_item_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (submission_id, order_item_id),
  FOREIGN KEY (submission_id) REFERENCES commerce_lab_submissions(id),
  FOREIGN KEY (order_item_id) REFERENCES commerce_order_items(id)
);
CREATE INDEX IF NOT EXISTS idx_commerce_lab_submission_items_order_item
  ON commerce_lab_submission_items(order_item_id, status);

CREATE TABLE IF NOT EXISTS commerce_lab_events (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES commerce_lab_submissions(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_commerce_lab_events_provider
  ON commerce_lab_events(provider, provider_event_id)
  WHERE trim(provider_event_id) <> '';
CREATE INDEX IF NOT EXISTS idx_commerce_lab_events_submission
  ON commerce_lab_events(submission_id, created_at DESC);

INSERT INTO schema_meta (key, value, updated_at)
VALUES ('schema_version', '22', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
