#!/usr/bin/env python3
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def gate_before(
    text: str,
    marker: str,
    gate: str,
    window: int = 4500,
) -> None:
    position = text.find(marker)
    require(position >= 0, f"marker missing: {marker}")
    require(
        gate in text[max(0, position - window):position],
        f"{marker} is not preceded by {gate}",
    )


page = read("src/admin/pages/CRMJob.tsx")
shared = read(
    "src/admin/components/crm/"
    "CRMWeddingWorkspaceShared.tsx"
)
policy = read("serverless/platform-entitlement-policy.ts")
server_test = read(
    "scripts/"
    "test-v1.10.13a-entitlement-crm-job-composite-server.py"
)
modules = read("src/admin/navigation/adminModules.ts")
middleware = read("functions/_middleware.ts")
schema = read("d1/schema.sql")

require("useOutletContext" in page, "CRM Job does not consume Admin Outlet context")
for name, key in (
    ("clientPortalEnabled", "client-portal"),
    ("clientGalleriesEnabled", "client-galleries"),
    ("contentToolsEnabled", "content-tools"),
    ("contractsEnabled", "contracts"),
    ("invoicesEnabled", "invoices"),
):
    require(
        f"const {name} =" in page
        and f'enabledEntitlementKeys?.has("{key}") === true' in page,
        f"CRM Job capability state missing: {name}",
    )

require(
    "connectedPaymentsEnabled" not in page
    and 'enabledEntitlementKeys?.has("connected-payments")' not in page,
    "CRM Job incorrectly added connected-payment capability state",
)

require(
    "[clientPortalEnabled, workspace?.portalAccess]" in page,
    "portal access derived state is not client-portal-aware",
)
require(
    "[clientPortalEnabled, workspace?.questionnaires]" in page,
    "questionnaire-file derived state is not client-portal-aware",
)
require(
    "clientPortalEnabled\n      ? (workspace?.files || [])" in page,
    "Job files are not client-portal-aware",
)
require(
    "[clientPortalEnabled, workspace?.supplierSubmissions]" in page,
    "portal-derived supplier submissions are not client-portal-aware",
)
require(
    "const canEditQuestionnaires =\n    clientPortalEnabled" in page,
    "questionnaire editor manage state is not client-portal-aware",
)

require(
    "showPortalControls = true" in shared
    and "showPortalControls?: boolean;" in shared,
    "shared Clients panel portal visibility prop missing",
)
require(
    "showPortalControls={clientPortalEnabled}" in page,
    "CRM Job does not pass its Client Portal capability to shared Clients",
)
gate_before(
    shared,
    "Client portal · {portal.label}",
    "{showPortalControls ? (",
)
gate_before(
    shared,
    "renderActions?.(",
    "{showPortalControls ? (",
)

require(
    "const commercialInvoice =\n    invoicesEnabled" in page,
    "invoice payload is not defensively nulled without invoices",
)
require(
    "const commercialContract =\n    contractsEnabled" in page,
    "contract payload is not defensively nulled without contracts",
)
require(
    "const bookingQuestionnaire =\n    clientPortalEnabled" in page,
    "questionnaire summary payload is not client-portal-aware",
)
require(
    "const primaryGallery =\n    clientGalleriesEnabled" in page,
    "Client Gallery summary payload is not client-galleries-aware",
)

gate_before(
    page,
    "commercialInvoice.reference",
    "{invoicesEnabled ? (",
)
gate_before(
    page,
    'label="View contract"',
    "{contractsEnabled ? (",
)
gate_before(
    page,
    'href="#job-questionnaires"',
    "{clientPortalEnabled ? (",
)
require(
    '{commercialContract?.status === "draft"\n'
    '              && clientPortalEnabled ? (' in page,
    "Send to Client Portal is not dual-gated by contract row + client-portal",
)
require(
    "{contractsEnabled\n      && contractPreviewOpen\n      && commercialContract ? ("
    in page,
    "contract preview modal is not contracts-gated",
)

