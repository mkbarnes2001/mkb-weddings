#!/usr/bin/env python3
"""v1.10.5a contracts/invoicing schema foundation regression."""

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]

SCHEMA = ROOT / "d1/schema.sql"
MIGRATION = (
    ROOT
    / "d1/migrations/"
    "039_crm_booking_pack_commercial_foundation.sql"
)

MARKER = (
    "-- v1.10.5a: WedCRM booking pack, "
    "contracts and invoicing foundation."
)

A = "workspace_mkb_weddings"
B = "workspace_commercial_test"


def one(
    con: sqlite3.Connection,
    sql: str,
    params: tuple = (),
):
    return con.execute(
        sql,
        params,
    ).fetchone()


def must_fail(
    con: sqlite3.Connection,
    sql: str,
    params: tuple = (),
    contains: str = "",
):
    try:
        con.execute(
            sql,
            params,
        )
    except sqlite3.DatabaseError as error:
        if contains:
            assert (
                contains.lower()
                in str(error).lower()
            ), (
                str(error),
                contains,
            )
        return

    raise AssertionError(
        "Expected SQL statement to fail: "
        + sql
    )


def tables(
    con: sqlite3.Connection,
):
    return {
        row[0]
        for row in con.execute(
            "SELECT name "
            "FROM sqlite_master "
            "WHERE type='table'"
        ).fetchall()
    }


