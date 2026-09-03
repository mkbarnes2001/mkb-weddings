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
    dashboard = read("src/admin/pages/Dashboard.tsx")
    overviews = read("src/admin/pages/ModuleOverviews.tsx")
    layout = read("src/admin/layouts/AdminLayout.tsx")
    platform = read("src/admin/pages/PlatformAdmin.tsx")
    platform_types = read("src/admin/types/platform.ts")
    workspace = read("serverless/workspace-d1.ts")
    admin_api = read("src/admin/services/AdminApiService.ts")
    portal_service = read("serverless/client-portal-d1.ts")
    portal_ui = read("src/components/ClientPortal.tsx")
    portal_settings = read("src/admin/pages/ClientPortalSettings.tsx")
    public_css = read("src/index.css")
    app = read("src/App.tsx")
    schema = read("d1/schema.sql")

    # New visible identities retain established persistence and entitlement keys.
    for key, label, entitlement in [
        ('key: "crm"', 'label: "WedCRM"', 'entitlementKey: "crm"'),
        ('key: "client-galleries"', 'label: "WedStore"', 'entitlementKey: "client-galleries"'),
        ('key: "website"', 'label: "WedStudio"', 'entitlementKey: "content-tools"'),
        ('key: "business"', 'label: "WedNav"', 'entitlementKey: "business-profile"'),
    ]:
        assert key in modules and label in modules and entitlement in modules

    assert 'export type PlatformModuleKey = "crm" | "client-galleries" | "website" | "business";' in platform_types
    assert "CHECK (module_key IN ('crm', 'client-galleries', 'website', 'business'))" in schema

    # Client Portal administration belongs to WedCRM while its route remains stable.
    crm_items = block(modules, "crmItems")
    business_items = block(modules, "businessItems")
    assert 'key: "client-portal"' in crm_items
    assert 'to: "/admin/settings/client-portal"' in crm_items
    assert 'key: "client-portal"' not in business_items
    assert 'pathname === "/admin/settings/client-portal"' in modules
    assert 'pathname === "/admin/settings"' in modules
    assert 'pathname.startsWith("/admin/suppliers")' in modules
    assert 'items: businessItems' in modules
    assert 'pathname.startsWith("/admin/settings")' not in modules

    # WedStudio is the visible public-content workspace.
    assert 'eyebrow="WedStudio · Content operations"' in dashboard
    assert 'title="Dashboard"' in dashboard
    assert 'eyebrow="WedStudio · Website"' in dashboard
    assert 'eyebrow="WedStudio · Publishing"' in dashboard
    assert "Open WedNav overview" in layout
    assert "Private client delivery remains separate from WedStudio." in overviews

    # Module icons remain restricted to platform-owned icon assets.
    # Wordmarks are assigned separately from platform-owned logo assets.
    assert 'asset.assetType === "icon"' in platform
    assert 'asset.assetType === "logo"' in platform
    assert "iconAssets.map" in platform
    assert "logoAssets.map" in platform
    assert "platformAdmin.brandAssets.map((asset) => <option" not in platform
    assert 'label="Module icon asset"' in platform
    assert 'label="Light background wordmark"' in platform
    assert 'label="Dark background wordmark"' in platform
    assert 'label="Compact / mobile wordmark"' in platform
    assert 'title="WedPlanned asset library"' in platform

    # Website connections are workspace-owned and persist in the existing JSON envelope.
    for field in [
        "websiteConnectionPlatform",
        "websiteConnectionDomain",
        "websiteConnectionStatus",
        "websiteConnectionLastCheckedAt",
        "websiteConnectionGalleries",
        "websiteConnectionStories",
        "websiteConnectionVenues",
        "websiteConnectionMoments",
    ]:
        assert field in workspace, field
        assert field in admin_api, field

    assert "websiteConnection: websiteConnectionDocument" in workspace
    assert "document_json = excluded.document_json" in workspace
    assert "Choose a supported website connection type." in workspace
    assert "Connected website must begin with http:// or https://." in workspace

    # Authenticated gallery discovery is workspace-, status- and identity-scoped.
    assert "portalGalleriesForIdentity" in portal_service
    assert "cg.workspace_id = ?" in portal_service
    assert "cg.status = 'live'" in portal_service
    assert "client_gallery_contacts" in portal_service
    assert "client_identity_gallery_visitors" in portal_service
    assert "datetime(cg.expires_at) > CURRENT_TIMESTAMP" in portal_service
    assert "galleries: await portalGalleriesForIdentity" in portal_service
    assert "quotes: [], galleries: []" in portal_service

    gallery_helper = portal_service.split(
        "async function portalGalleriesForIdentity",
        1,
    )[1].split(
        "export async function getPublicPortal",
        1,
    )[0]
    assert "access_token" not in gallery_helper
    assert "accessToken" not in gallery_helper

    # The authenticated portal uses the existing single-segment gallery route.
    portal_view = portal_ui.split(
        "type PortalView =",
        1,
    )[1].split(
        ";",
        1,
    )[0]

    for required_view in (
        '"home"',
        '"quotes"',
        '"questionnaires"',
        '"galleries"',
    ):
        assert required_view in portal_view, required_view
    assert 'setView("galleries")' in portal_ui
    assert "portalGalleryPath" in portal_ui
    assert "`/client-gallery/${encodeURIComponent(gallery.slug)}`" in portal_ui
    assert "gallery.accessToken" not in portal_ui
    assert "client-portal-gallery-grid" in portal_ui
    assert ".client-portal-gallery-grid" in public_css
    assert "<span>Galleries</span>" in portal_settings
    assert '<Route path="/client-gallery/:token"' in app
    assert '<Route path="/client-gallery/:slug/:token"' in app

    # WedStudio uses operational snapshots instead of repeating its sidebar.
    assert "function StudioSnapshot" in dashboard
    assert "admin-studio-snapshot-grid" in dashboard
    assert 'label="Website connection"' in dashboard
    assert 'label="Wedding stories"' in dashboard
    assert 'label="Public galleries"' in dashboard
    assert 'label="SEO readiness"' in dashboard
    assert 'title="Website connection"' in dashboard
    assert "AdminApiService.getWorkspace" in dashboard
    assert "AdminApiService.updateWorkspace" in dashboard
    assert "WordPress" in dashboard
    assert "Squarespace" in dashboard
    assert "Custom HTML website" in dashboard
    assert "Configuration status only" in dashboard
    assert "websiteEmbedCode" in dashboard

    dashboard_function = dashboard.split(
        "export function Dashboard()",
        1,
    )[1].split(
        "export function WebsiteOverview()",
        1,
    )[0]
    assert "admin-module-destination-grid" not in dashboard_function

    # Module names use the shared WedPlanned serif/sans lockup.
    admin_ui = read("src/admin/components/ui/AdminUI.tsx")
    crm = read("src/admin/pages/CRM.tsx")
    overviews = read("src/admin/pages/ModuleOverviews.tsx")
    admin_css = read("src/admin/admin-theme.css")

    assert "function AdminModuleWordmark" in admin_ui
    assert "admin-module-wordmark__wed" in admin_ui
    assert "WedPlanned Canela" in admin_css
    assert 'overview: "WedCRM overview"' in crm
    assert 'eyebrow="WedCRM · Client operations"' in crm
    assert '? "Dashboard"' in crm
    assert 'eyebrow="WedStore · Private delivery"' in overviews
    assert 'eyebrow="WedNav · Business home"' in overviews
    assert overviews.count('title="Dashboard"') >= 2
    assert 'to="/admin/settings/client-portal"' not in overviews
    assert "Client portal branding" not in overviews
    assert "portalReady" not in overviews

    # This implementation stage is source-only.
    assert not (ROOT / "d1/migrations/035_wedplanned_modules_unified_experience.sql").exists()
    assert not (ROOT / "d1/migrations/035_studio_foundation.sql").exists()

    print("PASS v1.10.0a WedPlanned module identity foundation")
    print("  WedNav, WedCRM, WedStudio and WedStore identities: verified")
    print("  persisted module keys and entitlement compatibility: verified")
    print("  Client Portal administration moved to WedCRM navigation: verified")
    print("  platform-owned icon assets enforced for custom module marks: verified")
    print("  workspace-owned website connection persistence: verified")
    print("  authenticated portal gallery discovery without capability-token exposure: verified")
    print("  unified Client Portal gallery navigation and delivery cards: verified")
    print("  WedStudio operational snapshots and website connection interface: verified")
    print("  WedPlanned module wordmarks and corrected overview ownership: verified")
    print("  source-only implementation; schema remains 34: verified")


if __name__ == "__main__":
    main()
