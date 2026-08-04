#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def main() -> None:
    modules = read("src/admin/navigation/adminModules.ts")
    layout = read("src/admin/layouts/AdminLayout.tsx")
    app = read("src/admin/app/AdminApp.tsx")
    crm = read("src/admin/pages/CRM.tsx")
    store = read("src/admin/pages/PrintStore.tsx")
    platform = read("src/admin/pages/WedPlannedPlatform.tsx")
    overviews = read("src/admin/pages/ModuleOverviews.tsx")
    dashboard = read("src/admin/pages/Dashboard.tsx")
    css = read("src/admin/admin-theme.css")

    # Central module architecture is explicit and entitlement-ready without exposing unimplemented commercial placeholders.
    for key, label, entitlement in [
        ('key: "crm"', 'label: "CRM"', 'entitlementKey: "crm"'),
        ('key: "client-galleries"', 'label: "Client Galleries"', 'entitlementKey: "client_galleries"'),
        ('key: "website"', 'label: "Studio"', 'entitlementKey: "website_content"'),
        ('key: "business"', 'label: "Business"', 'entitlementKey: "business_settings"'),
    ]:
        assert key in modules and label in modules and entitlement in modules
    assert "requiredPermission" in modules
    assert "WedPlanned Network" not in modules
    assert 'label: "Contracts"' not in modules
    assert 'label: "Invoices"' not in modules
    assert 'label: "Payments"' not in modules
    assert 'label: "Publishing"' in modules

    # Desktop and mobile both use the same resolved module and item source.
    assert "adminModules.map" in layout
    assert "visibleModuleItems(currentModule, auth.permissions)" in layout
    assert "resolveAdminNavigationItem" in layout
    assert "admin-module-switcher" in layout
    assert "admin-mobile-module-switcher" in layout
    assert "admin-mobile-bottom-nav" in layout
    assert 'aria-label="Breadcrumb"' in layout
    assert "document.title" in layout

    # New landing and compatibility routes are additive; legacy routes remain available.
    assert '<Route path="studio" element={<Navigate to="/admin" replace />} />' in app
    assert '<Route path="website" element={<WebsiteOverview />} />' in app
    assert '<Route path="publishing" element={<PublishingOverview />} />' in app
    assert "Build, validate and deploy weddings from one checklist." not in app
    assert '<Route path="business" element={<BusinessOverview />} />' in app
    assert '<Route path="client-galleries/overview" element={<ClientGalleriesOverview />} />' in app
    for route in [
        'path="crm"', 'path="crm/enquiries/:id"', 'path="crm/contacts/:id"', 'path="crm/jobs/:id"',
        'path="crm/catalogue"', 'path="crm/quotes"', 'path="crm/quotes/:id"',
        'path="weddings"', 'path="weddings/:slug"', 'path="gallery"', 'path="locations"',
        'path="venues"', 'path="suppliers"', 'path="assets"', 'path="client-galleries"',
        'path="client-galleries/:id"', 'path="print-store"', 'path="ai"', 'path="seo"',
        'path="publishing"', 'path="settings/client-portal"', 'path="settings"',
    ]:
        assert route in app, f"missing compatibility route {route}"

    # Existing tabbed tools are deep-linkable, so module navigation never points at a fake page.
    assert ' | "overview";' in crm
    assert 'setViewState(next && validViews.includes(next) ? next : "pipeline")' in crm
    assert 'setSearchParams(next === "pipeline" ? {} : { view: next }' in crm
    assert 'title="CRM overview"' not in crm  # title is resolved through the existing page-title map
    assert 'overview: "CRM overview"' in crm
    assert 'Communications remain attached to the relevant lead, client or Job record.' in crm
    assert 'useSearchParams' in store and 'const validTabs: Tab[] = ["catalogue", "pricing", "orders"]' in store
    assert 'setSearchParams(next === "catalogue" ? {} : { tab: next }' in store
    assert 'useSearchParams' in platform and 'searchParams.get("tab")' in platform

    # Landing pages use real existing APIs and preserve the public/private gallery boundary.
    assert "AdminApiService.listClientGalleries()" in overviews
    assert "AdminApiService.getPrintStore()" in overviews
    assert "AdminApiService.getWorkspace()" in overviews
    assert "AdminApiService.getWedPlannedPlatform()" in overviews
    assert "Private client delivery remains separate from Studio." in overviews
    assert 'title="Studio overview"' in dashboard
    assert "export function WebsiteOverview" in dashboard
    assert 'eyebrow="Studio · Website"' in dashboard
    assert "export function PublishingOverview" in dashboard
    assert 'eyebrow="Studio · Publishing"' in dashboard
    assert "Downloads, selections, favourites and print sales remain in Client Galleries." in dashboard

    # Responsive presentation is defined without schema or backend changes.
    for selector in [
        ".admin-module-switcher", ".admin-context-bar", ".admin-module-metrics",
        ".admin-module-destination-grid", ".admin-mobile-module-switcher",
    ]:
        assert selector in css, f"missing CSS selector {selector}"
    assert ".admin-module-switcher-wrap { padding: 14px 16px 18px !important; }" in css
    assert ".admin-module-switcher { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; }" in css
    assert "min-height: 44px" in css and "padding: 9px 10px" in css
    assert not (ROOT / "d1/migrations/032_platform_modules_navigation.sql").exists(), "v1.9.5a navigation did not own schema 33"

    print("PASS v1.9.5a platform modules and navigation")
    print("  four-module switcher and module-specific navigation: verified")
    print("  desktop, mobile, breadcrumbs and deep links: verified")
    print("  existing Admin routes and public/private gallery boundary: verified")
    print("  source-only release; schema remains 31: verified")


if __name__ == "__main__":
    main()
