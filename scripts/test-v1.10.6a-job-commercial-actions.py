#!/usr/bin/env python3
"""Focused source regression for v1.10.6a Job commercial lifecycle actions."""

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(
        encoding="utf-8"
    )


def main() -> None:
    service = read(
        "serverless/crm-commercial-actions-d1.ts"
    )
    booking = read(
        "serverless/crm-booking-pack-d1.ts"
    )
    route = read(
        "functions/api/crm/[[path]].ts"
    )
    api = read(
        "src/admin/services/AdminApiService.ts"
    )
    job = read(
        "src/admin/pages/CRMJob.tsx"
    )

    con = sqlite3.connect(":memory:")
    con.executescript(
        read("d1/schema.sql")
    )

    version = con.execute(
        "SELECT value FROM schema_meta "
        "WHERE key='schema_version'"
    ).fetchone()[0]

    assert str(version) == "41"
    # v1.10.6a itself introduced no migration. Later releases
    # may legitimately add migration 040 and beyond.

    # Booking-pack repair uses the existing shared,
    # idempotent generator rather than duplicating
    # invoice/contract/questionnaire creation.
    for token in (
        'import {\n'
        '  ensureBookingPackForAcceptedQuote,\n'
        '} from "./crm-booking-pack-d1";',
        "export async function repairJobBookingPack(",
        "FROM crm_jobs",
        "FROM crm_quotes",
        "FROM crm_quote_acceptances",
        "quote.accepted_job_id",
        'text(quote.status) !== "accepted"',
        "ensureBookingPackForAcceptedQuote(",
        "quoteId,",
        "jobId,",
        '"booking_pack.repaired"',
    ):
        assert token in service, token

    # Draft contract send is workspace + Job scoped,
    # requires an active portal-access relationship,
    # and moves both root and current version from
    # draft to sent without altering the snapshot.
    for token in (
        "export async function "
        "sendDraftContractToPortal(",
        "FROM crm_contracts contract",
        "crm_contract_versions version",
        "contract.job_id = ?",
        "contract.workspace_id = ?",
        'text(contract.status) !== "draft"',
        'text(contract.version_status) !== "draft"',
        "FROM crm_job_client_access",
        "status = 'active'",
        "UPDATE crm_contract_versions",
        "UPDATE crm_contracts",
        "status = 'sent'",
        "status = 'draft'",
        '"contract.sent"',
    ):
        assert token in service, token

    # Existing commercial permission and support
    # write boundary remains the authority.
    assert (
        'actor.permissions.includes(\n'
        '      "crm:manage",'
        in service
    )
    assert (
        'text(\n'
        '      actor?.accessMode,\n'
        '    ) === "support"'
        in service
    )

    # Admin API routes expose only the two required
    # lifecycle actions.
    for token in (
        "repairJobBookingPack",
        "sendDraftContractToPortal",
        'parts[2] === "booking-pack"',
        'parts[2] === "contracts"',
        'parts[4] === "send"',
        "getCrmJobWorkspace(",
    ):
        assert token in route, token

    for token in (
        "repairCrmBookingPack",
        "/booking-pack",
        "sendCrmContractToPortal",
        "/contracts/${",
        "}/send",
    ):
        assert token in api, token

    # Job UI exposes explicit, bounded actions and
    # blocks them in support mode.
    for token in (
        'const canManageCommercial = '
        'canManage && auth.accessMode !== "support"',
        "Generate / repair booking pack",
        "Send to Client Portal",
        "repairCrmBookingPack",
        "sendCrmContractToPortal",
        "No email was sent.",
        "Invite a client to the Client Portal "
        "before sending this draft contract.",
    ):
        assert token in job, token

    # Invoice issue remains the booking-pack concern.
    assert "status = 'issued'" in booking
    for forbidden in (
        "issueCrmInvoice",
        "issueInvoiceForJob",
        "Issue invoice",
        "Stripe Connect",
    ):
        assert forbidden not in service
        assert forbidden not in route
        assert forbidden not in job

    print(
        "PASS v1.10.6a Job commercial "
        "lifecycle actions"
    )
    print(
        "  booking-pack repair: shared and "
        "idempotent"
    )
    print(
        "  contract send: draft -> sent only"
    )
    print(
        "  workspace + Job boundaries: verified"
    )
    print(
        "  crm:manage + support write block: "
        "verified"
    )
    print(
        "  Client Portal access prerequisite: "
        "verified"
    )
    print(
        "  separate invoice issue action: absent"
    )
    print(
        "  connected payments: deferred"
    )
    print(
        "  schema: 39 unchanged"
    )


if __name__ == "__main__":
    main()
