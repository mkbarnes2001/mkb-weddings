#!/usr/bin/env python3
"""v1.10.12a Gate 2F Payment Setup Admin UI."""

from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8",
    )


page = read(
    "src/admin/pages/CRMPaymentSetup.tsx"
)

api = read(
    "src/admin/services/AdminApiService.ts"
)

types = read(
    "src/admin/types/crm.ts"
)

app = read(
    "src/admin/app/AdminApp.tsx"
)

nav = read(
    "src/admin/navigation/adminModules.ts"
)

css = read(
    "src/admin/admin-theme.css"
)

service = read(
    "serverless/crm-connected-payments-d1.ts"
)

callback = read(
    "functions/api/crm/payments/stripe/callback.ts"
)

migration = read(
    "d1/migrations/050_connected_payments_foundation.sql"
)

schema = read(
    "d1/schema.sql"
)


# Dedicated WedCRM page / route rather than another CRM.tsx switch branch.
assert (
    'export function CRMPaymentSetup'
    in page
)

assert (
    'path="crm/payment-setup"'
    in app
)

assert (
    'to: "/admin/crm/payment-setup"'
    in nav
)

assert (
    'label: "Payment setup"'
    in nav
)

assert (
    'icon: CreditCard'
    in nav
)


# Callback and persisted state agree on one canonical route.
for source in [
    service,
    callback,
    migration,
    schema,
    api,
]:
    assert (
        "/admin/crm/payment-setup"
        in source
    )

assert (
    "/admin/crm?view=payment-setup"
    not in service
)

assert (
    "/admin/crm?view=payment-setup"
    not in callback
)

assert (
    "/admin/crm?view=payment-setup"
    not in migration
)


# Admin API client exposes full payment settings lifecycle.
for token in [
    "getCrmPaymentSettings",
    "saveCrmPaymentSettings",
    "startCrmStripeConnection",
    "syncCrmStripeConnection",
    "disconnectCrmStripeConnection",
]:
    assert token in api, token


# Type contract exposes only durable payment settings / account readiness.
assert (
    "export type CrmPaymentSettings"
    in types
)

for token in [
    "cardPaymentsEnabled",
    "bankTransferEnabled",
    "bankAccountName",
    "bankSortCode",
    "bankAccountNumber",
    "bankIban",
    "bankBic",
    "bankTransferInstructions",
    "connectionStatus",
    "accountId",
    "detailsSubmitted",
    "chargesEnabled",
    "payoutsEnabled",
]:
    assert token in types, token


# Stripe provider UX.
for token in [
    'title="Stripe"',
    "Connect Stripe",
    "Enable card payments",
    "Refresh status",
    "Disconnect",
    "Account details",
    "Card charges",
    "Payouts",
]:
    assert token in page, token


# Card collection remains readiness-gated.
assert (
    "|| !stripeReady"
    in page
)


# Bank-transfer UX.
for token in [
    'title="Bank transfer"',
    "Enable bank transfer",
    'label="Account name"',
    'label="Bank name"',
    'label="Sort code"',
    'label="Account number"',
    'label="IBAN"',
    'label="BIC / SWIFT"',
    'label="Payment instructions"',
]:
    assert token in page, token


# No Studio Ninja-specific extra providers or surcharge model.
assert "PayPal" not in page
assert "surcharge" not in page.lower()


# Professional manage permission and support-mode guard are reflected in UI.
assert (
    'auth.permissions.includes('
    in page
)

assert (
    '"crm:manage"'
    in page
)

assert (
    'auth.accessMode !== "support"'
    in page
)


# Business-owned credential boundary remains visible.
assert (
    "Stripe credentials and OAuth access tokens are not stored"
    in page
)


# Styling is compact and responsive.
assert (
    "v1.10.12a — Gate 2F Payment setup"
    in css
)

for token in [
    ".crm-payment-provider-state",
    ".crm-payment-readiness-grid",
    ".crm-payment-method-toggle",
    ".crm-payment-bank-grid",
    ".crm-payment-security-note",
]:
    assert token in css, token


# Payment Setup requires the schema-50 foundation or newer.
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
    "PASS v1.10.12a Payment Setup Admin UI"
)
print(
    "  dedicated WedCRM route: verified"
)
print(
    "  Stripe provider card: verified"
)
print(
    "  Stripe readiness controls: verified"
)
print(
    "  Bank transfer configuration: verified"
)
print(
    "  no PayPal / surcharge duplication: verified"
)
print(
    "  support-mode read-only boundary: verified"
)
print(
    "  canonical callback route: verified"
)
print(
    "  compact responsive presentation: verified"
)
print(
    "  schema 50+ payment foundation: verified"
)
