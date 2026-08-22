#!/usr/bin/env python3
"""v1.10.12a Lead detail Job-continuity regression."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

page = (
    ROOT
    / "src/admin/pages/CRMEnquiry.tsx"
).read_text(
    encoding="utf-8",
)

job = (
    ROOT
    / "src/admin/pages/CRMJob.tsx"
).read_text(
    encoding="utf-8",
)

css = (
    ROOT
    / "src/admin/admin-theme.css"
).read_text(
    encoding="utf-8",
)


# Top Lead hierarchy mirrors Job.
for token in (
    "crm-lead-primary-grid",
    'title="Client journey"',
    'title="Client"',
    "crm-lead-contact-editors",
    "crm-lead-summary-grid",
    'title="Lead details"',
    'title="Quotes"',
):
    assert token in page, token


# Lead workflow stops at booking.
journey_start = page.index(
    "const journey = ["
)

journey_end = page.index(
    "];",
    journey_start,
)

journey = page[
    journey_start:
    journey_end
]

for token in (
    "Lead created",
    'label: "Quote"',
    "Quote accepted",
    "Job accepted",
):
    assert token in journey, token

for forbidden in (
    'label: "Contract"',
    'label: "Questionnaire"',
    'label: "Deposit"',
    'label: "Event"',
):
    assert forbidden not in journey, forbidden


# Main Lead details are intentionally concise.
details_pos = page.index(
    'title="Lead details"'
)

details_end = page.index(
    "</AdminPanel>",
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
    assert forbidden not in details, forbidden


# Underlying fields remain in the type/data model elsewhere.
for token in (
    "dateFlexibility",
    "packageInterest",
    "budgetMin",
    "budgetMax",
):
    assert token in page, token


# Quotes are compact rows, not another table.
quotes_pos = page.index(
    'title="Quotes"'
)

quotes_end = page.index(
    "</AdminPanel>",
    quotes_pos,
)

quotes = page[
    quotes_pos:
    quotes_end
]

assert "crm-lead-quote-list" in quotes
assert "crm-lead-quote-row" in quotes
assert "<table" not in quotes
assert "quote.quoteType" in quotes
assert '"Pick & Choose"' in quotes
assert '"Fixed"' in quotes


# Existing operational surfaces remain.
for token in (
    'title="Mail"',
    'title="Contracts"',
    'title="Questionnaires"',
    'title="Invoices"',
    'title="Files"',
    'title="Journey"',
    'title="History"',
    "Client Portal",
    "Open Job operations",
    "createQuote",
    "uploadLeadPlanningFile",
):
    assert token in page, token


# Job client action uses a neutral centred contact icon.
assert "ContactRound" in job
assert "UserRoundCog" not in job
assert "PenLine" not in job
assert 'title="Edit client"' in job


# New continuity styling.
assert (
    "/* v1.10.12a — Lead detail Job-continuity redesign */"
    in css
)

for token in (
    ".crm-lead-primary-grid",
    ".crm-lead-summary-grid",
    ".crm-lead-quote-row",
    ".crm-lead-contact-editor",
):
    assert token in css, token


# No schema migration.
assert not list(
    (ROOT / "d1" / "migrations")
    .glob("048*")
)


print(
    "PASS v1.10.12a Lead detail Job-continuity redesign"
)
print(
    "  Lead journey + Client top row: verified"
)
print(
    "  concise Lead details: verified"
)
print(
    "  compact Quotes: verified"
)
print(
    "  operational functionality: preserved"
)
print(
    "  ContactRound Job edit icon: verified"
)
print(
    "  schema migration required: no"
)
