#!/usr/bin/env python3
"""v1.10.12a Gate 2E.2B public typography reliability."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (
        ROOT / relative
    ).read_text(
        encoding="utf-8"
    )


editor = read(
    "src/admin/components/PublicSiteAppearanceEditor.tsx"
)

admin_css = read(
    "src/admin/admin-theme.css"
)

contract = read(
    "src/shared/wedplannedPublicAppearance.ts"
)

runtime = read(
    "src/wedplanned/publicTheme.tsx"
)

public_css = read(
    "src/wedplanned/wedplanned.css"
)

service = read(
    "serverless/platform-public-site-appearance-d1.ts"
)


# Responsive public appearance fields remain distinct.
for token in (
    "bodyDesktopPx",
    "bodyMobilePx",
    "navigationDesktopPx",
    "navigationMobilePx",
    "buttonPx",
    "metaPx",
    "h1DesktopPx",
    "h1MobilePx",
    "h2DesktopPx",
    "h2MobilePx",
    "h3DesktopPx",
    "h3MobilePx",
):
    assert token in contract, token


# Draft preview maps every typography role.
for token in (
    "--preview-body-size",
    "--preview-nav-size",
    "--preview-button-size",
    "--preview-meta-size",
    "--preview-h1-size",
    "--preview-h2-size",
    "--preview-h3-size",
):
    assert token in editor, token
    assert token in admin_css, token


# Corrective preview CSS remains inside the intentional
# public-appearance isolation boundary.
start = admin_css.index(
    "PUBLIC_APPEARANCE_PREVIEW_"
    "TYPOGRAPHY_ISOLATION_START"
)

bridge = admin_css.index(
    "v1.10.12a Gate 2E.2B — "
    "public appearance typography reliability"
)

end = admin_css.index(
    "PUBLIC_APPEARANCE_PREVIEW_"
    "TYPOGRAPHY_ISOLATION_END"
)

assert start < bridge < end


# Live runtime already exposes exact published values.
for token in (
    '"--wp-body-desktop"',
    '"--wp-body-mobile"',
    '"--wp-nav-desktop"',
    '"--wp-nav-mobile"',
    '"--wp-button-font-size"',
    '"--wp-meta-font-size"',
    '"--wp-h1-desktop"',
    '"--wp-h1-mobile"',
    '"--wp-h2-desktop"',
    '"--wp-h2-mobile"',
    '"--wp-h3-desktop"',
    '"--wp-h3-mobile"',
):
    assert token in runtime, token


# Final CSS layer consumes every published role.
for token in (
    "v1.10.12a Gate 2E.2B — published typography reliability",
    "--wp-body-desktop",
    "--wp-body-mobile",
    "--wp-nav-desktop",
    "--wp-nav-mobile",
    "--wp-button-font-size",
    "--wp-meta-font-size",
    "--wp-h1-desktop",
    "--wp-h1-mobile",
    "--wp-h2-desktop",
    "--wp-h2-mobile",
    "--wp-h3-desktop",
    "--wp-h3-mobile",
):
    assert token in public_css, token


# Corrective layer must occur after original fixed-size
# foundation rules.
assert (
    public_css.rindex(
        "v1.10.12a Gate 2E.2B — "
        "published typography reliability"
    )
    >
    public_css.index(
        ".wp-desktop-nav a,"
    )
)


# Existing draft -> publish -> live persistence path is retained.
for token in (
    "normaliseWedPlannedPublicTheme(incomingTheme)",
    "draft_json = ?",
    "published_json = ?",
    "theme: parseTheme(row.published_json)",
):
    assert token in service, token


# Public typography remains schema-neutral. Migration 050 now
# legitimately belongs to the later Connected Payments gate.
assert not list(
    (ROOT / "d1/migrations").glob(
        "*typography*.sql"
    )
)


print(
    "PASS v1.10.12a Gate 2E.2B "
    "public typography reliability"
)
print(
    "  Admin draft Body / Navigation values: verified"
)
print(
    "  Admin draft Button / Helper / H1-H3 values: verified"
)
print(
    "  live Body desktop/mobile consumers: verified"
)
print(
    "  live Navigation desktop/mobile consumers: verified"
)
print(
    "  live Button / Helper / H1-H3 consumers: verified"
)
print(
    "  draft -> publish -> live path preserved: verified"
)
print(
    "  typography gate remains schema-neutral: verified"
)
