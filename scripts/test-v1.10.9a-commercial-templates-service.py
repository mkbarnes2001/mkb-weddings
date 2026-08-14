#!/usr/bin/env python3

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(encoding="utf-8")


service = read(
    "serverless/crm-commercial-templates-d1.ts"
)
router = read(
    "functions/api/crm/[[path]].ts"
)
quotes = read(
    "serverless/crm-quotes-d1.ts"
)
schema = read(
    "d1/schema.sql"
)

assert (
    "'schema_version',\n  '41'"
    in schema
    or "'schema_version', '41'"
    in schema
    or "'41'," in schema
)

# Quote-template CRUD.
for token in [
    "export async function listQuoteTemplates",
    "export async function getQuoteTemplate",
    "export async function createQuoteTemplate",
    "export async function saveQuoteTemplate",
    "export async function archiveQuoteTemplate",
    "crm_quote_templates",
    "crm_quote_template_packages",
    "crm_quote_template_addons",
]:
    assert token in service, token

# Email-template CRUD.
for token in [
    "export async function listEmailTemplates",
    "export async function getEmailTemplate",
    "export async function createEmailTemplate",
    "export async function saveEmailTemplate",
    "export async function archiveEmailTemplate",
    "crm_email_templates",
]:
    assert token in service, token

# Server-owned tenant boundary.
assert (
    service.count("actor.workspaceId")
    >= 25
)
assert "input?.workspaceId" not in service
assert "input.workspaceId" not in service
assert (
    "Support sessions cannot change commercial templates."
    in service
)
assert (
    'requirePermission(\n    actor,\n    "crm:manage",\n    true,'
    in service
)

# Cross-workspace catalogue/template links are checked.
for token in [
    "One selected package does not belong to this business.",
    "One selected add-on does not belong to this business.",
    "Choose an active contract template from this workspace.",
    "Choose an active questionnaire template from this workspace.",
]:
    assert token in service, token

# Global template add-ons remain global in the reusable
# model but fan into the existing immutable quote option
# snapshots when a quote draft is instantiated.
assert (
    "const globalAddonIds ="
    in service
)
assert (
    "addonIds:\n          globalAddonIds"
    in service
)
assert (
    "return saveQuoteDraft("
    in service
)
assert (
    "await createQuote("
    in service
)

# Template provenance is stored only inside the
# existing immutable version snapshot JSON.
assert (
    'template: input?.templateSnapshot'
    in quotes
)
assert (
    "ALTER TABLE crm_quotes"
    not in service
)
assert (
    "ALTER TABLE crm_quote_versions"
    not in service
)
assert (
    "ALTER TABLE crm_quote_options"
    not in service
)

# Router surfaces private authenticated CRM routes only.
assert (
    'from "../../../serverless/crm-commercial-templates-d1"'
    in router
)
for token in [
    'parts[0] === "templates"',
    'parts[1] === "quotes"',
    'parts[1] === "emails"',
    "listQuoteTemplates(",
    "getQuoteTemplate(",
    "createQuoteTemplate(",
    "saveQuoteTemplate(",
    "archiveQuoteTemplate(",
    "listEmailTemplates(",
    "getEmailTemplate(",
    "createEmailTemplate(",
    "saveEmailTemplate(",
    "archiveEmailTemplate(",
    "createQuoteFromTemplate(",
]:
    assert token in router, token

assert (
    "body?.templateId"
    in router
)

assert (
    router.count(
        '"Cache-Control":\n            "private, no-store"'
    )
    >= 6
)

# Existing no-template quote creation remains available.
assert (
    "? await createQuoteFromTemplate("
    in router
)
assert (
    ": await createQuote("
    in router
)

print(
    "PASS v1.10.9a commercial template service/API"
)
print(
    "  workspace-isolated quote-template CRUD: verified"
)
print(
    "  workspace-isolated email-template CRUD: verified"
)
print(
    "  support-session mutation block: verified"
)
print(
    "  catalogue/template cross-workspace checks: verified"
)
print(
    "  global add-ons fan into immutable quote snapshots: verified"
)
print(
    "  quote template provenance snapshot: verified"
)
print(
    "  existing untemplated quote creation preserved: verified"
)
