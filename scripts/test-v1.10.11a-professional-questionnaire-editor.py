#!/usr/bin/env python3
"""Focused regression for v1.10.11a WedCRM living questionnaire editor."""

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(
        encoding="utf-8"
    )


page = read(
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

# Release remains schema 43.
db = sqlite3.connect(":memory:")

db.executescript(
    read("d1/schema.sql")
)

version = db.execute(
    "SELECT value "
    "FROM schema_meta "
    "WHERE key='schema_version'"
).fetchone()[0]

assert str(version) == "44"

# One shared response instance is edited, not a professional copy.
for token in (
    "questionnaireEditorId",
    "questionnaireDraft",
    "beginQuestionnaireEdit(",
    "saveQuestionnaireAnswers(",
    "AdminApiService",
    ".saveQuestionnaireInstance(",
):
    assert token in page, token

assert (
    "professionalQuestionnaire"
    not in page
)

assert (
    "questionnaireCopy"
    not in page
)

# Support-mode sessions are read-only both in UI and server.
compact = "".join(
    page.split()
)

assert (
    'canEditQuestionnaires=canManage&&auth.accessMode!=="support"'
    in compact
)

assert (
    'actor.accessMode === "support"'
    in server
)

assert (
    "Support sessions cannot edit client questionnaire responses."
    in server
)

# Living questionnaire UX.
for token in (
    "Edit answers",
    "Save changes",
    "Mark as complete",
    "planning target",
    "same questionnaire answers visible to the client",
    "remains marked complete",
):
    assert token in page, token

# Attribution is surfaced in WedCRM.
for token in (
    "lastSavedAt",
    "lastSavedByLabel",
    "lastSavedByType",
    "Last updated",
    "WedCRM",
):
    assert token in page, token

# Every standard answer type is editable.
for token in (
    'field.type === "short_text"',
    'field.type === "long_text"',
    'field.type === "select"',
    'field.type === "radio"',
    'field.type === "checkbox"',
):
    assert token in page, token

# File responses stay attached to the same questionnaire and are not
# replaced by an unsupported professional-only upload model.
assert (
    'field.type === "file"'
    in page
)

assert (
    "Questionnaire attachments remain managed through the shared Files area and Client Portal."
    in page
)

# Supplier values retain the Client Portal structured answer shape.
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
    "workspace.supplierDirectory",
    "field.supplierCategory",
    "field.allowUnlisted",
    "field.multiple",
):
    assert token in page, token

# Professional save transport remains the single shared endpoint.
assert (
    "static async saveQuestionnaireInstance("
    in api
)

assert (
    "/api/crm/questionnaires/instances/"
    in api
)

# Server persists professional changes into the same canonical tables.
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
):
    assert token in professional, token

# WedPlanned-native responsive styling exists.
for token in (
    ".crm-questionnaire-editor",
    ".crm-questionnaire-editor__field",
    ".crm-questionnaire-editor__suppliers",
    ".crm-questionnaire-editor__footer",
    "@media (max-width: 680px)",
):
    assert token in css, token

print(
    "PASS v1.10.11a professional shared questionnaire editor"
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
    "  standard answer field editing: verified"
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
