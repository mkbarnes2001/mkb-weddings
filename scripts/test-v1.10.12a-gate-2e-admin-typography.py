#!/usr/bin/env python3
"""v1.10.12a Gate 2E.2A Admin role typography."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (
        ROOT / relative
    ).read_text(
        encoding="utf-8"
    )


platform = read(
    "src/admin/pages/PlatformAdmin.tsx"
)

layout = read(
    "src/admin/layouts/AdminLayout.tsx"
)

css = read(
    "src/admin/admin-theme.css"
)


for token in (
    'label="Heading / H1"',
    'label="Subheading / controls"',
    'label="Main / body text"',
    'label="Helper / metadata"',
    'label="Navigation"',
):
    assert token in platform, token


# Existing persisted fields are retained.
for field in (
    "adminFontScale",
    "adminHeadingFontScale",
    "adminButtonFontScale",
    "adminNavigationFontScale",
    "adminMetaFontScale",
):
    assert field in platform, field
    assert field in layout, field


subheading = platform[
    platform.index(
        'label="Subheading / controls"'
    ):
]

subheading = subheading[
    :
    subheading.index(
        "<PlatformFontSizeControl",
        1,
    )
]

assert "basePx={11}" in subheading


for token in (
    "const roleMainFontSize",
    "const roleHeadingFontSize",
    "const roleSubheadingFontSize",
    "const roleNavigationFontSize",
    "const roleHelperFontSize",
    "--admin-role-main-size",
    "--admin-role-heading-size",
    "--admin-role-subheading-size",
    "--admin-role-navigation-size",
    "--admin-role-helper-size",
):
    assert token in layout, token


for token in (
    "v1.10.12a Gate 2E.2A — semantic Admin typography",
    "--admin-role-heading-size",
    "--admin-role-subheading-size",
    "--admin-role-main-size",
    "--admin-role-helper-size",
    "--admin-role-navigation-size",
):
    assert token in css, token


# Typography remains schema-neutral. Migration 050 now
# legitimately belongs to the later Connected Payments gate.
assert not list(
    (ROOT / "d1/migrations").glob(
        "*typography*.sql"
    )
)


print(
    "PASS v1.10.12a Gate 2E.2A "
    "Admin role typography"
)
print(
    "  Heading / Subheading / Main / Helper roles: verified"
)
print(
    "  Navigation role: verified"
)
print(
    "  persisted typography fields: preserved"
)
print(
    "  typography gate remains schema-neutral: verified"
)
