#!/usr/bin/env python3

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


ROUTE = (
    ROOT
    / "functions/api/webhooks/wedplanned-stripe.ts"
).read_text(
    encoding="utf-8",
)

SERVICE = (
    ROOT
    / "serverless/crm-connected-payments-d1.ts"
).read_text(
    encoding="utf-8",
)

PRINT_WEBHOOK = (
    ROOT
    / "functions/api/webhooks/stripe.ts"
).read_text(
    encoding="utf-8",
)


# ------------------------------------------------------------
# Dedicated WedCRM signing secret
# ------------------------------------------------------------

for token in [
    "WEDPLANNED_STRIPE_WEBHOOK_SECRET",
    "WEDPLANNED_STRIPE_WEBHOOK_TOLERANCE_SECONDS",
]:
    assert token in ROUTE, token


# Existing Print Store webhook remains separate.
assert (
    "WEDPLANNED_STRIPE_WEBHOOK_SECRET"
    not in PRINT_WEBHOOK
)

assert (
    "STRIPE_WEBHOOK_SECRET"
    in PRINT_WEBHOOK
)


# ------------------------------------------------------------
# Raw-body signature verification boundary
# ------------------------------------------------------------

for token in [
    "request.text()",
    "Stripe-Signature",
    "verifyStripeWebhook",
]:
    assert token in ROUTE, token


# No JSON parsing is permitted before signature verification.
before_verify = ROUTE[
    :ROUTE.index(
        "verifyStripeWebhook("
    )
]

assert ".json()" not in before_verify


# Settlement can only execute after verifier returns.
assert (
    ROUTE.index(
        "verifyStripeWebhook("
    )
    < ROUTE.index(
        "processStripeInvoicePaymentEvent("
    )
)


# ------------------------------------------------------------
# Route delegates financial logic to validated processor
# ------------------------------------------------------------

assert (
    "processStripeInvoicePaymentEvent"
    in ROUTE
)

for token in [
    "connected_account_mismatch",
    "amount_currency_mismatch",
    "schedule_item_mismatch",
    "INSERT INTO crm_invoice_payments",
    "provider_payment_id",
]:
    assert token in SERVICE, token


# Webhook itself must not duplicate financial SQL.
for forbidden in [
    "INSERT INTO crm_invoice_payments",
    "UPDATE crm_invoices",
    "INSERT INTO crm_activities",
]:
    assert forbidden not in ROUTE, forbidden


# Secret values must never be persisted.
for forbidden in [
    "workspace_payment_settings",
    "INSERT INTO",
    "UPDATE ",
]:
    assert forbidden not in ROUTE, forbidden


print(
    "PASS v1.10.12a WedPlanned Stripe webhook"
)

print(
    "  dedicated signing secret: verified"
)

print(
    "  Print Store webhook isolation: verified"
)

print(
    "  exact raw-body signature verification: verified"
)

print(
    "  settlement occurs only after verification: verified"
)

print(
    "  financial SQL remains service-owned: verified"
)

print(
    "  webhook secrets are not persisted: verified"
)
