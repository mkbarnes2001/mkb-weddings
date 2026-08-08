#!/usr/bin/env python3
"""Regression checks for v1.10.1a hotfix5 responsive global typography UI."""

from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (
        ROOT / relative
    ).read_text(encoding="utf-8")


def main() -> None:
    page = read(
        "src/admin/pages/PlatformAdmin.tsx"
    )
    layout = read(
        "src/admin/layouts/AdminLayout.tsx"
    )
    css = read(
        "src/admin/admin-theme.css"
    )
    schema = read(
        "d1/schema.sql"
    )

    # Five platform-wide typography controls expose pixel values.
    assert (
        "function PlatformFontSizeControl"
        in page
    )

    assert page.count(
        "<PlatformFontSizeControl"
    ) == 5

    for token in (
        "<span>px</span>",
        "Preview · {pixelValue}px",
        'basePx={11}',
        'basePx={18}',
        'basePx={10}',
        'basePx={9}',
        'basePx={8.5}',
        'preview="Body text"',
        'preview="Heading"',
        'preview="Button text"',
        'preview="Navigation"',
        'preview="Helper text"',
    ):
        assert token in page, token

    for field in (
        "adminFontScale",
        "adminHeadingFontScale",
        "adminButtonFontScale",
        "adminNavigationFontScale",
        "adminMetaFontScale",
    ):
        assert (
            f"value={{platformIdentity.{field}}}"
            in page
        ), field

    # Typography is no longer configurable per module.
    for field in (
        "moduleFontScale",
        "headingFontScale",
        "buttonFontScale",
        "navigationFontScale",
    ):
        assert (
            f"value={{module.{field}}}"
            not in page
        ), field

        assert (
            f"currentAppearance.{field}"
            not in layout
        ), field

    assert (
        "Typography & logo sizing"
        not in page
    )

    assert (
        "<strong>Logo sizing</strong>"
        in page
    )

    assert (
        "These values apply across every Admin module."
        in page
    )

    # Module-specific logo sizes remain available.
    for field in (
        "pageHeaderLogoScale",
        "sidebarLogoScale",
        "mobileLogoScale",
    ):
        assert (
            f"value={{module.{field}}}"
            in page
        ), field

    # Global scale is now the only typography base.
    assert (
        "const baseFontScale = globalFontScale;"
        in layout
    )

    assert (
        "globalFontScale * moduleFontScale"
        not in layout
    )

    # Responsive controls wrap before overlap occurs.
    for token in (
        "responsive global typography controls",
        ".platform-font-size-control",
        ".platform-font-size-preview",
        "minmax(min(100%, 420px), 1fr)",
        "minmax(min(100%, 520px), 1fr)",
        "minmax(min(100%, 220px), 1fr)",
        "@media (max-width: 1080px)",
        "@media (max-width: 900px)",
    ):
        assert token in css, token

    # Historical source-only boundary: v1.10.1a hotfix5
    # itself introduced no schema change. Validate the canonical
    # schema immediately before the later v1.10.3a migration.
    public_appearance_marker = '-- v1.10.3a: WedPlanned public website appearance and publication history.'

    assert public_appearance_marker in schema

    historical_schema = schema.split(
        public_appearance_marker,
        1,
    )[0]

    con = sqlite3.connect(":memory:")
    con.executescript(historical_schema)

    version = con.execute(
        "SELECT value FROM schema_meta "
        "WHERE key='schema_version'"
    ).fetchone()

    assert version == ("37",), version

    assert not con.execute(
        "PRAGMA foreign_key_check"
    ).fetchall()

    migration_038 = (
        ROOT
        / "d1/migrations/038_wedplanned_public_appearance.sql"
    )

    assert migration_038.exists()
    assert migration_038.read_text().startswith(
        public_appearance_marker
    )

    print(
        "PASS v1.10.1a hotfix5 responsive global typography UI"
    )
    print(
        "  global typography uses pixel controls: verified"
    )
    print(
        "  live font-size previews: verified"
    )
    print(
        "  per-module typography UI/runtime removed: verified"
    )
    print(
        "  per-module logo sizing retained: verified"
    )
    print(
        "  intermediate-width wrapping prevents overlap: verified"
    )
    print(
        "  historical schema-37 source-only boundary: verified"
    )


if __name__ == "__main__":
    main()
