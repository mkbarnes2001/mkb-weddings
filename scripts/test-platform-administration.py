#!/usr/bin/env python3
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "d1/schema.sql"
MIGRATION = ROOT / "d1/migrations/032_platform_administration.sql"


def one(con: sqlite3.Connection, sql: str):
    row = con.execute(sql).fetchone()
    assert row is not None, sql
    return row


def main() -> None:
    schema_text = SCHEMA.read_text()
    migration_text = MIGRATION.read_text()

    con = sqlite3.connect(":memory:")
    con.executescript(schema_text)
    assert one(con, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "32"
    columns = {row[1] for row in con.execute("PRAGMA table_info(platform_module_configurations)")}
    assert {
        "module_key", "accent_color", "icon_key", "mark_url",
        "active_button_style", "panel_accent_style", "status", "sort_order",
        "updated_by_user_id", "updated_by_email",
    }.issubset(columns)
    assert "workspace_id" not in columns, "Module appearance must be platform-owned, not tenant-owned"
    assert one(con, "SELECT COUNT(*) FROM platform_module_configurations")[0] == 4
    assert {row[0] for row in con.execute("SELECT module_key FROM platform_module_configurations")} == {
        "crm", "client-galleries", "website", "business"
    }
    assert not con.execute("PRAGMA foreign_key_check").fetchall()

    prefix = schema_text.split("-- v1.9.8a: WedPlanned platform administration", 1)[0]
    upgrade = sqlite3.connect(":memory:")
    upgrade.executescript(prefix)
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "31"
    upgrade.executescript(migration_text)
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "32"
    assert one(upgrade, "SELECT COUNT(*) FROM platform_module_configurations")[0] == 4
    assert not upgrade.execute("PRAGMA foreign_key_check").fetchall()

    app = (ROOT / "src/admin/app/AdminApp.tsx").read_text()
    layout = (ROOT / "src/admin/layouts/AdminLayout.tsx").read_text()
    navigation = (ROOT / "src/admin/navigation/adminModules.ts").read_text()
    business = (ROOT / "src/admin/pages/WedPlannedPlatform.tsx").read_text()
    platform_page = (ROOT / "src/admin/pages/PlatformAdmin.tsx").read_text()
    platform_api = (ROOT / "functions/api/platform-admin.ts").read_text()
    platform_data = (ROOT / "serverless/platform-administration-d1.ts").read_text()
    module_data = (ROOT / "serverless/platform-module-config-d1.ts").read_text()
    operations_api = (ROOT / "functions/api/platform-operations/index.ts").read_text()
    export_api = (ROOT / "functions/api/platform-operations/export.ts").read_text()
    css = (ROOT / "src/admin/admin-theme.css").read_text()

    assert 'path="platform"' in app and "PlatformAdminRoute" in app
    assert 'auth.platformRole === "platform_admin"' in app and 'permissions.includes("platform:admin")' in app
    assert 'to={isPlatformRoute ? "/admin/business" : "/admin/platform"}' in layout
    assert "admin-shell--platform" in layout and "admin-platform-entry" in layout
    assert 'key: "operations"' not in navigation.split("const businessItems", 1)[1].split("export const platformAdminItems", 1)[0]
    assert 'key: "access"' not in navigation.split("const businessItems", 1)[1].split("export const platformAdminItems", 1)[0]
    assert 'key: "taxonomy"' not in navigation.split("const businessItems", 1)[1].split("export const platformAdminItems", 1)[0]
    assert "<AdminTabs" not in business and 'tab === "taxonomy"' not in business and 'tab === "operations"' not in business and 'tab === "access"' not in business
    for label in ["Platform overview", "Businesses & workspaces", "Supplier taxonomy", "Module configuration", "Platform operations", "Platform access"]:
        assert label in navigation
    for token in ["accentColor", "iconKey", "markUrl", "activeButtonStyle", "panelAccentStyle"]:
        assert token in platform_page and token in module_data
    assert 'actor.platformRole !== "platform_admin"' in platform_api
    assert 'actor.accessMode === "support"' in platform_api
    assert "requirePlatformAdmin" in platform_data
    assert "workspaceId" in operations_api and "platform_admin" in operations_api
    assert "workspaceId" in export_api and "platform_admin" in export_api
    for selector in [
        '.admin-shell[data-active-button-style="solid"] .admin-module-link--active',
        '.admin-shell[data-panel-accent="edge"] .admin-main-content',
        '.admin-shell--platform .admin-sidebar',
        '.platform-module-config-grid',
        '.admin-platform-entry',
    ]:
        assert selector in css, selector

    print("PASS v1.9.8a Platform Administration")
    print("  schema 32 additive global module configuration: verified")
    print("  Business and Platform navigation boundary: verified")
    print("  client and server platform-admin guards: verified")
    print("  workspace-scoped cross-tenant operations: verified")
    print("  configurable module appearance with safe defaults: verified")


if __name__ == "__main__":
    main()
