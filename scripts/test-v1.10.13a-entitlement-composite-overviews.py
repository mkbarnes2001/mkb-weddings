#!/usr/bin/env python3
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


layout = read("src/admin/layouts/AdminLayout.tsx")
overviews = read("src/admin/pages/ModuleOverviews.tsx")
middleware = read("functions/_middleware.ts")
schema = read("d1/schema.sql")

outlet = layout[layout.index("<Outlet"):layout.index("/>", layout.index("<Outlet")) + 2]
require(
    "enabledEntitlementKeys" in outlet,
    "canonical entitlement Set not exposed through Admin Outlet context",
)

require(
    'const printStoreEnabled = enabledEntitlementKeys?.has("print-store") === true;'
    in overviews,
    "WedStore Print Store capability state missing",
)
require(
    "printStoreEnabled ? AdminApiService.getPrintStore() : Promise.resolve(null)"
    in overviews,
    "WedStore overview still unconditionally loads Print Store",
)
require(
    "{printStoreEnabled ? <Metric" in overviews,
    "Print Store metric is not optional",
)
require(
    '{printStoreEnabled ? <Destination to="/admin/print-store?tab=catalogue"'
    in overviews,
    "Store destination is not optional",
)
require(
    '{printStoreEnabled ? <Destination to="/admin/print-store?tab=orders"'
    in overviews,
    "Orders destination is not optional",
)

for feature in ("crm", "content-tools", "client-galleries"):
    require(
        f'item.key === "{feature}" && item.enabled' in overviews,
        f"WedNav product card does not honor {feature}",
    )

require(
    "professionalApiEntitlementForPath" in middleware,
    "server API entitlement authority missing",
)
require(
    "requireWorkspaceEntitlement" in middleware,
    "canonical server entitlement enforcement missing",
)

db = sqlite3.connect(":memory:")
db.executescript(schema)
version = db.execute(
    "SELECT value FROM schema_meta WHERE key='schema_version'"
).fetchone()[0]
db.close()

require(str(version) == "54", f"overview gate changed schema: {version}")
require(
    not list((ROOT / "d1/migrations").glob("055_*.sql")),
    "overview gate must not add migration 055",
)

print("PASS v1.10.13a Gate 2F2D-B1 entitlement-aware composite overviews")
print("  canonical Admin Outlet entitlement state shared: verified")
print("  WedStore client-galleries-only dashboard degradation: verified")
print("  Print Store calls/metrics/destinations are conditional: verified")
print("  WedNav specialist product cards reflect entitlements: verified")
print("  server-side API entitlement authority preserved: verified")
print("  schema is 54: verified")
