#!/usr/bin/env python3
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(
        encoding="utf-8",
    )


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


portal = read("serverless/client-portal-d1.ts")
booking = read("serverless/crm-booking-pack-d1.ts")
policy = read("serverless/platform-entitlement-policy.ts")
middleware = read("functions/_middleware.ts")
schema = read("d1/schema.sql")

require(
    'resolveWorkspaceEntitlements } from "./platform-entitlements-d1";'
    in portal,
    "Job Workspace service does not use canonical entitlement resolver",
)
require(
    "type JobWorkspaceCapabilities = {" in portal
    and "async function jobWorkspaceCapabilities(" in portal,
    "Job Workspace capability helper missing",
)

for token in (
    'resolved.byKey["client-portal"]?.enabled',
    'resolved.byKey["client-galleries"]?.enabled',
    'resolved.byKey["content-tools"]?.enabled',
    "resolved.byKey.contracts?.enabled",
    "resolved.byKey.invoices?.enabled",
):
    require(
        token in portal,
        f"Job Workspace capability missing: {token}",
    )

require(
    "if (capabilities.clientPortal)" in portal
    and "ensureStarterTemplate(" in portal,
    "questionnaire starter setup is not Client Portal conditional",
)

for token in (
    "capabilities.clientPortal\n      ? db.prepare(`\n          SELECT access.*",
    "capabilities.clientPortal\n      ? db.prepare(`\n          SELECT qi.*",
    "capabilities.clientPortal\n      ? db.prepare(`\n          SELECT *\n          FROM crm_questionnaire_templates",
    "capabilities.clientPortal\n      ? db.prepare(`\n          SELECT submission.*",
    "capabilities.clientPortal\n      ? await activeJobFiles(",
):
    require(
        token in portal,
        f"Client Portal Job payload read is not scoped: {token}",
    )

require(
    "clientPortalStatus:" in portal
    and '"not_invited"' in portal,
    "base Job Client Portal status is not neutralised when unavailable",
)

require(
    "capabilities.clientGalleries" in portal
    and "FROM client_galleries" in portal
    and "Promise.resolve({ results: [] })" in portal,
    "Client Gallery lifecycle data is not scoped",
)

require(
    portal.count(
        "capabilities.contentTools"
    ) >= 5,
    "Story/public-publishing lifecycle is not content-tools scoped",
)
for token in (
    "FROM story_images",
    "FROM published_story_images",
    "FROM asset_venue_links",
    "FROM asset_moment_links",
    "FROM asset_gallery_links",
    ": empty.story",
    ": empty.publicAssignments",
):
    require(
        token in portal,
        f"content-tools lifecycle boundary missing: {token}",
    )

require(
    'import { resolveWorkspaceEntitlements } from "./platform-entitlements-d1";'
    in booking,
    "booking/commercial service does not use canonical entitlement resolver",
)
require(
    "async function jobBookingCapabilities(" in booking,
    "booking capability helper missing",
)

for token in (
    "resolved.byKey.contracts?.enabled",
    "resolved.byKey.invoices?.enabled",
    'resolved.byKey["client-portal"]?.enabled',
):
    require(
        token in booking,
        f"booking capability missing: {token}",
    )

require(
    "capabilities.invoices\n      ? db.prepare(`\n          SELECT *\n          FROM crm_invoices"
    in booking,
    "Job commercial invoice query is not entitlement conditional",
)
require(
    "capabilities.contracts\n      ? db.prepare(`\n          SELECT *\n          FROM crm_contracts"
    in booking,
    "Job commercial contract query is not entitlement conditional",
)

require(
    "capabilities.clientPortal\n      ? await activePortalAccess("
    in booking,
    "booking-pack Client Portal access read is not conditional",
)
require(
    "capabilities.invoices\n      ? await ensureInvoice("
    in booking,
    "booking-pack invoice generation is not conditional",
)
require(
    "capabilities.contracts\n      ? await ensureContract("
    in booking,
    "booking-pack contract generation is not conditional",
)
require(
    "capabilities.clientPortal\n      ? await ensureQuestionnaire("
    in booking,
    "booking-pack questionnaire generation is not conditional",
)

job_policy_start = policy.index(
    'if (parts[0] === "jobs" && parts[1])'
)
job_policy_end = policy.index(
    '\n  if (parts[0] === "contracts")',
    job_policy_start,
)
job_policy = policy[
    job_policy_start:
    job_policy_end
]

for token in (
    'operation === "client-gallery"',
    'return "client-galleries";',
    'operation === "questionnaires"',
    'operation === "invite"',
    'operation === "revoke"',
    'operation === "files"',
    'operation === "supplier-submissions"',
    'return "client-portal";',
    'operation === "contracts"',
    'return "contracts";',
    'operation === "invoices"',
    'return "invoices";',
    'return "bookings";',
):
    require(
        token in job_policy,
        f"Job specialist route ownership changed: {token}",
    )

require(
    "professionalApiEntitlementForPath" in middleware
    and "requireWorkspaceEntitlement" in middleware,
    "professional API entitlement middleware is no longer authoritative",
)

require(
    "getJobCommercialWorkspace(db, actor, jobId)"
    in portal,
    "historical Job commercial caller shape was unnecessarily changed",
)

con = sqlite3.connect(":memory:")
con.executescript(schema)
version = con.execute(
    "SELECT value FROM schema_meta "
    "WHERE key='schema_version'"
).fetchone()[0]
require(
    str(version) == "54",
    f"B3C1 changed schema version: {version}",
)
require(
    not con.execute(
        "PRAGMA foreign_key_check"
    ).fetchall(),
    "schema foreign-key check failed",
)
con.close()

require(
    not list(
        (ROOT / "d1/migrations").glob(
            "055_*.sql"
        )
    ),
    "B3C1 must not add migration 055",
)

print(
    "PASS v1.10.13a Gate 2F2D-B3C1 "
    "CRM Job composite server entitlement scoping"
)
print(
    "  Client Portal access/questionnaires/files/templates/submissions "
    "are payload-scoped: verified"
)
print(
    "  Client Gallery lifecycle data is client-galleries-scoped: verified"
)
print(
    "  Wedding Story/public assignment lifecycle is content-tools-scoped: verified"
)
print(
    "  invoice/contract commercial payload reads are separately scoped: verified"
)
print(
    "  booking-pack indirect invoice/contract/questionnaire creation "
    "respects current canonical entitlements: verified"
)
print(
    "  bookings core Job/workflow/quote payload remains available: verified"
)
print(
    "  specialist API route ownership and middleware authority preserved: verified"
)
print(
    "  schema is 54: verified"
)
