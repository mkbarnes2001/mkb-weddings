#!/usr/bin/env python3
"""Source regression checks for v1.9.7a Admin and Wedding Workspace polish."""
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
    workspace_d1 = read("serverless/workspace-d1.ts")
    api = read("src/admin/services/AdminApiService.ts")
    wedding_d1 = read("serverless/wedding-d1.ts")
    css = read("src/admin/admin-theme.css")

    # Defaults remain available, but workspace settings now own the editable dropdown lists.
    for category in [
        "Photography", "Videography & Content", "Venue & Catering", "Floristry",
        "Hair & Beauty", "Attire", "Music & Entertainment", "Styling & Décor",
        "Ceremony", "Transport", "Other",
    ]:
        assert f'category: "{category}"' in taxonomy, category
    for token in [
        "export type SupplierTaxonomySettings",
        "export function normaliseSupplierTaxonomy",
        "export function configuredSupplierCategory",
        "export function configuredWeddingRole",
        "export function weddingRoleOptionsForCategory",
    ]:
        assert token in taxonomy, token
    assert 'hairdresser: "Hair & Beauty"' in taxonomy
    assert 'hairdresser: "Hair Stylist"' in taxonomy

    # Searchable listboxes only commit a real configured option value.
    for token in ['role="combobox"', 'role="listbox"', 'role="option"', 'const exact = options.find', 'onChange(option.value)']:
        assert token in searchable, token
    assert "No matching options. Choose a value from the controlled list." in searchable

    # Supplier master management exposes configurable categories and roles in existing workspace JSON.
    for token in [
        "supplierCategories: string[]",
        "supplierRoles: Array<{ name: string; category: string }>",
    ]:
        assert token in api, token
    for token in [
        "const taxonomy = supplierTaxonomy(document)",
        "supplierCategories: taxonomy.categories",
        "supplierRoles: taxonomy.roles",
        "nextDocument.supplierTaxonomy = taxonomyDocument",
    ]:
        assert token in workspace_d1, token
    assert "032_" not in workspace_d1

    for token in [
        "Manage categories & roles",
        "Save master lists",
        "Supplier categories & Wedding roles",
        "supplier-taxonomy-manager",
        'const [sortKey, setSortKey] = useState<SortKey>("supplier")',
        'changeSort("supplier")',
        'changeSort("category")',
        "admin-supplier-table--compact",
    ]:
        assert token in suppliers, token
    assert "configuredSupplierCategory(draft.category, categories)" in suppliers
    assert "SUPPLIER_CATEGORY_OPTIONS" in suppliers
    assert "const CATEGORIES = [" not in suppliers

    # Wedding Workspace consumes the workspace-managed taxonomy and retains controlled values.
    for token in [
        "workspaceRecord?.settings.supplierCategories",
        "workspaceRecord?.settings.supplierRoles",
        "normaliseSupplierTaxonomy",
        "configuredWeddingRole(supplierRole, supplierTaxonomy.roles)",
        "supplierCategorySearchOptions",
        'label="Add existing supplier"',
        'label="Wedding role"',
    ]:
        assert token in workspace, token
    assert "Choose a canonical Wedding role from the searchable list." in workspace
    assert "row.instagram ? cleanInstagram(row.instagram)" not in workspace
    assert 'row.category || "Uncategorised"' in workspace
    assert "wedding-workspace-venue-actions" in workspace
    assert "wedding-workspace-caption" in workspace
    assert ">At a glance<" not in workspace

    # Wedding supplier payload now carries the Supplier Master category for concise rows.
    assert "category?: string;" in read("src/admin/services/SupplierService.ts")
    assert "category: text(row.category)" in wedding_d1

    # Client delivery and Client Gallery Admin remain compact across intermediate breakpoints.
    assert "Add preview JPEGs" in workspace
    assert "Choose full-res JPEGs" not in workspace
    for token in [
        "client-gallery-sidebar-overview > :last-child",
        "grid-template-columns: minmax(220px, 290px) minmax(0, 1fr)",
        "client-gallery-photo-toolbar__search",
        "client-gallery-photo-toolbar__upload",
        "@media (max-width: 760px)",
    ]:
        assert token in gallery, token

    # Final compact styles cover supplier rows, status chips, card gaps and master lists.
    for selector in [
        ".admin-supplier-table--compact",
        ".supplier-taxonomy-manager",
        ".supplier-taxonomy-row--role",
        ".wedding-workspace-layout",
        ".wedding-workspace-steps",
        ".wedding-workspace-venue-actions",
        ".wedding-workspace-caption",
    ]:
        assert selector in css, selector

    migrations = list((ROOT / "d1" / "migrations").glob("032*")) if (ROOT / "d1" / "migrations").exists() else []
    assert not migrations, "v1.9.7a refinement must remain schema 31"

    print("PASS v1.9.7a Admin and Wedding Workspace polish")
    print("  workspace-configurable supplier categories and Wedding roles: verified")
    print("  compact sortable Supplier master list: verified")
    print("  responsive Client Gallery Admin breakpoints: verified")
    print("  final Wedding Workspace spacing and content refinements: verified")
    print("  source-only persistence in workspace settings; schema remains 31: verified")


if __name__ == "__main__":
    main()
