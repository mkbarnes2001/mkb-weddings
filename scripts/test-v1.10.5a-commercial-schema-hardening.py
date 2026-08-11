#!/usr/bin/env python3
"""v1.10.5a commercial tenant-update hardening regression."""

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]

A = "workspace_mkb_weddings"
B = "workspace_commercial_hardening_b"


def one(con, sql, params=()):
    return con.execute(
        sql,
        params,
    ).fetchone()


def must_fail(
    con,
    sql,
    params=(),
    contains="",
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


def main():
    schema = (
        ROOT / "d1/schema.sql"
    ).read_text(
        encoding="utf-8"
    )

    con = sqlite3.connect(":memory:")
    con.executescript(schema)

    assert one(
        con,
        "SELECT value FROM schema_meta "
        "WHERE key='schema_version'",
    )[0] == "40"

    con.execute(
        """
        INSERT INTO workspaces
          (id, slug, name)
        VALUES
          (?, 'commercial-hardening-b',
           'Commercial Hardening B')
        """,
        (B,),
    )

    con.execute(
        """
        INSERT INTO workspace_settings
          (workspace_id, business_name)
        VALUES
          (?, 'Commercial Hardening B')
        """,
        (B,),
    )

    con.execute(
        "INSERT INTO crm_booking_settings "
        "(workspace_id) VALUES (?)",
        (B,),
    )

    con.execute(
        "INSERT INTO crm_invoice_sequences "
        "(workspace_id) VALUES (?)",
        (B,),
    )

    for workspace, suffix in (
        (A, "a"),
        (B, "b"),
    ):
        stage_id = (
            f"hard-stage-{suffix}"
        )

        con.execute(
            """
            INSERT INTO crm_pipeline_stages (
              id,
              workspace_id,
              stage_key,
              name,
              stage_type,
              sort_order,
              is_default
            ) VALUES (
              ?,
              ?,
              ?,
              ?,
              'open',
              10,
              1
            )
            """,
            (
                stage_id,
                workspace,
                f"hard-new-{suffix}",
                f"Hard New {suffix.upper()}",
            ),
        )

        con.execute(
            """
            INSERT INTO crm_contacts (
              id,
              workspace_id,
              display_name,
              email_normalized,
              email
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (
                f"hard-contact-{suffix}",
                workspace,
                f"Client {suffix.upper()}",
                f"hard-{suffix}@example.test",
                f"hard-{suffix}@example.test",
            ),
        )

        con.execute(
            """
            INSERT INTO crm_enquiries (
              id,
              workspace_id,
              reference,
              stage_id,
              currency
            ) VALUES (?, ?, ?, ?, 'GBP')
            """,
            (
                f"hard-enquiry-{suffix}",
                workspace,
                f"ENQ-HARD-{suffix.upper()}",
                stage_id,
            ),
        )

        con.execute(
            """
            INSERT INTO crm_quotes (
              id,
              workspace_id,
              enquiry_id,
              primary_contact_id,
              reference
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (
                f"hard-quote-{suffix}",
                workspace,
                f"hard-enquiry-{suffix}",
                f"hard-contact-{suffix}",
                f"QUO-HARD-{suffix.upper()}",
            ),
        )

        con.execute(
            """
            INSERT INTO crm_quote_versions (
              id,
              workspace_id,
              quote_id,
              version_number,
              status
            ) VALUES (?, ?, ?, 1, 'draft')
            """,
            (
                f"hard-version-{suffix}",
                workspace,
                f"hard-quote-{suffix}",
            ),
        )

        con.execute(
            """
            INSERT INTO crm_quote_options (
              id,
              workspace_id,
              version_id,
              name,
              base_price_amount
            ) VALUES (?, ?, ?, ?, 100000)
            """,
            (
                f"hard-option-{suffix}",
                workspace,
                f"hard-version-{suffix}",
                f"Package {suffix.upper()}",
            ),
        )

        con.execute(
            """
            UPDATE crm_quote_versions
            SET status='sent',
                sent_at=CURRENT_TIMESTAMP
            WHERE id=?
            """,
            (
                f"hard-version-{suffix}",
            ),
        )

        con.execute(
            """
            UPDATE crm_quotes
            SET current_version_id=?,
                status='sent'
            WHERE id=?
            """,
            (
                f"hard-version-{suffix}",
                f"hard-quote-{suffix}",
            ),
        )

        con.execute(
            """
            INSERT INTO crm_quote_acceptances (
              id,
              workspace_id,
              quote_id,
              version_id,
              option_id,
              contact_id,
              actor_type,
              total_amount
            ) VALUES (?, ?, ?, ?, ?, ?, 'admin', 100000)
            """,
            (
                f"hard-acceptance-{suffix}",
                workspace,
                f"hard-quote-{suffix}",
                f"hard-version-{suffix}",
                f"hard-option-{suffix}",
                f"hard-contact-{suffix}",
            ),
        )

        con.execute(
            """
            UPDATE crm_quote_versions
            SET status='accepted',
                subtotal_amount=100000,
                total_amount=100000
            WHERE id=?
            """,
            (f"hard-version-{suffix}",),
        )

        con.execute(
            """
            INSERT INTO crm_jobs (
              id,
              workspace_id,
              reference,
              enquiry_id,
              title,
              status,
              currency,
              value_amount,
              quote_id,
              quote_version_id
            ) VALUES (?, ?, ?, ?, ?, 'booked',
                      'GBP', 100000, ?, ?)
            """,
            (
                f"hard-job-{suffix}",
                workspace,
                f"JOB-HARD-{suffix.upper()}",
                f"hard-enquiry-{suffix}",
                f"Job {suffix.upper()}",
                f"hard-quote-{suffix}",
                f"hard-version-{suffix}",
            ),
        )

    con.execute(
        """
        INSERT INTO crm_contract_templates (
          id,
          workspace_id,
          name
        ) VALUES (
          'hard-template-a',
          ?,
          'A Contract'
        )
        """,
        (A,),
    )

    con.execute(
        """
        INSERT INTO crm_contract_templates (
          id,
          workspace_id,
          name
        ) VALUES (
          'hard-template-b',
          ?,
          'B Contract'
        )
        """,
        (B,),
    )

    con.execute(
        """
        INSERT INTO crm_contracts (
          id,
          workspace_id,
          job_id,
          primary_contact_id,
          template_id,
          quote_acceptance_id,
          source_kind,
          source_id,
          reference,
          title
        ) VALUES (
          'hard-contract-a',
          ?,
          'hard-job-a',
          'hard-contact-a',
          'hard-template-a',
          'hard-acceptance-a',
          'accepted_quote',
          'hard-acceptance-a',
          'CON-HARD-A',
          'Contract A'
        )
        """,
        (A,),
    )

    con.execute(
        """
        INSERT INTO crm_contract_versions (
          id,
          workspace_id,
          contract_id,
          version_number,
          title
        ) VALUES (
          'hard-contract-version-a',
          ?,
          'hard-contract-a',
          1,
          'Contract A'
        )
        """,
        (A,),
    )

    con.execute(
        """
        INSERT INTO crm_invoices (
          id,
          workspace_id,
          job_id,
          primary_contact_id,
          quote_id,
          quote_version_id,
          quote_acceptance_id,
          source_kind,
          source_id,
          reference,
          currency,
          total_amount
        ) VALUES (
          'hard-invoice-a',
          ?,
          'hard-job-a',
          'hard-contact-a',
          'hard-quote-a',
          'hard-version-a',
          'hard-acceptance-a',
          'accepted_quote',
          'hard-acceptance-a',
          'INV-HARD-A',
          'GBP',
          100000
        )
        """,
        (A,),
    )

    con.execute(
        """
        INSERT INTO crm_invoice_items (
          id,
          workspace_id,
          invoice_id,
          name,
          quantity,
          unit_price_amount,
          line_total_amount
        ) VALUES (
          'hard-item-a',
          ?,
          'hard-invoice-a',
          'Package A',
          1,
          100000,
          100000
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
          amount
        ) VALUES (
          'hard-schedule-a',
          ?,
          'hard-invoice-a',
          'final',
          'Final balance',
          100000
        )
        """,
        (A,),
    )

    # Workspace roots are never movable between tenants.
    must_fail(
        con,
        """
        UPDATE crm_contract_templates
        SET workspace_id=?
        WHERE id='hard-template-a'
        """,
        (B,),
        "immutable",
    )

    must_fail(
        con,
        """
        UPDATE crm_contracts
        SET workspace_id=?
        WHERE id='hard-contract-a'
        """,
        (B,),
        "immutable",
    )

    must_fail(
        con,
        """
        UPDATE crm_invoice_sequences
        SET workspace_id=?
        WHERE workspace_id=?
        """,
        (B, A),
        "immutable",
    )

    must_fail(
        con,
        """
        UPDATE crm_invoices
        SET workspace_id=?
        WHERE id='hard-invoice-a'
        """,
        (B,),
        "immutable",
    )

    # Draft contract acceptance cannot be switched to a
    # different business's accepted quote.
    must_fail(
        con,
        """
        UPDATE crm_contracts
        SET quote_acceptance_id='hard-acceptance-b'
        WHERE id='hard-contract-a'
        """,
        contains="workspace mismatch",
    )

    # Draft version cannot be re-parented across tenants.
    must_fail(
        con,
        """
        UPDATE crm_contract_versions
        SET workspace_id=?,
            contract_id='hard-contract-a'
        WHERE id='hard-contract-version-a'
        """,
        (B,),
        "workspace mismatch",
    )

    # Draft invoice cannot be pointed at another tenant's
    # acceptance or an unrelated Job/quote combination.
    must_fail(
        con,
        """
        UPDATE crm_invoices
        SET quote_acceptance_id='hard-acceptance-b'
        WHERE id='hard-invoice-a'
        """,
        contains="workspace mismatch",
    )

    must_fail(
        con,
        """
        UPDATE crm_invoices
        SET job_id='hard-job-b'
        WHERE id='hard-invoice-a'
        """,
        contains="workspace mismatch",
    )

    # Child rows cannot be moved to another workspace.
    must_fail(
        con,
        """
        UPDATE crm_invoice_items
        SET workspace_id=?
        WHERE id='hard-item-a'
        """,
        (B,),
        "workspace mismatch",
    )

    must_fail(
        con,
        """
        UPDATE crm_invoice_schedule_items
        SET workspace_id=?
        WHERE id='hard-schedule-a'
        """,
        (B,),
        "workspace mismatch",
    )

    # An invoice cannot be initially connected to a quote
    # from a different Job, even within a valid schema row.
    must_fail(
        con,
        """
        INSERT INTO crm_invoices (
          id,
          workspace_id,
          job_id,
          quote_id,
          reference
        ) VALUES (
          'hard-invalid-job-quote',
          ?,
          'hard-job-a',
          'hard-quote-b',
          'INV-HARD-X'
        )
        """,
        (A,),
        "mismatch",
    )

    assert not con.execute(
        "PRAGMA foreign_key_check"
    ).fetchall()

    migration = (
        ROOT
        / "d1/migrations/"
        "039_crm_booking_pack_commercial_foundation.sql"
    ).read_text(
        encoding="utf-8"
    )

    for trigger in (
        "trg_crm_contract_workspace_immutable",
        "trg_crm_contract_acceptance_workspace_update",
        "trg_crm_contract_version_workspace_update",
        "trg_crm_invoice_workspace_immutable",
        "trg_crm_invoice_job_quote_insert",
        "trg_crm_invoice_job_quote_update",
        "trg_crm_invoice_acceptance_workspace_update",
        "trg_crm_invoice_item_workspace_update",
        "trg_crm_invoice_schedule_workspace_update",
    ):
        assert trigger in migration, trigger

    print(
        "PASS v1.10.5a commercial tenant update hardening"
    )
    print(
        "  workspace ownership: immutable"
    )
    print(
        "  draft contract relationships: tenant guarded"
    )
    print(
        "  draft invoice relationships: tenant guarded"
    )
    print(
        "  invoice Job/quote ownership: enforced"
    )
    print(
        "  invoice child rows: cannot cross tenants"
    )
    print(
        "  schema: 39"
    )


if __name__ == "__main__":
    main()
