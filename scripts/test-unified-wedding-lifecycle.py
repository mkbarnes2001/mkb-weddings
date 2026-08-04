#!/usr/bin/env python3
"""Source regression checks for v1.9.6a unified Wedding lifecycle."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def main() -> None:
    crm_api = read("functions/api/crm/[[path]].ts")
    portal = read("serverless/client-portal-d1.ts")
    galleries = read("serverless/client-gallery-d1.ts")
    wedding_workspace_api = read("serverless/wedding-workspace-d1.ts")
    api_service = read("src/admin/services/AdminApiService.ts")
    crm_types = read("src/admin/types/crm.ts")
    workspace_types = read("src/admin/types/weddingWorkspace.ts")
    job_page = read("src/admin/pages/CRMJob.tsx")
    wedding_workspace = read("src/admin/pages/WeddingWorkspace.tsx")
    weddings_page = read("src/admin/pages/Weddings.tsx")
    modules = read("src/admin/navigation/adminModules.ts")
    layout = read("src/admin/layouts/AdminLayout.tsx")
    dashboard = read("src/admin/pages/Dashboard.tsx")
    css = read("src/admin/admin-theme.css")

    # The CRM Job exposes a real lifecycle assembled from workspace-scoped records.
    assert "async function getJobWeddingLifecycle" in portal
    for token in [
        "asset_wedding_links",
        "wedding_preview_sets",
        "client_galleries",
        "story_images",
        "published_story_images",
        "asset_venue_links",
        "asset_moment_links",
        "asset_gallery_links",
    ]:
        assert token in portal, token
    assert "lifecycle," in portal
    assert "lifecycle: CrmWeddingLifecycle" in crm_types
    assert 'state: "not_started" | "draft" | "published" | "archived"' in crm_types

    # Job-led Client Gallery creation is idempotent, prefilled and imports canonical assets.
    assert "export async function createJobClientGallery" in portal
    assert 'parts[2] === "client-gallery"' in crm_api
    assert "AdminApiService.createCrmJobClientGallery(id)" in job_page
    assert "static async createCrmJobClientGallery" in api_service
    assert "listed.galleries.find" in portal
    assert "idempotent: true" in portal
    assert "clientEmail: text(primaryContact?.email)" in portal
    assert "importWeddingAssets: true" in portal
    assert "COALESCE(NULLIF(cover_asset_id, ''), NULLIF(?, ''))" in galleries
    assert '"client_gallery.created"' in portal

    # Generic Client Gallery links cannot cross workspace boundaries.
    assert "async function requireWeddingInWorkspace" in galleries
    assert "WHERE slug = ? AND workspace_id = ?" in galleries
    assert "await requireWeddingInWorkspace(db, workspaceId, weddingSlug);" in galleries
    assert "weddingSlug === text(existing.wedding_slug)" in galleries

    # The Job page is the operational origin and shows every downstream destination.
    assert 'title="Wedding delivery and content"' in job_page
    for label in [
        "Wedding Workspace",
        "Wedding assets",
        "Client Gallery",
        "Client portal",
        "Questionnaires",
        "Wedding Story",
        "Website galleries",
    ]:
        assert label in job_page, label
    assert "primaryClientGallery" in job_page
    assert "publicAssignments.total" in job_page
    assert 'href="#job-clients"' in job_page
    assert 'href="#job-questionnaires"' in job_page

    # Wedding Workspace links back to its CRM Job and remains the shared asset hub.
    assert "linkedJobRow" in wedding_workspace_api
    assert "job: linkedJobRow ?" in wedding_workspace_api
    assert "job:" in workspace_types
    assert "CRM Job ${workspace.job.reference}" in wedding_workspace
    assert "Open CRM Job" in wedding_workspace
    assert 'id="publishing-destinations"' in wedding_workspace
    assert "location.hash.slice(1)" in wedding_workspace

    # Website navigation is explicitly editorial; the operational workspace resolves to CRM.
    assert 'label: "Wedding stories"' in modules
    assert "isWeddingWorkspacePath" in modules
    assert 'pathname.startsWith("/admin/crm") || isWeddingWorkspacePath(pathname)' in modules
    assert 'currentSectionLabel = isWeddingWorkspacePath(location.pathname) ? "Wedding Workspace"' in layout
    assert 'title="Wedding Stories"' in weddings_page
    assert 'eyebrow="Website content"' in weddings_page
    assert "New booked weddings originate in CRM Jobs" in weddings_page
    assert "Add standalone story" in weddings_page
    assert 'title="Wedding stories"' in dashboard

    # Responsive UI only; schema remains 31.
    for selector in [
        ".crm-wedding-lifecycle-grid",
        ".crm-wedding-lifecycle-card",
        ".crm-wedding-lifecycle-card__icon",
    ]:
        assert selector in css, selector
    migrations = list((ROOT / "d1" / "migrations").glob("032*"))
    assert not migrations, "v1.9.6a must remain source-only unless schema 32 is explicitly reviewed"

    print("PASS v1.9.6a unified Wedding lifecycle")
    print("  CRM Job origin and Wedding Workspace lifecycle: verified")
    print("  idempotent Client Gallery creation and workspace isolation: verified")
    print("  private delivery, Website story and public-assignment flow: verified")
    print("  source-only release; schema remains 31: verified")


if __name__ == "__main__":
    main()
