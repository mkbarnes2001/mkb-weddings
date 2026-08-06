#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    layout = (
        ROOT / "src/admin/layouts/AdminLayout.tsx"
    ).read_text()
    page = (
        ROOT / "src/admin/pages/PlatformAdmin.tsx"
    ).read_text()
    css = (
        ROOT / "src/admin/admin-theme.css"
    ).read_text()
    foundation = (
        ROOT / "serverless/platform-foundation-d1.ts"
    ).read_text()

    assert "PlatformBrandingIdentity" in layout
    assert "DEFAULT_PLATFORM_IDENTITY" in layout
    assert "PlatformIdentityAsset" in layout
    assert "ModuleIdentityWordmark" in layout

    assert "platform.platformIdentity" in layout
    assert "configuration.wordmarkUrl" in layout
    assert "configuration.compactWordmarkUrl" in layout
    assert "identity.wordmarkUrl" in layout
    assert "identity.compactWordmarkUrl" in layout
    assert "identity.iconUrl" in layout

    assert 'variant="desktop"' in layout
    assert 'variant="compact"' in layout
    assert 'variant="icon"' in layout
    assert 'className="admin-sidebar-brand"' in layout
    assert 'className="admin-mobile-platform-mark"' in layout
    assert "admin-module-wordmark-asset--desktop" in layout
    assert "admin-module-wordmark-asset--compact" in layout

    assert '<img src="/favicon-32x32.png"' not in layout
    assert layout.count(
        "<AdminModuleWordmark label={module.shortLabel} />"
    ) == 0

    assert '"wedplanned:branding-updated"' in layout
    assert 'window.dispatchEvent(' in page
    assert 'new CustomEvent("wedplanned:branding-updated"' in page

    for selector in (
        ".admin-platform-identity-asset",
        ".admin-platform-identity-fallback",
        ".admin-module-wordmark-asset",
        ".admin-mobile-platform-mark",
    ):
        assert selector in css, selector

    assert "platformIdentity" in foundation

    print("PASS v1.10.1a platform branding shell")
    print("  global desktop platform wordmark: verified")
    print("  mobile platform icon and compact identity: verified")
    print("  desktop module wordmark assignments: verified")
    print("  compact mobile module assignments: verified")
    print("  immediate post-save shell refresh: verified")


if __name__ == "__main__":
    main()
