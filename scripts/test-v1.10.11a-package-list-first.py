#!/usr/bin/env python3
"""Focused v1.10.11a regression for list-first Packages."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8",
    )


page = read(
    "src/admin/pages/CRMCatalogue.tsx"
)

app = read(
    "src/admin/app/AdminApp.tsx"
)

nav = read(
    "src/admin/navigation/adminModules.ts"
)

css = read(
    "src/admin/admin-theme.css"
)

api = read(
    "src/admin/services/AdminApiService.ts"
)


assert (
    "export function CRMCatalogue()"
    in page
)

assert (
    'path="crm/catalogue"'
    in app
)

assert (
    'path="crm/catalogue/packages/:id"'
    in app
)

assert (
    'to: "/admin/crm/catalogue"'
    in nav
)

assert (
    'pathPrefix("/admin/crm/catalogue")'
    in nav
)


assert "useParams" in page
assert "useNavigate" in page
assert "packageRouteId" in page

assert (
    '`/admin/crm/catalogue/packages/${saved.id}`'
    in page
)


package_branch = page.index(
    '{view === "packages" ? ('
)

addon_branch = page.index(
    '{view === "addons" ?',
    package_branch,
)

landing = page[
    package_branch:
    addon_branch
]


assert (
    "crm-catalogue-list--links"
    in landing
)

assert (
    'to="/admin/crm/catalogue/packages/new"'
    in landing
)

assert (
    'to={`/admin/crm/catalogue/packages/${item.id}`}'
    in landing
)


for token in [
    '"Edit package"',
    ">Save package</AdminButton>",
    'label="Included items"',
    'label="Available selected add-ons"',
]:
    assert token not in landing, token


editor_start = page.index(
    "if (packageRouteId) {"
)

generic_return = page.index(
    "  return <AdminPage>",
    editor_start,
)

editor = page[
    editor_start:
    generic_return
]


for token in [
    '"Edit package"',
    '"New package"',
    ">Save package</AdminButton>",
    'label="Name"',
    'label="Internal code"',
    'label="Service type"',
    'label="Price"',
    'label="Currency"',
    'label="Coverage minutes"',
    'label="Included items"',
    'label="Deliverables"',
    'label="Available selected add-ons"',
    "savePackage",
]:
    assert token in editor, token


assert (
    "const creating ="
    in page
)

assert (
    "if (creating)"
    in page
)


addon_region = page[
    addon_branch:
]

# v1.10.11a D3 subsequently makes Add-ons list-first too.
for token in [
    'to="/admin/crm/catalogue/addons/new"',
    'to={`/admin/crm/catalogue/addons/${item.id}`}',
    "crm-catalogue-list--links",
    "addons.map",
]:
    assert token in addon_region, token

for token in [
    '"Edit add-on"',
    ">Save add-on</AdminButton>",
]:
    assert token not in addon_region, token


for method in [
    "getCrmQuoteCatalogue",
    "saveCrmPackage",
    "saveCrmAddon",
]:
    assert (
        f"static async {method}"
        in api
    ), method


marker = (
    "/* v1.10.11a — list-first Packages */"
)

assert marker in css

d2_css = css[
    css.index(marker):
]

for token in [
    ".crm-package-list-page",
    ".crm-catalogue-list--links > a",
    ".crm-package-editor-page",
    "@media (max-width: 760px)",
]:
    assert token in d2_css, token


print(
    "PASS v1.10.11a list-first Packages"
)
print(
    "  stable Package catalogue route: verified"
)
print(
    "  Packages list-only landing: verified"
)
print(
    "  dedicated new/edit Package route: verified"
)
print(
    "  existing Package editor retained: verified"
)
print(
    "  create canonicalisation: verified"
)
print(
    "  Add-ons list-first compatibility: verified"
)
print(
    "  catalogue API/data model unchanged: verified"
)
