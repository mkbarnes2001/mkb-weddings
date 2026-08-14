#!/usr/bin/env python3

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

types = (
    ROOT / "src/admin/types/crm.ts"
).read_text(encoding="utf-8")

api = (
    ROOT
    / "src/admin/services/AdminApiService.ts"
).read_text(encoding="utf-8")

for token in [
    "export type CrmQuoteTemplatePackageOverride",
    "export type CrmQuoteTemplatePackage",
    "export type CrmQuoteTemplateAddon",
    "export type CrmQuoteTemplate",
    "export type CrmQuoteTemplateInput",
    "export type CrmEmailTemplatePurpose",
    "export type CrmEmailTemplate",
    "export type CrmEmailTemplateInput",
]:
    assert token in types, token

for token in [
    'status: "draft" | "active" | "archived"',
    'discountType: "none" | "fixed" | "percentage"',
    'taxTreatment: "none" | "inclusive" | "exclusive"',
    "packages: CrmQuoteTemplatePackage[]",
    "addons: CrmQuoteTemplateAddon[]",
    '"autoresponder"',
]:
    assert token in types, token

for token in [
    "CrmQuoteTemplate",
    "CrmQuoteTemplateInput",
    "CrmEmailTemplate",
    "CrmEmailTemplateInput",
]:
    assert token in api, token

for method in [
    "getCrmQuoteTemplates",
    "getCrmQuoteTemplate",
    "createCrmQuoteTemplate",
    "saveCrmQuoteTemplate",
    "archiveCrmQuoteTemplate",
    "getCrmEmailTemplates",
    "getCrmEmailTemplate",
    "createCrmEmailTemplate",
    "saveCrmEmailTemplate",
    "archiveCrmEmailTemplate",
]:
    assert (
        f"static async {method}"
        in api
    ), method

for route in [
    '"/api/crm/templates/quotes"',
    '"/api/crm/templates/emails"',
    "/api/crm/templates/quotes/${encodeURIComponent(id)}",
    "/api/crm/templates/emails/${encodeURIComponent(id)}",
]:
    assert route in api, route

# Quote creation remains backwards compatible but can
# optionally apply a reusable template.
assert (
    "static async createCrmQuote("
    in api
)
assert 'templateId = ""' in api
assert (
    "? { templateId }"
    in api
)
assert (
    '"/api/crm/quotes"'
    in api
)

# Browser-facing methods never accept a workspace ID.
start = api.index(
    "static async getCrmQuoteTemplates"
)
end = api.index(
    "static async getCrmQuote(id:"
)

commercial_api = api[start:end]

assert "workspaceId" not in commercial_api

# All API writes remain explicit POST / PUT operations.
assert (
    commercial_api.count(
        'method: "POST"'
    )
    >= 5
)
assert (
    commercial_api.count(
        'method: "PUT"'
    )
    >= 2
)

print(
    "PASS v1.10.9a commercial templates admin API contract"
)
print(
    "  quote-template types: verified"
)
print(
    "  email-template types: verified"
)
print(
    "  quote-template API methods: verified"
)
print(
    "  email-template API methods: verified"
)
print(
    "  optional template quote creation: verified"
)
print(
    "  browser cannot choose workspace: verified"
)