def main() -> None:
    schema = SCHEMA.read_text(
        encoding="utf-8"
    )

    migration = MIGRATION.read_text(
        encoding="utf-8"
    )

    assert MARKER in schema
    assert migration.startswith(MARKER)

    # Fresh canonical schema.
    con = sqlite3.connect(":memory:")
    con.row_factory = sqlite3.Row
    con.executescript(schema)

    assert one(
        con,
        "SELECT value FROM schema_meta "
        "WHERE key='schema_version'",
    )[0] == "40"

    required = {
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
    }

    assert required <= tables(con), (
        required - tables(con)
    )

    # Exact upgrade boundary: canonical schema before the
    # v1.10.5a marker must still represent schema 38.
    prefix = schema.split(
        MARKER,
        1,
    )[0]

    upgrade = sqlite3.connect(":memory:")
    upgrade.row_factory = sqlite3.Row
    upgrade.executescript(prefix)

    assert one(
        upgrade,
        "SELECT value FROM schema_meta "
        "WHERE key='schema_version'",
    )[0] == "38"

    upgrade.executescript(migration)

    assert one(
        upgrade,
        "SELECT value FROM schema_meta "
        "WHERE key='schema_version'",
    )[0] == "39"

    assert not upgrade.execute(
        "PRAGMA foreign_key_check"
    ).fetchall()

    # Existing MKB workspace receives safe commercial
    # defaults, without inventing a deposit amount.
    settings_a = one(
        con,
        """
        SELECT
          auto_create_contract,
          auto_create_invoice,
          auto_assign_questionnaire,
          deposit_type,
          deposit_value,
          final_balance_due_days_before_event
        FROM crm_booking_settings
        WHERE workspace_id=?
        """,
        (A,),
    )

    assert tuple(settings_a) == (
        1,
        1,
        0,
        "none",
        0,
        30,
    )

    sequence_a = one(
        con,
        """
        SELECT prefix, next_number, padding
        FROM crm_invoice_sequences
        WHERE workspace_id=?
        """,
        (A,),
    )

    assert tuple(sequence_a) == (
        "INV",
        1,
        4,
    )

    # Second workspace proves tenant-scoped uniqueness and
    # relationship guards.
    con.execute(
        """
        INSERT INTO workspaces (
          id, slug, name
        ) VALUES (
          ?, 'commercial-test', 'Commercial Test'
        )
        """,
        (B,),
    )

    con.execute(
        """
        INSERT INTO workspace_settings (
          workspace_id,
          business_name
        ) VALUES (
          ?, 'Commercial Test'
        )
        """,
        (B,),
    )

    con.execute(
        """
        INSERT INTO crm_booking_settings (
          workspace_id
        ) VALUES (?)
        """,
        (B,),
    )

    con.execute(
        """
        INSERT INTO crm_invoice_sequences (
          workspace_id
        ) VALUES (?)
        """,
        (B,),
    )

    con.execute(
        """
        INSERT INTO crm_contacts (
          id,
          workspace_id,
          display_name,
          email_normalized,
          email
        ) VALUES (
          'commercial-contact-a',
          ?,
          'A Client',
          'commercial-a@example.test',
          'commercial-a@example.test'
        )
        """,
        (A,),
    )

    con.execute(
        """
        INSERT INTO crm_contacts (
          id,
          workspace_id,
          display_name,
          email_normalized,
          email
        ) VALUES (
          'commercial-contact-b',
          ?,
          'B Client',
          'commercial-b@example.test',
          'commercial-b@example.test'
        )
        """,
        (B,),
    )

    con.execute(
        """
        INSERT INTO client_identities (
          id,
          workspace_id,
          email_normalized,
          email,
          display_name
        ) VALUES (
          'commercial-identity-a',
          ?,
          'commercial-a@example.test',
          'commercial-a@example.test',
          'A Client'
        )
        """,
        (A,),
    )

    con.execute(
        """
        INSERT INTO client_identities (
          id,
          workspace_id,
          email_normalized,
          email,
          display_name
        ) VALUES (
          'commercial-identity-b',
          ?,
          'commercial-b@example.test',
          'commercial-b@example.test',
          'B Client'
        )
        """,
        (B,),
    )

    con.execute(
        """
        INSERT INTO crm_jobs (
          id,
          workspace_id,
          reference,
          title,
          status,
          currency,
          value_amount,
          event_date
        ) VALUES (
          'commercial-job-a',
          ?,
          'JOB-COM-A',
          'A Wedding',
          'booked',
          'GBP',
          269500,
          '2027-08-29'
        )
        """,
        (A,),
    )

    con.execute(
        """
        INSERT INTO crm_jobs (
          id,
          workspace_id,
          reference,
          title,
          status,
          currency,
          value_amount,
          event_date
        ) VALUES (
          'commercial-job-b',
          ?,
          'JOB-COM-B',
          'B Wedding',
          'booked',
          'GBP',
          150000,
          '2027-09-20'
        )
        """,
        (B,),
    )

    con.execute(
        """
        INSERT INTO crm_contract_templates (
          id,
          workspace_id,
          name,
          content_json
        ) VALUES (
          'commercial-template-a',
          ?,
          'Photography contract',
          '[{"type":"text","value":"Terms A"}]'
        )
        """,
        (A,),
    )

    con.execute(
        """
        INSERT INTO crm_contract_templates (
          id,
          workspace_id,
          name,
          content_json
        ) VALUES (
          'commercial-template-b',
          ?,
          'Photography contract',
          '[{"type":"text","value":"Terms B"}]'
        )
        """,
        (B,),
    )

    # Same contract-template name is valid in another tenant.
    assert one(
        con,
        """
        SELECT COUNT(*)
        FROM crm_contract_templates
        WHERE name='Photography contract'
        """,
    )[0] == 2

    # Workspace settings cannot reference another tenant's
    # contract template.
    must_fail(
        con,
        """
        UPDATE crm_booking_settings
        SET default_contract_template_id=
          'commercial-template-a'
        WHERE workspace_id=?
        """,
        (B,),
        "workspace mismatch",
    )

    con.execute(
        """
        UPDATE crm_booking_settings
        SET default_contract_template_id=
          'commercial-template-a'
        WHERE workspace_id=?
        """,
        (A,),
    )

    # Contract root is workspace guarded.
    con.execute(
        """
        INSERT INTO crm_contracts (
          id,
          workspace_id,
          job_id,
          primary_contact_id,
          template_id,
          reference,
          title
        ) VALUES (
          'commercial-contract-a',
          ?,
          'commercial-job-a',
          'commercial-contact-a',
          'commercial-template-a',
          'CON-0001',
          'A Photography Contract'
        )
        """,
        (A,),
    )

    must_fail(
        con,
        """
        INSERT INTO crm_contracts (
          id,
          workspace_id,
          job_id,
          primary_contact_id,
          template_id,
          reference,
          title
        ) VALUES (
          'commercial-contract-cross',
          ?,
          'commercial-job-b',
          'commercial-contact-b',
          'commercial-template-b',
          'CON-X',
          'Cross Tenant'
        )
        """,
        (A,),
        "workspace mismatch",
    )

    con.execute(
        """
        INSERT INTO crm_contract_versions (
          id,
          workspace_id,
          contract_id,
          version_number,
          title,
          content_json,
          booking_snapshot_json
        ) VALUES (
          'commercial-contract-version-a1',
          ?,
          'commercial-contract-a',
          1,
          'A Photography Contract',
          '[{"type":"text","value":"Terms A"}]',
          '{"totalAmount":269500}'
        )
        """,
        (A,),
    )

    con.execute(
        """
        UPDATE crm_contracts
        SET current_version_id=
          'commercial-contract-version-a1'
        WHERE id='commercial-contract-a'
        """,
    )

    must_fail(
        con,
        """
        INSERT INTO crm_contract_versions (
          id,
          workspace_id,
          contract_id,
          version_number
        ) VALUES (
          'commercial-contract-version-cross',
          ?,
          'commercial-contract-a',
          2
        )
        """,
        (B,),
        "workspace mismatch",
    )

    # Once sent, client-facing contract content is immutable.
    con.execute(
        """
        UPDATE crm_contract_versions
        SET status='sent',
            sent_at=CURRENT_TIMESTAMP
        WHERE id='commercial-contract-version-a1'
        """,
    )

    must_fail(
        con,
        """
        UPDATE crm_contract_versions
        SET content_json='[]'
        WHERE id='commercial-contract-version-a1'
        """,
        contains="immutable",
    )

    must_fail(
        con,
        """
        DELETE FROM crm_contract_versions
        WHERE id='commercial-contract-version-a1'
        """,
        contains="cannot be deleted",
    )

    con.execute(
        """
        INSERT INTO crm_contract_signatures (
          id,
          workspace_id,
          contract_id,
          version_id,
          contact_id,
          identity_id,
          signer_name,
          signer_email,
          signature_text,
          consent_text
        ) VALUES (
          'commercial-signature-a',
          ?,
          'commercial-contract-a',
          'commercial-contract-version-a1',
          'commercial-contact-a',
          'commercial-identity-a',
          'A Client',
          'commercial-a@example.test',
          'A Client',
          'I agree to this contract.'
        )
        """,
        (A,),
    )

    must_fail(
        con,
        """
        UPDATE crm_contract_signatures
        SET signer_name='Changed'
        WHERE id='commercial-signature-a'
        """,
        contains="immutable",
    )

    # Invoice is independently workspace owned.
    con.execute(
        """
        INSERT INTO crm_invoices (
          id,
          workspace_id,
          job_id,
          primary_contact_id,
          reference,
          currency,
          subtotal_amount,
          total_amount,
          business_snapshot_json,
          client_snapshot_json,
          booking_snapshot_json
        ) VALUES (
          'commercial-invoice-a',
          ?,
          'commercial-job-a',
          'commercial-contact-a',
          'INV-0001',
          'GBP',
          269500,
          269500,
          '{"name":"Business A"}',
          '{"name":"A Client"}',
          '{"jobId":"commercial-job-a"}'
        )
        """,
        (A,),
    )

    must_fail(
        con,
        """
        INSERT INTO crm_invoices (
          id,
          workspace_id,
          job_id,
          primary_contact_id,
          reference
        ) VALUES (
          'commercial-invoice-cross',
          ?,
          'commercial-job-b',
          'commercial-contact-b',
          'INV-X'
        )
        """,
        (A,),
        "workspace mismatch",
    )

    # Invoice references are unique inside a tenant, not
    # globally across businesses.
    con.execute(
        """
        INSERT INTO crm_invoices (
          id,
          workspace_id,
          job_id,
          primary_contact_id,
          reference,
          currency,
          total_amount
        ) VALUES (
          'commercial-invoice-b',
          ?,
          'commercial-job-b',
          'commercial-contact-b',
          'INV-0001',
          'GBP',
          150000
        )
        """,
        (B,),
    )

    con.execute(
        """
        INSERT INTO crm_invoice_items (
          id,
          workspace_id,
          invoice_id,
          item_type,
          name,
          description,
          quantity,
          unit_price_amount,
          line_total_amount,
          display_order
        ) VALUES (
          'commercial-item-a',
          ?,
          'commercial-invoice-a',
          'package',
          'Photography Package',
          'Wedding photography',
          1,
          269500,
          269500,
          10
        )
        """,
        (A,),
    )

    con.execute(
        """
        INSERT INTO crm_invoice_schedule_items (
          id,
          workspace_id,
          invoice_id,
          schedule_type,
          label,
          amount,
          due_date,
          display_order
        ) VALUES (
          'commercial-schedule-deposit-a',
          ?,
          'commercial-invoice-a',
          'deposit',
          'Booking deposit',
          35000,
          '2026-08-09',
          10
        )
        """,
        (A,),
    )

    con.execute(
        """
        INSERT INTO crm_invoice_schedule_items (
          id,
          workspace_id,
          invoice_id,
          schedule_type,
          label,
          amount,
          due_date,
          display_order
        ) VALUES (
          'commercial-schedule-balance-a',
          ?,
          'commercial-invoice-a',
          'final',
          'Final balance',
          234500,
          '2027-07-30',
          20
        )
        """,
        (A,),
    )

    # Issuing locks the commercial document and schedule.
    con.execute(
        """
        UPDATE crm_invoices
        SET status='issued',
            issue_date='2026-08-09',
            due_date='2027-07-30',
            issued_at=CURRENT_TIMESTAMP
        WHERE id='commercial-invoice-a'
        """,
    )

    must_fail(
        con,
        """
        UPDATE crm_invoices
        SET total_amount=1
        WHERE id='commercial-invoice-a'
        """,
        contains="immutable",
    )

    must_fail(
        con,
        """
        UPDATE crm_invoice_items
        SET line_total_amount=1
        WHERE id='commercial-item-a'
        """,
        contains="immutable",
    )

    must_fail(
        con,
        """
        UPDATE crm_invoice_schedule_items
        SET amount=1
        WHERE id='commercial-schedule-deposit-a'
        """,
        contains="immutable",
    )

    # Payments are append-only accounting records.
    con.execute(
        """
        INSERT INTO crm_invoice_payments (
          id,
          workspace_id,
          invoice_id,
          schedule_item_id,
          payment_type,
          amount,
          currency,
          method,
          reference,
          recorded_by_email,
          paid_at
        ) VALUES (
          'commercial-payment-a',
          ?,
          'commercial-invoice-a',
          'commercial-schedule-deposit-a',
          'payment',
          35000,
          'GBP',
          'bank_transfer',
          'BANK-001',
          'admin@example.test',
          '2026-08-09T12:00:00Z'
        )
        """,
        (A,),
    )

    must_fail(
        con,
        """
        UPDATE crm_invoice_payments
        SET amount=1
        WHERE id='commercial-payment-a'
        """,
        contains="immutable",
    )

    must_fail(
        con,
        """
        DELETE FROM crm_invoice_payments
        WHERE id='commercial-payment-a'
        """,
        contains="immutable",
    )

    must_fail(
        con,
        """
        INSERT INTO crm_invoice_payments (
          id,
          workspace_id,
          invoice_id,
          payment_type,
          amount
        ) VALUES (
          'commercial-payment-cross',
          ?,
          'commercial-invoice-a',
          'payment',
          100
        )
        """,
        (B,),
        "workspace mismatch",
    )

    # Schedule totals represent the whole invoice.
    scheduled = one(
        con,
        """
        SELECT COALESCE(SUM(amount), 0)
        FROM crm_invoice_schedule_items
        WHERE workspace_id=?
          AND invoice_id='commercial-invoice-a'
        """,
        (A,),
    )[0]

    assert scheduled == 269500

    # Payments and refunds are intentionally additive;
    # balance will be calculated from immutable records.
    paid = one(
        con,
        """
        SELECT
          COALESCE(
            SUM(
              CASE payment_type
                WHEN 'payment' THEN amount
                WHEN 'refund' THEN -amount
                ELSE 0
              END
            ),
            0
          )
        FROM crm_invoice_payments
        WHERE workspace_id=?
          AND invoice_id='commercial-invoice-a'
        """,
        (A,),
    )[0]

    assert paid == 35000

    assert not con.execute(
        "PRAGMA foreign_key_check"
    ).fetchall()

    # No later migration should exist while this release
    # slice is under construction.
    assert not (
        ROOT
        / "d1/migrations/"
        "040_crm_connected_payments.sql"
    ).exists()

    print(
        "PASS v1.10.5a commercial schema foundation"
    )
    print(
        "  schema transition: 38 -> 39"
    )
    print(
        "  booking settings: workspace-scoped"
    )
    print(
        "  contracts: versioned and signature-audited"
    )
    print(
        "  sent contract content: immutable"
    )
    print(
        "  invoices: tenant-scoped document snapshots"
    )
    print(
        "  payment schedules: deposit/instalment/final ready"
    )
    print(
        "  payments/refunds: append-only records"
    )
    print(
        "  connected payment provider: deliberately deferred"
    )


if __name__ == "__main__":
    main()
