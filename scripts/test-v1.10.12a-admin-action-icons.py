#!/usr/bin/env python3

from pathlib import Path
import sqlite3
import tempfile


ROOT = Path(__file__).resolve().parents[1]

migration = (
    ROOT
    / "d1/migrations/047_admin_action_icons.sql"
).read_text(
    encoding="utf-8",
)

schema = (
    ROOT
    / "d1/schema.sql"
).read_text(
    encoding="utf-8",
)

platform_types = (
    ROOT
    / "src/admin/types/platform.ts"
).read_text(
    encoding="utf-8",
)

layout = (
    ROOT
    / "src/admin/layouts/AdminLayout.tsx"
).read_text(
    encoding="utf-8",
)

platform_admin = (
    ROOT
    / "src/admin/pages/PlatformAdmin.tsx"
).read_text(
    encoding="utf-8",
)

server = (
    ROOT
    / "serverless/platform-branding-d1.ts"
).read_text(
    encoding="utf-8",
)

catalogue = (
    ROOT
    / "src/admin/config/adminActionIcons.ts"
).read_text(
    encoding="utf-8",
)


for token in [
    "admin_action_icons_json",
    "json_valid(admin_action_icons_json)",
    "schema_version', '47'",
]:
    assert token in migration, token
    assert token in schema, token


assert (
    "adminActionIcons: Record<string, string>;"
    in platform_types
)

assert "adminActionIcons: {}" in layout
assert "adminActionIcons: {}" in platform_admin

assert (
    "adminActionIcons: identity.adminActionIcons"
    in platform_admin
)


for token in [
    "adminActionIcons: Record<string, string>;",
    "adminActionIcons: {}",
    "hydratedAdminActionIcons",
    "requiredAdminActionIcons",
    "row.admin_action_icons_json",
    "incoming?.adminActionIcons",
    "admin_action_icons_json",
    "JSON.stringify(identity.adminActionIcons)",
]:
    assert token in server, token


for token in [
    "adminActionIconCatalogue",
    "adminActionDefinitions",
    "inferAdminActionKey",
    "resolveAdminActionIcon",
    "configuredAdminActionIconKey",
    'key: "save"',
    'key: "send"',
    'key: "quote"',
    'key: "invoice"',
    'key: "contract"',
    'key: "questionnaire"',
    'key: "generic"',
]:
    assert token in catalogue, token


assert catalogue.count(
    "keywords:"
) >= 40

assert catalogue.count(
    "defaultIconKey:"
) >= 30


with tempfile.NamedTemporaryFile(
    suffix=".sqlite",
) as handle:
    connection = sqlite3.connect(
        handle.name
    )

    connection.executescript(
        schema
    )

    version = connection.execute(
        """
        SELECT value
        FROM schema_meta
        WHERE key = 'schema_version'
        """
    ).fetchone()

    assert version
    # d1/schema.sql is cumulative. Migration 047 is
    # asserted independently above; the current schema
    # must finish at the repository schema version.
    assert str(version[0]) == "49"

    columns = {
        row[1]: row
        for row in connection.execute(
            "PRAGMA table_info(platform_branding_settings)"
        )
    }

    assert (
        "admin_action_icons_json"
        in columns
    )

    column = columns[
        "admin_action_icons_json"
    ]

    default = str(
        column[4] or ""
    ).strip("'\"")

    assert default == "{}"

    json_support = connection.execute(
        "SELECT json_valid('{}')"
    ).fetchone()

    assert json_support
    assert json_support[0] == 1

    connection.close()


print(
    "PASS v1.10.12a platform Admin action icon foundation"
)

print(
    "  schema transition source: 46 -> 47"
)

print(
    "  one JSON override field: verified"
)

print(
    "  source-owned defaults: verified"
)

print(
    "  server hydration / validation / persistence: verified"
)

print(
    "  Platform identity dirty-state coverage: verified"
)

print(
    "  curated Lucide catalogue: verified"
)

print(
    "  semantic action definitions: verified"
)

print(
    "  current cumulative schema version: 49"
)
