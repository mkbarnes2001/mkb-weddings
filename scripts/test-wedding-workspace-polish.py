#!/usr/bin/env python3
"""Source regression checks for v1.9.7a final Admin refinement."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def main() -> None:
    workspace = read("src/admin/pages/WeddingWorkspace.tsx")
    suppliers = read("src/admin/pages/Suppliers.tsx")
    taxonomy = read("src/admin/data/supplierTaxonomy.ts")
    searchable = read("src/admin/components/ui/AdminSearchSelect.tsx")
    gallery = read("src/admin/pages/ClientGalleryEditor.tsx")
    platform_page = read("src/admin/pages/PlatformAdmin.tsx")
    platform_route = read("src/admin/app/AdminApp.tsx")
    platform_d1 = read("serverless/platform-foundation-d1.ts")
    workspace_d1 = read("serverless/workspace-d1.ts")
    api = read("src/admin/services/AdminApiService.ts")
    wedding_d1 = read("serverless/wedding-d1.ts")
    weddings_page = read("src/admin/pages/Weddings.tsx")
    public_repository = read("src/lib/weddingEngine/PublicWeddingRepository.ts")
    middleware = read("functions/_middleware.ts")
    sitemap = read("scripts/generate-sitemap.mjs")
    published_index = read("scripts/generate-published-wedding-index.mjs")
    css = read("src/admin/admin-theme.css")

    # Canonical defaults and searchable controlled lists remain available.
    for category in [
        "Photography", "Videography & Content", "Venue & Catering", "Floristry",
        "Hair & Beauty", "Attire", "Music & Entertainment", "Styling & Décor",
        "Ceremony", "Transport", "Other",
    ]:
        assert f'category: "{category}"' in taxonomy, category
    for token in [
        "export function normaliseSupplierTaxonomy",
        "export function configuredSupplierCategory",
        "export function configuredWeddingRole",
        "export function weddingRoleOptionsForCategory",
    ]:
        assert token in taxonomy, token
    for token in ['role="combobox"', 'role="listbox"', 'role="option"', 'const exact = options.find', 'onChange(option.value)']:
        assert token in searchable, token

    # Supplier taxonomy is global, stored in existing platform_categories, and editable only by platform admins.
    for token in [
        "supplierTaxonomy: PlatformSupplierTaxonomy",
        "savePlatformSupplierTaxonomy",
        'action: "saveSupplierTaxonomy"',
    ]:
        assert token in api or token in read("src/admin/types/platform.ts"), token
    for token in [
        "getPlatformSupplierTaxonomy",
        "DEFAULT_SUPPLIER_TAXONOMY",
        "group_name = 'Supplier taxonomy'",
        "group_name = 'Supplier role'",
        "savePlatformSupplierTaxonomy",
    ]:
        assert token in platform_d1, token
    assert "platform_supplier_categories" not in platform_d1
    assert "supplierCategories" not in workspace_d1
    assert "supplierRoles" not in workspace_d1
    assert 'auth.platformRole === "platform_admin"' in platform_route
    for token in [
        "Supplier taxonomy",
        "Save platform taxonomy",
        "Business workspaces may select these options but cannot add, rename, reorder or remove them.",
    ]:
        assert token in platform_page, token
    assert "Manage categories & roles" not in suppliers
    assert "AdminApiService.getWedPlannedPlatform()" in suppliers
    assert "Categories are controlled centrally by WedPlanned." in suppliers

    # Supplier list supports category filtering plus independent A-Z sorting.
    for token in [
        'const [categoryFilter, setCategoryFilter] = useState("all")',
        "All categories",
        "admin-supplier-category-select",
        "setCategoryFilter(category)",
        'changeSort("supplier")',
        'changeSort("category")',
        "admin-supplier-table--compact",
    ]:
        assert token in suppliers, token

    # Wedding Workspace reads the global taxonomy, not workspace-defined lists.
    for token in [
        "AdminApiService.getWedPlannedPlatform()",
        "nextPlatform.supplierTaxonomy?.categories",
        "nextPlatform.supplierTaxonomy?.roles",
        "configuredWeddingRole(supplierRole, supplierTaxonomy.roles)",
        "supplierCategorySearchOptions",
    ]:
        assert token in workspace, token
    assert "workspaceRecord?.settings.supplierCategories" not in workspace
    assert "workspaceRecord?.settings.supplierRoles" not in workspace
    assert "row.instagram ? cleanInstagram(row.instagram)" not in workspace

    # Client Gallery toolbar responds to the available content width, including browser zoom/sidebar constraints.
    for token in [
        "container-name: gallery-main",
        "container-type: inline-size",
        "@container gallery-main (max-width: 760px)",
        "@container gallery-main (max-width: 520px)",
        "client-gallery-photo-toolbar__select",
        "client-gallery-photo-toolbar__upload",
    ]:
        assert token in gallery, token

    # Future weddings remain excluded while ISO, month/year and season/year dates are handled consistently.
    for token in [
        "function weddingDateHasArrived",
        "const season = raw.match",
        "Date.parse(`1 ${raw}`)",
        "Website story records appear here only after the wedding date",
        "weddings.filter((wedding) => weddingDateHasArrived(wedding.weddingDate))",
    ]:
        assert token in weddings_page, token
    assert "AND date(wedding_date) <= date('now')" not in wedding_d1
    assert "date(wedding_date) <= date('now')" not in middleware
    assert "weddingDateHasArrived(text(document.weddingDate || row.wedding_date))" in wedding_d1
    assert "weddingDateHasArrived(document?.weddingDate)" in middleware
    assert "weddingDateHasArrived(wedding.weddingDate)" in public_repository
    assert "extractEligibleWeddingStorySlugs" in sitemap
    assert 'status: wedding.status !== "published" ? wedding.status || "draft" : "future"' in published_index

    # Existing platform tables provide global persistence; no schema transition is required.
    assert not (ROOT / "d1/migrations/032_wedding_workspace_polish.sql").exists(), "v1.9.7a remained source-only"

    for selector in [
        ".admin-supplier-table--compact",
        ".admin-supplier-category-select",
        ".supplier-taxonomy-manager",
        ".wedding-workspace-layout",
    ]:
        assert selector in css, selector

    print("PASS v1.9.7a final Admin refinement")
    print("  container-responsive Client Gallery toolbar: verified")
    print("  clickable Supplier category filtering and A-Z sorting: verified")
    print("  platform-admin-only global supplier taxonomy: verified")
    print("  future Wedding Stories excluded with format-aware Admin and public date checks: verified")
    print("  existing platform tables reused; schema remains 31: verified")


if __name__ == "__main__":
    main()
