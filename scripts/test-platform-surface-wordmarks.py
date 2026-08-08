#!/usr/bin/env python3
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "d1/schema.sql"
MIGRATION = ROOT / "d1/migrations/036_platform_surface_wordmarks.sql"


def one(con: sqlite3.Connection, sql: str):
    row = con.execute(sql).fetchone()
    assert row is not None, sql
    return row


def read(path: str) -> str:
    return (ROOT / path).read_text()


def main() -> None:
    schema = SCHEMA.read_text()
    migration = MIGRATION.read_text()

    # Fresh canonical schema.
    con = sqlite3.connect(":memory:")
    con.executescript(schema)

    assert one(
        con,
        "SELECT value FROM schema_meta WHERE key='schema_version'",
    )[0] == "37"

    module_columns = {
        row[1]
        for row in con.execute(
            "PRAGMA table_info(platform_module_configurations)"
        )
    }

    platform_columns = {
        row[1]
        for row in con.execute(
            "PRAGMA table_info(platform_branding_settings)"
        )
    }

    assert "dark_wordmark_url" in module_columns
    assert "dark_wordmark_url" in platform_columns
    assert not con.execute(
        "PRAGMA foreign_key_check"
    ).fetchall()

    # Exact upgrade boundary.
    marker = (
        "-- v1.10.1a hotfix1: surface-aware platform "
        "and module wordmarks."
    )

    assert marker in schema

    prefix = schema.split(marker, 1)[0]

    upgrade = sqlite3.connect(":memory:")
    upgrade.executescript(prefix)

    assert one(
        upgrade,
        "SELECT value FROM schema_meta WHERE key='schema_version'",
    )[0] == "35"

    upgrade.executescript(migration)

    assert one(
        upgrade,
        "SELECT value FROM schema_meta WHERE key='schema_version'",
    )[0] == "36"

    assert not upgrade.execute(
        "PRAGMA foreign_key_check"
    ).fetchall()

    module_server = read(
        "serverless/platform-module-config-d1.ts"
    )
    branding_server = read(
        "serverless/platform-branding-d1.ts"
    )
    assets = read(
        "serverless/platform-brand-assets-d1.ts"
    )
    types = read(
        "src/admin/types/platform.ts"
    )
    navigation = read(
        "src/admin/navigation/adminModules.ts"
    )
    layout = read(
        "src/admin/layouts/AdminLayout.tsx"
    )
    ui = read(
        "src/admin/components/ui/AdminUI.tsx"
    )
    editor = read(
        "src/admin/pages/PlatformAdmin.tsx"
    )
    crm = read(
        "src/admin/pages/CRM.tsx"
    )
    dashboard = read(
        "src/admin/pages/Dashboard.tsx"
    )
    overviews = read(
        "src/admin/pages/ModuleOverviews.tsx"
    )
    css = read(
        "src/admin/admin-theme.css"
    )

    # Persistence contract.
    assert "darkWordmarkUrl" in module_server
    assert "darkWordmarkUrl" in branding_server
    assert module_server.count("dark_wordmark_url") >= 3
    assert branding_server.count("dark_wordmark_url") >= 3
    assert assets.count("dark_wordmark_url = ?") == 2
    assert types.count("darkWordmarkUrl: string;") == 2
    assert navigation.count('darkWordmarkUrl: ""') == 4

    # Dark application shell.
    assert "configuration.darkWordmarkUrl" in layout
    assert "identity.darkWordmarkUrl" in layout

    assert "moduleAppearance: currentAppearance" in layout
    assert "moduleLabel: currentModule.label" in layout
    assert "platformIdentity" in layout
    assert "isPlatformRoute" in layout

    # Light page-heading identity is supplied by the shared page header.
    assert "function AdminPageHeaderIdentity" in ui
    assert "moduleAppearance?.wordmarkUrl" in ui
    assert "platformIdentity?.wordmarkUrl" in ui
    assert "admin-page-header__identity-asset" in ui
    assert "<AdminPageHeaderIdentity />" in ui

    assert '<AdminPageHeader' in crm
    assert 'eyebrow="WedCRM · Client operations"' in crm
    assert '? "Dashboard"' in crm

    assert '<AdminPageHeader' in dashboard
    assert 'eyebrow="WedStudio · Content operations"' in dashboard
    assert 'title="Dashboard"' in dashboard

    assert overviews.count("<AdminPageHeader") >= 2
    assert 'eyebrow="WedStore · Private delivery"' in overviews
    assert 'eyebrow="WedNav · Business home"' in overviews
    assert overviews.count('title="Dashboard"') >= 2

    # Branding editor.
    assert editor.count(
        'label="Light background wordmark"'
    ) == 2

    assert editor.count(
        'label="Dark background wordmark"'
    ) == 2

    assert editor.count(
        'label="Compact / mobile wordmark"'
    ) == 2

    assert (
        "value={platformIdentity.darkWordmarkUrl}"
        in editor
    )

    assert (
        "value={module.darkWordmarkUrl}"
        in editor
    )

    assert (
        "module.darkWordmarkUrl || module.wordmarkUrl"
        in editor
    )

    assert (
        "platformIdentity.darkWordmarkUrl "
        "|| platformIdentity.wordmarkUrl"
        in editor
    )

    assert ".admin-module-page-wordmark__asset" in css

    print("PASS v1.10.1a hotfix1 surface-aware wordmarks")
    print("  schema transition: 35 -> 36")
    print("  light-background wordmarks: verified")
    print("  dark-background wordmarks: verified")
    print("  compact/mobile wordmarks: verified")
    print("  module overview branding: verified")
    print("  assigned dark assets protected: verified")


if __name__ == "__main__":
    main()
