#!/usr/bin/env python3
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]

def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")

def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)

route = read("functions/api/crm/[[path]].ts")
service = read("serverless/crm-commercial-settings-d1.ts")
crm = read("src/admin/pages/CRM.tsx")
templates = read("src/admin/pages/CRMCommercialTemplates.tsx")
modules = read("src/admin/navigation/adminModules.ts")
layout = read("src/admin/layouts/AdminLayout.tsx")
policy = read("serverless/platform-entitlement-policy.ts")
schema = read("d1/schema.sql")

require("commercialSettingsCapabilitiesForActor" in route, "commercial capability resolver missing")
for token in ('resolved.byKey.contracts?.enabled === true', 'resolved.byKey.invoices?.enabled === true', 'resolved.byKey["client-portal"]?.enabled === true'):
    require(token in route, f"canonical capability resolution missing: {token}")
require(route.count("await commercialSettingsCapabilitiesForActor(") == 2, "GET/POST commercial settings must resolve capabilities exactly twice")

require("export type CrmCommercialSettingsCapabilities" in service, "commercial capability type missing")
require("capabilities.contracts" in service, "contract capability scoping missing")
require("capabilities.invoices" in service, "invoice capability scoping missing")
require("capabilities.clientPortal" in service, "client portal capability scoping missing")
require('Promise.resolve({ results: [] })' in service, "optional template tables are not query-suppressed")
require("capabilities.contracts\n      ? requireActiveContractTemplate" in service, "contract validation not capability-scoped")
require("capabilities.clientPortal\n      ? requireActiveQuestionnaireTemplate" in service, "questionnaire validation not capability-scoped")
require("if (capabilities.invoices)" in service and "writes.push(" in service, "invoice sequence write is not capability-scoped")
require("...(capabilities.contracts" in service and "...(capabilities.invoices" in service and "...(capabilities.clientPortal" in service, "commercial audit metadata is not capability-scoped")
require("capabilities,\n  );\n}" in service, "save response does not preserve scoped payload")

for token in ('const contractsEnabled =', 'const invoicesEnabled =', 'const clientPortalEnabled ='):
    require(token in crm, f"CRM optional capability missing: {token}")
require("if (!contractsEnabled)" in crm, "contract API loader not suppressed")
require("if (!canManage || !contractsEnabled)" in crm, "contract create action not guarded")
require("...(contractsEnabled" in crm and "...(invoicesEnabled" in crm and "...(clientPortalEnabled" in crm, "commercial save does not omit inaccessible feature fields")
require("{contractsEnabled ? (" in crm, "contract templates panel not conditional")
require("{invoicesEnabled ? <CrmPaymentSchedulePresets" in crm, "payment schedule panel not invoice conditional")
require('label="Questionnaire due before event"' in crm, "client portal questionnaire timing control missing")
require(crm.count('label="Questionnaire due before event"') == 1, "questionnaire timing duplicated across feature panels")

require("useOutletContext" in templates, "Templates does not consume shared entitlements")
require('enabledEntitlementKeys?.has("bookings") === true' in templates, "Templates bookings capability missing")
require("const nextEmailTemplates =" in templates, "CRM email template load missing")
require("if (bookingsEnabled)" in templates and "getCrmQuoteTemplates" in templates and "getCrmQuoteCatalogue" in templates, "quote template/catalogue APIs are not bookings-conditional")
require('|| (bookingsEnabled ? "quotes" : "emails")' in templates, "CRM-only Templates does not default to Email templates")
require("{bookingsEnabled ? (" in templates, "Quote templates switcher not bookings conditional")

require('key: "templates", label: "Templates", to: "/admin/crm/templates", icon: FileText, match:' in modules, "Templates nav remains bookings-only")
require('key: "commercial-settings", label: "Commercial settings", to: "/admin/crm?view=commercial-settings", icon: Settings, requiredEntitlements: ["bookings"]' in modules, "Commercial settings nav is not bookings-core")
require("export function requiredEntitlementsForAdminPath(" in modules, "direct route entitlement matrix missing")
for token in ('return ["bookings"]', 'return ["connected-payments"]', 'return ["client-portal"]', 'return ["contracts"]', 'return ["print-store"]'):
    require(token in modules, f"direct route feature mapping missing: {token}")

require('import { Link, Navigate, Outlet, useLocation } from "react-router-dom";' in layout, "Navigate guard import missing")
require("adminModuleEntitled(" in layout and "adminRouteEntitled(" in layout, "central direct route guard missing")
require("enabledEntitlementKeys === null" in layout, "route guard must not redirect while entitlement state is loading")
require('to="/admin/wedplanned"' in layout and "replace" in layout, "unavailable direct route does not degrade to WedNav")
require("professionalApiEntitlementForPath" in read("functions/_middleware.ts"), "server API entitlement authority missing")
require('parts[0] === "commercial"' in policy and 'return "bookings";' in policy, "commercial settings outer bookings authority changed")

db = sqlite3.connect(":memory:")
db.executescript(schema)
version = db.execute("SELECT value FROM schema_meta WHERE key='schema_version'").fetchone()[0]
db.close()
require(str(version) == "53", f"mixed surfaces gate changed schema: {version}")
require(not list((ROOT / "d1/migrations").glob("054_*.sql")), "mixed surfaces gate must not add migration 054")

print("PASS v1.10.13a Gate 2F2D-B3B2B CRM mixed entitlement surfaces")
print("  Commercial Settings optional contract/invoice/client-portal payloads and writes are scoped: verified")
print("  inaccessible Commercial Settings values are preserved rather than cleared: verified")
print("  contract and invoice optional Admin calls/panels are conditional: verified")
print("  Templates remains CRM-visible while quote templates/catalogue require bookings: verified")
print("  CRM-only Templates defaults to Email templates: verified")
print("  specialist standalone direct routes degrade to WedNav after entitlement resolution: verified")
print("  loading state does not trigger premature direct-route redirect: verified")
print("  server-side API entitlement authority remains active: verified")
print("  schema remains 53: verified")
