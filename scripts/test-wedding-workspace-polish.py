#!/usr/bin/env python3
"""Source regression checks for v1.9.7a Wedding Workspace polish."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def main() -> None:
    workspace = read("src/admin/pages/WeddingWorkspace.tsx")
    suppliers = read("src/admin/pages/Suppliers.tsx")
    taxonomy = read("src/admin/data/supplierTaxonomy.ts")
    searchable = read("src/admin/components/ui/AdminSearchSelect.tsx")
    css = read("src/admin/admin-theme.css")

    # One shared controlled taxonomy prevents near-duplicate supplier labels.
    for category in [
        "Photography", "Videography & Content", "Venue & Catering", "Floristry",
        "Hair & Beauty", "Attire", "Music & Entertainment", "Styling & Décor",
        "Ceremony", "Transport", "Other",
    ]:
        assert f'category: "{category}"' in taxonomy, category
    for role in ["Photographer", "Videographer", "Florist", "Hair Stylist", "Makeup Artist", "Band", "DJ", "Celebrant", "Wedding Transport"]:
        assert f'"{role}"' in taxonomy, role
    assert 'hairdresser: "Hair & Beauty"' in taxonomy
    assert '"make-up": "Hair & Beauty"' in taxonomy
    assert 'hairdresser: "Hair Stylist"' in taxonomy
    assert 'export function canonicalSupplierCategory' in taxonomy
    assert 'export function canonicalWeddingRole' in taxonomy
    assert 'export function weddingRoleOptionsForCategory' in taxonomy

    # Searchable listboxes only commit a real option value.
    assert 'role="combobox"' in searchable
    assert 'role="listbox"' in searchable
    assert 'role="option"' in searchable
    assert 'const exact = options.find' in searchable
    assert 'onChange(option.value)' in searchable
    assert 'No matching options. Choose a value from the controlled list.' in searchable

    # Supplier repository and Wedding Workspace use the same canonical category source.
    assert 'SUPPLIER_CATEGORY_OPTIONS' in suppliers
    assert 'canonicalSupplierCategory(draft.category)' in suppliers
    assert 'Choose a canonical supplier category from the searchable list.' in suppliers
    assert '<AdminSearchSelect' in suppliers
    assert 'const CATEGORIES = [' not in suppliers

    # Wedding setup is visually compact and venue selection collapses after linking.
    for token in [
        'className="wedding-workspace-hero bg-black text-white"',
        'className="wedding-workspace-section-title"',
        'className="wedding-workspace-subpanel"',
        'showVenuePicker || !selectedVenue',
        'Change venue',
        'className="wedding-workspace-supplier-row"',
    ]:
        assert token in workspace, token
    assert 'text-4xl md:text-5xl' not in workspace

    # Existing suppliers and new suppliers both require canonical Wedding roles.
    assert 'canonicalWeddingRole(supplierRole)' in workspace
    assert 'canonicalSupplierCategory(newSupplier.category)' in workspace
    assert 'role: defaultWeddingRoleForCategory(category)' in workspace
    assert 'Choose a canonical Wedding role from the searchable list.' in workspace
    assert 'label="Add existing supplier"' in workspace
    assert 'label="Wedding role"' in workspace
    assert 'placeholder="Category (e.g. Florist)"' not in workspace
    assert 'placeholder="Wedding role"' not in workspace

    # Client delivery uses compact actions rather than the oversized upload treatment.
    assert 'Add preview JPEGs' in workspace
    assert 'className="admin-button admin-button--primary admin-button--sm cursor-pointer"' in workspace
    assert 'Choose full-res JPEGs' not in workspace
    assert 'className="wedding-workspace-gallery-summary"' in workspace

    # Responsive styles and searchable controls are included without schema changes.
    for selector in [
        ".admin-search-select__menu",
        ".wedding-workspace-hero__title",
        ".wedding-workspace-section-title",
        ".wedding-workspace-supplier-row",
        ".wedding-workspace-gallery-summary",
    ]:
        assert selector in css, selector
    migrations = list((ROOT / "d1" / "migrations").glob("032*")) if (ROOT / "d1" / "migrations").exists() else []
    assert not migrations, "v1.9.7a must remain source-only; schema stays 31"

    print("PASS v1.9.7a Wedding Workspace polish")
    print("  compact Wedding Workspace hierarchy and responsive cards: verified")
    print("  canonical searchable supplier categories and Wedding roles: verified")
    print("  compact Client Gallery preview upload controls: verified")
    print("  source-only release; schema remains 31: verified")


if __name__ == "__main__":
    main()
