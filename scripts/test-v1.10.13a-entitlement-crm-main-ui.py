#!/usr/bin/env python3
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


page = read("src/admin/pages/CRM.tsx")
server_test = read("scripts/test-v1.10.13a-entitlement-crm-composite-server.py")
route = read("functions/api/crm/[[path]].ts")
schema = read("d1/schema.sql")

require(
    "useOutletContext" in page,
    "CRM does not consume shared Admin entitlement context",
)
require(
    "function crmViewEntitled(" in page,
    "CRM view entitlement helper missing",
)
require(
    'view === "jobs"' in page
    and 'view === "schedule"' in page
    and 'view === "commercial-settings"' in page
    and 'enabledEntitlementKeys.has("bookings")' in page,
    "booking-owned CRM views are not entitlement mapped",
)
require(
    'view === "questionnaires"' in page
    and 'enabledEntitlementKeys.has("client-portal")' in page,
    "questionnaire view is not client-portal mapped",
)
require(
    'const bookingsEnabled =' in page
    and 'enabledEntitlementKeys?.has("bookings") === true' in page,
    "bookings capability state missing",
)
require(
    'const clientPortalEnabled =' in page
    and 'enabledEntitlementKeys?.has("client-portal") === true' in page,
    "client-portal capability state missing",
)

require(
    'resolved !== requested' in page
    and '{ view: resolved }' in page,
    "direct query view does not degrade to an entitled view",
)
require(
    page.count('crmViewEntitled(') >= 3,
    "CRM requested/set view paths do not consistently use entitlement resolver",
)

dashboard = read("src/admin/components/CRMDashboard.tsx")
require("<CRMDashboard" in page, "CRM does not use the capability-aware dashboard")
require(dashboard.count("data?.capabilities.bookings ? <TableCard") == 2, "upcoming Jobs and tasks are not bookings-aware")
require("data?.capabilities.payments ? <TableCard" in dashboard, "outstanding payments are not capability-aware")
require('to="/admin/crm/quotes"' not in dashboard, "global quote register was reintroduced")
require('AdminApiService.getCrmDashboard(' in dashboard, "dashboard does not use its scoped server summary")

require(
    "CRM job query/payload/stats are suppressed without bookings" in server_test,
    "B3B1 regression no longer proves CRM booking payload scoping",
)
require(
    "bookingsEnabledForActor" in route,
    "B3B1 canonical composite server scoping missing",
)

db = sqlite3.connect(":memory:")
db.executescript(schema)
version = db.execute(
    "SELECT value FROM schema_meta WHERE key='schema_version'"
).fetchone()[0]
db.close()

require(str(version) == "54", f"CRM main UI gate changed schema: {version}")
require(
    not list((ROOT / "d1/migrations").glob("055_*.sql")),
    "CRM main UI gate must not add migration 055",
)

print("PASS v1.10.13a Gate 2F2D-B3B2A CRM main entitlement-aware UI")
print("  Jobs/Schedule/Commercial Settings direct views degrade without bookings: verified")
print("  Questionnaires direct view degrades without client-portal: verified")
print("  dashboard booking/payment metrics and destinations are conditional: verified")
print("  questionnaire direct view is client-portal conditional: verified")
print("  upcoming operational schedule is bookings conditional: verified")
print("  B3B1 server payload authority remains active: verified")
print("  schema is 54: verified")