gate_before(
    page,
    'title="Open Client Gallery"',
    "{clientGalleriesEnabled ? (",
)
gate_before(
    page,
    'to={`/admin/weddings/${lifecycle.wedding.slug}/content`}',
    "{contentToolsEnabled ? (",
)
gate_before(
    page,
    'title="Manage Website galleries"',
    "{contentToolsEnabled ? (",
)

gate_before(
    page,
    'id="job-questionnaires"',
    "{clientPortalEnabled ? (",
    1200,
)
gate_before(
    page,
    'title="Files"',
    "{clientPortalEnabled ? (",
    1600,
)

require(
    "workspace.linkedSuppliers" in page,
    "linked supplier bookings core was removed",
)
require(
    "pendingSubmissions" in page
    and "clientPortalEnabled" in page,
    "supplier-submission review is not client-portal-aware",
)

for token in (
    'title="Booking and payments"',
    'label="Generate / repair booking pack"',
    "void repairBookingPack()",
    'title="Quote and package"',
    'title="Communication"',
    'title="Open Wedding Workspace"',
    'title="Manage Wedding assets"',
):
    require(token in page, f"bookings core token lost: {token}")

job_start = policy.index('if (parts[0] === "jobs" && parts[1])')
job_end = policy.index(
    '\n  if (parts[0] === "contracts")',
    job_start,
)
job_policy = policy[job_start:job_end]
require(
    'operation === "supplier-submissions"' in job_policy,
    "supplier-submissions route is not explicitly classified",
)
supplier_position = job_policy.index(
    'operation === "supplier-submissions"'
)
portal_return = job_policy.index(
    'return "client-portal";'
)
require(
    supplier_position < portal_return,
    "supplier-submissions does not resolve to client-portal",
)
require(
    'operation === "supplier-submissions"' in server_test,
    "B3C1 server regression does not own supplier-submissions route mapping",
)

invoice_route_marker = r'crm\/jobs\/[^/]+\/invoices\/[^/]+$'
invoice_route_pos = modules.find(invoice_route_marker)
require(
    invoice_route_pos >= 0
    and 'return ["bookings", "invoices"];'
        in modules[invoice_route_pos:invoice_route_pos + 700],
    "nested Job invoice direct route is no longer bookings+invoices",
)

require(
    "professionalApiEntitlementForPath" in middleware
    and "requireWorkspaceEntitlement" in middleware,
    "server entitlement middleware is no longer authoritative",
)

db = sqlite3.connect(":memory:")
db.executescript(schema)
version = db.execute(
    "SELECT value FROM schema_meta WHERE key='schema_version'"
).fetchone()[0]
require(str(version) == "53", f"B3C2 changed schema: {version}")
require(
    not db.execute("PRAGMA foreign_key_check").fetchall(),
    "schema foreign-key check failed",
)
db.close()

require(
    not list((ROOT / "d1/migrations").glob("054_*.sql")),
    "B3C2 must not add migration 054",
)

print(
    "PASS v1.10.13a Gate 2F2D-B3C2 "
    "CRM Job entitlement-aware composite UI"
)
print(
    "  canonical Admin entitlement state drives five optional Job capabilities: verified"
)
print(
    "  Client Portal status/actions/questionnaires/files/submission review are conditional: verified"
)
print(
    "  invoice and contract summaries/preview are independently conditional: verified"
)
print(
    "  Send to Client Portal requires both contracts and client-portal: verified"
)
print(
    "  Client Gallery and Studio delivery destinations are independently conditional: verified"
)
print(
    "  connected-payment UI remains absent from CRM Job: verified"
)
print(
    "  bookings core + booking-pack repair remain available: verified"
)
print(
    "  supplier-submission mutation policy now matches Client Portal ownership: verified"
)
print(
    "  B3C1 server/middleware authority and nested invoice route guard are preserved: verified"
)
print("  schema remains 53: verified")
