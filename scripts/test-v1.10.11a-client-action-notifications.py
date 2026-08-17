#!/usr/bin/env python3
"""Focused v1.10.11a client-action professional notifications."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT
        / path
    ).read_text(encoding="utf-8")


helper = read(
    "serverless/crm-client-action-notifications-d1.ts"
)

questionnaires = read(
    "serverless/client-portal-d1.ts"
)

contracts = read(
    "serverless/client-portal-commercial-d1.ts"
)

questionnaire_route = read(
    "functions/api/public/client-portal/questionnaires/[id].ts"
)

contract_route = read(
    "functions/api/public/client-portal/contracts/[id].ts"
)

# Existing CRM notification setting is the primary recipient, with
# workspace contact email and an active owner/admin membership fallback.
for token in (
    "lead_settings.notification_email",
    "workspace_settings.contact_email",
    "FROM business_memberships membership",
    "membership.status = 'active'",
    "'owner'",
    "'admin'",
):
    assert token in helper, token

# Delivery uses the existing managed Resend environment.
for token in (
    "RESEND_API_KEY",
    "WEDPLANNED_AUTH_FROM_EMAIL",
    "CLIENT_AUTH_FROM_EMAIL",
    "https://api.resend.com/emails",
):
    assert token in helper, token

# Human-readable booking context and a tenant admin-domain link are used.
for token in (
    "job.title",
    "job.reference",
    "purpose = 'admin'",
    "/admin/crm/jobs/",
    "Open Job in WedCRM",
):
    assert token in helper, token

# Client questionnaire actions are distinguished.
for token in (
    '"questionnaire_updated"',
    '"questionnaire_completed"',
    '"questionnaire_updated_after_completion"',
):
    assert token in questionnaires, token

questionnaire_save = questionnaires[
    questionnaires.index(
        "export async function savePublicQuestionnaire("
    ):
    questionnaires.index(
        "export async function uploadQuestionnaireFile",
    )
]

assert "env: ProfessionalNotificationEnv" in questionnaire_save
assert "await db.batch" in questionnaire_save
assert "sendProfessionalClientActionNotification" in questionnaire_save
assert (
    questionnaire_save.index("await db.batch")
    < questionnaire_save.index(
        "sendProfessionalClientActionNotification"
    )
)
assert "identity.displayName" in questionnaire_save
assert ".catch((notificationError)" in questionnaire_save

# Contract notification is sent only after the append-only signature
# insertion has been verified.
contract_sign = contracts[
    contracts.index(
        "export async function signPublicContract("
    ):
]

assert "env: ProfessionalNotificationEnv" in contract_sign
assert '"contract_signed"' in contract_sign
assert "sendProfessionalClientActionNotification" in contract_sign
assert (
    contract_sign.index("if (inserted !== 1)")
    < contract_sign.index(
        "sendProfessionalClientActionNotification"
    )
)
assert ".catch((notificationError)" in contract_sign

# Both public routes expose and pass the existing email environment.
for route in (
    questionnaire_route,
    contract_route,
):
    for token in (
        "RESEND_API_KEY?: string;",
        "WEDPLANNED_AUTH_FROM_EMAIL?: string;",
        "CLIENT_AUTH_FROM_EMAIL?: string;",
        "context.env,",
    ):
        assert token in route, token

print(
    "PASS v1.10.11a professional client-action notifications"
)
print(
    "  CRM notification recipient and fallbacks: verified"
)
print(
    "  questionnaire update/completion notifications: verified"
)
print(
    "  completed-questionnaire update notification: verified"
)
print(
    "  contract signature notification: verified"
)
print(
    "  post-mutation best-effort delivery: verified"
)
print(
    "  tenant Admin Job link: verified"
)
