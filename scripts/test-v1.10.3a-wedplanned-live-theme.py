#!/usr/bin/env python3

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

RUNTIME = (
    ROOT
    / "src/wedplanned/publicTheme.tsx"
).read_text(encoding="utf-8")

MAIN = (
    ROOT
    / "src/wedplanned/main.tsx"
).read_text(encoding="utf-8")

APP = (
    ROOT
    / "src/wedplanned/WedPlannedApp.tsx"
).read_text(encoding="utf-8")

CSS = (
    ROOT
    / "src/wedplanned/wedplanned.css"
).read_text(encoding="utf-8")

ENDPOINT = (
    ROOT
    / "config/wedplanned/functions/api/theme.ts"
).read_text(encoding="utf-8")


def require(source: str, token: str) -> None:
    assert token in source, token


def main() -> None:
    # Published theme endpoint is consumed at runtime.
    for token in (
        'fetch(',
        '"/api/theme"',
        'cache: "no-store"',
        "normaliseWedPlannedPublicTheme",
        "publishedVersion",
        "publishedThemeActive",
    ):
        require(RUNTIME, token)

    # A version-zero or failed endpoint preserves the source CSS
    # rather than silently redesigning the current live site.
    require(
        RUNTIME,
        "publishedVersion > 0",
    )
    require(
        RUNTIME,
        "clearThemeVariables()",
    )
    require(
        RUNTIME,
        "setRuntime(DEFAULT_RUNTIME)",
    )

    # Provider wraps the entire public application.
    require(
        MAIN,
        "WedPlannedPublicThemeProvider",
    )
    require(
        MAIN,
        "<WedPlannedPublicThemeProvider>",
    )

    # Global brand artwork supports desktop/mobile/footer variants.
    for token in (
        "useWedPlannedPublicTheme",
        "BrandVisual",
        'surface?: "header" | "footer"',
        "lightWordmarkUrl",
        "darkWordmarkUrl",
        "mobileWordmarkUrl",
        "desktopLogoWidthPx",
        "mobileLogoWidthPx",
        "footerLogoWidthPx",
        'className="wp-brand__asset wp-brand__asset--mobile"',
        '<Brand surface="footer" />',
        "<BrandVisual compact />",
    ):
        require(APP, token)

    # Product wordmarks are independently configurable.
    for token in (
        "theme.products[product.slug]",
        "compactWordmarkUrl",
        "wordmarkUrl",
        "compactLogoWidthPx",
        "logoWidthPx",
        "wp-product-wordmark__asset",
    ):
        require(APP, token)

    # Full token families reach runtime CSS variables.
    for token in (
        "--wp-theme-page",
        "--wp-theme-section",
        "--wp-theme-soft",
        "--wp-theme-dark",
        "--wp-theme-text",
        "--wp-theme-muted",
        "--wp-theme-border",
        "--wp-theme-header-bg",
        "--wp-theme-header-text",
        "--wp-theme-header-active",
        "--wp-theme-mobile-bg",
        "--wp-theme-mobile-text",
        "--wp-theme-primary-bg",
        "--wp-theme-secondary-bg",
        "--wp-theme-card-bg",
        "--wp-theme-card-text",
        "--wp-theme-hero-bg",
        "--wp-theme-footer-bg",
        "--wp-body-font",
        "--wp-heading-font",
        "--wp-display-font",
        "--wp-body-desktop",
        "--wp-body-mobile",
        "--wp-nav-desktop",
        "--wp-nav-mobile",
        "--wp-h1-desktop",
        "--wp-h1-mobile",
        "--wp-h2-desktop",
        "--wp-h2-mobile",
        "--wp-h3-desktop",
        "--wp-h3-mobile",
        "--wp-section-desktop",
        "--wp-section-mobile",
        "--wp-side-desktop",
        "--wp-side-mobile",
        "--wp-card-gap",
        "--wp-card-radius",
        "--wp-button-radius",
        "--wp-hero-radius",
        "--wp-header-height",
        "--wp-header-opacity",
        "--wp-header-blur",
        "--wp-card-hover-transform",
        "--wp-nav",
        "--wp-crm",
        "--wp-studio",
        "--wp-store",
    ):
        require(RUNTIME, token)
        require(CSS, token)

    # Controlled Google font catalogue is applied dynamically.
    for token in (
        "uniqueGoogleFamilies",
        "wedPlannedFontOption",
        "fonts.googleapis.com/css2",
    ):
        require(RUNTIME, token)

    # Runtime branding metadata uses controlled published assets.
    for token in (
        "faviconUrl",
        "iconUrl",
        "socialImageUrl",
        "og:image",
    ):
        require(RUNTIME, token)

    # Runtime card theming must not overwrite product identity
    # accent borders. The product-specific rules must appear after
    # the generic runtime card-border rule in the CSS cascade.
    runtime_card_rule = CSS.rfind(
        ".wp-product-card {"
    )

    assert runtime_card_rule >= 0

    for slug, variable in (
        ("wednav", "--wp-nav"),
        ("wedcrm", "--wp-crm"),
        ("wedstudio", "--wp-studio"),
        ("wedstore", "--wp-store"),
    ):
        selector = (
            f".wp-product-card--{slug} "
            f"{{ border-top-color: var({variable}); }}"
        )

        accent_rule = CSS.rfind(selector)

        assert accent_rule >= 0, selector
        assert accent_rule > runtime_card_rule, (
            f"{selector} must follow the runtime "
            "card-border override"
        )

    # Behaviour controls reach actual public interactions.
    for token in (
        "--wp-header-position",
        "--wp-card-hover-transform",
        "--wp-card-hover-shadow",
    ):
        require(RUNTIME, token)
        require(CSS, token)

    # Desktop/mobile responsive theme application is explicit.
    require(
        CSS,
        "@media (max-width: 760px)",
    )
    require(
        CSS,
        ".wp-brand__asset--mobile",
    )
    require(
        CSS,
        "var(--wp-h1-mobile, 54px)",
    )
    require(
        CSS,
        "var(--wp-section-mobile, 66px)",
    )

    # Public endpoint remains published-only.
    require(
        ENDPOINT,
        "getPublishedWedPlannedPublicAppearance",
    )

    for forbidden in (
        "saveWedPlannedPublicAppearanceDraft",
        "publishWedPlannedPublicAppearance",
        "restoreWedPlannedPublicAppearanceVersionToDraft",
    ):
        assert forbidden not in ENDPOINT

    print(
        "PASS v1.10.3a WedPlanned live published theme"
    )
    print(
        "  runtime /api/theme consumption: verified"
    )
    print(
        "  version-zero source-design fallback: verified"
    )
    print(
        "  desktop/mobile/footer branding assets: verified"
    )
    print(
        "  four product identities: verified"
    )
    print(
        "  typography and dynamic fonts: verified"
    )
    print(
        "  colour and layout token application: verified"
    )
    print(
        "  responsive sizing: verified"
    )
    print(
        "  behaviour controls: verified"
    )
    print(
        "  favicon/social artwork application: verified"
    )
    print(
        "  published-only public boundary: verified"
    )


if __name__ == "__main__":
    main()
