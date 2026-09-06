#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def main() -> None:
    modules = read("src/admin/navigation/adminModules.ts")
    app = read("src/admin/app/AdminApp.tsx")
    dashboard = read("src/admin/pages/Dashboard.tsx")
    layout = read("src/admin/layouts/AdminLayout.tsx")
    overviews = read("src/admin/pages/ModuleOverviews.tsx")
    platform_types = read("src/admin/types/platform.ts")
    module_data = read("serverless/platform-module-config-d1.ts")
    schema = read("d1/schema.sql")

    # Studio is the visible product identity while the persisted Website key remains stable.
    assert 'key: "website", label: "WedStudio", shortLabel: "W.STU"' in modules
    assert 'entitlementKey: "content-tools"' in modules
    assert 'items: studioItems' in modules
    assert 'export type PlatformModuleKey = "crm" | "client-galleries" | "website" | "business";' in platform_types
    assert 'export const PLATFORM_MODULE_KEYS = [' in module_data
    for module_key in [
        '"crm"',
        '"client-galleries"',
        '"website"',
        '"business"',
    ]:
        assert module_key in module_data
    assert "] as const;" in module_data
    assert "CHECK (module_key IN ('crm', 'client-galleries', 'website', 'business'))" in schema

    # Website is now a section inside Studio and both old and intuitive entry routes remain valid.
    assert '{ key: "website", label: "Website", to: "/admin/website"' in modules
    assert '{ key: "publishing", label: "Publishing", to: "/admin/publishing"' in modules
    assert '<Route path="studio" element={<Dashboard />} />' in app
    assert '<Route path="website" element={<WebsiteOverview />} />' in app
    assert '<Route path="publishing" element={<PublishingOverview />} />' in app
    assert 'export function WebsiteOverview()' in dashboard
    assert 'export function PublishingOverview()' in dashboard
    assert "Build, validate and deploy weddings from one checklist." not in app

    # Studio overview exposes the complete public-content toolset as
    # operational snapshots rather than repeating sidebar destinations.
    for token in [
        'eyebrow="WedStudio · Content operations"',
        'title="Dashboard"',
        'label="Website connection"',
        'label="Wedding stories"',
        'label="Public galleries"',
        'label="Asset library"',
        'label="AI content"',
        'label="SEO readiness"',
        'label="Publishing"',
        'title="Website"',
        'title="Website connection"',
        'eyebrow="WedStudio · Publishing"',
        'title="Publishing workflow"',
    ]:
        assert token in dashboard, token

    assert 'Open WedNav overview' in layout
    assert "Private client delivery remains separate from WedStudio." in overviews
    assert "managed in WedStudio." in overviews

    # Existing editing routes remain unchanged and no schema transition is introduced.
    for route in [
        'path="weddings"',
        'path="gallery"',
        'path="locations"',
        'path="moments"',
        'path="custom-collections"',
        'path="venues"',
        'path="suppliers"',
        'path="assets"',
        'path="ai"',
        'path="seo"',
        'path="publishing"',
    ]:
        assert route in app, route

    assert not (ROOT / "d1/migrations/035_studio_foundation.sql").exists()

    print("PASS v1.9.9a Studio Foundation")
    print("  Website module renamed visibly to WedStudio: verified")
    print("  persisted Website module key and entitlement compatibility: verified")
    print("  Website and Publishing sections plus Studio alias route: verified")
    print("  existing content routes and module boundaries preserved: verified")
    print("  source-only release; schema remains 34: verified")


if __name__ == "__main__":
    main()
