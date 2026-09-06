#!/usr/bin/env python3
"""Focused regression for v1.10.13a Gate 2D2 Stripe Billing Checkout foundation."""

from pathlib import Path
import re
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def require(condition: bool, message: str):
    if not condition:
        raise AssertionError(message)


service = read("serverless/platform-subscription-stripe.ts")
write_service = read("serverless/platform-subscription-billing-write-d1.ts")
endpoint = read("functions/api/platform-billing/checkout.ts")
schema = read("d1/schema.sql")
architecture = read("Project-docs/ARCHITECTURE.md")
payments = read("Project-docs/WEDPLANNED-PAYMENTS.md")
ui = read("src/admin/pages/WedPlannedPlatform.tsx")

# Dedicated Stripe Billing environment: do not reuse connected-account settings.
for token in (
    "WEDPLANNED_BILLING_STRIPE_SECRET_KEY",
    "WEDPLANNED_BILLING_STRIPE_API_BASE",
    "WEDPLANNED_BILLING_STRIPE_CHECKOUT_ENABLED",
    "WEDPLANNED_BILLING_STRIPE_LIVE_ENABLED",
):
    require(token in service, f"missing dedicated billing Stripe env: {token}")

require("WEDPLANNED_STRIPE_SECRET_KEY" not in service, "connected-payment Stripe secret leaked into subscription service")
require("Stripe-Account" not in service, "subscription Stripe calls must target platform account directly")
require("sk_live_" in service and "WEDPLANNED_BILLING_STRIPE_LIVE_ENABLED" in service, "live-mode safety latch missing")
require("sk_test_" in service, "test-mode Stripe key support missing")

# The browser selects only an internal WedPlanned Price. Workspace and provider IDs are server-derived.
require('requireProfessionalPermission(\n      actor,\n      "billing:manage"' in endpoint, "checkout endpoint must require billing:manage")
require('context.request.method !== "POST"' in endpoint, "checkout endpoint must be POST-only")
require("actor.workspaceId" in endpoint and "actor.userId" in endpoint, "checkout endpoint must use authenticated actor")
require("planPriceId" in endpoint, "checkout endpoint missing internal planPriceId input")
for forbidden in (
    "body?.workspaceId",
    "body.workspaceId",
    "providerPriceId",
    "stripePriceId",
    "providerCustomerId",
    "providerSubscriptionId",
):
    require(forbidden not in endpoint, f"browser-controlled provider/workspace field present: {forbidden}")

# Customer creation is workspace-owned and idempotent.
require("workspace_billing_customers" in service, "workspace Stripe Customer store missing")
require("/v1/customers" in service, "Stripe Customer creation call missing")
require("wedplanned_billing_customer_${actor.workspaceId}" in service, "workspace Customer idempotency key missing")
require("metadata[workspace_id]" in service, "Stripe Customer workspace metadata missing")
require("platform_subscription" in service, "Stripe Customer relationship metadata missing")
require("ON CONFLICT(workspace_id)" in service, "workspace Customer upsert missing")

# Checkout must be subscription mode, use mapped provider Price, one quantity and dual metadata.
for token in (
    'parameters.set("mode", "subscription")',
    'parameters.set("customer", customerId)',
    'parameters.set("line_items[0][price]", text(price.provider_price_id))',
    'parameters.set("line_items[0][quantity]", "1")',
    'parameters.set("client_reference_id", attempt.id)',
    'subscription_data[metadata]',
    'metadata[',
    "/v1/checkout/sessions",
    "https://checkout.stripe.com/",
):
    require(token in service, f"Stripe subscription Checkout contract missing: {token}")

# Return URLs are presentation only; no subscription state is mutated here.
require("checkout=returned" in service, "success return marker missing")
require("checkout=cancelled" in service, "cancel return marker missing")
require("UPDATE workspace_subscriptions" not in service, "browser Checkout foundation must not mutate subscription authority")
require("INSERT INTO workspace_subscriptions" not in service, "Checkout foundation must not create authoritative subscription rows")
require("resolveWorkspaceEntitlements" not in service, "Checkout return path must not directly grant access")

