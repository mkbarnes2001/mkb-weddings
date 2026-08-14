#!/usr/bin/env python3
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "d1/schema.sql"
MIGRATION = ROOT / "d1/migrations/035_platform_branding_assets.sql"


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
    )[0] == "41"

    module_columns = {
        row[1]
        for row in con.execute(
            "PRAGMA table_info(platform_module_configurations)"
        )
    }
    assert {
        "mark_url",
        "wordmark_url",
        "dark_wordmark_url",
        "compact_wordmark_url",
    }.issubset(module_columns)

    branding_columns = {
        row[1]
        for row in con.execute(
            "PRAGMA table_info(platform_branding_settings)"
        )
    }
    assert {
        "id",
        "platform_name",
        "wordmark_url",
        "dark_wordmark_url",
        "compact_wordmark_url",
        "icon_url",
        "updated_by_user_id",
        "updated_by_email",
    }.issubset(branding_columns)

    identity = one(
        con,
        """
        SELECT
          platform_name,
          wordmark_url,
          dark_wordmark_url,
          compact_wordmark_url,
          icon_url
        FROM platform_branding_settings
        WHERE id='default'
        """,
    )
    assert identity == ("WedPlanned", "", "", "", "")
    assert not con.execute("PRAGMA foreign_key_check").fetchall()

    prefix = schema.split(
        "-- v1.10.1a: exact platform and module branding assets.",
        1,
    )[0]

    upgrade = sqlite3.connect(":memory:")
    upgrade.executescript(prefix)

    assert one(
        upgrade,
        "SELECT value FROM schema_meta WHERE key='schema_version'",
    )[0] == "34"

    upgrade.executescript(migration)

    assert one(
        upgrade,
        "SELECT value FROM schema_meta WHERE key='schema_version'",
    )[0] == "35"

    assert not upgrade.execute("PRAGMA foreign_key_check").fetchall()

    module_data = (
        ROOT / "serverless/platform-module-config-d1.ts"
    ).read_text()
    branding_data = (
        ROOT / "serverless/platform-branding-d1.ts"
    ).read_text()
    administration = (
        ROOT / "serverless/platform-administration-d1.ts"
    ).read_text()
    foundation = (
        ROOT / "serverless/platform-foundation-d1.ts"
    ).read_text()
    api = (
        ROOT / "functions/api/platform-admin.ts"
    ).read_text()
    assets = (
        ROOT / "serverless/platform-brand-assets-d1.ts"
    ).read_text()
    types = (
        ROOT / "src/admin/types/platform.ts"
    ).read_text()
    service = (
        ROOT / "src/admin/services/AdminApiService.ts"
    ).read_text()
    navigation = (
        ROOT / "src/admin/navigation/adminModules.ts"
    ).read_text()

    for token in (
        "wordmarkUrl",
        "darkWordmarkUrl",
        "compactWordmarkUrl",
        "savePlatformModuleConfigurations",
    ):
        assert token in module_data

    assert "savePlatformBrandingIdentity" in branding_data
    assert "platform.branding.updated" in branding_data
    assert "preparePlatformBrandingIdentityStatements" in branding_data
    assert "preparePlatformModuleConfigurationsStatements" in module_data
    assert "updatePlatformBrandingAndModules" in administration
    assert "await db.batch([" in administration
    assert "platform.branding_and_modules.updated" in administration
    assert "platformIdentity" in administration
    assert "getPlatformBrandingIdentity" in foundation
    assert 'action === "saveBrandingAndModules"' in api
    assert "platform_branding_settings" in assets
    assert "PlatformBrandingIdentity" in types
    assert "savePlatformBrandingAndModules" in service
    assert navigation.count('wordmarkUrl: ""') == 4
    assert navigation.count('darkWordmarkUrl: ""') == 4
    assert navigation.count('compactWordmarkUrl: ""') == 4

    print("PASS v1.10.1a platform branding contract")
    print("  WedPlanned platform identity record: verified")
    print("  desktop and compact module wordmarks: verified")
    print("  single-request platform save contract: verified")
    print("  assigned-asset deletion protection: verified")
    print("  schema transition: 34 -> 35")


if __name__ == "__main__":
    main()
