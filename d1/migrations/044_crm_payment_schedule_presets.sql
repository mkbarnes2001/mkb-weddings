-- v1.10.11a refinement: reusable workspace payment schedule presets.
-- Schema 43 -> 44.
--
-- Presets are reusable commercial configuration only.
-- Actual invoice obligations remain immutable invoice schedule rows.
-- Existing crm_booking_settings values remain the legacy/default fallback.

CREATE TABLE crm_payment_schedule_presets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,

  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (
      status IN (
        'active',
        'archived'
      )
    ),

  is_default INTEGER NOT NULL DEFAULT 0
    CHECK (
      is_default IN (0, 1)
    ),

  deposit_type TEXT NOT NULL DEFAULT 'none'
    CHECK (
      deposit_type IN (
        'none',
        'fixed',
        'percentage'
      )
    ),

  deposit_value INTEGER NOT NULL DEFAULT 0
    CHECK (
      deposit_value >= 0
    ),

  deposit_due_days_after_acceptance INTEGER NOT NULL DEFAULT 0
    CHECK (
      deposit_due_days_after_acceptance >= 0
    ),

  final_balance_due_days_before_event INTEGER NOT NULL DEFAULT 30
    CHECK (
      final_balance_due_days_before_event >= 0
    ),

  sort_order INTEGER NOT NULL DEFAULT 0,

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
    REFERENCES platform_users(id),

  UNIQUE (
    workspace_id,
    name
  )
);

CREATE INDEX
idx_crm_payment_schedule_presets_workspace
ON crm_payment_schedule_presets (
  workspace_id,
  status,
  sort_order,
  name
);

CREATE UNIQUE INDEX
idx_crm_payment_schedule_presets_default
ON crm_payment_schedule_presets (
  workspace_id
)
WHERE
  status = 'active'
  AND is_default = 1;

-- Preserve each existing workspace's current commercial payment defaults
-- as its first reusable preset.
INSERT INTO crm_payment_schedule_presets (
  id,
  workspace_id,
  name,
  description,
  status,
  is_default,
  deposit_type,
  deposit_value,
  deposit_due_days_after_acceptance,
  final_balance_due_days_before_event,
  sort_order,
  created_at,
  updated_at
)
SELECT
  'crm_payment_schedule_default_' || workspace_id,
  workspace_id,
  'Standard payment schedule',
  'Existing workspace payment defaults.',
  'active',
  1,
  deposit_type,
  deposit_value,
  deposit_due_days_after_acceptance,
  final_balance_due_days_before_event,
  10,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM crm_booking_settings;

INSERT INTO schema_meta (
  key,
  value,
  updated_at
)
VALUES (
  'schema_version',
  '44',
  CURRENT_TIMESTAMP
)
ON CONFLICT(key)
DO UPDATE SET
  value = excluded.value,
  updated_at = CURRENT_TIMESTAMP;
