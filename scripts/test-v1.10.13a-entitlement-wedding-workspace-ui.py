#!/usr/bin/env python3
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


page = read("src/admin/pages/WeddingWorkspace.tsx")
route = read("functions/api/wedding-workspace/[slug].ts")
policy = read("serverless/platform-entitlement-policy.ts")
middleware = read("functions/_middleware.ts")
schema = read("d1/schema.sql")

require(
    "useOutletContext" in page,
    "Wedding Workspace does not consume shared entitlement state",
)
require(
    "const [workspaceEntitlementKeys, setWorkspaceEntitlementKeys]" in page,
    "Wedding Workspace local canonical entitlement fallback missing",
)
require(
    "enabledEntitlementKeys ?? workspaceEntitlementKeys" in page,
    "effective entitlement fallback missing",
)
require(
    'effectiveEntitlementKeys?.has("content-tools") === true' in page,
    "content-tools capability state missing",
)
require(
    'effectiveEntitlementKeys?.has("client-galleries") === true' in page,
    "client-galleries capability state missing",
)

require(
    "AdminApiService.getWeddingWorkspace(slug)" in page,
    "Wedding Workspace core API call missing",
)
require(
    "AdminApiService.getWorkspace()" in page,
    "workspace core API call missing",
)
require(
    "AdminApiService.getWedPlannedPlatform()" in page,
    "canonical platform entitlement load missing",
)

require(
    'if (canUseContentTools) {' in page,
    "content-tools conditional loader missing",
)
for token in (
    "AdminApiService.getJsonWedding(slug)",
    "AdminApiService.listVenues()",
    "SupplierService.load()",
    "AdminApiService.getLocations()",
):
    require(token in page, f"expected content call missing: {token}")

content_start = page.index("if (canUseContentTools)")
require(
    page.index("AdminApiService.getJsonWedding(slug)") > content_start,
    "getJsonWedding is still outside content-tools boundary",
)
require(
    page.index("AdminApiService.listVenues()") > content_start,
    "listVenues is still outside content-tools boundary",
)
require(
    page.index("SupplierService.load()") > content_start,
    "SupplierService.load is still outside content-tools boundary",
)
require(
    page.index("AdminApiService.getLocations()") > content_start,
    "getLocations is still outside content-tools boundary",
)

require(
    "if (!workspace || !clientGalleriesEnabled) return;" in page,
    "Client Gallery creation guard missing",
)
require(
    "if (!workspace || !contentToolsEnabled) return;" in page,
    "publishing UI guard missing",
)

require(
    "{contentToolsEnabled ? <AdminHeaderRouterLink" in page,
    "Studio header actions are not content-tools-aware",
)
require(
    '{contentToolsEnabled ? <section className="wedding-workspace-card">' in page,
    "Wedding setup/content panel is not content-tools-aware",
)
require(
    '{clientGalleriesEnabled ? <section id="preview-upload"' in page,
    "Client delivery panel is not client-galleries-aware",
)
require(
    '{contentToolsEnabled ? <section id="publishing-destinations"' in page,
    "Publishing panel is not content-tools-aware",
)
require(
    "clientGalleriesEnabled && clientGallery" in page,
    "Client Gallery summary link is not entitlement-aware",
)
require(
    "(contentToolsEnabled && !wedding)" in page,
    "bookings-only rendering still requires the Studio wedding document",
)

require(
    "AdminApiService.saveWeddingPreviewSet" in page,
    "Preview Set core mutation missing",
)
preview_function = page[page.index("const savePreviewSet"):page.index("const publishAssignments")]
require(
    "contentToolsEnabled" not in preview_function,
    "Preview Set core was incorrectly made content-tools-dependent",
)
require(
    "clientGalleriesEnabled" not in preview_function,
    "Preview Set core was incorrectly made client-galleries-dependent",
)

require(
    "scopeWeddingWorkspacePayload" in route,
    "B3A1 payload scoping missing",
)
require(
    'requireWorkspaceEntitlement(' in route
    and '"content-tools"' in route,
    "B3A1 publishing enforcement missing",
)
require(
    'if (pathPrefix(path, "/api/wedding-workspace"))' in policy
    and 'return "bookings";' in policy,
    "Wedding Workspace outer route no longer bookings-owned",
)
require(
    "professionalApiEntitlementForPath" in middleware,
    "professional entitlement middleware missing",
)

db = sqlite3.connect(":memory:")
db.executescript(schema)
version = db.execute(
    "SELECT value FROM schema_meta WHERE key='schema_version'"
).fetchone()[0]
db.close()

require(str(version) == "53", f"Wedding Workspace UI gate changed schema: {version}")
require(
    not list((ROOT / "d1/migrations").glob("054_*.sql")),
    "Wedding Workspace UI gate must not add migration 054",
)

print("PASS v1.10.13a Gate 2F2D-B3A2 Wedding Workspace entitlement-aware UI")
print("  bookings core loads independently of Studio content APIs: verified")
print("  content APIs and supplier assignment load only with content-tools: verified")
print("  Client Gallery delivery/create surfaces require client-galleries: verified")
print("  Studio setup/header/publishing surfaces require content-tools: verified")
print("  Preview Set remains bookings-owned: verified")
print("  bookings-only rendering no longer requires the Studio wedding document: verified")
print("  B3A1 server payload/publish authority preserved: verified")
print("  schema remains 53: verified")
