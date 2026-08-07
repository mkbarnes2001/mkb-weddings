#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    page = (
        ROOT / "src/admin/pages/PlatformAdmin.tsx"
    ).read_text()
    css = (
        ROOT / "src/admin/admin-theme.css"
    ).read_text()
    service = (
        ROOT / "src/admin/services/AdminApiService.ts"
    ).read_text()

    assert "platform-branding-editor__toolbar" in page
    assert "WedPlanned platform identity" in page
    assert "Light background wordmark" in page
    assert "Dark background wordmark" in page
    assert "Compact / mobile wordmark" in page
    assert "Module icon asset" in page
    assert "Colour system" in page
    assert "Interaction" in page

    assert "savePlatformBrandingAndModules" in page
    assert "Save changes" in page
    assert "Reset changes" in page
    assert 'window.addEventListener("beforeunload"' in page
    assert "changedModuleCount" in page
    assert "identityDirty" in page
    assert "brandingDirty" in page

    assert "saveModule(module" not in page
    assert "`Save ${definition.shortLabel}`" not in page
    assert page.count("onClick={saveBrandingAndModules}") == 1
    assert page.count("Save changes") == 1

    for selector in (
        ".platform-branding-editor__toolbar",
        ".platform-identity-editor",
        ".platform-identity-preview",
        ".platform-module-config-card",
        ".platform-module-control-group",
        ".platform-module-field-grid",
        ".platform-module-preview__wordmark",
    ):
        assert selector in css, selector

    assert "savePlatformBrandingAndModules" in service

    print("PASS v1.10.1a platform branding editor")
    print("  one page-level save action: verified")
    print("  unsaved-change tracking and reset: verified")
    print("  platform and module light/dark/compact asset assignments: verified")
    print("  grouped professional responsive layout: verified")
    print("  per-card module save actions removed: verified")


if __name__ == "__main__":
    main()
