#!/usr/bin/env python3
"""Focused v1.10.11a regression for list-first Add-ons."""

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

css = read(
    "src/admin/admin-theme.css"
)

api = read(
    "src/admin/services/AdminApiService.ts"
)


# Separate list and editor routes.
assert (
    'path="crm/catalogue/addons"'
    in app
)

assert (
    'path="crm/catalogue/addons/:id"'
    in app
)

assert (
    'path="crm/catalogue/packages/:id"'
    in app
)


# Shared :id is safely disambiguated by pathname.
assert "useLocation" in page
assert "catalogueRouteId" in page
assert "packageRouteId" in page
assert "addonRouteId" in page

assert (
    '"/admin/crm/catalogue/packages/"'
    in page
)

assert (
    '"/admin/crm/catalogue/addons/"'
    in page
)


# Add-ons tab is now deep-linkable.
assert (
    'navigate(\n            "/admin/crm/catalogue/addons"'
    in page
)

assert (
    'pathname.startsWith(\n        "/admin/crm/catalogue/addons"'
    in page
)


# Add-on landing is list-only.
addon_branch = page.index(
    '{view === "addons" ? ('
)

addon_landing = page[
    addon_branch:
]

assert (
    "crm-addon-list-page"
    in addon_landing
)

assert (
    "crm-catalogue-list--links"
    in addon_landing
)

assert (
    'to="/admin/crm/catalogue/addons/new"'
    in addon_landing
)

assert (
    'to={`/admin/crm/catalogue/addons/${item.id}`}'
    in addon_landing
)


for token in [
    '"Edit add-on"',
    ">Save add-on</AdminButton>",
    'label="Minimum quantity"',
    'label="Maximum quantity"',
]:
    assert token not in addon_landing, token


# Dedicated routed Add-on editor keeps existing functionality.
editor_start = page.index(
    "if (addonRouteId) {"
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
    '"Edit add-on"',
    '"New add-on"',
    ">Save add-on</AdminButton>",
    'label="Name"',
    'label="Price"',
    'label="Currency"',
    'label="Service type"',
    'label="Availability"',
    'label="Requirement"',
    'label="State"',
    'label="Minimum quantity"',
    'label="Maximum quantity"',
    'label="Display order"',
    'label="Description"',
    "saveAddon",
]:
    assert token in editor, token


# New Add-on canonicalises to its real ID route.
assert (
    '`/admin/crm/catalogue/addons/${saved.id}`'
    in page
)

assert (
    "const creating ="
    in page
)


# Package list/editor D2 remains present.
assert (
    "if (packageRouteId) {"
    in page
)

assert (
    'to="/admin/crm/catalogue/packages/new"'
    in page
)

assert (
    'to={`/admin/crm/catalogue/packages/${item.id}`}'
    in page
)


# Existing catalogue API/data model remains unchanged.
for method in [
    "getCrmQuoteCatalogue",
    "saveCrmPackage",
    "saveCrmAddon",
]:
    assert (
        f"static async {method}"
        in api
    ), method


assert (
    'method: id ? "PUT" : "POST"'
    in api
)


marker = (
    "/* v1.10.11a — list-first Add-ons */"
)

assert marker in css

d3_css = css[
    css.index(marker):
]

for token in [
    ".crm-addon-list-page",
    ".crm-addon-editor-page",
    "@media (max-width: 760px)",
]:
    assert token in d3_css, token


print(
    "PASS v1.10.11a list-first Add-ons"
)
print(
    "  separate Add-ons list route: verified"
)
print(
    "  dedicated new/edit Add-on route: verified"
)
print(
    "  Package/Add-on :id routes disambiguated: verified"
)
print(
    "  existing Add-on editor retained: verified"
)
print(
    "  create canonicalisation: verified"
)
print(
    "  D2 Package flow preserved: verified"
)
print(
    "  catalogue API/data model unchanged: verified"
)
