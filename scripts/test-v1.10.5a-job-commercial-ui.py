#!/usr/bin/env python3
"""Regression checks for v1.10.5a Job commercial workspace UI."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def exported_function(source: str, name: str) -> str:
    marker = f"export async function {name}"
    start = source.find(marker)
    assert start >= 0, f"missing {name}"
    rest = source[start:]
    next_export = rest.find("\nexport ", len(marker))
    return rest if next_export < 0 else rest[:next_export]


def main() -> None:
    service = read("serverless/crm-booking-pack-d1.ts")
    portal = read("serverless/client-portal-d1.ts")
    types = read("src/admin/types/crm.ts")
    job = read("src/admin/pages/CRMJob.tsx")
    css = read("src/admin/admin-theme.css")

    helper = exported_function(
        service,
        "getJobCommercialWorkspace",
    )

    # Read model is explicit, workspace-scoped and read-only.
    assert 'actor?.workspaceId' in helper
    assert '"crm:read"' in helper
    assert "FROM crm_jobs" in helper
    assert "FROM crm_invoices" in helper
    assert "FROM crm_invoice_schedule_items" in helper
    assert "FROM crm_invoice_payments" in helper
    assert "FROM crm_contracts" in helper
    assert "FROM crm_contract_versions" in helper
    assert "FROM crm_contract_signatures" in helper
    assert "FROM crm_quote_acceptances" in helper
    assert "workspace_id = ?" in helper
    assert "job_id = ?" in helper

    upper = helper.upper()
    for forbidden in (
        "INSERT INTO",
        "UPDATE CRM_",
        "DELETE FROM",
    ):
        assert forbidden not in upper, (
            f"commercial Job read model contains write SQL: {forbidden}"
        )

    # Existing Job route is extended, not replaced with a parallel API.
    assert (
        'import { getJobCommercialWorkspace } '
        'from "./crm-booking-pack-d1";'
    ) in portal
    assert (
        "getJobCommercialWorkspace(db, actor, jobId)"
    ) in portal
    assert "commercial," in portal

    # Stable typed Admin payload.
    for token in (
        "CrmJobCommercialScheduleItem",
        "CrmJobCommercialInvoice",
        "CrmJobCommercialContract",
        "CrmJobCommercialQuote",
        "CrmJobCommercialWorkspace",
        "commercial: CrmJobCommercialWorkspace;",
    ):
        assert token in types, token

    # v1.10.12a keeps the commercial read model on the Job but
    # presents it as compact operational summary rows. Assert the
    # semantic data and real destinations rather than JSX whitespace.
    assert 'title="Booking and payments"' in job
    assert "crm-job-commercial-summary-list" in job
    assert "crm-commercial-summary-row" in job

    for label in (
        "Invoice",
        "Contract",
        "Questionnaire",
        "Accepted quote",
        "Total",
        "Paid",
        "Balance",
        "Next payment",
    ):
        assert label in job, label

    # Invoice summary and dedicated Invoice Admin destination.
    assert "commercialInvoice.totalAmount" in job
    assert "commercialInvoice.paidAmount" in job
    assert "commercialInvoice.balanceAmount" in job
    assert "commercialInvoice.nextPayment" in job
    assert (
        'to={`/admin/crm/jobs/${job.id}/invoices/${commercialInvoice.id}`}'
        in job
    )

    # Contract signature progress and real Client Portal action remain.
    assert "commercialContract.signatureCount" in job
    assert "commercialContract.requiredSignatures" in job
    assert "commercialContract.versionNumber" in job
    assert "sendContractToPortal(" in job
    assert "commercialContract.id" in job
    assert "Send to Client Portal" in job

    # Questionnaire shortcut still targets the authoritative lower editor.
    assert 'href="#job-questionnaires"' in job
    assert 'id="job-questionnaires"' in job

    # Accepted quote retains its immutable commercial summary and route.
    assert "commercialQuote.totalAmount" in job
    assert (
        "to={`/admin/crm/quotes/${commercialQuote.id}`}"
        in job
    )

    # Existing lifecycle and detailed commercial source remain intact.
    assert 'title="Wedding delivery and content"' in job
    assert 'title="Quote and package"' in job
    assert 'id="job-questionnaires"' in job
    assert 'id="job-clients"' in job

    # Connected-payment actions are deliberately not surfaced yet.
    panel_start = job.index('title="Booking and payments"')
    panel_end = job.index(
        'title="Wedding delivery and content"',
        panel_start,
    )
    panel = job[panel_start:panel_end].lower()
    assert "pay with stripe" not in panel
    assert "connect stripe" not in panel
    assert "checkout" not in panel

    # Dedicated responsive styles.
    for selector in (
        ".crm-commercial-panel",
        ".crm-commercial-grid",
        ".crm-commercial-card",
        ".crm-commercial-card__icon",
        ".crm-commercial-card__metrics",
        ".crm-commercial-card__next",
    ):
        assert selector in css, selector

    print("PASS v1.10.5a Job commercial workspace UI")
    print("  commercial read model: workspace-scoped and read-only")
    print("  invoice total/paid/balance/next payment: surfaced")
    print("  contract signature progress: surfaced")
    print("  questionnaire and accepted quote: linked in Job")
    print("  existing Job lifecycle/detail sections: preserved")
    print("  connected payment actions: deferred")


if __name__ == "__main__":
    main()
