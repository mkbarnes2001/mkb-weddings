#!/usr/bin/env python3
"""Focused regression for the v1.10.11a shared questionnaire editor.

Current ownership:
- CRMClientPortalPreview owns professional response editing.
- CRMJob exposes a read-only questionnaire summary and navigation.
- Both use the same canonical questionnaire instance / response tables.
"""

from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8"
    )


preview = read(
    "src/admin/pages/CRMClientPortalPreview.tsx"
)

job = read(
    "src/admin/pages/CRMJob.tsx"
)

css = read(
    "src/admin/admin-theme.css"
)

api = read(
    "src/admin/services/AdminApiService.ts"
)

server = read(
    "serverless/client-portal-d1.ts"
)


# Full current schema.
db = sqlite3.connect(":memory:")

db.executescript(
    read("d1/schema.sql")
)

version = db.execute(
    "SELECT value "
    "FROM schema_meta "
    "WHERE key='schema_version'"
).fetchone()[0]

assert str(version) == "54"


# -------------------------------------------------------------
# Professional response editing is owned by Client Portal Preview.
# -------------------------------------------------------------

for token in (
    "questionnaireEditorId",
    "questionnaireDraft",
    "beginQuestionnaireEdit(",
    "saveQuestionnaireAnswers(",
    "AdminApiService",
    ".saveQuestionnaireInstance(",
    "ProfessionalQuestionnaireField",
):
    assert token in preview, token


# No parallel professional questionnaire copy is introduced.
assert (
    "professionalQuestionnaire"
    not in preview
)

assert (
    "questionnaireCopy"
    not in preview
)


# -------------------------------------------------------------
# Job workspace intentionally exposes a read-only summary.
# -------------------------------------------------------------

for token in (
    "crm-job-questionnaire-readonly",
    "Open Questionnaires",
    "questionnaire-response-row",
    "Last updated",
    "WedCRM user",
):
    assert token in job, token


# Editing controls belong to the dedicated preview/editor rather
# than the Job questionnaire summary.
job_panel_start = job.index(
    'className="crm-job-questionnaire-readonly"'
)

job_panel_end = job.index(
    'title="Supplier team"',
    job_panel_start,
)

job_panel = job[
    job_panel_start:
    job_panel_end
]

for retired_from_job in (
    "Edit answers",
    "Save changes",
    "Submit updates",
):
    assert (
        retired_from_job
        not in job_panel
    ), retired_from_job


# -------------------------------------------------------------
# Support mode is read-only in both UI and server boundaries.
# -------------------------------------------------------------

compact_preview = "".join(
    preview.split()
)

assert (
    'auth.permissions.includes("crm:manage",)'
    in compact_preview
)

assert (
    '&&auth.accessMode!=="support"'
    in compact_preview
)

assert (
    "Questionnaire editing is read-only for this session."
    in preview
)

assert (
    "Support-mode access cannot change client questionnaire responses."
    in preview
)

assert (
    'actor.accessMode === "support"'
    in server
)

assert (
    "Support sessions cannot edit client questionnaire responses."
    in server
)


# -------------------------------------------------------------
# Current professional living-questionnaire UX.
# -------------------------------------------------------------

for token in (
    "Edit answers",
    "Close editor",
    "Save changes",
    "Submit",
    "Submit updates",
    "Save work without completing the questionnaire",
):
    assert token in preview, token


# Completion remains editable.
assert (
    'questionnaire.status'
    in preview
)

assert (
    '=== "completed"'
    in preview
)

assert (
    "Submit updates"
    in preview
)


# -------------------------------------------------------------
# Last-editor attribution is visible in both relevant surfaces.
# -------------------------------------------------------------

for token in (
    "lastSavedAt",
    "lastSavedByLabel",
    "lastSavedByType",
    "Last updated",
    "WedCRM user",
):
    assert token in preview, token

for token in (
    "lastSavedAt",
    "lastSavedByLabel",
    "lastSavedByType",
    "Last updated",
    "WedCRM user",
):
    assert token in job, token


# -------------------------------------------------------------
# Shared field renderer still owns all answer types.
# -------------------------------------------------------------

for token in (
    'field.type === "short_text"',
    'field.type === "long_text"',
    'field.type === "select"',
    'field.type === "radio"',
    'field.type === "checkbox"',
):
    assert token in job, token


# File responses remain part of the same questionnaire / Files model.
assert (
    'field.type === "file"'
    in job
)

assert (
    "Questionnaire attachments remain managed through "
    "the shared Files area and Client Portal."
    in job
)


# Structured Supplier answers retain the Client Portal shape.
for token in (
    "type ProfessionalSupplierAnswer",
    '"existing"',
    '"unlisted"',
    "supplierId:",
    "website:",
    "instagram:",
    "email:",
    "phone:",
    "location:",
    "county:",
    "field.supplierCategory",
    "field.allowUnlisted",
    "field.multiple",
):
    assert token in job, token


# -------------------------------------------------------------
# Professional transport remains one shared response endpoint.
# -------------------------------------------------------------

assert (
    "static async saveQuestionnaireInstance("
    in api
)

assert (
    "/api/crm/questionnaires/instances/"
    in api
)


# Server persists professional changes into canonical tables.
professional_start = server.index(
    "export async function saveQuestionnaireInstanceAdmin("
)

professional_end = server.index(
    "export async function uploadQuestionnaireFile(",
    professional_start,
)

professional = server[
    professional_start:
    professional_end
]

for token in (
    "crm_questionnaire_responses",
    "crm_questionnaire_instances",
    "'professional'",
    "updated_by_user_id",
    "last_saved_by_user_id",
    "last_saved_by_label",
):
    assert token in professional, token


# Completion remains a milestone rather than being reset by edits.
for token in (
    "ELSE status",
    "completed_at",
):
    assert token in professional, token


# Shared responsive editor styling remains available to the
# dedicated professional editing surface.
for token in (
    ".crm-questionnaire-editor",
    ".crm-questionnaire-editor__field",
    ".crm-questionnaire-editor__footer",
    ".crm-client-portal-preview__questionnaire-editor",
    "@media (max-width: 680px)",
):
    assert token in css, token


assert not list(
    (ROOT / "d1/migrations").glob("055*")
)


print(
    "PASS v1.10.11a professional shared questionnaire editor"
)
print(
    "  Client Portal Preview editing ownership: verified"
)
print(
    "  Job read-only questionnaire summary: verified"
)
print(
    "  same questionnaire instance: verified"
)
print(
    "  client/professional shared answers: verified"
)
print(
    "  structured supplier answers preserved: verified"
)
print(
    "  completion remains a milestone: verified"
)
print(
    "  last-editor attribution visible: verified"
)
print(
    "  support-mode mutation blocked: verified"
)
print(
    "  responsive WedPlanned UI: verified"
)
print(
    "  schema 54: verified"
)
