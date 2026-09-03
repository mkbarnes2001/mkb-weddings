#!/usr/bin/env python3
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


modules = read("src/admin/navigation/adminModules.ts")
layout = read("src/admin/layouts/AdminLayout.tsx")
schema = read("d1/schema.sql")
middleware = read("functions/_middleware.ts")

require("requiredPermission?: string;" in modules, "role permission navigation field missing")
require("requiredEntitlements?: string[];" in modules, "entitlement navigation field missing")
require(
    "item.requiredPermission && !permissions.includes(item.requiredPermission)" in modules,
    "role permission filtering missing",
)
require("item.requiredEntitlements.every" in modules, "multi-entitlement navigation filtering missing")

require(
    'if (module.key === "business" || enabledEntitlementKeys === null) return true;' in modules,
    "WedNav recovery visibility rule missing",
)
require("export function visibleAdminModules(" in modules, "filtered module helper missing")
require(
    "enabledEntitlementKeys.has(module.entitlementKey)" in modules,
    "specialist module entitlement filtering missing",
)

expected_tokens = (
    'key: "jobs", label: "Jobs"',
    'requiredEntitlements: ["bookings"]',
    'key: "payments", label: "Payments"',
    'requiredEntitlements: ["connected-payments"]',
    'key: "questionnaires", label: "Questionnaires"',
    'requiredEntitlements: ["client-portal"]',
    'key: "commercial-settings", label: "Commercial settings"',
    'requiredEntitlements: ["bookings"]',
    'key: "store", label: "Store"',
    'requiredEntitlements: ["print-store"]',
    'key: "orders", label: "Orders"',
)
for token in expected_tokens:
    require(token in modules, f"navigation entitlement mapping missing: {token}")

require(
    'key: "templates", label: "Templates", to: "/admin/crm/templates", icon: FileText, match:'
    in modules,
    "CRM Templates should remain visible as a CRM composite surface",
)

require(
    "const [enabledEntitlementKeys, setEnabledEntitlementKeys] = useState<Set<string> | null>(null);"
    in layout,
    "AdminLayout entitlement state missing",
)
require("(platform.entitlements || [])" in layout, "canonical platform entitlement payload not consumed")
require(".filter((entitlement) => entitlement.enabled)" in layout, "enabled entitlement filter missing")
require(".map((entitlement) => entitlement.key)" in layout, "entitlement key projection missing")
require("setEnabledEntitlementKeys(null);" in layout, "workspace/load transition must reset stale entitlement state")

require(
    "const visibleModules = visibleAdminModules(enabledEntitlementKeys);" in layout,
    "visible module collection missing",
)
require(
    layout.count("visibleModules.map((module)") == 2,
    "desktop and mobile module switchers must share visibleModules",
)
require("adminModules.map((module)" not in layout, "raw module collection still rendered")

require(
    "const normalModuleItems = visibleModuleItems(currentModule, auth.permissions, enabledEntitlementKeys);"
    in layout,
    "entitlement-aware module items missing",
)
require(
    "const navItems = isPlatformRoute ? platformAdminItems : normalModuleItems;" in layout,
    "platform admin navigation boundary changed",
)
require("normalModuleItems.find" in layout, "CRM mobile primary items do not derive from filtered module items")
require("normalModuleItems.filter" in layout, "non-CRM mobile primary items do not derive from filtered module items")

require('key: "billing", label: "Plan & billing"' in modules, "billing navigation missing")
require('requiredPermission: "billing:read"' in modules, "billing permission boundary missing")

require("professionalApiEntitlementForPath" in middleware, "API entitlement enforcement unexpectedly absent")
require("requireWorkspaceEntitlement" in middleware, "canonical API entitlement enforcement unexpectedly absent")

db = sqlite3.connect(":memory:")
db.executescript(schema)
version = db.execute(
    "SELECT value FROM schema_meta WHERE key='schema_version'"
).fetchone()[0]
db.close()

require(str(version) == "53", f"navigation gate unexpectedly changed schema: {version}")
require(
    not list((ROOT / "d1/migrations").glob("054_*.sql")),
    "navigation gate must not add migration 054",
)

print("PASS v1.10.13a Gate 2F2C entitlement-aware navigation shell")
print("  WedNav recovery/control-plane visibility: verified")
print("  specialist module entitlement filtering: verified")
print("  role permission + multi-entitlement item filtering: verified")
print("  desktop/mobile module switchers share filtered modules: verified")
print("  sidebar/mobile bottom navigation share filtered items: verified")
print("  billing remains permission-controlled in WedNav: verified")
print("  server-side API entitlement enforcement remains authoritative: verified")
print("  schema remains 53: verified")
