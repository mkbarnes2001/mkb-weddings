#!/usr/bin/env python3
"""v1.10.12a final Job continuity regression."""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (
        ROOT / relative
    ).read_text(
        encoding="utf-8",
    )


job = read(
    "src/admin/pages/CRMJob.tsx"
)

css = read(
    "src/admin/admin-theme.css"
)

types = read(
    "src/admin/types/crm.ts"
)

booking = read(
    "serverless/crm-booking-pack-d1.ts"
)


# Cleaner centred client-management icon.
assert "PenLine" not in job
assert "<Pencil" not in job
assert "UserRoundCog" not in job
assert "UserRound" in job
assert 'title="Edit client"' in job


# Real read-only Contract view.
for token in (
    "contractPreviewBlocks",
    "contractPreviewOpen",
    'label="View contract"',
    "commercialContract.content",
    "crm-job-contract-preview",
):
    assert token in job, token

assert "content: unknown;" in types
assert "terms: unknown;" in types
assert "version?.content_json" in booking
assert "version?.terms_snapshot_json" in booking


# Existing Contract delivery semantics remain.
for token in (
    'commercialContract?.status === "draft"',
    'portal.status === "not_invited"',
    "Invite client first",
    "Send to Client Portal",
    "sendContractToPortal(",
):
    assert token in job, token


# Quote duplicate details removed.
for token in (
    'title="Quote and package"',
    "crm-job-quote-compact",
    "Open accepted quote",
):
    assert token in job, token

for forbidden in (
    "crm-quote-job-details",
    "packageSnapshot.includedItems",
    "selectedAddons.map",
):
    assert forbidden not in job, forbidden


# Questionnaire on Job is read-only.
needle = 'title="Questionnaires"'

assert job.count(needle) == 1

title_pos = job.index(needle)

q_start = job.rfind(
    "<AdminAccordion",
    0,
    title_pos,
)

q_end = job.find(
    "</AdminAccordion>",
    title_pos,
)

questionnaire = job[
    q_start:
    q_end + len("</AdminAccordion>")
]

for forbidden in (
    "crm-questionnaire-assign",
    "Planning target",
    "Assign questionnaire",
    "Edit answers",
    "ProfessionalQuestionnaireField",
    "saveQuestionnaireAnswers",
):
    assert forbidden not in questionnaire, forbidden

for token in (
    "workspace.questionnaires.map",
    "item.title",
    "item.assignedContactName",
    "answerLabel(",
    'to="/admin/crm?view=questionnaires"',
    "Open Questionnaires",
):
    assert token in questionnaire, token


# Lower Job surfaces follow Platform module appearance.
for token in (
    "--admin-module-record-background",
    ".crm-job-operations-grid",
    ".crm-booking-summary-row__actions",
    ".crm-job-questionnaire-readonly",
    ".crm-job-contract-preview",
):
    assert token in css, token


# No schema migration.
assert not list(
    (ROOT / "d1" / "migrations")
    .glob("048*")
)


print(
    "PASS v1.10.12a final Job continuity refinement"
)
print(
    "  client edit icon: refined"
)
print(
    "  Contract view: read-only generated version"
)
print(
    "  Contract send lifecycle: preserved"
)
print(
    "  Quote/package: compact summary"
)
print(
    "  Job Questionnaire: read-only"
)
print(
    "  lower surfaces: platform-controlled"
)
print(
    "  schema migration: not required"
)
