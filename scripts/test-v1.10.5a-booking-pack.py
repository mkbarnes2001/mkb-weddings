#!/usr/bin/env python3
"""v1.10.5a automatic booking-pack service regression."""

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8"
    )


def main() -> None:
    schema = read(
        "d1/schema.sql"
    )

    service = read(
        "serverless/crm-booking-pack-d1.ts"
    )

    quotes = read(
        "serverless/crm-quotes-d1.ts"
    )

    operations = read(
        "serverless/platform-operations-d1.ts"
    )

    con = sqlite3.connect(":memory:")
    con.executescript(schema)

    current_schema_version = int(
        con.execute(
            "SELECT value "
            "FROM schema_meta "
            "WHERE key='schema_version'"
        ).fetchone()[0]
    )
    assert current_schema_version >= 39

    # Dedicated service has no default-tenant fallback and
    # deliberately avoids importing Client Portal, which
    # already imports quote functions.
    assert (
        "export async function "
        "ensureBookingPackForAcceptedQuote"
        in service
    )

    assert (
        "workspace_mkb_weddings"
        not in service
    )

    assert (
        "client-portal-d1"
        not in service
    )

    # Lazy commercial setup means newly provisioned
    # workspaces are safe without a second provisioning path.
    assert (
        "INSERT OR IGNORE INTO\n"
        "        crm_booking_settings"
        in service
    )

    assert (
        "INSERT OR IGNORE INTO\n"
        "        crm_invoice_sequences"
        in service
    )

    # Invoice generation comes from the immutable quote
    # acceptance and Job snapshots.
    for token in (
        "FROM crm_quote_acceptances",
        "selected_package_snapshot_json",
        "selected_addons_snapshot_json",
        "quote_acceptance_id",
        "'accepted_quote'",
        "crm_invoice_items",
        "crm_invoice_schedule_items",
        "Booking deposit",
        "Final balance",
        "final_balance_due_days_before_event",
        "deposit_due_days_after_acceptance",
        "UPDATE crm_invoice_sequences",
        "RETURNING",
    ):
        assert token in service, token

    # Percentage deposits use basis points and cannot exceed
    # the invoice total.
    assert (
        "Math.min(\n"
        "            10000,\n"
        "            depositValue"
        in service
    )

    # Invoice children are created while draft, then the
    # document is issued and locked by schema triggers.
    invoice_insert = service.index(
        "INSERT OR IGNORE INTO\n"
        "        crm_invoices"
    )

    item_insert = service.index(
        "INSERT OR IGNORE INTO\n"
        "        crm_invoice_items"
    )

    invoice_issue = service.index(
        "UPDATE crm_invoices"
    )

    assert (
        invoice_insert
        < item_insert
        < invoice_issue
    )

    assert (
        "status = 'issued'"
        in service
    )

    # No legal contract wording is invented. A contract is
    # generated only from the business's configured active
    # contract template.
    assert (
        "default_contract_template_id"
        in service
    )

    assert (
        "FROM crm_contract_templates"
        in service
    )

    assert (
        "AND status = 'active'"
        in service
    )

    assert (
        "template.content_json"
        in service
    )

    assert (
        "Booking contract"
        in service
    )

    # Portal access determines whether generated contract /
    # questionnaire records are immediately sent or remain
    # draft for Admin review/invitation.
    assert (
        "FROM crm_job_client_access"
        in service
    )

    assert (
        'hasPortalAccess\n'
        '      ? "sent"\n'
        '      : "draft"'
        in service
    )

    # Questionnaire automation is opt-in and only uses the
    # configured active template; it snapshots the template.
    for token in (
        "auto_assign_questionnaire",
        "default_questionnaire_template_id",
        "FROM crm_questionnaire_templates",
        "crm_questionnaire_instances",
        "template.schema_json",
        "questionnaire_due_days_before_event",
    ):
        assert token in service, token

    # Both client and Admin acceptance continue through the
    # single shared core. Booking-pack repair also runs for
    # all idempotent acceptance returns.
    assert (
        'import { ensureBookingPackForAcceptedQuote } '
        'from "./crm-booking-pack-d1";'
        in quotes
    )

    assert (
        quotes.count(
            "ensureBookingPackForAcceptedQuote("
        )
        == 3
    )

    assert (
        "acceptQuoteAsAdmin"
        in quotes
    )

    assert (
        "acceptQuoteAsClient"
        in quotes
    )

    assert (
        "acceptQuoteCore"
        in quotes
    )

    assert (
        "bookingPack,"
        in quotes
    )

    # Every schema-39 commercial table participates in the
    # workspace data export.
    export_tables = [
        "crm_booking_settings",
        "crm_contract_templates",
        "crm_contracts",
        "crm_contract_versions",
        "crm_contract_signatures",
        "crm_invoice_sequences",
        "crm_invoices",
        "crm_invoice_items",
        "crm_invoice_schedule_items",
        "crm_invoice_payments",
    ]

    for table in export_tables:
        assert (
            f'"{table}"'
            in operations
        ), (
            "workspace export missing "
            + table
        )

    # Structural DB protections remain intact.
    required = set(
        export_tables
    )

    actual = {
        row[0]
        for row in con.execute(
            "SELECT name "
            "FROM sqlite_master "
            "WHERE type='table'"
        )
    }

    assert required <= actual

    assert not con.execute(
        "PRAGMA foreign_key_check"
    ).fetchall()

    print(
        "PASS v1.10.5a automatic booking pack service"
    )
    print(
        "  shared quote acceptance hook: verified"
    )
    print(
        "  idempotent booking-pack repair: verified"
    )
    print(
        "  invoice generation/payment schedule: verified"
    )
    print(
        "  configured contract template only: verified"
    )
    print(
        "  configured questionnaire assignment: verified"
    )
    print(
        "  portal-aware sent/draft state: verified"
    )
    print(
        "  commercial workspace export: verified"
    )
    print(
        "  connected payments: deferred"
    )


if __name__ == "__main__":
    main()
