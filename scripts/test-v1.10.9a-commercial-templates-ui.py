#!/usr/bin/env python3

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(encoding="utf-8")


page = read(
    "src/admin/pages/CRMCommercialTemplates.tsx"
)
app = read(
    "src/admin/app/AdminApp.tsx"
)
settings = read(
    "src/admin/navigation/adminSettings.ts"
)
quotes = read(
    "src/admin/pages/CRMQuotes.tsx"
)
enquiry = read(
    "src/admin/pages/CRMEnquiry.tsx"
)
api = read(
    "src/admin/services/AdminApiService.ts"
)
css = read(
    "src/admin/admin-theme.css"
)

# Templates belongs to WedCRM Settings, with separate quote and email pages.
assert (
    "export function CRMCommercialTemplates"
    in page
)
assert (
    'path="crm/templates"'
    in app
)
assert '<CRMTemplates />' in app
assert '<CRMCommercialTemplates templateType="quotes" />' in app
assert '<CRMCommercialTemplates templateType="emails" />' in app
assert 'to: "/admin/crm/templates"' in settings

# Quote and email template APIs are actually consumed.
# Normalise whitespace so multiline method chaining does
# not make this source-contract test formatting-sensitive.
page_compact = "".join(page.split())

for token in [
    "AdminApiService.getCrmQuoteTemplates()",
    "AdminApiService.getCrmEmailTemplates()",
    "AdminApiService.createCrmQuoteTemplate",
    "AdminApiService.saveCrmQuoteTemplate",
    "AdminApiService.createCrmEmailTemplate",
    "AdminApiService.saveCrmEmailTemplate",
]:
    assert token in page_compact, token

# Quote-template editor has packages and global add-ons
# as separate first-class sections.
assert 'title="Package choices"' in page
assert 'title="Additional options"' in page
assert (
    page.count(
        'title="Additional options"'
    )
    == 1
)
assert "togglePackage(" in page
assert "toggleAddon(" in page
assert "recommendPackage(" in page
# Guidance is removed; editable content and labelled choices remain.
for helper in [
    "They are not repeated beneath every package",
    "Configure reusable quote defaults",
    "Build reusable quote and email templates",
]:
    assert helper not in page, helper
assert 'aria-label={`Include ${item.name}`}' in page
assert 'aria-pressed={recommended}' in page

# Core Studio-Ninja-like functions are represented
# using the WedPlanned design system.
for token in [
    'placeholder="2025 Packages"',
    "Default quote template",
    "Create invoice after acceptance",
    "Client introduction",
    "Quote expiry",
    'placeholder="Wedding Quotes"',
    'placeholder="Your wedding quote is ready"',
    "Append email signature",
]:
    assert token in page, token

assert "admin-choice-row" in page
assert "AdminPanel" in page
assert "AdminPageHeader" in page
assert "AdminStatus" in page

# Quote creation now offers a reusable template.
assert (
    "AdminApiService.getCrmQuoteTemplates()"
    in quotes
)
assert (
    "setTemplateId"
    in quotes
)
assert (
    'label="Quote template"'
    in quotes
)
assert (
    "AdminApiService.createCrmQuote(enquiryId, templateId, quoteType)"
    in quotes
)
assert '<Navigate to="/admin/crm" replace />' in quotes
assert 'AdminApiService.getCrmEnquiry(enquiryId)' in quotes
assert 'template.status === "active" && template.quoteType === quoteType' in quotes

# Enquiry Create quote no longer bypasses template choice.
# Check the behaviour inside createQuote rather than requiring
# one historical whitespace/source formatting shape.
create_quote_start = enquiry.index(
    "function createQuote()"
)

create_quote = enquiry[
    create_quote_start:
    create_quote_start + 420
]

assert (
    "/admin/crm/quotes?enquiryId="
    in create_quote
)

assert (
    "encodeURIComponent(id)"
    in create_quote
)

assert (
    "AdminApiService.createCrmQuote"
    not in create_quote
)

# Admin API supports optional template selection.
assert (
    'templateId = ""'
    in api
)
assert (
    "? { templateId }"
    in api
)

# Native responsive visual treatment.
for token in [
    ".crm-template-type-switcher",
    ".crm-template-layout",
    ".crm-template-list",
    ".crm-template-package-grid",
    ".crm-template-addon-grid",
    ".crm-quote-create-grid",
    "var(--admin-module-accent",
    "var(--admin-module-record-background",
]:
    assert token in css, token

print(
    "PASS v1.10.9a commercial templates UI"
)
print(
    "  dedicated WedCRM Templates destination: verified"
)
print(
    "  quote-template package selector: verified"
)
print(
    "  global additional-options selector: verified"
)
print(
    "  reusable email-template editor: verified"
)
print(
    "  enquiry -> template-aware quote flow: verified"
)
print(
    "  default-template quote creation: verified"
)
print(
    "  WedPlanned-native responsive styling: verified"
)
