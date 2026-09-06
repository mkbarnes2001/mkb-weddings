#!/usr/bin/env python3
"""Focused regression for v1.10.13a Gate 2E1B Stripe Customer Portal foundation."""

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
endpoint = read("functions/api/platform-billing/portal.ts")
api = read("src/admin/services/AdminApiService.ts")
page = read("src/admin/pages/WedPlannedPlatform.tsx")
schema = read("d1/schema.sql")

for token in (
    "WEDPLANNED_BILLING_STRIPE_SECRET_KEY",
    "WEDPLANNED_BILLING_STRIPE_API_BASE",
    "WEDPLANNED_BILLING_STRIPE_PORTAL_ENABLED",
    "WEDPLANNED_BILLING_STRIPE_LIVE_ENABLED",
):
    require(token in service, f"missing Customer Portal billing env: {token}")

require('type SubscriptionStripeCapability = "checkout" | "portal";' in service, "Stripe capability separation missing")
require('capability === "portal"' in service, "Customer Portal must have an explicit enablement latch")
require('stripeSecretKey(' in service and '"portal"' in service, "Customer Portal capability preflight missing")
require('stripeSecretKey(env, capability)' in service, "shared Stripe live/test key safety not reused")
require("WEDPLANNED_STRIPE_SECRET_KEY" not in service, "connected-payment Stripe secret leaked into subscription service")
require("Stripe-Account" not in service, "Customer Portal must target the WedPlanned platform Stripe account")

for token in (
    "loadWorkspaceStripeCustomer",
    "workspace_billing_customers",
    "provider_customer_id",
    "/v1/billing_portal/sessions",
    '"return_url"',
    "portal=returned",
    "https://billing.stripe.com/",
    'startsWith("bps_")',
):
    require(token in service, f"Customer Portal contract missing: {token}")

portal_type = re.search(r"export type WorkspaceSubscriptionPortalResult = \{(.*?)\n\};", service, re.S)
require(portal_type is not None, "Customer Portal result type missing")
portal_body = portal_type.group(1)
require("url:" in portal_body, "Customer Portal URL missing from result")
for forbidden in ("customerId", "providerCustomerId", "sessionId", "subscriptionId", "providerSubscriptionId"):
    require(forbidden not in portal_body, f"provider identifier exposed in Customer Portal result: {forbidden}")

require('requireProfessionalPermission(' in endpoint and '"billing:manage"' in endpoint, "Customer Portal endpoint must require billing:manage")
require('context.request.method !== "POST"' in endpoint, "Customer Portal endpoint must be POST-only")
require('actor.accessMode === "support"' in endpoint, "support access must not open Customer Portal")
require("context.request.json" not in endpoint, "Customer Portal endpoint must not accept browser billing identity input")
require("body?.workspaceId" not in endpoint and "body.workspaceId" not in endpoint, "browser-controlled workspace present in Customer Portal endpoint")
for forbidden in ("customerId", "providerCustomerId", "subscriptionId", "providerSubscriptionId"):
    require(forbidden not in endpoint, f"provider identity exposed in Customer Portal endpoint: {forbidden}")

require("static async createWedPlannedBillingPortal()" in api, "Admin API Customer Portal method missing")
require('"/api/platform-billing/portal"' in api and 'method: "POST"' in api, "Admin API Customer Portal POST missing")
require('auth.permissions.includes("billing:manage")' in page, "WedNav manage-billing permission guard missing")
require("AdminApiService.createWedPlannedBillingPortal()" in page, "WedNav Customer Portal API action missing")
require("Manage billing" in page, "WedNav Manage billing action missing")
require('billing.customer?.configured' in page, "Manage billing must require configured billing Customer")
require('billing.subscription?.provider === "stripe"' in page, "Manage billing must require Stripe subscription relationship")
require('window.location.assign(portal.url)' in page, "Customer Portal hosted redirect missing")

for forbidden in ("providerCustomerId", "providerProductId", "providerPriceId", "providerSubscriptionId"):
    require(forbidden not in page, f"provider identifier exposed in WedNav billing UI: {forbidden}")

for forbidden in ("crm_invoice_payment_attempts", "crm_invoice_payments", "workspace_payment_settings", "commerce_payment_events"):
    require(forbidden not in service, f"connected/commerce payment state leaked into Customer Portal service: {forbidden}")

con = sqlite3.connect(":memory:")
con.executescript(schema)
version = con.execute("SELECT value FROM schema_meta WHERE key='schema_version'").fetchone()[0]
require(str(version) == "54", f"Customer Portal unexpectedly changed schema: {version}")
con.close()
require(not list((ROOT / "d1/migrations").glob("055_*.sql")), "Customer Portal must not add migration 055")

print("PASS v1.10.13a Gate 2E1B Stripe Customer Portal foundation")
print("  dedicated portal enablement latch + shared test/live safety: verified")
print("  authenticated workspace-owned Stripe Customer resolution: verified")
print("  billing:manage and support-access boundary: verified")
print("  platform Stripe Billing Portal Session contract: verified")
print("  hosted URL-only browser response: verified")
print("  WedNav permission/configuration-scoped Manage billing action: verified")
print("  provider identifiers remain server-side: verified")
print("  connected client-payment and Print Store boundaries remain isolated: verified")
print("  schema is 54: verified")
