#!/usr/bin/env python3
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "d1/schema.sql"
MIGRATION_32 = ROOT / "d1/migrations/032_platform_administration.sql"
MIGRATION_33 = ROOT / "d1/migrations/033_platform_style_assets.sql"


def one(con: sqlite3.Connection, sql: str):
    row = con.execute(sql).fetchone()
    assert row is not None, sql
    return row


def main() -> None:
    schema_text = SCHEMA.read_text()
    migration_32 = MIGRATION_32.read_text()
    migration_33 = MIGRATION_33.read_text()

    con = sqlite3.connect(":memory:")
    con.executescript(schema_text)
    assert one(con, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "33"

    module_columns = {row[1] for row in con.execute("PRAGMA table_info(platform_module_configurations)")}
    assert {
        "module_key", "accent_color", "page_background_color",
        "section_background_color", "icon_key", "mark_url",
        "active_button_style", "panel_accent_style", "status", "sort_order",
        "updated_by_user_id", "updated_by_email",
    }.issubset(module_columns)
    assert "workspace_id" not in module_columns
    assert one(con, "SELECT COUNT(*) FROM platform_module_configurations")[0] == 4

    asset_columns = {row[1] for row in con.execute("PRAGMA table_info(platform_brand_assets)")}
    assert {
        "id", "name", "asset_type", "storage_key", "url", "mime_type",
        "size_bytes", "status", "uploaded_by_user_id", "uploaded_by_email",
    }.issubset(asset_columns)
    assert "workspace_id" not in asset_columns
    assert not con.execute("PRAGMA foreign_key_check").fetchall()

    prefix = schema_text.split("-- v1.9.8a: WedPlanned platform administration", 1)[0]
    upgrade = sqlite3.connect(":memory:")
    upgrade.executescript(prefix)
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "31"
    upgrade.executescript(migration_32)
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "32"
    upgrade.executescript(migration_33)
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "33"
    assert not upgrade.execute("PRAGMA foreign_key_check").fetchall()

    layout = (ROOT / "src/admin/layouts/AdminLayout.tsx").read_text()
    navigation = (ROOT / "src/admin/navigation/adminModules.ts").read_text()
    platform_page = (ROOT / "src/admin/pages/PlatformAdmin.tsx").read_text()
    platform_api = (ROOT / "functions/api/platform-admin.ts").read_text()
    asset_api = (ROOT / "functions/api/platform-assets.ts").read_text()
    platform_data = (ROOT / "serverless/platform-administration-d1.ts").read_text()
    module_data = (ROOT / "serverless/platform-module-config-d1.ts").read_text()
    asset_data = (ROOT / "serverless/platform-brand-assets-d1.ts").read_text()
    service = (ROOT / "src/admin/services/AdminApiService.ts").read_text()
    types = (ROOT / "src/admin/types/platform.ts").read_text()
    css = (ROOT / "src/admin/admin-theme.css").read_text()

    assert 'label: "Brand assets"' in navigation
    assert 'value === "assets"' in platform_page
    assert "pageBackgroundColor" in platform_page and "sectionBackgroundColor" in platform_page
    assert "uploadPlatformBrandAsset" in platform_page and "deletePlatformBrandAsset" in service
    assert "platform.brand_asset.created" in asset_data
    assert "platform.brand_asset.archived" in asset_data
    assert 'actor.platformRole === "platform_admin"' in asset_api
    assert 'actor.accessMode !== "support"' in asset_api
    assert "MKB_IMAGES.put" in asset_api
    assert "platform/brand-assets/" in asset_api
    assert "mark_url = ?" in asset_data
    assert "brandAssets" in platform_data and "brandAssets" in types

    assert "admin-sidebar-control-card" in layout
    assert "Business active" in layout
    assert 'title="Sign out" aria-label="Sign out"><LogOut /></button>' in layout
    assert "admin-sidebar-external" not in layout
    assert "www.mkbweddings.co.uk/blog" not in layout
    assert "admin-external-links" not in layout
    assert "width: 244px" in css and "min-width: 244px" in css
    assert "grid-template-columns: 206px" not in css

    assert "page_background_color" in module_data
    assert "section_background_color" in module_data
    assert "--admin-module-page-background" in layout
    assert "--admin-module-section-background" in layout
    assert "var(--admin-module-section-background" in css
    assert "saveModuleConfiguration" in platform_api

    print("PASS v1.9.8a Platform Administration refinement")
    print("  fixed-width desktop sidebar and unified control card: verified")
    print("  duplicate Blog/Website controls removed: verified")
    print("  configurable page and section backgrounds: verified")
    print("  platform-owned reusable logo/icon library: verified")
    print("  schema transition: 31 -> 32 -> 33")


if __name__ == "__main__":
    main()
