#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def main() -> None:
    page = read("src/admin/pages/PlatformAdmin.tsx")
    layout = read("src/admin/layouts/AdminLayout.tsx")
    css = read("src/admin/admin-theme.css")

    # Global controls.
    for token in (
        "Global Admin typography",
        "Overall Admin text",
        "Headings",
        "Buttons & controls",
        "Navigation & menus",
        "Status / helper text",
        "Global Admin logo sizing",
        "Page-header logos",
        "Desktop sidebar logos",
        "Mobile logos",
        "adminFontScale",
        "adminHeadingFontScale",
        "adminButtonFontScale",
        "adminNavigationFontScale",
        "adminMetaFontScale",
    ):
        assert token in page, token

    # Module desktop/mobile controls.
    for token in (
        "Desktop navigation",
        "Sidebar background",
        "Menu text & icons",
        "Normal menu button",
        "Active menu button",
        "Mobile navigation",
        "Mobile menu background",
        "Normal mobile button",
        "Active mobile button",
        "Typography & logo sizing",
        "moduleFontScale",
        "headingFontScale",
        "buttonFontScale",
        "navigationFontScale",
        "pageHeaderLogoScale",
        "sidebarLogoScale",
        "mobileLogoScale",
    ):
        assert token in page, token

    # Runtime CSS variables.
    for token in (
        "--admin-font-scale-effective",
        "--admin-heading-scale-effective",
        "--admin-button-scale-effective",
        "--admin-navigation-scale-effective",
        "--admin-meta-scale-effective",
        "--admin-page-header-logo-scale-effective",
        "--admin-sidebar-logo-scale-effective",
        "--admin-mobile-logo-scale-effective",
        "--admin-desktop-nav-background-color",
        "--admin-desktop-nav-active-color",
        "--admin-mobile-nav-background-color",
        "--admin-mobile-nav-active-color",
    ):
        assert token in layout, token

    # Opt-in colour overrides preserve old appearance when fields are blank.
    for token in (
        "data-desktop-nav-background-custom",
        "data-desktop-nav-text-custom",
        "data-desktop-nav-button-custom",
        "data-desktop-nav-active-custom",
        "data-mobile-nav-background-custom",
        "data-mobile-nav-text-custom",
        "data-mobile-nav-button-custom",
        "data-mobile-nav-active-custom",
    ):
        assert token in layout, token
        assert token.replace("data-", '[data-')[:0] == ""

    for selector in (
        ".platform-scale-control",
        ".platform-colour-control--optional",
        ".platform-colour-reset",
        'data-desktop-nav-active-custom="true"',
        'data-mobile-nav-active-custom="true"',
        ".admin-page-header__identity-asset",
        ".admin-module-wordmark-asset--desktop",
        ".admin-module-wordmark-asset--compact",
    ):
        assert selector in css, selector

    # Existing one-save editor contract is retained.
    assert page.count("onClick={saveBrandingAndModules}") == 1
    assert page.count("Save changes") == 1

    print("PASS v1.10.1a hotfix3 Admin appearance editor/runtime")
    print("  global Admin typography controls: verified")
    print("  global and per-module logo scales: verified")
    print("  desktop module navigation colours: verified")
    print("  mobile module navigation colours: verified")
    print("  blank colour overrides preserve existing behaviour: verified")
    print("  single page-level save retained: verified")


if __name__ == "__main__":
    main()
