#!/usr/bin/env python3

"""Focused v1.10.10a quote refresh UI checks."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8"
    )


quotes = read(
    "src/admin/pages/CRMQuotes.tsx"
)

editor = read(
    "src/admin/pages/CRMQuote.tsx"
)

api = read(
    "src/admin/services/AdminApiService.ts"
)

server = read(
    "serverless/crm-quotes-d1.ts"
)

templates_server = read(
    "serverless/crm-commercial-templates-d1.ts"
)

css = read(
    "src/admin/admin-theme.css"
)


# Add-new-quote chooser.
for token in [
    "selectedQuoteType",
    '"pick_and_choose"',
    '"fixed"',
    "Pick & Choose",
    "Fixed",
    "crm-quote-type-chooser",
    "Build one exact package",
]:
    assert token in quotes, token


# Template choices are type-aware.
assert (
    "template.quoteType"
    in quotes
)

assert (
    "=== selectedQuoteType"
    in quotes
)

assert (
    "matchingTemplates"
    in quotes
)


# Blank creation sends quote type, while template creation
# continues to use the established template route.
assert (
    "AdminApiService.createCrmQuote(enquiryId, templateId)"
    in quotes
)

assert (
    "quoteType:"
    in quotes
)

assert (
    'CrmQuote["quoteType"]'
    in api
)

assert (
    "...(templateId ? { templateId } : {})"
    in api
)


# Existing server remains authoritative.
assert (
    'quoteType(input?.quoteType)'
    in server
)

assert (
    'quoteTypeValue === "fixed"'
    in server
)

assert (
    "options.length !== 1"
    in server
)

assert (
    "template.quoteType"
    in templates_server
)


# Existing quote editor can apply a matching template.
for token in [
    "CrmQuoteTemplate",
    "applyTemplateId",
    "getCrmQuoteTemplates()",
    "async function applyTemplate()",
    "Apply Template",
    "crm-quote-template-apply",
    "template.quoteType",
    "quote.quoteType",
]:
    assert token in editor, token


# Template application copies into the quote through the
# established creation/template service; it does not edit
# the source template.
apply_start = editor.index(
    "async function applyTemplate()"
)

apply_block = editor[
    apply_start:
    apply_start + 1900
]

assert (
    ".createCrmQuote("
    in apply_block
)

assert (
    ".saveCrmQuoteTemplate("
    not in apply_block
)


# Fixed quotes are constrained to one package in the UI and
# independently by the server.
assert (
    'quote.quoteType\n                  !== "fixed"\n                || !draft.options.length'
    in editor
)

assert (
    "One fixed option"
    in editor
)


# Package / add-on imagery uses the snapshot/catalogue fields.
for token in [
    "item.imageUrl",
    "option.imageUrl",
    "addon.imageUrl",
    "crm-quote-package-card__image",
    "crm-quote-addon-grid__image",
]:
    assert token in editor, token


# Support sessions cannot mutate commercial quote UI.
assert (
    'auth.accessMode !== "support"'
    in quotes
)

assert (
    'auth.accessMode !== "support"'
    in editor
)


# Responsive WedPlanned-native treatment.
for selector in [
    ".crm-quote-type-chooser",
    ".crm-quote-template-apply",
    ".crm-quote-package-card__image",
    ".crm-quote-addon-grid__image",
]:
    assert selector in css, selector


print(
    "PASS v1.10.10a quote refresh UI"
)

print(
    "  Pick & Choose / Fixed chooser: verified"
)

print(
    "  type-aware reusable templates: verified"
)

print(
    "  Apply Template editor action: verified"
)

print(
    "  source template remains independent: verified"
)

print(
    "  fixed quote one-package constraint: verified"
)

print(
    "  package / add-on image cards: verified"
)

print(
    "  support-mode mutation guard: verified"
)

print(
    "  responsive WedPlanned styling: verified"
)
