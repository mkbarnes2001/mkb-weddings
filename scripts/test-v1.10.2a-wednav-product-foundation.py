#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(path: str) -> str:
    return (ROOT / path).read_text()

def block(source: str, name: str) -> str:
    match = re.search(
        rf"const {re.escape(name)}: AdminNavigationItem\[\] = \[\n(.*?)\n\];",
        source,
        flags=re.DOTALL,
    )
    assert match, f"{name} block not found"
    return match.group(1)

def main() -> None:
    modules = read("src/admin/navigation/adminModules.ts")
    app = read("src/admin/app/AdminApp.tsx")
    layout = read("src/admin/layouts/AdminLayout.tsx")
    ui = read("src/admin/components/ui/AdminUI.tsx")
    overviews = read("src/admin/pages/ModuleOverviews.tsx")
    platform_types = read("src/admin/types/platform.ts")
    schema = read("d1/schema.sql")

    # Visible product suite is concise while persistence keys stay unchanged.
    for key, label, short_label, entitlement in [
        ('key: "business"', 'label: "WedNav"', 'shortLabel: "W.NAV"', 'entitlementKey: "business-profile"'),
        ('key: "crm"', 'label: "WedCRM"', 'shortLabel: "W.CRM"', 'entitlementKey: "crm"'),
        ('key: "website"', 'label: "WedStudio"', 'shortLabel: "W.STU"', 'entitlementKey: "content-tools"'),
        ('key: "client-galleries"', 'label: "WedStore"', 'shortLabel: "W.STO"', 'entitlementKey: "client-galleries"'),
    ]:
        assert key in modules
        assert label in modules
        assert short_label in modules
        assert entitlement in modules

    assert 'export type PlatformModuleKey = "crm" | "client-galleries" | "website" | "business";' in platform_types
    assert "CHECK (module_key IN ('crm', 'client-galleries', 'website', 'business'))" in schema
    assert "VALUES ('schema_version', '37')" in schema or "'schema_version', '37'" in schema

    # WedNav owns the signed-in home; Studio has its own stable explicit route.
    assert '<Route index element={<BusinessOverview />} />' in app
    assert '<Route path="studio" element={<Dashboard />} />' in app
    assert '<Route path="business" element={<BusinessOverview />} />' in app
    assert ': <Navigate to="/admin" replace />;' in app
    assert 'to: "/admin", icon: BriefcaseBusiness' in modules
    assert 'to: "/admin/studio", icon: Globe2' in modules
    assert 'Open WedNav overview' in layout

    # Supplier Master belongs to WedNav without changing the existing route.
    studio_items = block(modules, "studioItems")
    business_items = block(modules, "businessItems")
    assert 'key: "suppliers"' not in studio_items
    assert 'key: "suppliers"' in business_items
    assert 'to: "/admin/suppliers"' in business_items
    assert 'path="suppliers"' in app
    assert 'pathname.startsWith("/admin/suppliers")' in modules

    # Compact labels render literally instead of receiving an extra "Wed" prefix.
    assert 'const isCompactLabel = label.startsWith("W.");' in ui
    assert '{isCompactLabel ? (' in ui
    assert '{moduleName}' in ui

    # WedNav is a business command centre and launches the specialist products.
    assert 'eyebrow="WedNav · Business home"' in overviews
    assert 'title="Your WedPlanned products"' in overviews
    assert 'to="/admin/crm?view=overview"' in overviews
    assert 'to="/admin/studio"' in overviews
    assert 'to="/admin/client-galleries/overview"' in overviews
    assert 'to="/admin/suppliers"' in overviews

    print("PASS v1.10.2a WedNav product foundation")
    print("  WedNav default business home: verified")
    print("  W.NAV / W.CRM / W.STU / W.STO compact identities: verified")
    print("  persisted module keys unchanged: verified")
    print("  Supplier Master moved to WedNav ownership with stable route: verified")
    print("  WedStudio explicit /admin/studio dashboard route: verified")
    print("  compact fallback wordmark rendering: verified")
    print("  schema remains 37: verified")

if __name__ == "__main__":
    main()
