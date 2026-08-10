#!/usr/bin/env python3
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "d1/schema.sql"
MIGRATION_32 = ROOT / "d1/migrations/032_platform_administration.sql"
MIGRATION_33 = ROOT / "d1/migrations/033_platform_style_assets.sql"
MIGRATION_34 = ROOT / "d1/migrations/034_platform_record_card_colour.sql"
MIGRATION_35 = ROOT / "d1/migrations/035_platform_branding_assets.sql"


def one(con: sqlite3.Connection, sql: str):
    row = con.execute(sql).fetchone()
    assert row is not None, sql
    return row


def main() -> None:
    schema_text = SCHEMA.read_text()
    migration_32 = MIGRATION_32.read_text()
    migration_33 = MIGRATION_33.read_text()
    migration_34 = MIGRATION_34.read_text()
    migration_35 = MIGRATION_35.read_text()

    con = sqlite3.connect(":memory:")
    con.executescript(schema_text)
    assert one(con, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "39"

    module_columns = {row[1] for row in con.execute("PRAGMA table_info(platform_module_configurations)")}
    assert {
        "module_key", "accent_color", "page_background_color",
        "section_background_color", "record_background_color", "icon_key", "mark_url",
        "wordmark_url", "compact_wordmark_url",
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

    branding_columns = {
        row[1]
        for row in con.execute("PRAGMA table_info(platform_branding_settings)")
    }
    assert {
        "id", "platform_name", "wordmark_url",
        "compact_wordmark_url", "icon_url",
        "updated_by_user_id", "updated_by_email",
    }.issubset(branding_columns)
    assert one(
        con,
        "SELECT COUNT(*) FROM platform_branding_settings WHERE id='default'",
    )[0] == 1
    assert not con.execute("PRAGMA foreign_key_check").fetchall()

    prefix = schema_text.split("-- v1.9.8a: WedPlanned platform administration", 1)[0]
    upgrade = sqlite3.connect(":memory:")
    upgrade.executescript(prefix)
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "31"
    upgrade.executescript(migration_32)
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "32"
    upgrade.executescript(migration_33)
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "33"
    upgrade.executescript(migration_34)
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "34"
    upgrade.executescript(migration_35)
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "35"
    assert not upgrade.execute("PRAGMA foreign_key_check").fetchall()

    layout = (ROOT / "src/admin/layouts/AdminLayout.tsx").read_text()
    navigation = (ROOT / "src/admin/navigation/adminModules.ts").read_text()
    platform_page = (ROOT / "src/admin/pages/PlatformAdmin.tsx").read_text()
    crm_page = (ROOT / "src/admin/pages/CRM.tsx").read_text()
    platform_api = (ROOT / "functions/api/platform-admin.ts").read_text()
    asset_api = (ROOT / "functions/api/platform-assets.ts").read_text()
    platform_data = (ROOT / "serverless/platform-administration-d1.ts").read_text()
    module_data = (ROOT / "serverless/platform-module-config-d1.ts").read_text()
    asset_data = (ROOT / "serverless/platform-brand-assets-d1.ts").read_text()
    branding_data = (ROOT / "serverless/platform-branding-d1.ts").read_text()
    service = (ROOT / "src/admin/services/AdminApiService.ts").read_text()
    types = (ROOT / "src/admin/types/platform.ts").read_text()
    css = (ROOT / "src/admin/admin-theme.css").read_text()

    assert 'label: "WedPlanned assets"' in navigation
    assert 'value === "assets"' in platform_page
    assert "pageBackgroundColor" in platform_page and "sectionBackgroundColor" in platform_page
    assert "recordBackgroundColor" in platform_page
    assert "uploadPlatformBrandAsset" in platform_page and "deletePlatformBrandAsset" in service
    assert "platform.brand_asset.created" in asset_data
    assert "platform.brand_asset.archived" in asset_data
    assert 'actor.platformRole === "platform_admin"' in asset_api
    assert 'actor.accessMode !== "support"' in asset_api
    assert "MKB_IMAGES.put" in asset_api
    assert "platform/brand-assets/" in asset_api
    assert "mark_url = ?" in asset_data
    assert "wordmark_url = ?" in asset_data
    assert "compact_wordmark_url = ?" in asset_data
    assert "platform_branding_settings" in asset_data
    assert "platform.branding.updated" in branding_data
    assert "brandAssets" in platform_data and "brandAssets" in types

    assert "admin-workspace-menu" in layout
    assert 'aria-haspopup="menu"' in layout and 'role="menu"' in layout
    assert "auth.memberships.map" in layout and "chooseWorkspace" in layout
    assert 'event.key === "Escape"' in layout and 'document.addEventListener("mousedown"' in layout
    assert "admin-workspace-menu__identity" in layout
    assert "admin-workspace-menu__signout" in layout
    assert "position: sticky;\n  top: 0;\n  z-index: 80;" in css
    assert "grid-template-rows: auto auto minmax(0,1fr) auto; overflow: visible;" in css
    assert ".admin-main-region {\n  position: relative;\n  z-index: 1;" in css
    assert "admin-sidebar-control-card" not in layout
    assert "admin-sidebar-external" not in layout
    assert "www.mkbweddings.co.uk/blog" not in layout
    assert "admin-external-links" not in layout
    assert "width: 244px" in css and "min-width: 244px" in css
    assert "grid-template-columns: 206px" not in css

    assert "page_background_color" in module_data
    assert "section_background_color" in module_data
    assert "record_background_color" in module_data
    assert "--admin-module-page-background" in layout
    assert "--admin-module-section-background" in layout
    assert "--admin-module-record-background" in layout
    assert "var(--admin-module-section-background" in css
    assert "var(--admin-module-record-background" in css
    assert '<AdminTabs className="crm-operations-tabs">' not in crm_page
    assert "saveModuleConfiguration" in platform_api
    assert "saveBrandingAndModules" in platform_api
    assert "savePlatformModuleConfigurations" in module_data
    assert "platformIdentity" in platform_data
    assert "PlatformBrandingIdentity" in types
    assert "savePlatformBrandingAndModules" in service

    print("PASS v1.9.8a Platform Administration refinement")
    print("  fixed-width desktop sidebar and compact workspace flyout: verified")
    print("  duplicate Blog/WedStudio controls removed: verified")
    print("  duplicate CRM horizontal navigation removed: verified")
    print("  configurable page, section and record backgrounds: verified")
    print("  platform-owned reusable logo/icon library: verified")
    print("  exact platform and module wordmark assignments: verified")
    print("  schema transition: 31 -> 32 -> 33 -> 34 -> 35")


if __name__ == "__main__":
    main()
