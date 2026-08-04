from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


layout = read("src/admin/layouts/AdminLayout.tsx")
suppliers = read("src/admin/pages/Suppliers.tsx")
theme = read("src/admin/admin-theme.css")

checks = {
    "desktop sidebar keeps a stable width and navigation scrolls": (
        'className="admin-module-navigation min-h-0 flex-1 overflow-y-auto p-3"' in layout
        and ".admin-module-navigation {" in theme
        and "width: 244px;" in theme
        and "min-width: 244px;" in theme
        and "overflow-y: auto !important;" in theme
    ),
    "CRM and Website navigation use a compact two-column layout": (
        'data-layout={!isPlatformRoute && (currentModule.key === "website" || currentModule.key === "crm") ? "grid" : "list"}' in layout
        and '.admin-module-navigation__items[data-layout="grid"]' in theme
    ),
    "platform administrator authority is visible in the session UI": (
        'const isPlatformAdmin = auth.platformRole === "platform_admin";' in layout
        and '? "Platform administrator"' in layout
        and "admin-sidebar-control-card__user" in layout
    ),
    "unified workspace control and icon sign-out are visually distinct": (
        "admin-sidebar-control-card" in layout
        and "admin-sidebar-control-card__user" in layout
        and "admin-sidebar-signout" in layout
        and 'title="Sign out" aria-label="Sign out"><LogOut /></button>' in layout
        and ".admin-sidebar-control-card {" in theme
        and ".admin-sidebar-signout {" in theme
        and "admin-sidebar-account" not in layout
    ),
    "Supplier categories use a single selection list": (
        'aria-label="Filter suppliers by category"' in suppliers
        and "admin-supplier-category-select" in suppliers
        and "admin-supplier-category-filter" not in suppliers
    ),
}

failed = [label for label, passed in checks.items() if not passed]
if failed:
    raise SystemExit("FAIL v1.9.7a final UI correction\n  " + "\n  ".join(failed))

print("PASS v1.9.7a final UI correction")
for label in checks:
    print(f"  {label}: verified")
