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

auth = read("serverless/platform-auth-d1.ts")
service = read("serverless/platform-subscription-billing-d1.ts")
endpoint = read("functions/api/platform-billing.ts")
schema = read("d1/schema.sql")
architecture = read("Project-docs/ARCHITECTURE.md")
payments = read("Project-docs/WEDPLANNED-PAYMENTS.md")

role_block = re.search(
    r"const ROLE_PERMISSIONS: Record<string, string\[\]> = \{(.*?)\n\};",
    auth,
    re.S,
)
require(role_block is not None, "ROLE_PERMISSIONS block not found")
roles = role_block.group(1)

for role in ("owner", "admin"):
    match = re.search(rf"\b{role}: \[(.*?)\]", roles)
    require(match is not None, f"{role} permissions not found")
    body = match.group(1)
    require('"billing:read"' in body, f"{role} missing billing:read")
    require('"billing:manage"' in body, f"{role} missing billing:manage")

finance = re.search(r"\bfinance: \[(.*?)\]", roles)
require(finance is not None, "finance permissions not found")
require('"billing:read"' in finance.group(1), "finance missing billing:read")
require('"billing:manage"' not in finance.group(1), "finance must not receive billing:manage")

for role in ("manager", "content", "staff", "viewer"):
    match = re.search(rf"\b{role}: \[(.*?)\]", roles)
    require(match is not None, f"{role} permissions not found")
    body = match.group(1)
    require('"billing:read"' not in body, f"{role} unexpectedly receives billing:read")
    require('"billing:manage"' not in body, f"{role} unexpectedly receives billing:manage")

support_branch = re.search(
    r'if \(accessMode === "support"\) \{(.*?)\n  \}',
    auth,
    re.S,
)
require(support_branch is not None, "support permission branch not found")
require("billing:read" not in support_branch.group(1), "support access must not inherit billing:read")
require("billing:manage" not in support_branch.group(1), "support access must not inherit billing:manage")

require('requireProfessionalPermission(\n      actor,\n      "billing:read"' in endpoint, "billing endpoint must require billing:read")
require('context.request.method !== "GET"' in endpoint, "billing endpoint must be GET-only")
require("actor.workspaceId" in endpoint, "billing endpoint must use authenticated workspace")
require("searchParams" not in endpoint and "workspaceIdInput" not in endpoint, "billing endpoint must not accept browser-selected workspace")
require("getWorkspaceSubscriptionBillingOverview" in endpoint, "billing endpoint must use dedicated billing service")

for table in (
    "workspace_subscriptions",
    "platform_plans",
    "platform_plan_prices",
    "workspace_billing_customers",
):
    require(table in service, f"billing read service missing {table}")

for forbidden in (
    "INSERT INTO",
    "UPDATE ",
    "DELETE FROM",
    "fetch(",
    "STRIPE_SECRET",
    "Stripe-Account",
    "crm_invoice_payments",
    "crm_invoice_payment_attempts",
    "workspace_payment_settings",
):
    require(forbidden not in service, f"billing read service contains forbidden runtime/write boundary: {forbidden}")

require("provider_customer_id" in service, "billing customer readiness must derive from stored provider customer identity")
require("provider_customer_id:" not in service, "provider customer ID must not be returned in API payload")
require("provider_price_id:" not in service, "provider Price ID must not be returned in API payload")
require("provider_subscription_id:" not in service, "provider Subscription ID must not be returned in API payload")

require("v1.10.13a Gate 2C2" in architecture, "architecture Gate 2C2 note missing")
require("Gate 2C2" in payments, "payments Gate 2C2 note missing")

connection = sqlite3.connect(":memory:")
connection.executescript(schema)
schema_version = connection.execute(
    "SELECT value FROM schema_meta WHERE key='schema_version'"
).fetchone()[0]
require(int(schema_version) >= 52, f"schema regressed below 52: {schema_version}")

row = connection.execute(
    """
    SELECT
      subscription.workspace_id,
      subscription.provider,
      subscription.status,
      subscription.billing_interval,
      plan.plan_key,
      plan.name
    FROM workspace_subscriptions subscription
    JOIN platform_plans plan ON plan.id = subscription.plan_id
    WHERE subscription.workspace_id = 'workspace_mkb_weddings'
      AND subscription.is_current = 1
    """
).fetchone()
require(row is not None, "compatibility subscription missing from canonical schema")
require(row[1] == "internal", "compatibility subscription must remain internal")
require(row[2] == "complimentary", "compatibility subscription must remain complimentary")
require(row[3] == "none", "compatibility subscription must remain non-billed")
require(row[4] == "compatibility-full-access", "compatibility plan key changed")
require(connection.execute("SELECT COUNT(*) FROM platform_plan_prices").fetchone()[0] == 0, "Gate 2C2 must not seed Stripe Prices")
require(connection.execute("SELECT COUNT(*) FROM workspace_billing_customers").fetchone()[0] == 0, "Gate 2C2 must not seed Stripe Customers")
connection.close()

migration_053 = ROOT / "d1/migrations/053_wedplanned_subscription_billing.sql"
require(not migration_053.exists(), "Gate 2C2 must not add migration 053")

print("PASS v1.10.13a Gate 2C2 subscription billing read boundary")
print("  owner/admin billing read + manage permissions: verified")
print("  finance billing read-only permission: verified")
print("  support and non-billing roles remain excluded: verified")
print("  GET-only workspace-scoped billing endpoint: verified")
print("  billing overview is read-only and Stripe-ID redacted: verified")
print("  connected client-payment boundary remains isolated: verified")
print("  compatibility access remains Stripe-free: verified")
print("  schema remains compatible at 52+: verified")
