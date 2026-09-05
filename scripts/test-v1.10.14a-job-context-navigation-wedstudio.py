#!/usr/bin/env python3
"""v1.10.14a Gate 2C1 Job-context navigation + WedStudio handoff regression."""

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


job = read("src/admin/pages/CRMJob.tsx")
quote = read("src/admin/pages/CRMQuote.tsx")
invoice = read("src/admin/pages/CRMInvoice.tsx")
back = read("src/admin/components/crm/CRMRecordBackLink.tsx")
quotes = read("src/admin/pages/CRMQuotes.tsx")
app = read("src/admin/app/AdminApp.tsx")
modules = read("src/admin/navigation/adminModules.ts")
wedding_workspace = read("src/admin/pages/WeddingWorkspace.tsx")
schema = read("d1/schema.sql")

# One reusable deterministic CRM-record return control.
for token in (
    "AdminHeaderRouterLink",
    '"Back to Job"',
    "/admin/crm/jobs/${encodeURIComponent(contextualJobId)}",
    'className="admin-icon-control"',
    "ArrowLeft",
):
    require(token in back, f"shared Back control missing {token}")

# Every Quote opened from inside the Job carries explicit return context.
require(
    job.count("?jobId=${encodeURIComponent(job.id)}") == 3,
    "Job does not carry context through all three Quote entry points",
)
require(
    'to={`/admin/crm/quotes/${job.quoteId}`}\n' not in job,
    "bare Job quoteId link remains",
)
require(
    'to={`/admin/crm/quotes/${commercialQuote.id}`}\n' not in job,
    "bare accepted commercial Quote link remains",
)

# A generic Quote-list open stays generic and therefore falls back to Quotes.
require(
    'to={`/admin/crm/quotes/${quote.id}`}' in quotes,
    "generic Quotes register destination changed unexpectedly",
)
require(
    "?jobId=" not in quotes,
    "generic Quotes register should not invent Job context",
)

# Query context is not trusted blindly: it must match authoritative acceptedJobId.
for token in (
    "useSearchParams",
    'searchParams.get("jobId")',
    "quote.acceptedJobId === requestedJobId",
    "<CRMRecordBackLink",
    "jobId={contextualJobId}",
    'fallbackTo="/admin/crm/quotes"',
    'fallbackLabel="Back to Quotes"',
):
    require(token in quote, f"Quote contextual return missing {token}")

# Nested Invoice route always has an authoritative Job id.
require(
    'path="crm/jobs/:jobId/invoices/:invoiceId"' in app,
    "nested Job Invoice route changed unexpectedly",
)
for token in (
    "<CRMRecordBackLink",
    "jobId={job.id}",
    'fallbackTo="/admin/crm?view=jobs"',
):
    require(token in invoice, f"Invoice Back to Job missing {token}")

# CRM exposes a concise handoff to the owning WedStudio content surface.
for token in (
    'title="Wedding delivery and content"',
    "contentToolsEnabled",
    "lifecycle.wedding.exists",
    'aria-label="Open in WedStudio"',
    'title="Open in WedStudio"',
    'to={`/admin/weddings/${lifecycle.wedding.slug}/content`}',
):
    require(token in job, f"Job WedStudio handoff missing {token}")

# Do not silently reclassify the operational Wedding Workspace in this gate.
require(
    'export const isWeddingWorkspacePath' in modules,
    "Wedding Workspace route classifier missing",
)
require(
    'pathname.startsWith("/admin/crm") || pathname === "/admin/settings/client-portal" || isWeddingWorkspacePath(pathname)'
    in modules,
    "operational Wedding Workspace no longer resolves with WedCRM",
)
workspace_guard = modules[
    modules.index("if (isWeddingWorkspacePath(pathname))"):
    modules.index("if (pathname.startsWith(\"/admin/crm/jobs/\"))")
]
require(
    'return ["bookings"];' in workspace_guard,
    "operational Wedding Workspace is no longer bookings-owned",
)
require(
    "Open CRM Job" in wedding_workspace,
    "Wedding Workspace lost its CRM Job return boundary",
)

# Source-only gate: schema 53 and no migration 054.
db = sqlite3.connect(":memory:")
db.executescript(schema)
version = db.execute(
    "SELECT value FROM schema_meta WHERE key='schema_version'"
).fetchone()[0]
require(str(version) == "53", f"Gate 2C1 changed schema: {version}")
require(
    not db.execute("PRAGMA foreign_key_check").fetchall(),
    "schema foreign-key check failed",
)
db.close()
require(
    not list((ROOT / "d1/migrations").glob("054_*.sql")),
    "Gate 2C1 must not add migration 054",
)

print("PASS v1.10.14a Job context navigation + WedStudio handoff")
print("  shared deterministic CRM record back control: verified")
print("  Job-origin Quote return context: verified")
print("  generic Quote return destination: verified")
print("  nested Invoice Back to Job: verified")
print("  Job delivery panel WedStudio handoff: verified")
print("  operational Wedding Workspace bookings boundary preserved: verified")
print("  schema remains 53; migration 054 absent: verified")
