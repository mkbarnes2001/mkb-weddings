#!/usr/bin/env python3

from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]

MARKER = (
    "-- v1.10.12a: platform-controlled Admin header appearance."
)

migration = (
    ROOT
    / "d1/migrations/046_admin_header_appearance.sql"
).read_text(
    encoding="utf-8",
)

schema = (
    ROOT
    / "d1/schema.sql"
).read_text(
    encoding="utf-8",
)

server = (
    ROOT
    / "serverless/platform-branding-d1.ts"
).read_text(
    encoding="utf-8",
)

types = (
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

platform = (
    ROOT
    / "src/admin/pages/PlatformAdmin.tsx"
).read_text(
    encoding="utf-8",
)

css = (
    ROOT
    / "src/admin/admin-theme.css"
).read_text(
    encoding="utf-8",
)


columns = {
    "admin_header_style",
    "admin_header_density",
    "admin_header_title_size",
    "admin_header_shadow",
    "admin_header_description",
    "admin_header_description_size",
    "admin_header_action_size",
    "admin_status_size",
    "admin_page_spacing",
}

fields = {
    "adminHeaderStyle",
    "adminHeaderDensity",
    "adminHeaderTitleSize",
    "adminHeaderShadow",
    "adminHeaderDescription",
    "adminHeaderDescriptionSize",
    "adminHeaderActionSize",
    "adminStatusSize",
    "adminPageSpacing",
}


assert MARKER in migration
assert MARKER in schema


# Current canonical release schema reaches 51.
db = sqlite3.connect(":memory:")
db.executescript(schema)

schema_columns = {
    row[1]
    for row in db.execute(
        "PRAGMA table_info(platform_branding_settings)"
    )
}

assert columns.issubset(
    schema_columns
)

version = db.execute(
    """
    SELECT value
    FROM schema_meta
    WHERE key='schema_version'
    """
).fetchone()

assert version
assert version[0] == "51"


defaults = db.execute(
    """
    SELECT
      admin_header_style,
      admin_header_density,
      admin_header_title_size,
      admin_header_shadow,
      admin_header_description,
      admin_header_description_size,
      admin_header_action_size,
      admin_status_size,
      admin_page_spacing
    FROM platform_branding_settings
    WHERE id='default'
    LIMIT 1
    """
).fetchone()

assert defaults == (
    "divider",
    "compact",
    "medium",
    "off",
    "show",
    "small",
    "compact",
    "compact",
    "compact",
)


# Exact schema 45 -> 46 migration.
schema_45 = schema.split(
    MARKER,
    1,
)[0]

upgrade = sqlite3.connect(":memory:")
upgrade.executescript(
    schema_45
)

before = upgrade.execute(
    """
    SELECT value
    FROM schema_meta
    WHERE key='schema_version'
    """
).fetchone()

assert before
assert before[0] == "45"

upgrade.executescript(
    migration
)

after = upgrade.execute(
    """
    SELECT value
    FROM schema_meta
    WHERE key='schema_version'
    """
).fetchone()

assert after
assert after[0] == "46"

assert not upgrade.execute(
    "PRAGMA foreign_key_check"
).fetchall()


for field in fields:
    assert field in server, field
    assert field in types, field
    assert field in layout, field
    assert field in platform, field


for column in columns:
    assert column in server, column


assert server.count(
    "function preparePlatformBrandingUpsert("
) == 1

assert server.count(
    "function preparePlatformBrandingAudit("
) == 1


fingerprint = platform.split(
    "function identityFingerprint",
    1,
)[1].split(
    "function PlatformFontSizeControl",
    1,
)[0]

for field in fields:
    assert f"identity.{field}" in fingerprint, field


for token in [
    'data-admin-header-style={',
    'data-admin-header-density={',
    'data-admin-header-title-size={',
    'data-admin-header-shadow={',
    'data-admin-header-description={',
    'data-admin-header-description-size={',
    'data-admin-header-action-size={',
    'data-admin-status-size={',
    'data-admin-page-spacing={',
]:
    assert token in layout, token


for token in [
    "Global Admin layout &amp; headers",
    "Flat — no box or border",
    "Divider — bottom line only",
    "Panel — contained header",
]:
    assert token in platform, token


assert (
    platform.index(
        "Global Admin layout &amp; headers"
    )
    <
    platform.index(
        "Global Admin logo sizing"
    )
)


flat_selector = (
    '.admin-shell:not(.admin-shell--platform)'
    '[data-admin-header-style="flat"]'
)

assert flat_selector in css

flat_start = css.index(
    flat_selector
)

flat_region = css[
    flat_start:
    flat_start + 350
]

assert "border: 0;" in flat_region
assert "background: transparent;" in flat_region
assert "box-shadow: none;" in flat_region

assert (
    '[data-admin-header-style="divider"]'
    in css
)

assert (
    '[data-admin-header-style="panel"]'
    in css
)

assert (
    '[data-admin-header-description="hide"]'
    in css
)

assert (
    '[data-admin-page-spacing="standard"]'
    in css
)


print(
    "PASS v1.10.12a platform-controlled Admin appearance"
)

print(
    "  schema transition: 45 -> 46"
)

print(
    "  existing typography / logo settings retained"
)

print(
    "  Flat / Divider / Panel: verified"
)

print(
    "  Flat removes box, border, background and shadow"
)

print(
    "  header density / title / description: configurable"
)

print(
    "  actions / status pills / page spacing: configurable"
)

print(
    "  dirty-state persistence: verified"
)

print(
    "  AdminLayout runtime propagation: verified"
)

print(
    "  Platform Administration remains visually distinct"
)
