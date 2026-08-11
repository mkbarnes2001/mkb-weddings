#!/usr/bin/env python3
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "d1/schema.sql"
MIGRATION = ROOT / "d1/migrations/037_admin_appearance_controls.sql"


def one(con: sqlite3.Connection, sql: str):
    row = con.execute(sql).fetchone()
    assert row is not None, sql
    return row


def main() -> None:
    schema = SCHEMA.read_text()
    migration = MIGRATION.read_text()

    con = sqlite3.connect(":memory:")
    con.executescript(schema)

    assert one(
        con,
        "SELECT value FROM schema_meta WHERE key='schema_version'",
    )[0] == "40"

    module_columns = {
        row[1]
        for row in con.execute(
            "PRAGMA table_info(platform_module_configurations)"
        )
    }

    expected_module_columns = {
        "desktop_nav_background_color",
        "desktop_nav_text_color",
        "desktop_nav_button_color",
        "desktop_nav_active_color",
        "desktop_nav_active_text_color",
        "mobile_nav_background_color",
        "mobile_nav_text_color",
        "mobile_nav_button_color",
        "mobile_nav_active_color",
        "mobile_nav_active_text_color",
        "module_font_scale",
        "heading_font_scale",
        "button_font_scale",
        "navigation_font_scale",
        "page_header_logo_scale",
        "sidebar_logo_scale",
        "mobile_logo_scale",
    }

    assert expected_module_columns.issubset(module_columns)

    branding_columns = {
        row[1]
        for row in con.execute(
            "PRAGMA table_info(platform_branding_settings)"
        )
    }

    expected_branding_columns = {
        "admin_font_scale",
        "admin_heading_font_scale",
        "admin_button_font_scale",
        "admin_navigation_font_scale",
        "admin_meta_font_scale",
        "page_header_logo_scale",
        "sidebar_logo_scale",
        "mobile_logo_scale",
    }

    assert expected_branding_columns.issubset(branding_columns)

    module_defaults = one(
        con,
        """
        SELECT
          desktop_nav_background_color,
          mobile_nav_background_color,
          module_font_scale,
          heading_font_scale,
          button_font_scale,
          navigation_font_scale,
          page_header_logo_scale,
          sidebar_logo_scale,
          mobile_logo_scale
        FROM platform_module_configurations
        WHERE module_key='crm'
        """,
    )

    assert module_defaults == (
        "",
        "",
        100,
        100,
        100,
        100,
        100,
        100,
        100,
    )

    global_defaults = one(
        con,
        """
        SELECT
          admin_font_scale,
          admin_heading_font_scale,
          admin_button_font_scale,
          admin_navigation_font_scale,
          admin_meta_font_scale,
          page_header_logo_scale,
          sidebar_logo_scale,
          mobile_logo_scale
        FROM platform_branding_settings
        WHERE id='default'
        """,
    )

    assert global_defaults == (
        100,
        100,
        100,
        100,
        100,
        100,
        100,
        100,
    )

    assert not con.execute(
        "PRAGMA foreign_key_check"
    ).fetchall()

    marker = (
        "-- v1.10.1a hotfix3: global Admin typography "
        "and module navigation appearance."
    )

    assert marker in schema

    prefix = schema.split(marker, 1)[0]

    upgrade = sqlite3.connect(":memory:")
    upgrade.executescript(prefix)

    assert one(
        upgrade,
        "SELECT value FROM schema_meta WHERE key='schema_version'",
    )[0] == "36"

    upgrade.executescript(migration)

    assert one(
        upgrade,
        "SELECT value FROM schema_meta WHERE key='schema_version'",
    )[0] == "37"

    assert not upgrade.execute(
        "PRAGMA foreign_key_check"
    ).fetchall()

    module_server = (
        ROOT / "serverless/platform-module-config-d1.ts"
    ).read_text()
    branding_server = (
        ROOT / "serverless/platform-branding-d1.ts"
    ).read_text()
    types = (
        ROOT / "src/admin/types/platform.ts"
    ).read_text()
    navigation = (
        ROOT / "src/admin/navigation/adminModules.ts"
    ).read_text()

    for token in (
        "desktopNavBackgroundColor",
        "desktopNavActiveColor",
        "mobileNavBackgroundColor",
        "mobileNavActiveColor",
        "moduleFontScale",
        "headingFontScale",
        "buttonFontScale",
        "navigationFontScale",
        "pageHeaderLogoScale",
        "sidebarLogoScale",
        "mobileLogoScale",
    ):
        assert token in module_server, token
        assert token in types, token
        assert token in navigation, token

    for token in (
        "adminFontScale",
        "adminHeadingFontScale",
        "adminButtonFontScale",
        "adminNavigationFontScale",
        "adminMetaFontScale",
        "pageHeaderLogoScale",
        "sidebarLogoScale",
        "mobileLogoScale",
    ):
        assert token in branding_server, token
        assert token in types, token

    print("PASS v1.10.1a hotfix3 Admin appearance foundation")
    print("  schema transition: 36 -> 37")
    print("  global Admin typography persistence: verified")
    print("  desktop/mobile module navigation colours: verified")
    print("  module typography and logo scaling: verified")
    print("  defaults preserve current appearance: verified")


if __name__ == "__main__":
    main()
