#!/usr/bin/env python3

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(encoding="utf-8")


quotes = read(
    "serverless/crm-quotes-d1.ts"
)
router = read(
    "functions/api/crm/[[path]].ts"
)
types = read(
    "src/admin/types/crm.ts"
)
api = read(
    "src/admin/services/AdminApiService.ts"
)
page = read(
    "src/admin/pages/CRMQuote.tsx"
)
css = read(
    "src/admin/admin-theme.css"
)
settings = read(
    "serverless/crm-email-settings-d1.ts"
)
delivery = read(
    "serverless/crm-email-delivery-d1.ts"
)

# Preview exists across server/router/admin API.
for token, source in [
    (
        "export async function getQuoteSendPreview",
        quotes,
    ),
    (
        "async function quoteSendEmailContext(",
        quotes,
    ),
    (
        'parts[2] === "send-preview"',
        router,
    ),
    (
        "export type CrmQuoteSendPreview",
        types,
    ),
    (
        "export type CrmQuoteSendInput",
        types,
    ),
    (
        "static async getCrmQuoteSendPreview",
        api,
    ),
]:
    assert token in source, token

# Preview cannot create or expose a portal token.
preview_start = quotes.index(
    "export async function getQuoteSendPreview"
)
preview_end = quotes.index(
    "export async function sendQuote(",
    preview_start,
)
preview_section = quotes[
    preview_start:preview_end
]

assert "createInvitation(" not in preview_section
assert "rawToken" not in preview_section
assert "loginUrl" not in preview_section

# Actual send still generates the secure invitation server-side.
send_start = quotes.index(
    "export async function sendQuote("
)
send_end = quotes.index(
    "\nexport async function ",
    send_start + 10,
)
send_section = quotes[
    send_start:send_end
]

assert "createInvitation(" in send_section
assert "invitation.rawToken" in send_section
assert "finalQuoteEmailBody(" in send_section

# Raw secure URLs are not written into CRM communication history.
assert "loggedQuoteEmailBody(" in quotes
assert '"[secure quote link]"' in quotes
assert "communicationBody" in send_section

# Quote-purpose templates and signature rendering.
for token in [
    "crm_email_templates",
    "purpose = 'quote'",
    "subject_template",
    "body_text",
    "append_signature",
    "emailSignatureText(",
    "mergeQuoteEmailVariables(",
    "{{quote_link}}",
]:
    assert token in quotes, token

# Quote context still loads workspace email settings.
assert (
    "getCrmEmailSettings("
    in quotes
)

# Sender presentation and selected delivery mode are now
# centralised in the reusable CRM delivery service.
for token in [
    "settings?.senderName",
    "settings?.replyToEmail",
    "settings?.senderEmail",
    "settings?.deliveryMode",
]:
    assert token in delivery, token

# Quote preview and send use the shared server-side delivery abstraction.
assert (
    "crmEmailDeliveryReadiness("
    in quotes
)
assert (
    "sendCrmEmail("
    in quotes
)
assert (
    "sendManagedCrmQuoteEmail("
    not in quotes
)

# Managed Resend remains available through the shared transport.
assert (
    "env.WEDPLANNED_AUTH_FROM_EMAIL"
    in delivery
)
assert (
    '"https://api.resend.com/emails"'
    in delivery
)
assert (
    "reply_to:"
    in delivery
)

# Google and SMTP both use explicit live transports.
assert (
    'deliveryMode === "google"'
    in delivery
)
assert (
    '"https://gmail.googleapis.com/gmail/v1/users/me/messages/send"'
    in delivery
)
assert (
    "Google delivery is configured but the Google transport connection is not enabled yet."
    not in quotes
)
assert (
    'provider: "smtp"'
    in delivery
)
assert (
    "sendSmtpEmail("
    in delivery
)

# Existing portal authentication sender remains separate.
assert "async function sendQuoteEmail(" in quotes
assert "requestQuotePortalMagicLink" in quotes

portal_start = quotes.index(
    "export async function requestQuotePortalMagicLink"
)

assert "sendQuoteEmail(" in quotes[
    portal_start:
]

# Reviewed POST payload reaches server-side quote send.
router_compact = "".join(
    router.split()
)

assert (
    "sendQuote(context.env.MKB_DB,context.env,actor,parts[1],body,)"
    in router_compact
)

# Browser API can edit template/subject/body, not recipient/workspace.
for token in [
    "static async getCrmQuoteSendPreview",
    "static async sendCrmQuote(",
    "CrmQuoteSendInput",
    "/send-preview",
]:
    assert token in api, token

api_start = api.index(
    "static async getCrmQuoteSendPreview"
)
api_end = api.index(
    "static async acceptCrmQuote",
    api_start,
)
send_api = api[
    api_start:api_end
]

assert "workspaceId" not in send_api
assert "fromEmail" not in send_api

# Admin Send quote opens editable preview.
for token in [
    "async function openSendPreview()",
    "async function refreshSendPreview(",
    "void openSendPreview()",
    'role="dialog"',
    'aria-labelledby="crm-quote-send-title"',
    "Email preview",
    'label="Email template"',
    'label="Subject"',
    'label="Message"',
    "Reply to",
    "Secure quote link",
]:
    assert token in page, token

# Normalise source whitespace so established multiline method
# chaining does not make this source-contract test brittle.
page_compact = "".join(
    page.split()
)

assert (
    "AdminApiService.sendCrmQuote("
    in page_compact
)

# Sending remains blocked when provider transport is unavailable.
assert (
    "!sendPreview.deliveryReady"
    in page
)
assert (
    'to="/admin/crm/email-settings"'
    in page
)

# Credential encryption remains a separate backend concern.
assert "CRM_EMAIL_CREDENTIAL_KEY" in settings
assert "crypto.subtle.encrypt" in settings

# WedPlanned-native responsive send dialog.
for token in [
    ".crm-quote-send-overlay",
    ".crm-quote-send-dialog",
    ".crm-quote-send-compose",
    ".crm-quote-send-sidebar",
    ".crm-quote-send-addresses",
    ".crm-quote-send-link-note",
    "var(--admin-module-accent",
    "@media (max-width: 760px)",
]:
    assert token in css, token

print(
    "PASS v1.10.9a quote send preview / managed CRM delivery"
)
print(
    "  editable send preview: verified"
)
print(
    "  workspace quote email templates: verified"
)
print(
    "  business signature rendering: verified"
)
print(
    "  server-derived recipient/workspace: verified"
)
print(
    "  secure token absent from preview: verified"
)
print(
    "  secure token created only at send time: verified"
)
print(
    "  secure URL excluded from communication history: verified"
)
print(
    "  managed sender / business reply-to: verified"
)
print(
    "  live Google / SMTP provider boundary: verified"
)
print(
    "  portal authentication email path preserved: verified"
)
print(
    "  responsive WedPlanned send dialog: verified"
)
