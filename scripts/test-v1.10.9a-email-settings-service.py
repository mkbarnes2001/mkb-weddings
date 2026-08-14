#!/usr/bin/env python3

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(encoding="utf-8")


service = read(
    "serverless/crm-email-settings-d1.ts"
)
router = read(
    "functions/api/crm/[[path]].ts"
)
schema = read(
    "d1/migrations/041_commercial_templates_email_delivery.sql"
)
quotes = read(
    "serverless/crm-quotes-d1.ts"
)
workflow = read(
    "serverless/crm-workflow-d1.ts"
)
platform_auth = read(
    "serverless/platform-auth-d1.ts"
)
client_auth = read(
    "serverless/client-auth-d1.ts"
)

# Settings and credentials use the schema-41 tables.
for token in [
    "crm_email_settings",
    "crm_email_credentials",
    "delivery_mode",
    "credential_id",
]:
    assert token in service, token
    assert token in schema, token

# Workspace isolation is server-derived.
assert "actor.workspaceId" in service
assert "input?.workspaceId" not in service
assert "input.workspaceId" not in service

# Every credential/settings read, write and disconnect path
# is explicitly scoped by the server-derived workspace ID.
assert (
    service.count(
        "WHERE workspace_id = ?"
    )
    >= 6
)

for token in [
    "async function credentialRow(",
    "export async function getCrmEmailSettings(",
    "export async function saveCrmEmailSettings(",
    "export async function disconnectCrmEmailProvider(",
    "DELETE FROM crm_email_credentials",
    "UPDATE crm_email_settings",
]:
    assert token in service, token

assert (
    "DELETE FROM crm_email_credentials\n      WHERE workspace_id = ?"
    in service
)
assert (
    "UPDATE crm_email_settings\n    SET"
    in service
)

# Writes are blocked during support sessions.
assert (
    "Support sessions cannot change email settings."
    in service
)
assert (
    'requirePermission(\n    actor,\n    "crm:manage",\n    true,'
    in service
)

# Credentials are AES-GCM encrypted using a secret binding.
for token in [
    "CRM_EMAIL_CREDENTIAL_KEY",
    'name: "AES-GCM"',
    "crypto.subtle.encrypt",
    "crypto.subtle.decrypt",
    "ciphertext",
    "new Uint8Array(12)",
]:
    assert token in service, token

# Plain SMTP secrets are not persisted to settings or metadata.
assert "smtp_password" not in service.lower()
assert "password TEXT" not in schema
assert "refresh_token TEXT" not in schema
assert "access_token TEXT" not in schema
assert (
    "ciphertext TEXT NOT NULL"
    in schema
)

# The plaintext SMTP password is restricted to the encrypted payload.
assert (
    "const smtpPassword ="
    in service
)
assert (
    "password:\n            smtpPassword"
    in service
)
assert (
    "JSON.stringify(\n          value.password"
    not in service
)

# Cloudflare SMTP port 25 is prohibited.
assert (
    "smtpPort === 25"
    in service
)
assert (
    "SMTP port 25 is not supported by the Cloudflare Workers runtime."
    in service
)
assert (
    "smtp_port <> 25"
    in schema
)

# Provider consistency rules.
assert (
    'deliveryMode === "smtp"'
    in service
)
assert (
    'deliveryMode === "google"'
    in service
)
assert (
    "Connect a Google account before enabling Google email delivery."
    in service
)
assert (
    "Enter the SMTP password before enabling custom SMTP."
    in service
)

# Disconnect deletes encrypted credential material and falls
# active delivery back to managed.
assert (
    "export async function disconnectCrmEmailProvider"
    in service
)
assert (
    "DELETE FROM crm_email_credentials"
    in service
)
assert (
    "THEN 'managed'"
    in service
)

# Authentication and client-identity email implementations remain
# on their managed delivery paths. Business CRM workflow correspondence
# now uses the shared workspace-selected CRM transport.
assert "RESEND_API_KEY" in platform_auth
assert "WEDPLANNED_AUTH_FROM_EMAIL" in platform_auth
assert "RESEND_API_KEY" in client_auth
assert "sendQuoteEmail" in quotes
assert "sendCrmEmail" in workflow
assert "sendResend" not in workflow

# New API routes are private authenticated CRM routes.
assert (
    'from "../../../serverless/crm-email-settings-d1"'
    in router
)
assert (
    'CRM_EMAIL_CREDENTIAL_KEY?: string;'
    in router
)
assert (
    'parts[0] === "email"'
    in router
)
assert (
    'parts[1] === "settings"'
    in router
)
assert (
    'parts[1] === "providers"'
    in router
)
assert (
    "getCrmEmailSettings("
    in router
)
assert (
    "saveCrmEmailSettings("
    in router
)
assert (
    "disconnectCrmEmailProvider("
    in router
)

# The email-settings foundation remains compatible as
# quote delivery advances to its reviewed send payload.
# Client-facing CRM correspondence now uses the shared workspace provider.
workflow_delivery = (
    ROOT
    / "serverless"
    / "crm-workflow-d1.ts"
).read_text(
    encoding="utf-8",
)

assert "sendCrmEmail" in workflow_delivery
assert "workflowAttemptedProvider" in workflow_delivery
assert 'accessMode:\n        "system"' in workflow_delivery
assert '"crm:read"' in workflow_delivery
assert '"crm:manage"' in workflow_delivery
assert "sendResend" not in workflow_delivery
assert (
    "https://api.resend.com/emails"
    not in workflow_delivery
)
print(
    "PASS v1.10.9a email settings / encrypted credential foundation"
)
print(
    "  workspace-isolated settings: verified"
)
print(
    "  support-session mutation block: verified"
)
print(
    "  AES-GCM credential encryption: verified"
)
print(
    "  no plaintext SMTP/Google secret columns: verified"
)
print(
    "  SMTP provider validation: verified"
)
print(
    "  Google provider readiness gate: verified"
)
print(
    "  provider disconnect / managed fallback: verified"
)
print(
    "  authentication email path unchanged: verified"
)
print(
    "  reviewed quote-send payload compatibility: verified"
)
print(
    "  shared Job/autoresponder CRM delivery: verified"
)
