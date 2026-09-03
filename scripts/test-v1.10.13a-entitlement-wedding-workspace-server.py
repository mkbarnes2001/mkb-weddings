#!/usr/bin/env python3
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


route = read("functions/api/wedding-workspace/[slug].ts")
policy = read("serverless/platform-entitlement-policy.ts")
resolver = read("serverless/platform-entitlements-d1.ts")
middleware = read("functions/_middleware.ts")
schema = read("d1/schema.sql")

require(
    'if (pathPrefix(path, "/api/wedding-workspace"))' in policy
    and 'return "bookings";' in policy,
    "Wedding Workspace outer policy is no longer bookings-owned",
)

require(
    'resolveWorkspaceEntitlements' in route,
    "Wedding Workspace route does not use the canonical entitlement resolver",
)
require(
    'resolved.byKey["content-tools"]?.enabled === true' in route,
    "content-tools capability is not resolved",
)
require(
    'resolved.byKey["client-galleries"]?.enabled === true' in route,
    "client-galleries capability is not resolved",
)
require(
    'venue: contentToolsEnabled' in route,
    "venue detail is not content-tools-scoped",
)
require(
    'moments: contentToolsEnabled' in route,
    "moments are not content-tools-scoped",
)
require(
    'galleries: contentToolsEnabled' in route,
    "custom galleries are not content-tools-scoped",
)
require(
    'clientGalleries: clientGalleriesEnabled' in route,
    "client galleries are not client-galleries-scoped",
)

require(
    route.count("scopeWeddingWorkspacePayload(") == 3,
    "expected helper definition plus GET and savePreviewSet scoping",
)

require(
    'requireWorkspaceEntitlement(' in route,
    "explicit publish entitlement guard missing",
)
require(
    '"content-tools"' in route,
    "publish action does not require content-tools",
)
publish_index = route.index('if (action === "publishAssignments")')
guard_index = route.index("requireWorkspaceEntitlement", publish_index)
publish_call_index = route.index("publishWeddingPreviewAssignments", publish_index)
require(
    guard_index < publish_call_index,
    "content-tools guard must run before publishing",
)

require(
    "export async function requireWorkspaceEntitlement" in resolver,
    "canonical entitlement enforcement helper missing",
)
require(
    "professionalApiEntitlementForPath" in middleware,
    "professional API entitlement middleware missing",
)
require(
    "requireWorkspaceEntitlement" in middleware,
    "global professional entitlement enforcement missing",
)

db = sqlite3.connect(":memory:")
db.executescript(schema)
version = db.execute(
    "SELECT value FROM schema_meta WHERE key='schema_version'"
).fetchone()[0]
db.close()

require(str(version) == "53", f"Wedding Workspace server gate changed schema: {version}")
require(
    not list((ROOT / "d1/migrations").glob("054_*.sql")),
    "Wedding Workspace server gate must not add migration 054",
)

print("PASS v1.10.13a Gate 2F2D-B3A1 Wedding Workspace server entitlement boundary")
print("  outer Wedding Workspace API remains bookings-owned: verified")
print("  Studio venue/moment/gallery payloads are content-tools-scoped: verified")
print("  Client Gallery payloads are client-galleries-scoped: verified")
print("  GET and savePreviewSet responses use canonical payload scoping: verified")
print("  publishAssignments explicitly requires content-tools: verified")
print("  canonical middleware/resolver authority preserved: verified")
print("  schema remains 53: verified")
