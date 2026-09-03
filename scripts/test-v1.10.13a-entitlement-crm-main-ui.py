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

require(
    'actions={<div className="flex flex-wrap gap-2">{bookingsEnabled ? <>' in page,
    "catalogue/quote header actions are not bookings-aware",
)
require(
    '{bookingsEnabled ? <div className="admin-module-metric"><strong>{crm?.stats.jobs || 0}</strong>' in page,
    "Jobs metric is not bookings-aware",
)
require(
    '{bookingsEnabled ? <div className="admin-module-metric"><strong>{scheduleItems.length}</strong>' in page,
    "schedule metric is not bookings-aware",
)
require(
    '{bookingsEnabled ? <Link to="/admin/crm?view=jobs"' in page,
    "Jobs overview destination is not bookings-aware",
)
require(
    '{bookingsEnabled ? <Link to="/admin/crm/quotes"' in page,
    "quote overview destination is not bookings-aware",
)
require(
    '{clientPortalEnabled ? <Link to="/admin/crm?view=questionnaires"' in page,
    "questionnaire overview destination is not client-portal-aware",
)
require(
    '{bookingsEnabled ? <>\n          <AdminPanel title="Upcoming schedule"' in page,
    "overview schedule panel is not bookings-aware",
)

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

require(str(version) == "53", f"CRM main UI gate changed schema: {version}")
require(
    not list((ROOT / "d1/migrations").glob("054_*.sql")),
    "CRM main UI gate must not add migration 054",
)

print("PASS v1.10.13a Gate 2F2D-B3B2A CRM main entitlement-aware UI")
print("  Jobs/Schedule/Commercial Settings direct views degrade without bookings: verified")
print("  Questionnaires direct view degrades without client-portal: verified")
print("  catalogue/quote actions and booking metrics/destinations are conditional: verified")
print("  questionnaire destination is client-portal conditional: verified")
print("  upcoming operational schedule is bookings conditional: verified")
print("  B3B1 server payload authority remains active: verified")
print("  schema remains 53: verified")
