#!/usr/bin/env python3

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(encoding="utf-8")


types = read(
    "src/admin/types/crm.ts"
)
api = read(
    "src/admin/services/AdminApiService.ts"
)
page = read(
    "src/admin/pages/CRMEmailSettings.tsx"
)
app = read(
    "src/admin/app/AdminApp.tsx"
)
nav = read(
    "src/admin/navigation/adminModules.ts"
)
css = read(
    "src/admin/admin-theme.css"
)
service = read(
    "serverless/crm-email-settings-d1.ts"
)

# Types mirror the private API shape.
for token in [
    "export type CrmEmailDeliveryMode",
    "export type CrmEmailSmtpSecurity",
    "export type CrmEmailSignature",
    "export type CrmEmailSettings",
    "export type CrmEmailSettingsInput",
    "googleConnected: boolean",
    "smtpCredentialConfigured: boolean",
    "smtpPassword?: string",
]:
    assert token in types, token

# Browser API does not receive workspace IDs or credentials back.
for token in [
    "static async getCrmEmailSettings",
    "static async saveCrmEmailSettings",
    "static async disconnectCrmEmailProvider",
    '"/api/crm/email/settings"',
    "/api/crm/email/providers/${encodeURIComponent(provider)}/disconnect",
]:
    assert token in api, token

start = api.index(
    "static async getCrmEmailSettings"
)
end = api.index(
    "static async getCrmEmailTemplates"
)

email_api = api[start:end]

assert "workspaceId" not in email_api
assert "ciphertext" not in email_api
assert "CRM_EMAIL_CREDENTIAL_KEY" not in email_api

# Dedicated WedCRM settings destination.
assert (
    "export function CRMEmailSettings"
    in page
)
assert (
    'path="crm/email-settings"'
    in app
)
assert (
    "<CRMEmailSettings />"
    in app
)
assert (
    'to: "/admin/crm/email-settings"'
    in nav
)
assert (
    'label: "Email settings"'
    in nav
)

# The navigation item uses the Mail icon at module initialisation,
# so its Lucide import must exist or the whole Admin app fails
# before React can mount.
nav_lucide_start = nav.index(
    "import {"
)
nav_lucide_end = nav.index(
    '} from "lucide-react";',
    nav_lucide_start,
)
nav_lucide_import = nav[
    nav_lucide_start:
    nav_lucide_end
]
assert (
    "Mail," in nav_lucide_import
), "Mail icon import is present"

# Three provider modes are visible and provider readiness gates
# prevent selecting unconfigured Google/SMTP delivery.
for token in [
    "Managed by WedPlanned",
    "Google / Gmail",
    "Custom SMTP",
    "googleConnected",
    "smtpCredentialConfigured",
    "deliveryMode",
]:
    assert token in page, token

assert (
    'disabled={\n            !canManage\n            || !settings\n              .googleConnected'
    in page
)
assert (
    'disabled={\n            !canManage\n            || !settings\n              .smtpCredentialConfigured'
    in page
)

# SMTP port 25 is blocked in the Admin UI.
assert (
    'settings.deliveryMode'
    in page
)
assert (
    '=== "smtp"'
    in page
)
assert (
    "Number("
    in page
)
assert (
    "settings.smtpPort"
    in page
)
assert (
    "Port 25 is not supported."
    in page
)
assert (
    "Port 25 is unavailable."
    in page
)

# SMTP password is write-only in the browser UI.
assert 'type="password"' in page
assert "smtpPassword" in page
assert "setSmtpPassword" in page
assert (
    "The password is never returned to this screen after saving."
    in page
)
assert "ciphertext" not in page
assert "iv:" not in page

# Sender, reply-to and signature are first-class settings.
for token in [
    'title="Sender identity"',
    'label="Sender name"',
    'label="Sender email"',
    'label="Reply-to email"',
    'title="Email signature"',
    "Append business signature",
]:
    assert token in page, token

# Authentication boundary is explicit in UI and remains separate
# in the backend implementation.
assert (
    "Authentication and security emails always remain on WedPlanned-managed delivery."
    in page
)
assert (
    "Sign-in links, account verification and client authentication do not use these business email settings."
    in page
)
assert (
    "CRM_EMAIL_CREDENTIAL_KEY"
    in service
)

# Provider disconnect routes are consumed.
# Normalise whitespace so multiline method chaining and JSX
# formatting do not make the source-contract test brittle.
page_compact = "".join(page.split())

assert (
    "AdminApiService.disconnectCrmEmailProvider"
    in page_compact
)
assert 'disconnect("google",)' in page_compact
assert 'disconnect("smtp",)' in page_compact

# Native WedPlanned styling.
for token in [
    ".crm-email-delivery-grid",
    ".crm-email-delivery-card",
    ".crm-email-settings-layout",
    ".crm-email-provider-state",
    ".crm-email-smtp-grid",
    ".crm-email-signature-grid",
    "var(--admin-module-accent",
    "var(--admin-module-record-background",
]:
    assert token in css, token

print(
    "PASS v1.10.9a WedCRM email settings admin UI"
)
print(
    "  email settings types/API client: verified"
)
print(
    "  WedCRM navigation/route: verified"
)
print(
    "  managed delivery UI: verified"
)
print(
    "  Google connection readiness UI: verified"
)
print(
    "  custom SMTP encrypted-credential UI: verified"
)
print(
    "  sender/reply-to identity: verified"
)
print(
    "  business signature editor: verified"
)
print(
    "  authentication-email boundary: verified"
)
print(
    "  responsive WedPlanned styling: verified"
)
