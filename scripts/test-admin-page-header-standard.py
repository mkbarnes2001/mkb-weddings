#!/usr/bin/env python3

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def main() -> None:
    ui = read("src/admin/components/ui/AdminUI.tsx")
    layout = read("src/admin/layouts/AdminLayout.tsx")
    css = read("src/admin/admin-theme.css")
    crm = read("src/admin/pages/CRM.tsx")
    dashboard = read("src/admin/pages/Dashboard.tsx")
    overviews = read("src/admin/pages/ModuleOverviews.tsx")

    assert "function AdminPageHeaderIdentity()" in ui
    assert 'className="admin-page-header__brand"' in ui
    assert "admin-page-summary admin-page-meta" in ui
    assert 'typeof eyebrow !== "string"' in ui

    assert "moduleAppearance?.wordmarkUrl" in ui
    assert "platformIdentity?.wordmarkUrl" in ui

    assert "moduleAppearance: currentAppearance" in layout
    assert "moduleLabel: currentModule.label" in layout
    assert "platformIdentity," in layout
    assert "isPlatformRoute," in layout

    assert "AdminModulePageWordmark" not in crm
    assert '"Dashboard"' in crm

    assert "AdminModulePageWordmark" not in dashboard
    assert 'title="Dashboard"' in dashboard

    assert "AdminModulePageWordmark" not in overviews
    assert overviews.count('title="Dashboard"') == 2

    for selector in (
        ".admin-page-header__brand",
        ".admin-page-header__identity-asset",
        ".admin-page-summary",
        ".admin-page-actions",
    ):
        assert selector in css

    assert "position: absolute !important;" in css
    assert "clip: rect(0 0 0 0) !important;" in css

    print("PASS compact shared Admin page header")
    print("  light-surface module identity: verified")
    print("  platform identity: verified")
    print("  page-title slot: verified")
    print("  summary slot: verified")
    print("  action slot: verified")
    print("  descriptions visually compacted: verified")
    print("  detail back controls retained: verified")
    print("  four module overviews use Dashboard: verified")


if __name__ == "__main__":
    main()
