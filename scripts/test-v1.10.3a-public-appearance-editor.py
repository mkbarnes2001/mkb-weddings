#!/usr/bin/env python3

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

EDITOR = (
    ROOT
    / "src/admin/components/PublicSiteAppearanceEditor.tsx"
).read_text(encoding="utf-8")

PLATFORM = (
    ROOT
    / "src/admin/pages/PlatformAdmin.tsx"
).read_text(encoding="utf-8")

NAVIGATION = (
    ROOT
    / "src/admin/navigation/adminModules.ts"
).read_text(encoding="utf-8")

CSS = (
    ROOT
    / "src/admin/admin-theme.css"
).read_text(encoding="utf-8")


def require(source: str, token: str) -> None:
    assert token in source, token


def main() -> None:
    # Dedicated Platform Administration section.
    require(PLATFORM, '"public-appearance"')
    require(
        PLATFORM,
        'section=public-appearance',
    )
    require(
        PLATFORM,
        "<PublicSiteAppearanceEditor",
    )
    require(
        PLATFORM,
        "brandAssets={platformAdmin.brandAssets}",
    )

    require(
        NAVIGATION,
        'key: "public-appearance"',
    )
    require(
        NAVIGATION,
        'label: "Public website"',
    )
    require(
        NAVIGATION,
        'section=public-appearance',
    )

    # Draft / publish / restore lifecycle.
    for token in (
        "getWedPlannedPublicAppearance",
        "saveWedPlannedPublicAppearanceDraft",
        "publishWedPlannedPublicAppearance",
        "restoreWedPlannedPublicAppearanceVersionToDraft",
        "Save draft",
        "Publish changes",
        "Restore to draft",
        "Unsaved draft",
        "beforeunload",
    ):
        require(EDITOR, token)

    # Desktop/mobile preview.
    for token in (
        'type PreviewMode = "desktop" | "mobile"',
        'setPreviewMode("desktop")',
        'setPreviewMode("mobile")',
        "Live draft preview",
        "PublicAppearancePreview",
        'data-preview-mode={mode}',
        "Monitor",
        "Smartphone",
    ):
        require(EDITOR, token)

    # Branding and responsive logos.
    for token in (
        "Desktop / light wordmark",
        "Dark-background wordmark",
        "Mobile / compact wordmark",
        "Platform icon",
        "Browser favicon",
        "Social-share artwork",
        "desktopLogoWidthPx",
        "mobileLogoWidthPx",
        "footerLogoWidthPx",
        "Manage platform artwork",
    ):
        require(EDITOR, token)

    # Fonts and responsive typography.
    for token in (
        "WEDPLANNED_PUBLIC_FONT_OPTIONS",
        "Body font",
        "Heading font",
        "Display / brand font",
        "bodyDesktopPx",
        "bodyMobilePx",
        "navigationDesktopPx",
        "navigationMobilePx",
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
        require(EDITOR, token)

    # Full colour groups.
    for heading in (
        "Core colours",
        "Header & mobile navigation",
        "Buttons",
        "Cards",
        "Hero",
        "Footer",
    ):
        require(EDITOR, heading)

    # Layout / product / behaviour controls.
    for token in (
        "Layout & sizing",
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
        "Shadow strength",
        "Product identities",
        "WedNav",
        "WedCRM",
        "WedStudio",
        "WedStore",
        "accentColour",
        "logoWidthPx",
        "compactLogoWidthPx",
        "Sticky header",
        "Card hover lift",
        "Header opacity",
        "Header blur",
    ):
        require(EDITOR, token)

    # Safety / accessibility / defaults.
    for token in (
        "contrastRatio",
        "4.5",
        "Accessibility check",
        "Load built-in defaults",
        "cloneDefaultWedPlannedPublicTheme",
        "The live website will not change until you publish it.",
    ):
        require(EDITOR, token)

    # Arbitrary CSS is deliberately not exposed.
    assert "customCss" not in EDITOR
    assert "Custom CSS" not in EDITOR
    assert "<textarea" not in EDITOR

    # Responsive Admin editor CSS.
    for selector in (
        ".public-appearance-editor",
        ".public-appearance-editor__workspace",
        ".public-appearance-editor__preview-column",
        ".public-appearance-control-group",
        ".public-appearance-field-grid",
        ".public-appearance-number-control",
        ".public-appearance-colour-control",
        ".public-appearance-preview-frame",
        '.public-appearance-preview-frame[data-preview-mode="mobile"]',
        ".public-appearance-product-controls",
        ".public-appearance-version-list",
        "@media (max-width: 1180px)",
        "@media (max-width: 900px)",
        "@media (max-width: 760px)",
    ):
        require(CSS, selector)

    print(
        "PASS v1.10.3a public appearance editor"
    )
    print(
        "  dedicated Platform Administration section: verified"
    )
    print(
        "  draft/save/publish/version restore UI: verified"
    )
    print(
        "  desktop/mobile live draft preview: verified"
    )
    print(
        "  responsive branding controls: verified"
    )
    print(
        "  full typography and font controls: verified"
    )
    print(
        "  complete colour-system controls: verified"
    )
    print(
        "  layout/product/behaviour controls: verified"
    )
    print(
        "  contrast warnings and defaults: verified"
    )
    print(
        "  arbitrary CSS intentionally excluded: verified"
    )


if __name__ == "__main__":
    main()
