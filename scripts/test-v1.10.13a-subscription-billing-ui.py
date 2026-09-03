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

page = read("src/admin/pages/WedPlannedPlatform.tsx")
modules = read("src/admin/navigation/adminModules.ts")
service = read("src/admin/services/AdminApiService.ts")
types = read("src/admin/types/platform.ts")
endpoint = read("functions/api/platform-billing.ts")
architecture = read("Project-docs/ARCHITECTURE.md")
payments = read("Project-docs/WEDPLANNED-PAYMENTS.md")
schema = read("d1/schema.sql")

require('type TabKey = "business" | "services" | "team" | "billing";' in page, "billing tab missing")
require('requested === "billing"' in page, "billing deep link missing")
require('auth.permissions.includes("billing:read")' in page, "billing read permission guard missing")
require('AdminApiService.getWedPlannedBilling()' in page, "billing UI must use dedicated billing API")
require('tab !== "billing"' in page, "billing API should load only for billing tab")
require('title="Billing details"' in page, "billing details panel missing")
require('Workspace tier' in page, "legacy workspaces.plan label must be distinguished from commercial Plan")

nav = re.search(r'\{ key: "billing", label: "Plan & billing".*?\},', modules)
require(nav is not None, "WedNav Plan & billing navigation item missing")
require('to: "/admin/wedplanned?tab=billing"' in nav.group(0), "billing route incorrect")
require('requiredPermission: "billing:read"' in nav.group(0), "billing navigation must require billing:read")

require('static async getWedPlannedBilling()' in service, "Admin API billing read method missing")
require('"/api/platform-billing"' in service, "Admin API billing path missing")
require('WorkspaceSubscriptionBillingOverview' in types, "billing overview UI type missing")

for token in (
    "Current plan", "Subscription", "Billing", "Access",
    "Period end", "Trial ends", "Grace ends", "Cancellation",
    "Billing account", "Workspace access",
):
    require(token in page, f"billing UI field missing: {token}")

for forbidden in (
    "providerCustomerId", "providerProductId", "providerPriceId", "providerSubscriptionId",
    "Change plan", "Upgrade plan", "Checkout",
):
    require(forbidden not in page, f"read-only billing UI exposes forbidden action/identifier: {forbidden}")

require('context.request.method !== "GET"' in endpoint, "billing endpoint no longer GET-only")
require(
    'requireProfessionalPermission(' in endpoint and '"billing:read"' in endpoint,
    "billing endpoint permission boundary changed",
)
require("v1.10.13a Gate 2C3" in architecture, "architecture Gate 2C3 note missing")
require("Gate 2C3" in payments, "payments Gate 2C3 note missing")

connection = sqlite3.connect(":memory:")
connection.executescript(schema)
schema_version = connection.execute("SELECT value FROM schema_meta WHERE key='schema_version'").fetchone()[0]
require(int(schema_version) >= 52, f"schema regressed below 52: {schema_version}")
require(connection.execute("SELECT COUNT(*) FROM platform_plan_prices").fetchone()[0] == 0, "UI gate must not seed Stripe Prices")
require(connection.execute("SELECT COUNT(*) FROM workspace_billing_customers").fetchone()[0] == 0, "UI gate must not seed Stripe Customers")
connection.close()

require(not (ROOT / "d1/migrations/053_wedplanned_subscription_billing_ui.sql").exists(), "Gate 2C3 must not add migration 053")

print("PASS v1.10.13a Gate 2C3 WedNav Plan & Billing read-only UI")
print("  permission-scoped WedNav billing destination: verified")
print("  dedicated billing read API consumption: verified")
print("  compact Plan/subscription/access presentation: verified")
print("  legacy workspace tier separated from commercial Plan: verified")
print("  provider identifiers and plan-change actions remain absent: verified")
print("  connected-payment ownership remains outside WedNav billing: verified")
print("  schema remains compatible at 52+: verified")
