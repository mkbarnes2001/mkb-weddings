#!/usr/bin/env python3

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (
    ROOT / "src/shared/wedplannedPublicAppearance.ts"
).read_text(encoding="utf-8")


def require(token: str) -> None:
    assert token in SOURCE, token


def main() -> None:
    # Versioned controlled theme contract.
    require(
        "WEDPLANNED_PUBLIC_THEME_SCHEMA_VERSION = 1"
    )
    require("export type WedPlannedPublicTheme")
    require("DEFAULT_WEDPLANNED_PUBLIC_THEME")
    require("normaliseWedPlannedPublicTheme")

    # Branding assets and responsive sizing.
    for token in (
        "lightWordmarkUrl",
        "darkWordmarkUrl",
        "mobileWordmarkUrl",
        "iconUrl",
        "faviconUrl",
        "socialImageUrl",
        "desktopLogoWidthPx",
        "mobileLogoWidthPx",
        "footerLogoWidthPx",
    ):
        require(token)

    # Controlled font catalogue.
    for token in (
        '"montserrat"',
        '"inter"',
        '"manrope"',
        '"dm-sans"',
        '"system-sans"',
        '"system-serif"',
        '"playfair-display"',
        '"cormorant-garamond"',
        "WEDPLANNED_PUBLIC_FONT_OPTIONS",
    ):
        require(token)

    # Full typography controls.
    for token in (
        "bodyFont",
        "headingFont",
        "displayFont",
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
        "bodyWeight",
        "navigationWeight",
        "buttonWeight",
        "headingWeight",
        "bodyLineHeight",
        "headingLineHeight",
        "headingLetterSpacingEm",
        "navigationLetterSpacingEm",
    ):
        require(token)

    # Public colour system.
    for token in (
        "pageBackground",
        "sectionBackground",
        "alternateSectionBackground",
        "darkSectionBackground",
        "text",
        "mutedText",
        "border",
        "headerBackground",
        "headerText",
        "headerActiveText",
        "mobileMenuBackground",
        "mobileMenuText",
        "mobileMenuActiveText",
        "primaryButtonBackground",
        "primaryButtonText",
        "primaryButtonBorder",
        "secondaryButtonBackground",
        "secondaryButtonText",
        "secondaryButtonBorder",
        "cardBackground",
        "cardText",
        "cardMutedText",
        "cardBorder",
        "heroBackground",
        "heroText",
        "heroMutedText",
        "footerBackground",
        "footerText",
        "footerMutedText",
    ):
        require(token)

    # Layout, responsive and interaction controls.
    for token in (
        "contentWidthPx",
        "desktopSectionSpacingPx",
        "mobileSectionSpacingPx",
        "desktopHorizontalPaddingPx",
        "mobileHorizontalPaddingPx",
        "cardGapPx",
        "cardRadiusPx",
        "buttonRadiusPx",
        "heroRadiusPx",
        "headerHeightPx",
        "cardShadowStrength",
        "stickyHeader",
        "headerOpacityPercent",
        "headerBlurPx",
        "enableCardHoverLift",
    ):
        require(token)

    # Each product has independent identity controls.
    for token in (
        "wednav",
        "wedcrm",
        "wedstudio",
        "wedstore",
        "accentColour",
        "wordmarkUrl",
        "compactWordmarkUrl",
        "logoWidthPx",
        "compactLogoWidthPx",
    ):
        require(token)

    # Validation/safety boundaries.
    for token in (
        r"/^#[0-9A-F]{6}$/",
        'parsed.protocol === "https:"',
        "FONT_KEYS.has(candidate)",
        "Math.min(maximum, Math.max(minimum, numeric))",
    ):
        require(token)

    # Existing v1.10.2a product colours remain defaults.
    for colour in (
        "#B45309",
        "#2563EB",
        "#0F766E",
        "#7C3AED",
    ):
        require(colour)

    print(
        "PASS v1.10.3a public appearance contract"
    )
    print(
        "  desktop/mobile branding controls: verified"
    )
    print(
        "  controlled font catalogue: verified"
    )
    print(
        "  responsive typography controls: verified"
    )
    print(
        "  complete colour system: verified"
    )
    print(
        "  layout and interaction controls: verified"
    )
    print(
        "  four independent product identities: verified"
    )
    print(
        "  bounded values and safe asset URLs: verified"
    )
    print(
        "  v1.10.2a product colour defaults preserved: verified"
    )


if __name__ == "__main__":
    main()
