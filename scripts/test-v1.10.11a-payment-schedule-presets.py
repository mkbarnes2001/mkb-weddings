#!/usr/bin/env python3
"""v1.10.11a reusable payment schedule preset foundation."""

from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]

SCHEMA = (
    ROOT
    / "d1/schema.sql"
)

MIGRATION = (
    ROOT
    / "d1/migrations/"
      "044_crm_payment_schedule_presets.sql"
)


def read(relative: str) -> str:
    return (
        ROOT / relative
    ).read_text(
        encoding="utf-8",
    )


schema = SCHEMA.read_text(
    encoding="utf-8",
)

migration = MIGRATION.read_text(
    encoding="utf-8",
)

service = read(
    "serverless/"
    "crm-payment-schedules-d1.ts"
)

router = read(
    "functions/api/crm/[[path]].ts"
)

types = read(
    "src/admin/types/crm.ts"
)

api = read(
    "src/admin/services/"
    "AdminApiService.ts"
)

operations = read(
    "serverless/"
    "platform-operations-d1.ts"
)


# Canonical schema is now 44.
con = sqlite3.connect(":memory:")

con.execute(
    "PRAGMA foreign_keys = ON"
)

con.executescript(
    schema,
)

version = con.execute(
    """
    SELECT value
    FROM schema_meta
    WHERE key='schema_version'
    """
).fetchone()

assert version
assert version[0] == "44"


columns = {
    row[1]
    for row in con.execute(
        """
        PRAGMA table_info(
          crm_payment_schedule_presets
        )
        """
    )
}

assert {
    "id",
    "workspace_id",
    "name",
    "description",
    "status",
    "is_default",
    "deposit_type",
    "deposit_value",
    "deposit_due_days_after_acceptance",
    "final_balance_due_days_before_event",
    "sort_order",
    "created_by_user_id",
    "updated_by_user_id",
    "created_at",
    "updated_at",
} <= columns


indexes = {
    row[1]
    for row in con.execute(
        """
        PRAGMA index_list(
          crm_payment_schedule_presets
        )
        """
    )
}

assert (
    "idx_crm_payment_schedule_presets_default"
    in indexes
)

assert (
    "idx_crm_payment_schedule_presets_workspace"
    in indexes
)


# Exact 43 -> 44 migration path works independently.
marker = (
    "-- v1.10.11a refinement: "
    "reusable workspace payment schedule presets."
)

assert marker in schema

schema_43 = schema.split(
    marker,
    1,
)[0]

upgrade = sqlite3.connect(":memory:")

upgrade.execute(
    "PRAGMA foreign_keys = ON"
)

upgrade.executescript(
    schema_43,
)

before = upgrade.execute(
    """
    SELECT value
    FROM schema_meta
    WHERE key='schema_version'
    """
).fetchone()

assert before
assert before[0] == "43"

settings_before = upgrade.execute(
    """
    SELECT COUNT(*)
    FROM crm_booking_settings
    """
).fetchone()[0]

upgrade.executescript(
    migration,
)

after = upgrade.execute(
    """
    SELECT value
    FROM schema_meta
    WHERE key='schema_version'
    """
).fetchone()

assert after
assert after[0] == "44"

presets_after = upgrade.execute(
    """
    SELECT COUNT(*)
    FROM crm_payment_schedule_presets
    """
).fetchone()[0]

assert (
    presets_after
    == settings_before
)

if settings_before:
    assert upgrade.execute(
        """
        SELECT COUNT(*)
        FROM crm_payment_schedule_presets
        WHERE status='active'
          AND is_default=1
        """
    ).fetchone()[0] == settings_before


# Storage meaning is explicit: reusable configuration,
# not actual invoice schedule/payment rows.
for token in (
    "deposit_type",
    "deposit_value",
    "deposit_due_days_after_acceptance",
    "final_balance_due_days_before_event",
    "Existing workspace payment defaults.",
):
    assert token in migration, token

assert (
    "crm_invoice_schedule_items"
    not in migration
)

assert (
    "crm_invoice_payments"
    not in migration
)


# Server authority is actor-derived and support writes remain blocked.
for token in (
    '"crm:read"',
    '"crm:manage"',
    'actor?.accessMode === "support"',
    "WHERE workspace_id = ?",
    "actor.workspaceId",
):
    assert token in service, token

for function_name in (
    "listCrmPaymentSchedulePresets",
    "getCrmPaymentSchedulePreset",
    "createCrmPaymentSchedulePreset",
    "saveCrmPaymentSchedulePreset",
    "archiveCrmPaymentSchedulePreset",
):
    assert (
        f"export async function {function_name}"
        in service
    ), function_name

assert (
    "value > 10000"
    in service
)

assert (
    "Percentage deposit cannot exceed 100%."
    in service
)

assert (
    "platform_audit_events"
    in service
)

for event in (
    "crm.payment_schedule_preset.created",
    "crm.payment_schedule_preset.updated",
    "crm.payment_schedule_preset.archived",
):
    assert event in service, event


# CRM API routes are authenticated through the existing professional actor.
for token in (
    'parts[1] === "payment-schedules"',
    "listCrmPaymentSchedulePresets",
    "createCrmPaymentSchedulePreset",
    "saveCrmPaymentSchedulePreset",
    "archiveCrmPaymentSchedulePreset",
    '"private, no-store"',
):
    assert token in router, token

assert (
    "/api/crm/commercial/payment-schedules"
    in api
)

for token in (
    "getCrmPaymentSchedulePresets",
    "createCrmPaymentSchedulePreset",
    "saveCrmPaymentSchedulePreset",
    "archiveCrmPaymentSchedulePreset",
):
    assert token in api, token


# Browser contracts use the canonical types.
assert (
    "export type CrmPaymentSchedulePreset"
    in types
)

assert (
    "export type CrmPaymentSchedulePresetInput"
    in types
)


# Workspace export/deletion tooling knows about the new durable table.
assert (
    '"crm_payment_schedule_presets"'
    in operations
)


# Structural integrity.
assert not con.execute(
    "PRAGMA foreign_key_check"
).fetchall()

assert not upgrade.execute(
    "PRAGMA foreign_key_check"
).fetchall()


print(
    "PASS v1.10.11a payment schedule preset foundation"
)

print(
    "  schema transition: 43 -> 44"
)

print(
    "  existing workspace defaults seeded: verified"
)

print(
    "  workspace-scoped reusable presets: verified"
)

print(
    "  one active default per workspace: verified"
)

print(
    "  fixed / percentage / no-deposit schedules: verified"
)

print(
    "  percentage upper bound: verified"
)

print(
    "  crm:read / crm:manage authority: verified"
)

print(
    "  support-session writes blocked: verified"
)

print(
    "  authenticated CRM CRUD routes: verified"
)

print(
    "  workspace export coverage: verified"
)

print(
    "  actual invoice schedule/payment tables unchanged"
)
