#!/usr/bin/env python3
from pathlib import Path
import re
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


crm_service = read("serverless/crm-d1.ts")
workflow = read("serverless/crm-workflow-d1.ts")
route = read("functions/api/crm/[[path]].ts")
policy = read("serverless/platform-entitlement-policy.ts")
middleware = read("functions/_middleware.ts")
schema = read("d1/schema.sql")

require(
    "export async function getCrmOverview(db: D1Db, actor: CrmActor, includeBookings: boolean)" in crm_service,
    "getCrmOverview includeBookings boundary missing",
)
require(
    "includeBookings\n      ? db.prepare(`\n      SELECT job.*" in crm_service,
    "CRM job query is not conditional",
)
require(
    ": Promise.resolve({ results: [] })" in crm_service,
    "CRM overview does not suppress job query when bookings are unavailable",
)
require(
    "jobs: (jobResult.results || []).map(hydrateJob)" in crm_service,
    "CRM jobs response mapping changed unexpectedly",
)
require(
    "jobs: (jobResult.results || []).length" in crm_service,
    "CRM stats.jobs is not derived from the scoped job result",
)

require(
    "export async function getWorkflowOverview(db: D1Db, actor: WorkflowActor, includeBookings: boolean)" in workflow,
    "getWorkflowOverview includeBookings boundary missing",
)
workflow_function = workflow[
    workflow.index("export async function getWorkflowOverview"):
]
require(
    workflow_function.count("includeBookings") >= 3,
    "workflow task/job conditional boundaries missing",
)
require(
    "templateRows(db, actor.workspaceId)" in workflow_function,
    "workflow templates were incorrectly made bookings-dependent",
)
require(
    "SELECT task.* FROM crm_tasks task" in workflow_function,
    "workflow task query missing",
)
require(
    "SELECT id, reference, title, event_date FROM crm_jobs" in workflow_function,
    "workflow job query missing",
)

require(
    "resolveWorkspaceEntitlements" in route,
    "CRM route does not use canonical entitlement resolver",
)
require(
    "resolved.byKey.bookings?.enabled === true" in route,
    "CRM route does not resolve bookings entitlement",
)
require(
    route.count("await bookingsEnabledForActor(") == 3,
    "expected CRM overview, workflow overview and lead-form refresh to resolve bookings exactly three times",
)
require(
    re.search(
        r'getCrmOverview\(\s*context\.env\.MKB_DB,\s*actor,\s*includeBookings,\s*\)',
        route,
    ) is not None,
    "CRM overview route does not pass includeBookings",
)
require(
    re.search(
        r'getWorkflowOverview\(\s*context\.env\.MKB_DB,\s*actor,\s*includeBookings,\s*\)',
        route,
    ) is not None,
    "workflow route does not pass includeBookings",
)
require(
    "export async function saveLeadFormSettings(db: D1Db, actor: CrmActor, input: any, includeBookings: boolean)" in crm_service,
    "saveLeadFormSettings includeBookings boundary missing",
)
require(
    "return getCrmOverview(db, actor, includeBookings);" in crm_service,
    "lead-form save still refreshes an unscoped CRM overview",
)
require(
    re.search(
        r'saveLeadFormSettings\(\s*context\.env\.MKB_DB,\s*actor,\s*body,\s*includeBookings,\s*\)',
        route,
    ) is not None,
    "lead-form route does not pass includeBookings",
)

policy_section = policy[
    policy.index("function crmEntitlement"):
    policy.index("const CONTENT_TOOL_PREFIXES")
]
require(
    'return "crm";' in policy_section,
    "base CRM fallback entitlement missing",
)
require(
    'if (parts[0] === "jobs" && parts[1])' in policy_section
    and 'return "bookings";' in policy_section,
    "job-specific booking policy missing",
)
require(
    '"workflows"' not in policy_section,
    "workflow template family should remain CRM-owned",
)

require(
    "professionalApiEntitlementForPath" in middleware
    and "requireWorkspaceEntitlement" in middleware,
    "professional API entitlement middleware missing",
)

db = sqlite3.connect(":memory:")
db.executescript(schema)
version = db.execute(
    "SELECT value FROM schema_meta WHERE key='schema_version'"
).fetchone()[0]
db.close()

require(str(version) == "53", f"CRM composite server gate changed schema: {version}")
require(
    not list((ROOT / "d1/migrations").glob("054_*.sql")),
    "CRM composite server gate must not add migration 054",
)

print("PASS v1.10.13a Gate 2F2D-B3B1 CRM composite server entitlement scoping")
print("  base /api/crm remains CRM-owned: verified")
print("  CRM job query/payload/stats are suppressed without bookings: verified")
print("  workflow templates remain CRM-owned: verified")
print("  workflow task/job operational payload is suppressed without bookings: verified")
print("  lead-form write refresh cannot re-expose booking data: verified")
print("  canonical resolver drives composite booking inclusion: verified")
print("  job-specific middleware booking enforcement remains authoritative: verified")
print("  schema remains 53: verified")
