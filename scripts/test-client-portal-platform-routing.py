#!/usr/bin/env python3
"""Source regression checks for v1.9.4a hotfix1 shared client portal routing."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    tenant = (ROOT / "serverless/tenant-context.ts").read_text()
    settings = (ROOT / "src/admin/pages/ClientPortalSettings.tsx").read_text()
    portal = (ROOT / "src/components/ClientPortal.tsx").read_text()
    portal_service = (ROOT / "serverless/client-portal-d1.ts").read_text()
    quotes = (ROOT / "serverless/crm-quotes-d1.ts").read_text()

    assert 'DEFAULT_CLIENT_PORTAL_ORIGIN = "https://mkb-weddings.pages.dev"' in tenant
    assert "resolveClientPortalWorkspaceId" in tenant
    assert 'url.searchParams.get("workspace")' in tenant
    assert "lower(slug) = lower(?) OR id = ?" in tenant

    assert "AdminLinkButton" in settings
    assert 'url.searchParams.set("workspace", workspace.slug || workspace.id)' in settings
    assert 'target="_blank"' in settings
    assert "window.open" not in settings

    assert "function portalApiPath" in portal
    assert 'url.searchParams.set("workspace", workspace)' in portal
    assert 'portalApiPath("/api/public/client-portal")' in portal
    assert "href={portalApiPath(" in portal

    for route in (ROOT / "functions/api/public/client-portal").rglob("*.ts"):
        if route.name == "verify.ts":
            continue
        source = route.read_text()
        assert "resolveClientPortalWorkspaceId" in source, route
        assert "resolvePublicWorkspaceId" not in source, route

    assert "return DEFAULT_CLIENT_PORTAL_ORIGIN" in portal_service
    assert "new URLSearchParams({ workspace:" in portal_service
    assert "return DEFAULT_CLIENT_PORTAL_ORIGIN" in quotes
    assert "new URLSearchParams({ workspace:" in quotes

    print("PASS v1.9.4a hotfix1 shared client portal routing")
    print("  real external portal link: verified")
    print("  workspace slug carried through portal API calls: verified")
    print("  shared platform origin fallback: verified")
    print("  job and quote invitation return paths: verified")


if __name__ == "__main__":
    main()
