#!/usr/bin/env python3
"""v1.10.12a Gate 2F connected-payments schema foundation."""

from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]

migration = (
    ROOT
    / "d1/migrations/050_connected_payments_foundation.sql"
).read_text(
    encoding="utf-8",
)

schema = (
    ROOT / "d1/schema.sql"
).read_text(
    encoding="utf-8",
)

exports = (
    ROOT
    / "serverless/platform-operations-d1.ts"
).read_text(
    encoding="utf-8",
)

platform = (
    ROOT
    / "serverless/platform-foundation-d1.ts"
).read_text(
    encoding="utf-8",
)


def table_columns(
    connection: sqlite3.Connection,
    table: str,
):
    return {
        row[1]
        for row in connection.execute(
            f"PRAGMA table_info({table})"
        ).fetchall()
    }


assert (
    "Schema 49 -> 50"
    in migration
)

for token in [
    "CREATE TABLE workspace_payment_settings",
    "CREATE TABLE payment_provider_connection_states",
    "CREATE TABLE crm_invoice_payment_attempts",
    "'schema_version'",
    "'50'",
]:
    assert token in migration, token
    assert token in schema, token


db = sqlite3.connect(":memory:")

db.executescript(schema)

version = db.execute(
    """
    SELECT value
    FROM schema_meta
    WHERE key = 'schema_version'
    LIMIT 1
    """
).fetchone()

assert version
assert int(version[0]) >= 50


settings_columns = table_columns(
    db,
    "workspace_payment_settings",
)

for column in [
    "workspace_id",
    "card_payments_enabled",
    "bank_transfer_enabled",
    "bank_account_name",
    "bank_name",
    "bank_sort_code",
    "bank_account_number",
    "bank_iban",
    "bank_bic",
    "bank_transfer_instructions",
    "stripe_connection_status",
    "stripe_account_id",
    "stripe_account_type",
    "stripe_country",
    "stripe_default_currency",
    "stripe_details_submitted",
    "stripe_charges_enabled",
    "stripe_payouts_enabled",
    "stripe_connected_at",
    "stripe_last_synced_at",
    "stripe_disconnected_at",
]:
    assert column in settings_columns, column


# We persist only the connected account identity/readiness,
# never a business Stripe credential.
for forbidden in [
    "stripe_secret_key",
    "access_token",
    "refresh_token",
    "client_secret",
]:
    assert forbidden not in settings_columns, forbidden


state_columns = table_columns(
    db,
    "payment_provider_connection_states",
)

for column in [
    "workspace_id",
    "user_id",
    "membership_id",
    "provider",
    "state_hash",
    "return_path",
    "expires_at",
    "consumed_at",
]:
    assert column in state_columns, column

assert "state" not in state_columns
assert "raw_state" not in state_columns


attempt_columns = table_columns(
    db,
    "crm_invoice_payment_attempts",
)

for column in [
    "workspace_id",
    "invoice_id",
    "schedule_item_id",
    "client_identity_id",
    "provider",
    "provider_account_id",
    "provider_checkout_id",
    "provider_payment_id",
    "idempotency_key",
    "status",
    "amount",
    "currency",
    "client_email",
    "failure_code",
    "failure_message",
    "expires_at",
    "completed_at",
]:
    assert column in attempt_columns, column


ledger_columns = table_columns(
    db,
    "crm_invoice_payments",
)

for column in [
    "invoice_id",
    "schedule_item_id",
    "payment_type",
    "amount",
    "method",
    "provider",
    "provider_payment_id",
]:
    assert column in ledger_columns, column


schedule_columns = table_columns(
    db,
    "crm_invoice_schedule_items",
)

# Schedule rows remain obligations. Payment state is derived
# from crm_invoice_payments rather than duplicated here.
assert "amount" in schedule_columns
assert "due_date" in schedule_columns
assert "amount_paid" not in schedule_columns
assert "paid_amount" not in schedule_columns
assert "payment_status" not in schedule_columns


indexes = {
    row[1]
    for row in db.execute(
        "PRAGMA index_list(workspace_payment_settings)"
    ).fetchall()
}

assert (
    "idx_workspace_payment_settings_stripe_account"
    in indexes
)


attempt_indexes = {
    row[1]
    for row in db.execute(
        "PRAGMA index_list(crm_invoice_payment_attempts)"
    ).fetchall()
}

for index in [
    "idx_crm_invoice_payment_attempts_idempotency",
    "idx_crm_invoice_payment_attempts_checkout",
    "idx_crm_invoice_payment_attempts_payment",
    "idx_crm_invoice_payment_attempts_invoice",
    "idx_crm_invoice_payment_attempts_schedule",
]:
    assert index in attempt_indexes, index


seed = db.execute(
    """
    SELECT workspace_id,
           card_payments_enabled,
           bank_transfer_enabled,
           stripe_connection_status
    FROM workspace_payment_settings
    WHERE workspace_id = 'workspace_mkb_weddings'
    LIMIT 1
    """
).fetchone()

assert seed
assert seed[1] == 0
assert seed[2] == 0
assert seed[3] == "disconnected"


db.close()


# Workspace export owns durable business payment configuration
# and CRM operational payment attempts.
assert (
    '"workspace_payment_settings"'
    in exports
)

assert (
    '"crm_invoice_payment_attempts"'
    in exports
)

# Ephemeral OAuth state hashes are deliberately excluded.
assert (
    '"payment_provider_connection_states"'
    not in exports
)


# Do not claim Stripe Connect is operational until runtime
# onboarding and verified provider processing are implemented.
assert (
    'key: "connect", label: "Stripe Connect", status: "planned"'
    in platform
)


# Existing invoice ledger remains provider-idempotent.
assert (
    "idx_crm_invoice_payments_provider"
    in schema
)

assert (
    "'stripe'"
    in schema
)


print(
    "PASS v1.10.12a connected payments foundation"
)
print(
    "  schema 49 -> 50: verified"
)
print(
    "  workspace payment settings: verified"
)
print(
    "  Stripe account identity without business secrets: verified"
)
print(
    "  one-use hashed connection state: verified"
)
print(
    "  invoice checkout attempt lifecycle: verified"
)
print(
    "  existing CRM payment ledger retained: verified"
)
print(
    "  immutable payment schedule retained: verified"
)
print(
    "  workspace export ownership: verified"
)
print(
    "  Stripe Connect readiness remains planned: verified"
)
