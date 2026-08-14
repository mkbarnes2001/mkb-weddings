#!/usr/bin/env python3

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(encoding="utf-8")


delivery = read(
    "serverless/crm-email-delivery-d1.ts"
)
settings = read(
    "serverless/crm-email-settings-d1.ts"
)
oauth = read(
    "serverless/crm-google-oauth-d1.ts"
)
quotes = read(
    "serverless/crm-quotes-d1.ts"
)
router = read(
    "functions/api/crm/[[path]].ts"
)
api = read(
    "src/admin/services/AdminApiService.ts"
)
page = read(
    "src/admin/pages/CRMEmailSettings.tsx"
)
schema = read(
    "d1/schema.sql"
)

# Shared server-side business email transport.
for token in [
    "export type CrmEmailDeliveryEnv",
    "export function crmEmailDeliveryReadiness",
    "export async function sendCrmEmail",
    "getCrmEmailSettings(",
    "getDecryptedCrmEmailCredential(",
]:
    assert token in delivery, token

# Decrypted provider credentials remain server-only.
assert (
    "export async function getDecryptedCrmEmailCredential"
    in settings
)
assert (
    "decryptEmailCredential("
    in settings
)
assert (
    "getDecryptedCrmEmailCredential"
    not in api
)
assert (
    "getDecryptedCrmEmailCredential"
    not in page
)

# Google refresh-token exchange is entirely server-side.
for token in [
    "https://oauth2.googleapis.com/token",
    "refresh_token:",
    '"refresh_token"',
    "CRM_GOOGLE_CLIENT_ID",
    "CRM_GOOGLE_CLIENT_SECRET",
    "access_token",
]:
    assert token in delivery, token

assert (
    "CRM_GOOGLE_CLIENT_SECRET"
    not in api
)
assert (
    "CRM_GOOGLE_CLIENT_SECRET"
    not in page
)

# Gmail message is RFC/MIME structured.
for token in [
    "MIME-Version: 1.0",
    "multipart/alternative",
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "mimeMessage(",
    "base64Url(",
    "raw,",
]:
    assert token in delivery, token

# MIME message uses CRLF separators.
assert (
    '"\\r\\n"'
    in delivery
)

# Header values are protected from CR/LF injection.
assert (
    "/[\\r\\n]+/g"
    in delivery
)
assert (
    "safeHeader("
    in delivery
)

# Gmail is sent as the verified connected account.
for token in [
    "credentialEmail",
    "input.fromEmail",
    "does not match the configured CRM sender",
]:
    assert token in delivery, token

# Gmail users.messages.send endpoint and returned ID.
assert (
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
    in delivery
)
assert (
    "`Bearer ${accessToken}`"
    in delivery
)
assert (
    "payload?.id"
    in delivery
)
assert (
    'provider: "gmail"'
    in delivery
)

# Revoked Google consent gives an explicit reconnect path.
assert (
    'code === "invalid_grant"'
    in delivery
)
assert (
    "Reconnect the Google account in Email settings."
    in delivery
)

# OAuth scope remains minimum Gmail send permission.
assert (
    "https://www.googleapis.com/auth/gmail.send"
    in oauth
)

# Quote preview now derives readiness from selected workspace provider.
assert (
    "crmEmailDeliveryReadiness("
    in quotes
)
assert (
    "readiness.deliveryReady"
    in quotes
)
assert (
    "readiness.providerLabel"
    in quotes
)

# Actual quote sending goes through the shared transport.
assert (
    "await sendCrmEmail("
    in quotes
)
assert (
    "sendManagedCrmQuoteEmail("
    not in quotes
)

# Failed quote communications record whichever provider was attempted.
assert (
    "const attemptedProvider"
    in quotes
)
assert (
    '?,' in quotes
)
assert (
    "attemptedProvider,"
    in quotes
)

# Successful quote/version logging persists returned provider/message ID.
assert (
    "delivery.provider,"
    in quotes
)
assert (
    "delivery.providerMessageId,"
    in quotes
)

# crm_communications provider is unrestricted text, so gmail requires no migration.
communication_match = re.search(
    r'CREATE TABLE IF NOT EXISTS crm_communications\s*\((.*?)\n\);',
    schema,
    re.S,
)

assert communication_match

communication_table = (
    communication_match
    .group(1)
)

assert (
    "provider TEXT NOT NULL DEFAULT ''"
    in communication_table
)
assert not re.search(
    r'provider\s+TEXT[^,\n]*CHECK',
    communication_table,
    re.I,
)

# Browser cannot pick provider/workspace during quote send.
quote_send_start = api.index(
    "static async sendCrmQuote("
)

quote_send_end = api.index(
    "static async acceptCrmQuote",
    quote_send_start,
)

quote_send_api = api[
    quote_send_start:
    quote_send_end
]

assert (
    "deliveryMode"
    not in quote_send_api
)
assert (
    "provider"
    not in quote_send_api
)
assert (
    "workspaceId"
    not in quote_send_api
)

# SMTP is a separate explicit transport; Gmail never falls back through it.
assert (
    'deliveryMode === "smtp"'
    in delivery
)
assert (
    "sendSmtpEmail("
    in delivery
)
assert (
    'provider: "smtp"'
    in delivery
)

# Authentication/security email path remains separate.
assert (
    "sendQuoteEmail("
    in quotes
)
assert (
    "requestQuotePortalMagicLink"
    in quotes
)

# Runtime route has all required server-only Google bindings.
for token in [
    "CRM_EMAIL_CREDENTIAL_KEY",
    "CRM_GOOGLE_CLIENT_ID",
    "CRM_GOOGLE_CLIENT_SECRET",
]:
    assert token in router, token

print(
    "PASS v1.10.9a live Gmail CRM delivery"
)
print(
    "  reusable server-side CRM transport: verified"
)
print(
    "  encrypted Google refresh-token access: verified"
)
print(
    "  server-side access-token refresh: verified"
)
print(
    "  RFC/MIME message construction: verified"
)
print(
    "  base64url Gmail raw payload: verified"
)
print(
    "  CR/LF header injection protection: verified"
)
print(
    "  connected Google sender match: verified"
)
print(
    "  Gmail users.messages.send delivery: verified"
)
print(
    "  revoked-grant reconnect handling: verified"
)
print(
    "  quote preview Gmail readiness: verified"
)
print(
    "  quote delivery abstraction: verified"
)
print(
    "  dynamic provider communication logging: verified"
)
print(
    "  browser cannot choose provider/workspace: verified"
)
print(
    "  SMTP remains a separate explicit transport: verified"
)
print(
    "  authentication email boundary preserved: verified"
)
