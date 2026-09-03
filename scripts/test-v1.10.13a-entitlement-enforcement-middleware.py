#!/usr/bin/env python3
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


middleware = read("functions/_middleware.ts")
policy = read("serverless/platform-entitlement-policy.ts")
resolver = read("serverless/platform-entitlements-d1.ts")
schema = read("d1/schema.sql")
platform_api = read("functions/api/platform.ts")

require(
    'import { getProfessionalContext, professionalAuthEnforced }' in middleware,
    "professional auth import missing",
)
require(
    'if (path.startsWith("/api/") && !authExempt && professionalAuthEnforced(context.env as any))'
    in middleware,
    "entitlement enforcement escaped the existing professional-auth deployment boundary",
)
require(
    'if (!auth.accessGranted)' in middleware,
    "professional sign-in denial missing",
)

require(
    'import { requireWorkspaceEntitlement } from "../serverless/platform-entitlements-d1";'
    in middleware,
    "canonical entitlement helper import missing",
)
require(
    'import { professionalApiEntitlementForPath } from "../serverless/platform-entitlement-policy";'
    in middleware,
    "route entitlement policy import missing",
)
require(
    "const featureKey = professionalApiEntitlementForPath(path);" in middleware,
    "route policy lookup missing",
)
require(
    "await requireWorkspaceEntitlement(" in middleware,
    "canonical entitlement enforcement call missing",
)
require(
    "auth.workspaceId," in middleware,
    "server-derived authenticated workspace is not used for entitlement enforcement",
)

auth_position = middleware.index("if (!auth.accessGranted)")
policy_position = middleware.index(
    "const featureKey = professionalApiEntitlementForPath(path);"
)
enforcement_position = middleware.index(
    "await requireWorkspaceEntitlement("
)

require(
    auth_position < policy_position < enforcement_position,
    "entitlement checks must happen only after professional authentication",
)

require(
    '"This feature is not available for this workspace."' in middleware,
    "controlled feature denial fallback missing",
)
require(
    'status: Number(error?.statusCode || 403)' in middleware,
    "entitlement denial status handling missing",
)
require(
    '"Cache-Control": "private, no-store"' in middleware,
    "entitlement denial must be private/no-store",
)

denial_start = middleware.index(
    "const featureKey = professionalApiEntitlementForPath(path);"
)
denial_end = middleware.index(
    "\n  // Don’t touch static files",
    denial_start,
)
denial_block = middleware[denial_start:denial_end]

for forbidden in (
    "provider_subscription_id",
    "provider_customer_id",
    "provider_price_id",
    "featureKey:",
    "accessState:",
    "subscription:",
    "sk_test_",
    "sk_live_",
):
    require(
        forbidden not in denial_block,
        f"middleware denial leaks internal entitlement/provider detail: {forbidden}",
    )

for route_token in (
    'pathPrefix(path, "/api/platform-auth")',
    'pathPrefix(path, "/api/platform-billing")',
    'path === "/api/platform"',
    'path === "/api/workspace"',
    'pathPrefix(path, "/api/public")',
    'pathPrefix(path, "/api/webhooks")',
):
    require(
        route_token in policy,
        f"recovery/public policy exemption missing: {route_token}",
    )

require(
    'path === "/api/webhooks/wedplanned-billing"' in middleware,
    "billing webhook exact auth exemption missing",
)
require(
    'path.startsWith("/api/webhooks/")' not in middleware,
    "whole webhook namespace must not be auth-exempt",
)

require(
    "resolveWorkspaceEntitlements(" in resolver,
    "canonical resolver missing",
)
require(
    'const planAccessEnabled = accessState !== "recovery";' in resolver,
    "recovery Plan suppression missing",
)
require(
    "const override = overrides.get(featureKey);" in resolver,
    "workspace override layer missing",
)
require(
    "if (override)" in resolver,
    "workspace override precedence missing",
)

require(
    "requireWorkspaceEntitlement" not in platform_api,
    "/api/platform must remain outside specialist entitlement enforcement",
)

db = sqlite3.connect(":memory:")
db.executescript(schema)
version = db.execute(
    "SELECT value FROM schema_meta WHERE key='schema_version'"
).fetchone()[0]
db.close()

require(str(version) == "53", f"middleware gate unexpectedly changed schema: {version}")
require(
    not list((ROOT / "d1/migrations").glob("054_*.sql")),
    "middleware gate must not add migration 054",
)

print("PASS v1.10.13a Gate 2F1D professional API entitlement middleware")
print("  existing professional-auth deployment boundary retained: verified")
print("  authenticated workspace drives entitlement resolution: verified")
print("  route policy + canonical entitlement resolver wired: verified")
print("  controlled provider-ID-redacted 403 boundary: verified")
print("  WedNav/auth/billing/public/webhook recovery policy preserved: verified")
print("  exact subscription webhook auth exemption preserved: verified")
print("  workspace override + recovery semantics remain resolver-owned: verified")
print("  schema remains 53: verified")
