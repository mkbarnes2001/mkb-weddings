#!/usr/bin/env python3
"""Regression checks for v1.10.12a final compact Job dashboard refinement."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (
        ROOT / relative
    ).read_text(
        encoding="utf-8",
    )


def component(
    source: str,
    tag: str,
    title: str,
) -> str:
    needle = f'title="{title}"'

    assert source.count(needle) == 1, (
        title,
        source.count(needle),
    )

    title_pos = source.index(
        needle,
    )

    start = source.rfind(
        f"<{tag}",
        0,
        title_pos,
    )

    assert start >= 0, (
        tag,
        title,
    )

    close = f"</{tag}>"

    end = source.find(
        close,
        title_pos,
    )

    assert end >= 0, (
        tag,
        title,
    )

    return source[
        start:
        end + len(close)
    ]


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


# Workflow visual structure now has one shared source for
# Lead and Job.
workflow = component(
    shared,
    "AdminPanel",
    "Wedding workflow",
)

assert "<AdminStatus" not in workflow
assert "Lead created" in workflow
assert "Job accepted" in workflow
assert "Wedding day" in workflow
assert "Previews sent" in workflow
assert "Client photos delivered" in workflow


# Clients visual structure is shared too.
clients = component(
    shared,
    "AdminPanel",
    "Clients",
)

assert "<AdminAccordion" not in clients
assert "crm-job-clients-panel" in clients
assert "Client portal · {portal.label}" in clients
assert "crm-job-client-portal-state" in clients
assert 'title="Edit client"' in clients
assert "<User aria-hidden" in clients


# Job keeps lifecycle-specific portal operations while
# rendering the shared Clients panel.
assert "CRMClientsPanel" in job
assert "renderActions" in job
assert "AdminIconButton" in job
assert 'title={' in job
assert "Send new link" in job
assert 'title="Revoke client portal access"' in job
assert "Revoke client portal access" in job
assert 'id="job-clients"' in job


# The authoritative living Questionnaire editor is preserved.
assert 'id="job-questionnaires"' in job
assert 'title="Questionnaires"' in job


# Booking summaries are compact and retain real operations.
booking = component(
    job,
    "AdminPanel",
    "Booking and payments",
)

for token in (
    "crm-job-commercial-summary-list",
    "crm-booking-summary-row__heading",
    "crm-commercial-summary-line",
    'to={`/admin/crm/jobs/${job.id}/invoices/${commercialInvoice.id}`}',
    "crm-booking-summary-row__detail",
    'href="#job-questionnaires"',
    'to={`/admin/crm/quotes/${commercialQuote.id}`}',
    "commercialInvoice.totalAmount",
    "commercialInvoice.paidAmount",
    "commercialInvoice.balanceAmount",
    "commercialInvoice.nextPayment",
    "commercialContract.signatureCount",
    "commercialContract.requiredSignatures",
    "commercialContract.versionNumber",
    "sendContractToPortal(",
    "commercialContract.id",
    "Send to Client Portal",
    'portal.status === "not_invited"',
    'label="Generate / repair booking pack"',
):
    assert token in booking, token

assert "crm-booking-pack-repair" not in booking
assert "<dl className=" not in booking
assert "crm-booking-summary-list" in booking
assert booking.count("crm-booking-summary-row") >= 4
assert "crm-commercial-card__icon" not in booking
assert 'description="Invoice, contract, questionnaire and accepted quote."' not in booking


# Delivery/content owns only actual content destinations.
delivery = component(
    job,
    "AdminPanel",
    "Wedding delivery and content",
)

for token in (
    "Wedding Workspace",
    "Wedding assets",
    "Client Gallery",
    "Wedding Story",
    "Website galleries",
):
    assert token in delivery, token

for forbidden in (
    "Client portal",
    "Questionnaires",
    "description=",
    'className="admin-button',
):
    assert forbidden not in delivery, forbidden

assert delivery.count(
    "crm-wedding-lifecycle-action"
) >= 5
assert 'title="Open Wedding Workspace"' in delivery
assert 'title="Manage Wedding assets"' in delivery
assert 'title="Create Client Gallery"' in delivery
assert "Start Wedding Story" in delivery
assert 'title="Manage Website galleries"' in delivery
assert "crm-delivery-summary-list" in delivery
assert delivery.count("crm-delivery-summary-row") == 5
assert "crm-wedding-lifecycle-card" not in delivery
assert "crm-wedding-lifecycle-card__icon" not in delivery


# Repeating dashboard records use the platform-controlled
# record-card appearance token.
marker = (
    "/* v1.10.12a — final compact Job dashboard refinement */"
)

assert marker in css

refinement_css = css[
    css.index(marker):
]

for token in (
    ".crm-job-clients-panel",
    ".crm-job-client-portal-state",
    ".crm-job-client-actions",
    ".crm-job-commercial-summary-list",
    ".crm-commercial-summary-row",
    ".crm-wedding-lifecycle-card",
    "var(\n      --admin-module-record-background,\n      #fff\n    )",
    "@media (max-width: 760px)",
):
    assert token in refinement_css, token


print(
    "PASS v1.10.12a final compact Job dashboard refinement"
)
print(
    "  workflow status-pill removal: verified"
)
print(
    "  Clients shared AdminPanel surface: verified"
)
print(
    "  square client icon actions + portal state: verified"
)
print(
    "  compact commercial summaries: verified"
)
print(
    "  authoritative Questionnaire editor preserved: verified"
)
print(
    "  delivery/content duplication removed: verified"
)
print(
    "  platform record-background token respected: verified"
)
