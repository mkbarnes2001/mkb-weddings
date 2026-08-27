#!/usr/bin/env python3
"""v1.10.12a Gate 2F Payment Setup + Stripe Connect server contract."""

from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8",
    )


service = read(
    "serverless/crm-connected-payments-d1.ts"
)

settings_route = read(
    "functions/api/crm/payments/settings.ts"
)

connect_route = read(
    "functions/api/crm/payments/stripe/connect.ts"
)

callback_route = read(
    "functions/api/crm/payments/stripe/callback.ts"
)

sync_route = read(
    "functions/api/crm/payments/stripe/sync.ts"
)

disconnect_route = read(
    "functions/api/crm/payments/stripe/disconnect.ts"
)

schema = read(
    "d1/schema.sql"
)


# Workspace-owned settings contract.
for token in [
    "getWorkspacePaymentSettings",
    "saveWorkspacePaymentSettings",
    "workspace_payment_settings",
    "card_payments_enabled",
    "bank_transfer_enabled",
    "bank_transfer_instructions",
]:
    assert token in service, token


# Card collection cannot be enabled before Stripe is genuinely ready.
assert (
    'stripeStatus !== "ready"'
    in service
)

assert (
    "Connect a Stripe account and complete Stripe verification"
    in service
)


# Support-mode writes are explicitly blocked server-side.
assert (
    'actor.accessMode === "support"'
    in service
)

assert (
    '"crm:manage"'
    in service
)

assert (
    '"crm:read"'
    in service
)


# Dedicated WedPlanned Connect configuration is used.
# The legacy Print Store STRIPE_SECRET_KEY binding is not silently reused.
for token in [
    "WEDPLANNED_STRIPE_SECRET_KEY",
    "WEDPLANNED_STRIPE_CONNECT_CLIENT_ID",
    "WEDPLANNED_STRIPE_CONNECT_REDIRECT_URI",
]:
    assert token in service, token

assert (
    "env.STRIPE_SECRET_KEY"
    not in service
)

assert (
    "STRIPE_WEBHOOK_SECRET"
    not in service
)


# OAuth state is random, hashed at rest, workspace/user scoped and one-use.
for token in [
    "payment_provider_connection_states",
    "randomToken(32)",
    "await sha256(rawState)",
    "state_hash",
    "consumed_at IS NULL",
    "SET consumed_at = CURRENT_TIMESTAMP",
    "workspace_id",
    "membership_id",
]:
    assert token in service, token


# Standard Stripe Connect OAuth contract.
for token in [
    "/oauth/authorize",
    'response_type',
    '"code"',
    '"read_write"',
    "/oauth/token",
    "authorization_code",
    "stripe_user_id",
    "/oauth/deauthorize",
]:
    assert token in service, token


# No per-business secret/access token is persisted.
for forbidden in [
    "stripe_access_token",
    "stripe_refresh_token",
]:
    assert forbidden not in service, forbidden


# Durable account identity/readiness only.
for token in [
    "stripe_account_id",
    "stripe_connection_status",
    "stripe_details_submitted",
    "stripe_charges_enabled",
    "stripe_payouts_enabled",
]:
    assert token in service, token


# Connection only becomes ready once account onboarding and money movement
# capabilities are available.
assert (
    "detailsSubmitted"
    in service
)

assert (
    "chargesEnabled"
    in service
)

assert (
    "payoutsEnabled"
    in service
)

assert (
    'return "ready";'
    in service
)


# Account IDs remain unique across WedPlanned workspaces.
assert (
    "already connected to another WedPlanned business"
    in service
)

assert (
    "idx_workspace_payment_settings_stripe_account"
    in schema
)


# Routes are professional-authenticated.
for route in [
    settings_route,
    connect_route,
    callback_route,
    sync_route,
    disconnect_route,
]:
    assert (
        "requireProfessionalContext"
        in route
    )


assert "onRequestGet" in settings_route
assert "onRequestPut" in settings_route
assert "beginStripeConnection" in connect_route
assert "completeStripeConnection" in callback_route
assert "syncStripeConnection" in sync_route
assert "disconnectStripeConnection" in disconnect_route


# Callback returns only to an Admin-local path.
assert (
    'path.startsWith("/admin/")'
    in callback_route
)


# Connected Payment settings require the schema-50 foundation or newer.
db = sqlite3.connect(":memory:")

db.executescript(schema)

version = db.execute(
    """
    SELECT value
    FROM schema_meta
    WHERE key = 'schema_version'
    LIMIT 1
    """
).fetchone()[0]

assert int(version) >= 50

db.close()


print(
    "PASS v1.10.12a Payment Setup + Stripe Connect service"
)
print(
    "  workspace-owned payment settings: verified"
)
print(
    "  card readiness guard: verified"
)
print(
    "  bank transfer settings: verified"
)
print(
    "  professional permission boundary: verified"
)
print(
    "  support-mode mutation block: verified"
)
print(
    "  dedicated WedPlanned Stripe credentials: verified"
)
print(
    "  hashed one-use OAuth state: verified"
)
print(
    "  Standard Connect OAuth contract: verified"
)
print(
    "  connected-account uniqueness: verified"
)
print(
    "  Stripe readiness synchronisation: verified"
)
print(
    "  authenticated API routes: verified"
)
print(
    "  schema 50+ payment foundation: verified"
)
