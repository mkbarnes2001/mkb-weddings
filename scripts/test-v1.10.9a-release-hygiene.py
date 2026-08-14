#!/usr/bin/env python3
"""v1.10.9a final pre-regression release hygiene."""

from pathlib import Path
import re
import sqlite3


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8",
    )


schema = read(
    "d1/schema.sql"
)

provisioner = read(
    "serverless/platform-administration-d1.ts"
)

settings = read(
    "serverless/crm-email-settings-d1.ts"
)

quotes = read(
    "src/admin/pages/CRMQuotes.tsx"
)

templates = read(
    "src/admin/pages/CRMCommercialTemplates.tsx"
)


# Canonical schema.
con = sqlite3.connect(":memory:")
con.executescript(schema)

assert (
    con.execute(
        "SELECT value FROM schema_meta "
        "WHERE key='schema_version'"
    ).fetchone()[0]
    == "41"
)

assert not con.execute(
    "PRAGMA foreign_key_check"
).fetchall()


# Generic new-workspace commercial foundation.
foundation_start = provisioner.index(
    "async function provisionBusinessWorkspaceFoundation("
)

foundation_end = provisioner.index(
    "\nexport async function provisionBusinessWorkspace(",
    foundation_start,
)

foundation = provisioner[
    foundation_start:
    foundation_end
]

for token in [
    "starterQuoteTemplateId",
    "starterQuoteEmailTemplateId",
    "INSERT INTO crm_quote_templates",
    "INSERT INTO crm_email_templates",
    "INSERT INTO crm_email_settings",
    "'Starter Quote'",
    "'Quote ready'",
    "'Your wedding quote is ready'",
    "'quote'",
    "'managed'",
    "{{first_name}}",
    "{{quote_link}}",
    "await db.batch(statements)",
]:
    assert token in foundation, token

assert (
    "INSERT INTO crm_quote_template_packages"
    not in foundation
)

assert (
    "INSERT INTO crm_quote_template_addons"
    not in foundation
)

for forbidden in [
    "2025 Packages",
    "Wedding Quotes",
    "MKB Weddings",
    "Pre-wedding shoot",
    "Video-lite",
    "Video-pro",
]:
    assert forbidden not in foundation, forbidden


# Workspace switch cannot retain a template from the previous tenant.
assert (
    "activeTemplates.some((template) => template.id === current)"
    in quotes
)

assert (
    "current || activeTemplates.find"
    not in quotes
)


# Email settings GET is read-only and can hydrate defaults from null.
get_start = settings.index(
    "export async function getCrmEmailSettings("
)

audit_start = settings.index(
    "\nasync function audit(",
    get_start,
)

get_block = settings[
    get_start:
    audit_start
]

assert (
    "ensureSettings("
    not in get_block
)

assert (
    "Unable to initialise CRM email settings."
    not in get_block
)

assert (
    "return hydrateSettings("
    in get_block
)


# SAVE initialises legacy workspaces before UPDATE.
save_start = settings.index(
    "export async function saveCrmEmailSettings("
)

disconnect_start = settings.index(
    "export async function disconnectCrmEmailProvider(",
    save_start,
)

save_block = settings[
    save_start:
    disconnect_start
]

assert (
    "await ensureSettings("
    in save_block
)


# Bad delivery-mode input is rejected instead of silently becoming managed.
assert (
    "const deliveryModes = ["
    in save_block
)

assert (
    '"Choose managed, Google or SMTP email delivery."'
    in save_block
)

assert (
    "const deliveryMode =\n    deliveryModeInput;"
    in save_block
)

assert not re.search(
    r"const deliveryMode\s*="
    r".*?\?"
    r"\s*deliveryModeInput"
    r"\s*:\s*\"managed\"",
    save_block,
    re.DOTALL,
)


# Admin guidance uses the renderer-supported merge field.
assert (
    "Hi {{first_name}},"
    in templates
)

assert (
    "{{client_first_name}}"
    not in templates
)


print(
    "PASS v1.10.9a final pre-regression release hygiene"
)

print(
    "  generic starter quote template: verified"
)

print(
    "  generic starter quote email: verified"
)

print(
    "  managed email settings provisioned with workspace: verified"
)

print(
    "  no MKB-specific platform defaults: verified"
)

print(
    "  workspace-safe quote template selection: verified"
)

print(
    "  email-settings reads are side-effect free: verified"
)

print(
    "  legacy email settings initialise on write: verified"
)

print(
    "  invalid delivery mode rejection: verified"
)

print(
    "  supported quote email merge fields: verified"
)

print(
    "  schema remains 41: verified"
)
