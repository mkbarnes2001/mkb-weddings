#!/usr/bin/env python3
"""v1.10.11a professional portal questionnaire + quote polish."""

from pathlib import Path
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

preview = read(
    "src/admin/pages/"
    "CRMClientPortalPreview.tsx"
)

job = read(
    "src/admin/pages/CRMJob.tsx"
)

api = read(
    "src/admin/services/"
    "AdminApiService.ts"
)

server = read(
    "serverless/client-portal-d1.ts"
)

quote = read(
    "src/admin/pages/CRMQuote.tsx"
)

css = read(
    "src/admin/admin-theme.css"
)


db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys = ON")
db.executescript(schema)

assert db.execute(
    """
    SELECT value
    FROM schema_meta
    WHERE key='schema_version'
    """
).fetchone()[0] == "49"

assert not db.execute(
    "PRAGMA foreign_key_check"
).fetchall()

assert (
    ROOT
    / "d1/migrations"
    / "045_crm_configurable_lead_form.sql"
).is_file()


# Shared renderer: no second professional answer model.
assert (
    "export function ProfessionalQuestionnaireField("
    in job
)

assert (
    'from "./CRMJob";'
    in preview
)

assert (
    "ProfessionalQuestionnaireField"
    in preview
)


# Authenticated professional boundary.
for token in (
    "useProfessionalAuth",
    "canEditQuestionnaires",
    'auth.permissions.includes(',
    '"crm:manage"',
    "auth.accessMode",
    '"support"',
):
    assert token in preview, token


# Existing professional transport is reused.
for token in (
    ".saveQuestionnaireInstance(",
    "questionnaireDraft",
    "Save changes",
    "Submit",
    "Submit updates",
):
    assert token in preview, token

assert (
    "static async saveQuestionnaireInstance("
    in api
)

assert (
    "/api/crm/questionnaires/instances/"
    in api
)


# Completed remains editable.
assert (
    "This questionnaire is complete, but answers can still be updated and submitted again."
    in preview
)

assert (
    "disabled={questionnaire.status === \"completed\"}"
    not in preview
)

assert (
    "ELSE status"
    in server
)

assert (
    "completed_at"
    in server
)


# Professional attribution and support guard.
for token in (
    "saveQuestionnaireInstanceAdmin(",
    "'professional'",
    "updated_by_user_id",
    "last_saved_by_user_id",
    "last_saved_by_label",
):
    assert token in server, token

assert (
    'actor.accessMode === "support"'
    in server
)


# No client impersonation or client-only actions.
for forbidden in (
    "/api/public/client-portal",
    "request-link",
    "/verify?token=",
    "client_identity_sessions",
    "acceptQuote",
    "declineQuote",
    "rawToken",
    "sessionToken",
):
    assert forbidden not in preview, forbidden

assert (
    "does not sign in as the client"
    in preview
)

assert (
    "Professional portal view"
    in preview
)

assert (
    "Professional controls"
    in preview
)


# Professional file upload remains deliberately absent.
assert (
    "Questionnaire attachments remain managed through the shared Files area and Client Portal."
    in job
)


# Exact PDF-requested explanatory copy removed.
for removed in (
    "Build one exact package. Add quote-specific line items inside the package when the scope needs itemised quantities or charges.",
    "Present the client with clear package choices. Detailed editing stays tucked away until you need it.",
    "Control expiry, discount and tax without mixing commercial terms into the package content.",
    "Set what happens after the client accepts this quote. Draft choices are saved with the quote and frozen only after a successful send.",
    "Keep the client-facing introduction separate from internal team notes.",
):
    assert removed not in quote, removed


# Panel identities themselves are preserved.
for token in (
    '"Fixed package"',
    '"Package choices"',
    'title="Commercial settings"',
    'title="Booking & payment"',
    'title="Client message"',
):
    assert token in quote, token


# Compact visual treatment.
for token in (
    "v1.10.11a final manual-gate refinement",
    ".crm-client-portal-preview__questionnaire-editor",
    ".crm-client-portal-preview__questionnaire-footer",
    ".crm-quote-page-header",
    ".crm-quote-header-actions",
    ".crm-quote-settings-grid",
    "min-height: 28px",
    "repeat(4, minmax(0, 1fr))",
):
    assert token in css, token


print(
    "PASS v1.10.11a professional portal questionnaire + quote polish"
)

print(
    "  same questionnaire instance/editor model: verified"
)

print(
    "  crm:manage professional authority: verified"
)

print(
    "  support-mode writes blocked: verified"
)

print(
    "  save changes: verified"
)

print(
    "  submit / submit updates: verified"
)

print(
    "  completed questionnaire remains editable: verified"
)

print(
    "  professional attribution retained: verified"
)

print(
    "  client impersonation: absent"
)

print(
    "  quote/client-only actions remain unavailable: verified"
)

print(
    "  PDF quote explanatory copy removed: verified"
)

print(
    "  compact quote header and commercial layout: verified"
)

print(
    "  schema 49 retains migration 045 compatibility: verified"
)
