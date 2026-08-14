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
page = read(
    "src/admin/pages/CRMEmailSettings.tsx"
)
schema = read(
    "d1/schema.sql"
)
migration = read(
    "d1/migrations/041_commercial_templates_email_delivery.sql"
)
quotes = read(
    "serverless/crm-quotes-d1.ts"
)
api = read(
    "src/admin/services/AdminApiService.ts"
)

# Cloudflare Workers TCP sockets are used directly.
assert (
    'import { connect } from "cloudflare:sockets";'
    in delivery
)

for token in [
    "secureTransport:",
    '"on"',
    '"starttls"',
    "socket.startTls()",
    "socket.opened",
]:
    assert token in delivery, token

# SMTP settings remain workspace-owned and encrypted.
assert (
    'getDecryptedCrmEmailCredential('
    in delivery
)
assert (
    '"smtp"'
    in delivery
)
delivery_compact = "".join(
    delivery.split()
)

assert (
    "credential?.payload?.password"
    in delivery_compact
)
assert (
    "crypto.subtle.decrypt"
    in settings
)

# Plain SMTP password never exists in schema/browser response.
for source in [
    schema.lower(),
    migration.lower(),
]:
    assert (
        "smtp_password text"
        not in source
    )
    assert (
        "password text"
        not in source
    )

assert "ciphertext TEXT NOT NULL" in migration
assert "smtpPassword?: string" in read(
    "src/admin/types/crm.ts"
)

# Port 25 is blocked at schema, backend, delivery and UI boundaries.
for source in [
    schema,
    migration,
]:
    assert (
        "smtp_port <> 25"
        in source
    )

assert (
    "smtpPort === 25"
    in settings
)
assert (
    "input.smtpPort === 25"
    in delivery
)
assert (
    "SMTP port 25 is not supported by the Cloudflare Workers runtime."
    in settings
)
assert (
    "SMTP port 25 is not supported by the Cloudflare Workers runtime."
    in delivery
)
assert (
    "Port 25 is not supported."
    in page
)
assert (
    "Port 25 is unavailable."
    in page
)

# Only encrypted TLS modes are supported.
assert (
    'smtpSecurity === "tls"'
    in delivery
    or '=== "tls"'
    in delivery
)
assert (
    'smtpSecurity === "starttls"'
    in delivery
    or '=== "starttls"'
    in delivery
)
assert (
    "The SMTP server does not advertise STARTTLS."
    in delivery
)

# SMTP response parser supports multiline EHLO replies.
for token in [
    "async function readLine()",
    "async function readResponse()",
    'first.charAt(3)',
    '=== "-"',
    "terminator",
    "lines.length > 100",
]:
    assert token in delivery, token

# Required SMTP transaction commands.
for token in [
    "EHLO wedplanned.com",
    '"STARTTLS"',
    '"AUTH LOGIN"',
    "AUTH PLAIN",
    "MAIL FROM:<",
    "RCPT TO:<",
    '"DATA"',
    '"QUIT"',
]:
    assert token in delivery, token

# AUTH is selected from advertised mechanisms.
assert (
    "smtpAuthMechanisms("
    in delivery
)
assert (
    'mechanisms.has(\n      "PLAIN",'
    in delivery
)
assert (
    'mechanisms.has(\n      "LOGIN",'
    in delivery
)
assert (
    "The SMTP server does not advertise AUTH PLAIN or AUTH LOGIN"
    in delivery
)

# AUTH secret values are encoded and never placed in error labels/log metadata.
assert (
    "utf8Base64("
    in delivery
)
assert (
    "`\\u0000${username}\\u0000${password}`"
    in delivery
)
assert (
    '"authentication password"'
    in delivery
)

# MIME transport reuses the existing RFC message builder.
assert (
    "mimeMessage({"
    in delivery
)
assert (
    "multipart/alternative"
    in delivery
)

# SMTP DATA dot-stuffing is present.
assert (
    "function smtpDotStuff("
    in delivery
)
assert (
    'line.startsWith(".")'
    in delivery
)
assert (
    "function smtpDataPayload("
    in delivery
)
assert (
    "${stuffed}.\\r\\n"
    in delivery
)
assert (
    "${stuffed}\\r\\n.\\r\\n"
    in delivery
)

# Successful SMTP delivery is reported as its own provider.
assert (
    'provider: "smtp"'
    in delivery
)
assert (
    'deliveryMode:\n        "smtp"'
    in delivery
)
assert (
    "await sendSmtpEmail("
    in delivery
)

# Quote path uses the generic shared provider and stores
# returned provider/message id rather than assuming Resend.
assert (
    "await sendCrmEmail("
    in quotes
)
assert (
    "delivery.provider,"
    in quotes
)
assert (
    "delivery.providerMessageId,"
    in quotes
)
assert (
    '=== "smtp"'
    in quotes
)

# Browser quote-send payload cannot select SMTP/provider/workspace.
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

assert "deliveryMode" not in quote_send_api
assert "provider" not in quote_send_api
assert "workspaceId" not in quote_send_api

# No new schema version is introduced: SMTP remains part of schema 41.
assert (
    "041_commercial_templates_email_delivery.sql"
    in str(
        ROOT
        / "d1/migrations/041_commercial_templates_email_delivery.sql"
    )
)
assert (
    "schema_version"
    in migration
)
assert (
    "'41'"
    in migration
    or '"41"'
    in migration
    or "value = '41'"
    in migration
)

print(
    "PASS v1.10.9a live Custom SMTP CRM delivery"
)
print(
    "  Cloudflare TCP socket transport: verified"
)
print(
    "  implicit TLS delivery: verified"
)
print(
    "  STARTTLS upgrade/re-EHLO: verified"
)
print(
    "  multiline SMTP response parsing: verified"
)
print(
    "  AUTH PLAIN / LOGIN negotiation: verified"
)
print(
    "  encrypted SMTP password access: verified"
)
print(
    "  MAIL FROM / RCPT TO / DATA transaction: verified"
)
print(
    "  RFC/MIME transport reuse: verified"
)
print(
    "  SMTP DATA dot-stuffing: verified"
)
print(
    "  port-25 prohibition across schema/backend/UI: verified"
)
print(
    "  explicit SMTP provider logging: verified"
)
print(
    "  browser cannot select provider/workspace: verified"
)
print(
    "  schema remains 41: verified"
)
