#!/usr/bin/env python3
from pathlib import Path
import re
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def require(condition: bool, message: str):
    if not condition:
        raise AssertionError(message)


service = read("serverless/platform-subscription-stripe.ts")
schema = read("d1/schema.sql")

require("async function stripeJsonGet(" in service, "Stripe GET helper missing")
get_body = service.split(
    "async function stripeJsonGet(",
    1,
)[1].split(
    "async function loadCheckoutPrice(",
    1,
)[0]

require('method: "GET"' in get_body, "provider duplicate lookup must use GET")
require("Authorization:" in get_body, "provider duplicate lookup missing Stripe auth")
require("Stripe-Account" not in get_body, "provider duplicate lookup must not use connected-account header")
require("Idempotency-Key" not in get_body, "read-only Stripe GET must not send idempotency header")
require("stripeSecretKey(env, capability)" in get_body, "provider lookup must reuse test/live safety boundary")

require("async function findWorkspaceStripeCustomerId(" in service, "nullable workspace Stripe Customer lookup missing")
require("workspace_billing_customers" in service, "workspace billing Customer store missing")
require("provider_customer_id" in service, "workspace provider Customer identity missing")
require('startsWith("cus_")' in service, "workspace Stripe Customer ID validation missing")

guard_body = service.split(
    "async function assertNoProviderStripeSubscriptionConflict(",
    1,
)[1].split(
    "async function ensureWorkspaceStripeCustomer(",
    1,
)[0]

for token in (
    'parameters.set("customer", customerId)',
    'parameters.set("status", "all")',
    'parameters.set("limit", "100")',
    '"/v1/subscriptions"',
    '"checkout"',
    "payload.has_more",
    "expectedLivemode(",
):
    require(token in guard_body, f"provider duplicate guard contract missing: {token}")

require("if (!customerId) return;" in guard_body, "provider lookup should be skipped when workspace has no Stripe Customer")
require('text(payload?.object) !== "list"' in guard_body, "provider list shape validation missing")
require("!Array.isArray(payload?.data)" in guard_body, "provider list data validation missing")
require('typeof payload?.has_more !== "boolean"' in guard_body, "provider pagination shape validation missing")
require("if (payload.has_more)" in guard_body, "provider pagination must fail closed")
require("subscriptionCustomerId !== customerId" in guard_body, "provider subscription Customer identity guard missing")

for status in (
    '"incomplete"',
    '"trialing"',
    '"active"',
    '"past_due"',
    '"unpaid"',
    '"paused"',
):
    require(status in service, f"blocking Stripe status missing: {status}")

for status in (
    '"canceled"',
    '"incomplete_expired"',
):
    require(status in service, f"terminal Stripe status missing: {status}")

require("PROVIDER_TERMINAL_SUBSCRIPTION_STATUSES.has(status)" in guard_body, "terminal Stripe states are not explicitly allowed")
require("PROVIDER_BLOCKING_SUBSCRIPTION_STATUSES.has(status)" in guard_body, "blocking Stripe states are not explicitly rejected")
require("already has a Stripe subscription that must be resolved" in guard_body, "provider duplicate 409 guard missing")
require(guard_body.count("could not safely confirm") >= 2, "provider duplicate guard does not fail closed")

checkout = service.split(
    "export async function beginWorkspaceStripeSubscriptionCheckout(",
    1,
)[1].split(
    "export async function createWorkspaceStripeBillingPortalSession(",
    1,
)[0]

local_index = checkout.index("assertNoActiveStripeSubscription")
provider_index = checkout.index("assertNoProviderStripeSubscriptionConflict")
price_index = checkout.index("loadCheckoutPrice")
attempt_index = checkout.index("createWorkspaceSubscriptionCheckoutAttempt")

require(
    local_index < provider_index < price_index < attempt_index,
    "provider duplicate guard must run before Checkout attempt creation",
)

for forbidden in (
    "INSERT INTO",
    "UPDATE ",
    "DELETE FROM",
    "createWorkspaceSubscriptionCheckoutAttempt",
    "attachWorkspaceSubscriptionCheckoutSession",
    "failWorkspaceSubscriptionCheckoutAttempt",
):
    require(forbidden not in guard_body, f"provider duplicate guard unexpectedly mutates state: {forbidden}")

result = re.search(
    r"export type WorkspaceSubscriptionCheckoutResult = \{(.*?)\n\};",
    service,
    re.S,
)
require(result is not None, "Checkout result type missing")
result_body = result.group(1)

for forbidden in (
    "customerId",
    "subscriptionId",
    "providerSubscriptionId",
    "providerCustomerId",
):
    require(forbidden not in result_body, f"provider identifier exposed in Checkout result: {forbidden}")

for forbidden in (
    "crm_invoice_payment_attempts",
    "crm_invoice_payments",
    "workspace_payment_settings",
    "commerce_payment_events",
):
    require(forbidden not in service, f"connected/commerce payment state leaked into subscription Stripe service: {forbidden}")

db = sqlite3.connect(":memory:")
db.executescript(schema)
version = db.execute(
    "SELECT value FROM schema_meta WHERE key='schema_version'"
).fetchone()[0]
db.close()

require(str(version) == "54", f"provider duplicate guard unexpectedly changed schema: {version}")
require(
    not list((ROOT / "d1/migrations").glob("055_*.sql")),
    "provider duplicate guard must not add migration 055",
)

print("PASS v1.10.13a Gate 2E2B provider-side duplicate subscription guard")
print("  existing workspace Stripe Customer is resolved server-side: verified")
print("  read-only Stripe subscription list lookup: verified")
print("  platform-account / no Stripe-Account boundary: verified")
print("  provider pagination and malformed responses fail closed: verified")
print("  incomplete/trialing/active/past_due/unpaid/paused states block duplicate Checkout: verified")
print("  canceled/incomplete_expired terminal states permit recovery Checkout: verified")
print("  provider guard executes before any Checkout ledger write: verified")
print("  browser Checkout response remains provider-ID redacted: verified")
print("  schema is 54: verified")