# Write ledger ordering/idempotency must be used.
require("createWorkspaceSubscriptionCheckoutAttempt" in service, "checkout attempt creation missing")
require("attachWorkspaceSubscriptionCheckoutSession" in service, "provider Checkout binding missing")
require("failWorkspaceSubscriptionCheckoutAttempt" in service, "failed attempt handling missing")
require("attempt.idempotencyKey" in service, "Stripe Checkout must use server ledger idempotency key")
require("providerSessionCreated" in service, "post-provider local-bind retry protection missing")

# Prevent accidental duplicate paid subscriptions.
require("assertNoActiveStripeSubscription" in service, "active Stripe subscription duplicate guard missing")
for status in ("'trialing'", "'active'", "'past_due'"):
    require(status in service, f"duplicate-subscription status guard missing {status}")

# Only active, public commercial/promotional internal Price mappings can reach Stripe.
for token in (
    "platform_plan_prices",
    "provider_product_id",
    "provider_price_id",
    "price.status = 'active'",
    "plan.status = 'active'",
    "plan.is_public = 1",
    "'commercial'",
    "'promotional'",
):
    require(token in service, f"server Price validation missing: {token}")

# Financial domains remain separate.
for forbidden in (
    "crm_invoice_payment_attempts",
    "crm_invoice_payments",
    "workspace_payment_settings",
    "commerce_payment_events",
):
    require(forbidden not in service, f"connected/commerce payment state leaked into subscription Stripe service: {forbidden}")

# Gate 2D2 itself introduced no webhook or Customer Portal. Later cumulative
# gates may add those features while this Checkout contract remains unchanged.
require("Change plan" not in ui and "Upgrade plan" not in ui, "Gate 2D2 Checkout foundation must not expose plan-change UI")

# Canonical schema is 54; Gate 2D2 is source/runtime only.
con = sqlite3.connect(":memory:")
con.executescript(schema)
version = con.execute("SELECT value FROM schema_meta WHERE key='schema_version'").fetchone()[0]
require(version == "54", f"Gate 2D2 unexpectedly changed schema: {version}")
require(con.execute("SELECT COUNT(*) FROM platform_plan_prices").fetchone()[0] == 0, "Gate 2D2 must not seed a Stripe Price")
require(con.execute("SELECT COUNT(*) FROM workspace_billing_customers").fetchone()[0] == 0, "Gate 2D2 must not seed a Stripe Customer")
con.close()

require(not list((ROOT / "d1/migrations").glob("055_*.sql")), "Gate 2D2 must not add migration 055")
require("Gate 2D2" in architecture, "architecture Gate 2D2 note missing")
require("Gate 2D2" in payments, "payments Gate 2D2 note missing")

# Basic source shape check for a narrow response: internal attempt ID + hosted URL only.
result_type = re.search(r"export type WorkspaceSubscriptionCheckoutResult = \{(.*?)\n\};", service, re.S)
require(result_type is not None, "Checkout result type missing")
result_body = result_type.group(1)
for token in ("attemptId", "url", "expiresAt"):
    require(token in result_body, f"Checkout response missing {token}")
for forbidden in ("customerId", "providerPriceId", "subscriptionId", "sessionId"):
    require(forbidden not in result_body, f"provider identifier exposed in Checkout response: {forbidden}")

print("PASS v1.10.13a Gate 2D2 Stripe Billing Customer + Checkout foundation")
print("  dedicated platform Stripe Billing environment: verified")
print("  test-mode default with explicit live safety latch: verified")
print("  workspace-owned idempotent Stripe Customer creation: verified")
print("  internal Plan Price -> provider Price server resolution: verified")
print("  subscription-mode hosted Checkout contract: verified")
print("  billing:manage authenticated workspace boundary: verified")
print("  Checkout attempt idempotency / provider binding: verified")
print("  browser return remains non-authoritative: verified")
print("  connected-payment and Print Store boundaries remain isolated: verified")
print("  schema is 54 and no provider objects are seeded: verified")
