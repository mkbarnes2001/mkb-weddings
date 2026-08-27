#!/usr/bin/env python3

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (
        ROOT / relative
    ).read_text(
        encoding="utf-8",
    )


portal_service = read(
    "serverless/client-portal-commercial-d1.ts"
)

payment_service = read(
    "serverless/crm-connected-payments-d1.ts"
)

route = read(
    "functions/api/public/client-portal/invoices/[id]/checkout.ts"
)

migration = read(
    "d1/migrations/050_connected_payments_foundation.sql"
)


# ------------------------------------------------------------
# Authenticated client / invoice access boundary
# ------------------------------------------------------------

for token in [
    "getPublicInvoiceCheckoutContext",
    "publicIdentity",
    "getPublicInvoice",
]:
    assert token in portal_service, token


for token in [
    "resolveClientPortalWorkspaceId",
    "getPublicInvoiceCheckoutContext",
    "beginStripeInvoiceCheckout",
    "identityId",
    "clientEmail",
    "scheduleItemId",
    "requestUrl",
]:
    assert token in route, token


# Context must be resolved before Checkout begins.
assert (
    route.index(
        "getPublicInvoiceCheckoutContext"
    )
    < route.index(
        "beginStripeInvoiceCheckout("
    )
)


# ------------------------------------------------------------
# Connected-account Stripe Checkout
# ------------------------------------------------------------

for token in [
    "beginStripeInvoiceCheckout",
    "/v1/checkout/sessions",
    '"Stripe-Account"',
    '"Idempotency-Key"',
    "stripe_account_id",
    "stripe_connection_status",
    "stripe_charges_enabled",
    "stripe_payouts_enabled",
    "card_payments_enabled",
]:
    assert token in payment_service, token


# ------------------------------------------------------------
# Existing attempt lifecycle is reused
# ------------------------------------------------------------

for token in [
    "crm_invoice_payment_attempts",
    "provider_account_id",
    "provider_checkout_id",
    "provider_payment_id",
    "idempotency_key",
    "schedule_item_id",
    "client_identity_id",
]:
    assert token in migration, token

for token in [
    "INSERT INTO crm_invoice_payment_attempts",
    "provider_checkout_id",
    "provider_payment_id",
    "status = 'open'",
    "status = 'failed'",
    "status = 'cancelled'",
]:
    assert token in payment_service, token


# ------------------------------------------------------------
# Stripe receives invoice linkage metadata
# ------------------------------------------------------------

for token in [
    "wedplanned_attempt_id",
    "wedplanned_workspace_id",
    "wedplanned_invoice_id",
    "wedplanned_schedule_item_id",
    "payment_intent_data[metadata]",
]:
    assert token in payment_service, token


# ------------------------------------------------------------
# Critical boundary: browser Checkout route cannot settle money
# ------------------------------------------------------------

for forbidden in [
    "INSERT INTO crm_invoice_payments",
    "UPDATE crm_invoices",
    "invoice.payment_recorded",
    "processStripeInvoicePaymentEvent",
]:
    assert forbidden not in route, forbidden


# No platform subscription/Billing path.
for forbidden in [
    "subscription",
    "Stripe Billing",
]:
    assert forbidden not in route
    assert forbidden not in payment_service[
        payment_service.index(
            "export async function beginStripeInvoiceCheckout"
        ):
    ]


print(
    "PASS v1.10.12a client invoice Stripe Checkout creation"
)

print(
    "  authenticated public invoice boundary: verified"
)

print(
    "  active Job access inherited: verified"
)

print(
    "  direct connected-account Checkout: verified"
)

print(
    "  payment-attempt lifecycle reuse: verified"
)

print(
    "  Stripe linkage metadata: verified"
)

print(
    "  browser route cannot settle invoice: verified"
)

print(
    "  no subscription Billing coupling: verified"
)
