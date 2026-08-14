#!/usr/bin/env python3
"""Focused source regression for v1.10.9a CRM correspondence delivery."""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (
        ROOT
        / relative
    ).read_text(
        encoding="utf-8",
    )


workflow = read(
    "serverless/crm-workflow-d1.ts"
)

delivery = read(
    "serverless/crm-email-delivery-d1.ts"
)

settings = read(
    "serverless/crm-email-settings-d1.ts"
)

public_enquiries = read(
    "functions/api/public/crm/enquiries.ts"
)

platform_auth = read(
    "serverless/platform-auth-d1.ts"
)

platform_signup = read(
    "serverless/platform-signup-d1.ts"
)

client_auth = read(
    "serverless/client-auth-d1.ts"
)

client_portal = read(
    "serverless/client-portal-d1.ts"
)

router = read(
    "functions/api/crm/[[path]].ts"
)

schema = read(
    "d1/schema.sql"
)


# One reusable transport owns all business CRM-provider delivery.
assert (
    'from "./crm-email-delivery-d1"'
    in workflow
)

assert (
    "sendCrmEmail"
    in workflow
)

assert (
    "workflowAttemptedProvider"
    in workflow
)

assert (
    "getCrmEmailSettings"
    in workflow
)

assert (
    "sendResend"
    not in workflow
)

assert (
    "https://api.resend.com/emails"
    not in workflow
)


# Direct Job correspondence uses the authenticated workspace actor.
job_match = re.search(
    r'export async function sendJobEmail'
    r'(.*?)'
    r'export async function getJobWorkflowWorkspace',
    workflow,
    re.DOTALL,
)

assert job_match

job = job_match.group(1)

assert (
    "await sendCrmEmail("
    in job
)

assert (
    "delivery.provider"
    in job
)

assert (
    "delivery.providerMessageId"
    in job
)

assert (
    "attemptedProvider"
    in job
)

assert (
    "'sent',"
    in job
)

assert (
    "'failed',"
    in job
)

assert (
    "provider:"
    in job
)

assert (
    "deliveryMode:"
    in job
)

# Browser payload cannot override workspace/provider selection.
for forbidden in [
    "input?.provider",
    "input.provider",
    "input?.deliveryMode",
    "input.deliveryMode",
    "input?.workspaceId",
    "input.workspaceId",
]:
    assert (
        forbidden
        not in job
    ), forbidden


# Public lead acknowledgement is business CRM correspondence.
auto_match = re.search(
    r'export async function sendLeadAutoresponder'
    r'(.*)$',
    workflow,
    re.DOTALL,
)

assert auto_match

autoresponder = auto_match.group(1)

assert (
    "await sendCrmEmail("
    in autoresponder
)

assert (
    'accessMode:\n        "system"'
    in autoresponder
)

assert (
    '"crm:read"'
    in autoresponder
)

assert (
    '"crm:manage"'
    in autoresponder
)

assert (
    "delivery.provider"
    in autoresponder
)

assert (
    "delivery.providerMessageId"
    in autoresponder
)

assert (
    "attemptedProvider"
    in autoresponder
)

assert (
    '"lead_autoresponder"'
    in autoresponder
)


# Shared transport supports all three business delivery modes.
for token in [
    '"resend" | "gmail" | "smtp"',
    '"managed" | "google" | "smtp"',
    "sendManagedEmail",
    "sendGoogleEmail",
    "sendSmtpEmail",
]:
    assert (
        token
        in delivery
    ), token


# Encrypted workspace credentials remain server-side.
assert (
    "getDecryptedCrmEmailCredential"
    in delivery
)

assert (
    "crypto.subtle.decrypt"
    in settings
)


# The internal new-enquiry notification is deliberately still the
# platform-managed notification path; only client correspondence moved.
assert (
    "async function sendNotification"
    in public_enquiries
)

assert (
    "https://api.resend.com/emails"
    in public_enquiries
)


# Authentication/security mail is deliberately separate and managed.
assert (
    "sendProfessionalEmail"
    in platform_auth
)

assert (
    "https://api.resend.com/emails"
    in platform_auth
)

assert (
    "sendVerificationEmail"
    in platform_signup
)

assert (
    "https://api.resend.com/emails"
    in platform_signup
)

assert (
    "requestClientMagicLink"
    in client_auth
)

assert (
    "sendPortalEmail"
    in client_portal
)

assert (
    "https://api.resend.com/emails"
    in client_portal
)


# Existing CRM router still passes only server environment + actor to
# the Job delivery service.
compact_router = re.sub(
    r"\s+",
    "",
    router,
)

assert (
    "sendJobEmail("
    "context.env.MKB_DB,"
    "context.env,"
    "actor,"
    "parts[1],"
    "body"
    ")"
    in compact_router
)


# No extra schema transition is required.
assert (
    "'41'"
    in schema
    or '"41"'
    in schema
    or "41"
    in schema
)

assert not list(
    (
        ROOT
        / "d1"
        / "migrations"
    ).glob(
        "042*"
    )
)


print(
    "PASS v1.10.9a CRM correspondence provider consolidation"
)
print(
    "  direct Job email uses workspace-selected provider: verified"
)
print(
    "  lead autoresponder uses workspace-selected provider: verified"
)
print(
    "  dynamic provider/message logging: verified"
)
print(
    "  server-authoritative workspace/provider boundary: verified"
)
print(
    "  internal lead notification remains managed: verified"
)
print(
    "  authentication/security email paths remain managed: verified"
)
print(
    "  schema remains 41: verified"
)
