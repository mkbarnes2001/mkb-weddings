#!/usr/bin/env python3
"""v1.10.12a Gate 2F.4 Stripe dual onboarding foundation."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (
        ROOT / relative
    ).read_text(
        encoding="utf-8",
    )


service = read(
    "serverless/crm-connected-payments-d1.ts"
)

route = read(
    "functions/api/crm/payments/stripe/onboard.ts"
)

oauth_route = read(
    "functions/api/crm/payments/stripe/connect.ts"
)

callback_route = read(
    "functions/api/crm/payments/stripe/callback.ts"
)

page = read(
    "src/admin/pages/CRMPaymentSetup.tsx"
)

api = read(
    "src/admin/services/AdminApiService.ts"
)

migration = read(
    "d1/migrations/050_connected_payments_foundation.sql"
)

schema = read(
    "d1/schema.sql"
)


# New professional account setup uses Stripe Accounts v2.
hosted_start = service.index(
    "export async function beginStripeHostedOnboarding"
)

hosted_end = service.index(
    "export async function beginStripeConnection",
    hosted_start,
)

hosted = service[
    hosted_start:
    hosted_end
]

for token in [
    "stripeV2JsonRequest",
    '"/v2/core/accounts"',
    "registration_country",
    "default_country",
    "business_profiles",
    "workspace_settings",
    "contact_email:",
    "identity:",
    "configuration:",
    "merchant:",
    "card_payments:",
    "requested: true",
    "defaults:",
    "responsibilities:",
    "fees_collector:",
    "losses_collector:",
    "dashboard:",
    '"full"',
    '"/v2/core/account_links"',
    "use_case:",
    '"account_onboarding"',
    "configurations:",
    '"merchant"',
    "return_url:",
    "refresh_url:",
]:
    assert token in hosted, token

assert (
    '"/v1/accounts"'
    not in hosted
)

assert (
    '"/v1/account_links"'
    not in hosted
)

# Accounts v2 requests are JSON and explicitly API-version pinned.
for token in [
    "STRIPE_V2_VERSION",
    '"2026-08-26.dahlia"',
    '"Content-Type":',
    '"application/json"',
    '"Stripe-Version":',
]:
    assert token in service, token

# A v2-created acct_ identity is deliberately normalised through
# the existing v1 Account representation for common readiness.
assert (
    "await stripeAccount("
    in hosted
)


# Existing Standard-account OAuth remains available.
for token in [
    "/oauth/authorize",
    "/oauth/token",
    "authorization_code",
    "stripe_user_id",
]:
    assert token in service, token

assert (
    "beginStripeConnection"
    in oauth_route
)

assert (
    "completeStripeConnection"
    in callback_route
)


# Hosted onboarding is professional-authenticated on start, refresh and return.
assert (
    "requireProfessionalContext"
    in route
)

assert (
    "onRequestPost"
    in route
)

assert (
    "onRequestGet"
    in route
)

assert (
    'action === "refresh"'
    in route
)

assert (
    'action !== "return"'
    in route
)

assert (
    "syncStripeConnection"
    in route
)


# The browser never chooses a Stripe account id for hosted setup.
assert (
    "accountId"
    not in route
)


# OAuth deauthorisation uses authenticated platform credentials.
deauth_start = service.index(
    "async function deauthorizeStripeAccount"
)

deauth_end = service.index(
    "export async function disconnectStripeConnection",
    deauth_start,
)

deauth = service[
    deauth_start:
    deauth_end
]

assert (
    "stripeConnectAuthorizedFormRequest"
    in deauth
)

assert (
    "/oauth/deauthorize"
    in deauth
)

assert (
    "client_id"
    in deauth
)

assert (
    "stripe_user_id"
    in deauth
)

assert (
    "client_secret"
    not in deauth
)

assert (
    "Authorization:"
    in service
)

assert (
    "`Basic ${credentials}`"
    in service
)


# No professional access/refresh token storage.
for forbidden in [
    "stripe_access_token",
    "stripe_refresh_token",
]:
    assert forbidden not in service
    assert forbidden not in migration
    assert forbidden not in schema


# Payment Setup clearly offers both user journeys.
for token in [
    "Set up Stripe",
    "Connect existing Stripe",
    "Continue setup",
    "setupStripe",
    "connectStripe",
]:
    assert token in page, token


# Admin API exposes both setup methods.
assert (
    "startCrmStripeOnboarding"
    in api
)

assert (
    '"/api/crm/payments/stripe/onboard"'
    in api
)

assert (
    "startCrmStripeConnection"
    in api
)

assert (
    '"/api/crm/payments/stripe/connect"'
    in api
)


# Existing readiness gate remains authoritative.
assert (
    'stripeStatus !== "ready"'
    in service
)

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


# Existing durable account identity remains the shared convergence model.
assert (
    "stripe_account_id"
    in migration
)

assert (
    "idx_workspace_payment_settings_stripe_account"
    in schema
)


print(
    "PASS v1.10.12a Stripe dual onboarding foundation"
)

print(
    "  hosted Stripe account setup: verified"
)

print(
    "  existing Stripe OAuth connection: verified"
)

print(
    "  hosted Account Link refresh/return: verified"
)

print(
    "  professional authentication boundary: verified"
)

print(
    "  Standard-equivalent fee/risk/dashboard model: verified"
)

print(
    "  OAuth deauthorisation auth header: verified"
)

print(
    "  no professional Stripe token persistence: verified"
)

print(
    "  common connected-account readiness model: verified"
)
