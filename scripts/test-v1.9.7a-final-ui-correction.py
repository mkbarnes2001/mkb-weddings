from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


layout = read("src/admin/layouts/AdminLayout.tsx")
suppliers = read("src/admin/pages/Suppliers.tsx")
theme = read("src/admin/admin-theme.css")

checks = {
    "desktop sidebar navigation can shrink and scroll": (
        'className="admin-module-navigation min-h-0 flex-1 overflow-y-auto p-3"' in layout
        and ".admin-module-navigation { min-height: 0;" in theme
    ),
    "Website navigation uses a compact two-column layout": (
        'data-layout={currentModule.key === "website" ? "grid" : "list"}' in layout
        and '.admin-module-navigation__items[data-layout="grid"]' in theme
    ),
    "platform administrator authority is visible in the session UI": (
        'auth.platformRole === "platform_admin"' in layout
        and layout.count("Platform administrator") >= 2
    ),
    "account and sign-out controls are visually distinct": (
        "admin-sidebar-account" in layout
        and "admin-sidebar-signout" in layout
        and ".admin-sidebar-account" in theme
        and ".admin-sidebar-signout" in theme
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
