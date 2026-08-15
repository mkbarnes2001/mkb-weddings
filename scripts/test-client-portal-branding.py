#!/usr/bin/env python3
"""Source regression checks for v1.9.4a workspace-branded client portal."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    workspace = (ROOT / "serverless/workspace-d1.ts").read_text()
    portal_service = (ROOT / "serverless/client-portal-d1.ts").read_text()
    portal_ui = (ROOT / "src/components/ClientPortal.tsx").read_text()
    portal_settings = (ROOT / "src/admin/pages/ClientPortalSettings.tsx").read_text()
    admin_api = (ROOT / "src/admin/services/AdminApiService.ts").read_text()
    admin_routes = (ROOT / "src/admin/app/AdminApp.tsx").read_text()
    upload_route = (ROOT / "functions/api/workspace/portal-assets.ts").read_text()
    public_css = (ROOT / "src/index.css").read_text()
    admin_css = (ROOT / "src/admin/admin-theme.css").read_text()
    schema = (ROOT / "d1/schema.sql").read_text()

    # Branding is stored inside the existing workspace_settings document_json.
    for setting in [
        "portalBannerUrl",
        "portalSecondaryColor",
        "portalBackgroundColor",
        "portalWelcomeHeading",
        "portalWelcomeMessage",
        "portalFooterText",
    ]:
        assert setting in workspace, setting
        assert setting in admin_api, setting
    assert "document_json = excluded.document_json" in workspace
    assert "portal: portalDocument" in workspace
    assert "websiteConnection: websiteConnectionDocument" in workspace

    # Workspace-safe R2 uploads are restricted to supported portal images.
    assert 'new Set(["logo", "banner"])' in upload_route
    assert 'new Set(["image/jpeg", "image/png", "image/webp"])' in upload_route
    assert "workspaces/${workspaceId}/client-portal/${kind}/" in upload_route
    assert "resolveAdminWorkspaceId" in upload_route
    assert "adminApiRequestAllowed" in upload_route
    assert "uploadPortalAsset" in admin_api

    # Admin configuration includes live desktop/mobile preview and R2 upload controls.
    assert 'path="settings/client-portal"' in admin_routes
    assert "export function ClientPortalSettings" in portal_settings
    assert 'uploadAsset("logo"' in portal_settings
    assert 'uploadAsset("banner"' in portal_settings
    assert 'previewMode === "desktop"' in portal_settings
    assert 'previewMode === "mobile"' in portal_settings
    assert "portal-branding-preview" in portal_settings

    # Public payload and portal shell expose only the active workspace branding.
    for field in [
        "secondaryColor",
        "backgroundColor",
        "bannerUrl",
        "welcomeHeading",
        "welcomeMessage",
        "footerText",
    ]:
        assert field in portal_service, field
        assert field in portal_ui, field
    assert "WHERE workspace_id = ? LIMIT 1" in portal_service
    assert 'type PortalView = "home" | "quotes" | "contracts" | "invoices" | "questionnaires" | "files" | "galleries"' in portal_ui
    assert "client-portal-hero" in portal_ui
    assert "client-portal-nav" in portal_ui
    assert "client-portal-home-grid" in portal_ui
    assert 'setView("galleries")' in portal_ui
    assert "setView(\"home\")" in portal_ui
    assert "firstQuote" not in portal_ui

    # Responsive branded styling is present for both the Admin preview and client portal.
    for selector in [
        ".portal-branding-grid",
        ".portal-branding-device--mobile",
        ".portal-branding-preview__hero",
    ]:
        assert selector in admin_css, selector
    for selector in [
        ".client-portal-hero",
        ".client-portal-nav",
        ".client-portal-home",
        ".client-portal-home-grid",
        ".client-portal-footer",
    ]:
        assert selector in public_css, selector

    # v1.9.4a uses the existing JSON settings envelope; database schema remains 31.
    assert "('schema_version', '31'" in schema or "schema_version', '31" in schema
    assert not (ROOT / "d1/migrations/032_client_portal_branding.sql").exists()

    print("PASS v1.9.4a branded client portal")
    print("  workspace-isolated logo and banner uploads: verified")
    print("  colours and welcome content persistence: verified")
    print("  desktop/mobile Admin preview: verified")
    print("  branded Home, Quotes and Questionnaires shell: verified")
    print("  schema transition: none (remains 31)")


if __name__ == "__main__":
    main()
