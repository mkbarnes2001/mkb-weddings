#!/usr/bin/env python3
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


editor = read("src/admin/pages/ClientGalleryEditor.tsx")
layout = read("src/admin/layouts/AdminLayout.tsx")
policy = read("serverless/platform-entitlement-policy.ts")
middleware = read("functions/_middleware.ts")
schema = read("d1/schema.sql")

require("useOutletContext" in editor, "Client Gallery Editor does not consume shared entitlement state")
require(
    'const printStoreEnabled = enabledEntitlementKeys?.has("print-store") === true;' in editor,
    "Print Store capability state missing",
)
require(
    'const contentToolsEnabled = enabledEntitlementKeys?.has("content-tools") === true;' in editor,
    "Content Tools capability state missing",
)

require(
    'requestedTab === "store" && !printStoreEnabled ? "settings" : requestedTab' in editor,
    "direct Store tab does not degrade to General settings",
)
require(
    'const nextTab = tab === "store" && !printStoreEnabled ? "settings" : tab;' in editor,
    "Store tab navigation guard missing",
)

require("if (!printStoreEnabled) {" in editor, "Store loader fail-closed guard missing")
require(
    'if (activeTab === "store" && printStoreEnabled) loadStore();' in editor,
    "Store loader effect is not entitlement-gated",
)
require(
    "if (!storeDraft || !printStoreEnabled) return;" in editor,
    "Store save guard missing",
)
require(
    'if (printStoreEnabled) {\n    settingsTabs.push({ key: "store"' in editor,
    "Store submenu is not entitlement-gated",
)
require(
    'activeTab === "store" && printStoreEnabled' in editor,
    "Store panel is not entitlement-gated",
)

require("if (!contentToolsEnabled) return;" in editor, "Asset Library search guard missing")
require(
    '{contentToolsEnabled ? <details className="client-gallery-photo-toolbar__library"' in editor,
    "Asset Library control is not entitlement-gated",
)

for token in (
    "AdminApiService.getClientGallery(id)",
    "AdminApiService.mutateClientGalleryAssets(id, payload)",
    "AdminApiService.mutateClientGalleryAlbums(id, payload)",
    "AdminApiService.mutateClientGalleryContact(id, payload)",
    "AdminApiService.mutateClientGallerySelection(id, payload)",
    "AdminApiService.updateClientGalleryBranding",
):
    require(token in editor, f"core Client Gallery operation missing: {token}")

require(
    'if (/\\/store(?:\\/|$)/.test(path))' in policy and 'return "print-store";' in policy,
    "server policy no longer protects Client Gallery Store routes",
)
require(
    '"/api/assets"' in policy and 'return "content-tools";' in policy,
    "server policy no longer protects Asset Library routes",
)
require("professionalApiEntitlementForPath" in middleware, "professional API entitlement middleware missing")
require("requireWorkspaceEntitlement" in middleware, "canonical server entitlement enforcement missing")

outlet = layout[layout.index("<Outlet"):layout.index("/>", layout.index("<Outlet")) + 2]
require("enabledEntitlementKeys" in outlet, "Admin Outlet entitlement context missing")

db = sqlite3.connect(":memory:")
db.executescript(schema)
version = db.execute(
    "SELECT value FROM schema_meta WHERE key='schema_version'"
).fetchone()[0]
db.close()

require(str(version) == "53", f"Client Gallery capability gate changed schema: {version}")
require(
    not list((ROOT / "d1/migrations").glob("054_*.sql")),
    "Client Gallery capability gate must not add migration 054",
)

print("PASS v1.10.13a Gate 2F2D-B2 entitlement-aware Client Gallery Editor")
print("  shared canonical Admin entitlement state consumed: verified")
print("  Print Store loader/save/tab/panel are entitlement-gated: verified")
print("  direct ?tab=store degrades to General settings when unavailable: verified")
print("  Asset Library search/control require content-tools: verified")
print("  Client Gallery core operations remain available: verified")
print("  server-side optional capability enforcement preserved: verified")
print("  schema remains 53: verified")
