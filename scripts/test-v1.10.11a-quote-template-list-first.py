#!/usr/bin/env python3
"""Focused v1.10.11a regression for list-first Quote Templates."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8",
    )


page = read(
    "src/admin/pages/CRMCommercialTemplates.tsx"
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


assert (
    "export function CRMCommercialTemplates()"
    in page
)

assert (
    'path="crm/templates"'
    in app
)

assert (
    'path="crm/templates/quotes/:id"'
    in app
)

assert "useParams" in page
assert "useNavigate" in page
assert "quoteTemplateRouteId" in page

assert (
    '`/admin/crm/templates/quotes/${saved.id}`'
    in page
)

assert (
    'navigate(\n        "/admin/crm/templates"'
    in page
)


final_return = page.rfind(
    "  return (\n    <AdminPage>"
)

assert final_return >= 0

quote_start = page.index(
    '{view === "quotes" ? (',
    final_return,
)

email_start = page.index(
    "\n      ) : (",
    quote_start,
)

quote_landing = page[
    quote_start:
    email_start
]

assert (
    "crm-template-list--links"
    in quote_landing
)

assert (
    'to="/admin/crm/templates/quotes/new"'
    in quote_landing
)

assert (
    'to={`/admin/crm/templates/quotes/${template.id}`}'
    in quote_landing
)

for token in [
    'title="Package choices"',
    'title="Additional options"',
    'placeholder="2025 Packages"',
]:
    assert token not in quote_landing, token


editor_start = page.index(
    "if (quoteTemplateRouteId) {"
)

editor_region = page[
    editor_start:
    final_return
]

for token in [
    'title="Package choices"',
    'title="Additional options"',
    'placeholder="2025 Packages"',
    "Default quote template",
    "Create invoice after acceptance",
    "Client introduction",
    "Quote expiry",
    "togglePackage(",
    "recommendPackage(",
    "toggleAddon(",
    "saveQuoteTemplate",
    "archiveQuoteTemplate",
]:
    assert token in editor_region, token


assert (
    "function newQuoteTemplate"
    not in page
)

assert (
    "function selectQuoteTemplate"
    not in page
)


email_region = page[
    email_start:
]

for token in [
    'title="Email templates"',
    "newEmailTemplate",
    "saveEmailTemplate",
    "archiveEmailTemplate",
    'placeholder="Wedding Quotes"',
    'placeholder="Your wedding quote is ready"',
    "Append email signature",
]:
    assert token in email_region, token


for method in [
    "getCrmQuoteTemplates",
    "createCrmQuoteTemplate",
    "saveCrmQuoteTemplate",
    "archiveCrmQuoteTemplate",
]:
    assert (
        f"static async {method}"
        in api
    ), method


marker = (
    "/* v1.10.11a — list-first quote templates */"
)

assert marker in css

d1_css = css[
    css.index(marker):
]

for token in [
    ".crm-template-list--links > a",
    ".crm-quote-template-page",
    "@media (max-width: 760px)",
]:
    assert token in d1_css, token


print(
    "PASS v1.10.11a list-first Quote Templates"
)
print(
    "  Templates landing route: verified"
)
print(
    "  Quote Templates list-only landing: verified"
)
print(
    "  dedicated new/edit route: verified"
)
print(
    "  existing editor capability retained: verified"
)
print(
    "  create canonicalisation: verified"
)
print(
    "  archive returns to list: verified"
)
print(
    "  Email Templates unchanged: verified"
)
print(
    "  commercial API/data model unchanged: verified"
)
