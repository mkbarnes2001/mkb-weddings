#!/usr/bin/env python3
"""v1.10.12a Lead detail continuity regression."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8",
    )


page = read(
    "src/admin/pages/CRMEnquiry.tsx"
)

shared = read(
    "src/admin/components/crm/"
    "CRMWeddingWorkspaceShared.tsx"
)


for token in (
    "CRMWeddingWorkflowPanel",
    "CRMClientsPanel",
    "crm-job-primary-grid",
    "crm-job-summary-grid",
    "crm-job-operations-grid",
):
    assert token in page, token


for token in (
    "Lead created",
    "Job accepted",
    "Wedding day",
    "Previews sent",
    "Client photos delivered",
):
    assert token in shared, token


for title in (
    'title="Booking and payments"',
    'title="Wedding delivery and content"',
    'title="Lead details"',
    'title="Quote and package"',
    'title="Communication"',
    'title="Questionnaires"',
    'title="Supplier team"',
    'title="Files"',
    'title="Notes and activity"',
):
    assert title in page, title


details_pos = page.index(
    'title="Lead details"'
)

details_end = page.index(
    "</AdminAccordion>",
    details_pos,
)

details = page[
    details_pos:
    details_end
]


for token in (
    "Pipeline stage",
    "Service",
    "Wedding date",
    "Venue",
    "Source",
    "Campaign",
    "Notes",
):
    assert token in details, token


for forbidden in (
    "Date flexibility",
    "Package interest",
    "Budget minimum",
    "Budget maximum",
):
    assert forbidden not in details


for token in (
    "dateFlexibility",
    "packageInterest",
    "budgetMin",
    "budgetMax",
):
    assert token in page, token


for token in (
    "Client Portal",
    "createQuote",
    "markLost",
    "uploadLeadPlanningFile",
    "createLeadClientGallery",
    "Files begin after booking",
):
    assert token in page, token


for forbidden in (
    'title="Journey"',
    "crm-lead-workspace-layout",
    "crm-lead-summary-grid",
):
    assert forbidden not in page


assert not list(
    (
        ROOT
        / "d1/migrations"
    ).glob("048*")
)


print(
    "PASS v1.10.12a Lead detail continuity"
)

print(
    "  shared Wedding workflow + Clients: verified"
)

print(
    "  Job-style summary grid: verified"
)

print(
    "  Job-style operations grid: verified"
)

print(
    "  concise editable Lead details: preserved"
)

print(
    "  Lead-specific actions: preserved"
)

print(
    "  schema migration required: no"
)
