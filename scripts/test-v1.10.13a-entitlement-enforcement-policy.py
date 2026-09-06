#!/usr/bin/env python3
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def require(condition: bool, message: str):
    if not condition:
        raise AssertionError(message)


resolver = read("serverless/platform-entitlements-d1.ts")
policy = read("serverless/platform-entitlement-policy.ts")
schema = read("d1/schema.sql")
middleware = read("functions/_middleware.ts")
platform = read("functions/api/platform.ts")
foundation = read("serverless/platform-foundation-d1.ts")

require(
    "export async function requireWorkspaceEntitlement(" in resolver,
    "requireWorkspaceEntitlement helper missing",
)
require("resolveWorkspaceEntitlements(" in resolver, "canonical resolver not reused")
require('error.statusCode = 403' in resolver, "disabled entitlement must produce controlled 403")
require('"This feature is not available for this workspace."' in resolver, "controlled entitlement denial message missing")
require("error.accessState = resolved.accessState" in resolver, "resolver access state not retained on denial")
require("const override = overrides.get(featureKey);" in resolver, "workspace override layer missing")
require("if (override)" in resolver, "workspace override precedence missing")
require('const planAccessEnabled = accessState !== "recovery";' in resolver, "recovery-state plan suppression missing")

require(
    "export function professionalApiEntitlementForPath(" in policy,
    "professional API entitlement mapper missing",
)

for forbidden in (
    "D1Database",
    ".prepare(",
    "fetch(",
    "sk_test_",
    "workspace_subscriptions",
):
    require(forbidden not in policy, f"pure route policy contains forbidden runtime dependency: {forbidden}")

for key in (
    '"crm"',
    '"bookings"',
    '"contracts"',
    '"invoices"',
    '"connected-payments"',
    '"content-tools"',
    '"client-portal"',
    '"client-galleries"',
    '"print-store"',
):
    require(key in policy, f"specialist feature key missing: {key}")

for token in (
    'parts[0] === "payments"',
    'return "connected-payments";',
    'operation === "client-gallery"',
    'return "client-galleries";',
    'operation === "contracts"',
    'return "contracts";',
    'operation === "invoices"',
    'return "invoices";',
    'parts[1] === "payment-schedules"',
    'parts[0] === "catalogue"',
    'parts[0] === "quotes"',
    'return "bookings";',
    'parts[0] === "questionnaires"',
    'return "client-portal";',
):
    require(token in policy, f"CRM fine entitlement mapping missing: {token}")

for token in (
    'pathPrefix(path, "/api/wedding-workspace")',
    'pathPrefix(path, "/api/client-galleries")',
    'pathPrefix(path, "/api/print-store")',
    'CONTENT_TOOL_PREFIXES',
):
    require(token in policy, f"specialist route family missing: {token}")

for exempt in (
    'pathPrefix(path, "/api/platform-auth")',
    'pathPrefix(path, "/api/platform-billing")',
    'pathPrefix(path, "/api/platform-admin")',
    'pathPrefix(path, "/api/platform-operations")',
    'path === "/api/platform"',
    'path === "/api/workspace"',
    'pathPrefix(path, "/api/suppliers")',
    'pathPrefix(path, "/api/public")',
    'pathPrefix(path, "/api/webhooks")',
):
    require(exempt in policy, f"required recovery/public exemption missing: {exempt}")

require(
    "professionalApiEntitlementForPath" in middleware,
    "professional API route policy is not wired into middleware",
)
require(
    "requireWorkspaceEntitlement" in middleware,
    "canonical entitlement enforcement is not wired into middleware",
)

require(
    "getPlatformFoundation" in platform,
    "/api/platform must continue through the platform foundation service",
)
require(
    'import { resolveWorkspaceEntitlements } from "./platform-entitlements-d1";'
    in foundation,
    "platform foundation canonical entitlement resolver import missing",
)
require(
    "resolveWorkspaceEntitlements(db, workspaceId)" in foundation,
    "platform foundation canonical entitlement resolution missing",
)
require(
    "resolvedAccess.entitlements.map" in foundation,
    "platform foundation entitlement payload mapping missing",
)

db = sqlite3.connect(":memory:")
db.executescript(schema)
version = db.execute(
    "SELECT value FROM schema_meta WHERE key='schema_version'"
).fetchone()[0]
db.close()

require(str(version) == "54", f"entitlement policy unexpectedly changed schema: {version}")
require(
    not list((ROOT / "d1/migrations").glob("055_*.sql")),
    "entitlement policy must not add migration 055",
)

print("PASS v1.10.13a Gate 2F1C entitlement enforcement policy foundation")
print("  canonical resolver enforcement helper: verified")
print("  recovery-state Plan suppression + workspace override precedence: verified")
print("  fine-grained CRM feature policy: verified")
print("  client gallery / print store / Studio route-family policy: verified")
print("  WedNav, auth, billing/recovery, public and webhook routes remain exempt: verified")
print("  professional API middleware entitlement enforcement: verified")
print("  schema is 54: verified")
