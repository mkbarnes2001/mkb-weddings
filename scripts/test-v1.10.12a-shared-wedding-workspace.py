#!/usr/bin/env python3
"""Shared Lead / Job Wedding Workspace regression."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8",
    )


shared = read(
    "src/admin/components/crm/"
    "CRMWeddingWorkspaceShared.tsx"
)

lead = read(
    "src/admin/pages/CRMEnquiry.tsx"
)

job = read(
    "src/admin/pages/CRMJob.tsx"
)


for token in (
    'title="Wedding workflow"',
    'aria-label="Wedding workflow"',
    "Lead created",
    "Job accepted",
    "Wedding day",
    "Previews sent",
    "Client photos delivered",
    "crm-wedding-workflow",
):
    assert token in shared, token


for token in (
    'title="Clients"',
    "crm-job-clients-panel",
    "crm-job-clients",
    "crm-job-client-actions",
    'title="Edit client"',
    "<User aria-hidden",
):
    assert token in shared, token


for source in (
    lead,
    job,
):
    assert (
        "CRMWeddingWorkflowPanel"
        in source
    )

    assert (
        "CRMClientsPanel"
        in source
    )

    assert (
        "crm-job-primary-grid"
        in source
    )


assert (
    'title="Client journey"'
    not in lead
)

assert (
    'title="Journey"'
    not in lead
)

assert (
    "ContactRound"
    not in job
)


# Wedding details is now owned by the shared
# Wedding workspace component. The Lead page
# renders that shared component and separately
# owns its Lead-specific operational accordion.
assert (
    "<CRMWeddingDetailsPanel"
    in lead
)

assert (
    '"Wedding details"'
    in shared
)

assert (
    '"Lead details"'
    in shared
)

assert (
    'title="Lead details"'
    not in lead
)

assert (
    'mode={'
    in lead
)

assert (
    '"lead"'
    in lead
)

assert (
    '"wedding"'
    in lead
)


for token in (
    'title="Communication"',
    'title="Quote and package"',
    'title="Booking and payments"',
    'title="Questionnaires"',
    'title="Files"',
    'title="Notes and activity"',
    'title="Close lead"',
):
    assert token in lead, token


assert (
    ROOT
    / "d1/migrations/048_crm_lead_source_continuity.sql"
).is_file()


print(
    "PASS v1.10.12a shared Lead / Job Wedding Workspace"
)

print(
    "  Wedding workflow: one shared source"
)

print(
    "  Clients panel: one shared source"
)

print(
    "  Lead uses canonical Job top grid"
)

print(
    "  duplicate Lead Journey: removed"
)

print(
    "  edit-client icon: plain User"
)

print(
    "  release schema: 48 · Lead Source continuity"
)
