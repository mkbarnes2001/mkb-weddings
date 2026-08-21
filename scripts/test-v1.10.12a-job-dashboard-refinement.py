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

css = read(
    "src/admin/admin-theme.css"
)


# Workflow markers carry state without redundant status pills.
workflow = component(
    job,
    "AdminPanel",
    "Wedding workflow",
)

assert "<AdminStatus" not in workflow
assert "Lead created" in workflow
assert "Job accepted" in workflow
assert "Wedding day" in workflow
assert "Previews sent" in workflow
assert "Client photos delivered" in workflow


# Clients now shares the same panel surface as Workflow.
clients = component(
    job,
    "AdminPanel",
    "Clients",
)

assert "<AdminAccordion" not in clients
assert "crm-job-clients-panel" in clients
assert "Client portal · {portalLabel}" in clients
assert "crm-job-client-portal-state" in clients
assert "AdminIconButton" in clients
assert "floatingTooltip" in clients
assert "Send new link" in clients
assert "Revoke client portal access" in clients

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
    'to={`/admin/crm/jobs/${job.id}/invoices/${commercialInvoice.id}`}',
    "crm-commercial-card__next",
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
):
    assert token in booking, token


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
    "<small",
):
    assert forbidden not in delivery, forbidden


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
