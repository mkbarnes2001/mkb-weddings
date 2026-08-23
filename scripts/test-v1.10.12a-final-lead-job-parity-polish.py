#!/usr/bin/env python3
"""v1.10.12a final Lead / Job parity polish."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (
        ROOT / relative
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

css = read(
    "src/admin/admin-theme.css"
)


def between(
    source: str,
    first: str,
    second: str,
) -> str:
    start = source.index(first)
    end = source.index(
        second,
        start,
    )
    return source[start:end]


lead_booking = between(
    lead,
    'title="Booking and payments"',
    'title="Wedding delivery and content"',
)

lead_delivery = between(
    lead,
    'title="Wedding delivery and content"',
    '<div className="crm-job-operations-grid">',
)


# Job remains canonical and already owns the flat visual language.
for token in (
    "crm-booking-summary-panel",
    "crm-booking-summary-list",
    "crm-booking-summary-row",
    "crm-delivery-summary-panel",
    "crm-delivery-summary-list",
    "crm-delivery-summary-row",
):
    assert token in job, (
        "Job canonical token missing",
        token,
    )


# Lead now renders the same flat Booking structure.
for token in (
    "crm-booking-summary-panel",
    "crm-booking-summary-list",
    'className="crm-booking-summary-row"',
    "crm-booking-summary-row__copy",
    "crm-booking-summary-row__heading",
    "crm-booking-summary-row__detail",
    "crm-booking-summary-row__state",
    "crm-booking-summary-row__action",
):
    assert token in lead_booking, token


for forbidden in (
    "crm-commercial-panel",
    "crm-job-commercial-summary-list",
    "crm-commercial-summary-row",
    "crm-commercial-card__icon",
):
    assert forbidden not in lead_booking, forbidden


# Lead Delivery is the same five-row flat presentation as Job.
for token in (
    "crm-delivery-summary-panel",
    "crm-delivery-summary-list",
    "crm-delivery-summary-row",
    "crm-delivery-summary-state",
    "crm-delivery-summary-action",
):
    assert token in lead_delivery, token


assert (
    lead_delivery.count(
        'className="crm-delivery-summary-row"'
    )
    == 5
)


for label in (
    "Wedding Workspace",
    "Wedding assets",
    "Client Gallery",
    "Wedding Story",
    "Website galleries",
):
    assert label in lead_delivery, label


for forbidden in (
    "crm-wedding-lifecycle-panel",
    "crm-wedding-lifecycle-grid",
    "crm-wedding-lifecycle-card",
    "crm-wedding-lifecycle-card__icon",
    "crm-wedding-lifecycle-action",
):
    assert forbidden not in lead_delivery, forbidden


# Lead lifecycle semantics remain different only by state.
for token in (
    "After booking",
    "journeyQuote",
    "leadLifecycle",
    "leadPrimaryGallery",
    "createLeadClientGallery",
):
    assert token in lead, token


# Shared client source remains one plain User icon.
assert (
    '<User aria-hidden="true" />'
    in shared
)

assert (
    "crm-job-client-icon-action"
    in shared
)

assert (
    "<ContactRound"
    not in shared
)

assert (
    "<UserRound"
    not in shared
)


# CSS explicitly centres the shared client edit SVG.
for token in (
    "/* v1.10.12a — final Lead / Job parity polish */",
    ".crm-job-client-icon-action",
    "place-items: center !important;",
    "position: static !important;",
    "display: block !important;",
    "transform: none !important;",
):
    assert token in css, token


# Existing canonical flat responsive contracts remain present.
for token in (
    ".crm-booking-summary-row",
    ".crm-delivery-summary-row",
    "@media (max-width: 760px)",
):
    assert token in css, token


assert (
    ROOT
    / "d1/migrations/048_crm_lead_source_continuity.sql"
).is_file()


print(
    "PASS v1.10.12a final Lead / Job parity polish"
)

print(
    "  Lead Booking/payments: canonical flat Job rows"
)

print(
    "  Lead Delivery/content: canonical flat Job rows"
)

print(
    "  pre-booking lifecycle states: preserved"
)

print(
    "  client edit icon: plain User + centred SVG box"
)

print(
    "  Job source behaviour: unchanged"
)

print(
    "  release schema: 48 · Lead Source continuity"
)
