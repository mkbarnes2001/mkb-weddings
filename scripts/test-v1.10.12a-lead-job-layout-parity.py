#!/usr/bin/env python3
"""v1.10.12a Lead / Job workspace layout parity."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8",
    )


lead = read(
    "src/admin/pages/CRMEnquiry.tsx"
)

job = read(
    "src/admin/pages/CRMJob.tsx"
)

shared = read(
    "src/admin/components/crm/"
    "CRMWeddingWorkspaceShared.tsx"
)


# Top lifecycle presentation is literally shared.
for source in (
    lead,
    job,
):
    assert "CRMWeddingWorkflowPanel" in source
    assert "CRMClientsPanel" in source
    assert "crm-job-primary-grid" in source


# Lead now uses the same canonical Job layout below the top row.
for source in (
    lead,
    job,
):
    assert "crm-job-summary-grid" in source
    assert "crm-job-operations-grid" in source

    for title in (
        'title="Booking and payments"',
        'title="Wedding delivery and content"',
        'title="Quote and package"',
        'title="Communication"',
        'title="Questionnaires"',
        'title="Supplier team"',
        'title="Files"',
        'title="Notes and activity"',
    ):
        assert title in source, (
            title,
            "Lead" if source is lead else "Job",
        )


# Shared five-stage workflow remains canonical.
for label in (
    "Lead created",
    "Job accepted",
    "Wedding day",
    "Previews sent",
    "Client photos delivered",
):
    assert label in shared, label


# Pre-booking Lead retains only lifecycle-appropriate differences.
for token in (
    'title="Close lead"',
    "createQuote",
    "markLost",
    "createLeadClientGallery",
    "After booking",
):
    assert token in lead, token


# Later Gate 2B refinement moved Lead/Wedding details into the
# shared contextual details panel. The Lead page should render
# the shared component rather than own a literal Wedding-details
# panel title.
assert "<CRMWeddingDetailsPanel" in lead
assert '"Lead details"' in shared
assert '"Wedding details"' in shared
assert "title={panelLabel}" in shared
assert 'title="Wedding details"' not in lead


# Old parallel Lead page architecture is gone.
for forbidden in (
    "crm-lead-workspace-layout",
    "crm-lead-summary-grid",
    'title="Mail"',
    'title="Quotes"',
    'title="Contracts"',
    'title="Invoices"',
    'title="History"',
    'title="Journey"',
):
    assert forbidden not in lead, forbidden


assert (
    ROOT
    / "d1/migrations/048_crm_lead_source_continuity.sql"
).is_file()


print(
    "PASS v1.10.12a Lead / Job workspace layout parity"
)

print(
    "  primary grid: canonical Job layout"
)

print(
    "  summary grid: canonical Job layout"
)

print(
    "  operations grid: canonical Job layout"
)

print(
    "  booking/delivery panels: aligned"
)

print(
    "  lower operational sections: aligned"
)

print(
    "  Lead-only lifecycle actions: preserved"
)

print(
    "  release schema: 48 · Lead Source continuity"
)
