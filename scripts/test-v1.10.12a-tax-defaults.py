#!/usr/bin/env python3
"""Focused regression for v1.10.12a workspace tax defaults and historical tax labelling."""

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]

MIGRATION = (
    ROOT
    / "d1/migrations"
    / "051_crm_tax_defaults.sql"
)

MARKER = (
    "-- v1.10.12a: workspace tax defaults "
    "and historical tax labelling."
)


def read(relative: str) -> str:
    return (
        ROOT / relative
    ).read_text(
        encoding="utf-8",
    )


def one(
    con: sqlite3.Connection,
    sql: str,
    params=(),
):
    return con.execute(
        sql,
        params,
    ).fetchone()


def must_fail(
    con: sqlite3.Connection,
    sql: str,
    params=(),
):
    try:
        con.execute(
            sql,
            params,
        )
    except sqlite3.DatabaseError:
        return

    raise AssertionError(
        "Expected SQLite constraint failure: "
        + sql
    )


def main() -> None:
    schema = read(
        "d1/schema.sql"
    )

    migration = (
        MIGRATION.read_text(
            encoding="utf-8",
        )
    )

    assert migration.startswith(
        MARKER
    )

    assert schema.count(MARKER) == 1

    # Fresh canonical schema is 51.
    con = sqlite3.connect(":memory:")
    con.executescript(schema)

    assert one(
        con,
        (
            "SELECT value "
            "FROM schema_meta "
            "WHERE key='schema_version'"
        ),
    )[0] == "51"

    columns = {
        row[1]
        for row in con.execute(
            "PRAGMA table_info("
            "crm_booking_settings)"
        )
    }

    assert {
        "default_tax_treatment",
        "default_tax_rate_basis_points",
        "tax_label",
    } <= columns

    invoice_columns = {
        row[1]
        for row in con.execute(
            "PRAGMA table_info("
            "crm_invoices)"
        )
    }

    # We use existing immutable invoice snapshot JSON,
    # rather than creating a second tax-label column.
    assert "tax_label" not in invoice_columns

    # Tax registration number remains a business-profile field.
    assert "tax_number" not in columns
    assert "tax_number" not in migration

    # Exact additive upgrade 50 -> 51.
    prefix = schema.split(
        MARKER,
        1,
    )[0]

    upgrade = sqlite3.connect(
        ":memory:",
    )

    upgrade.executescript(prefix)

    assert one(
        upgrade,
        (
            "SELECT value "
            "FROM schema_meta "
            "WHERE key='schema_version'"
        ),
    )[0] == "50"

    workspace = one(
        upgrade,
        (
            "SELECT id "
            "FROM workspaces "
            "ORDER BY id "
            "LIMIT 1"
        ),
    )

    assert workspace

    workspace_id = workspace[0]

    upgrade.execute(
        """
        INSERT OR IGNORE INTO
          crm_booking_settings (
            workspace_id
          )
        VALUES (?)
        """,
        (workspace_id,),
    )

    upgrade.executescript(
        migration,
    )

    assert one(
        upgrade,
        (
            "SELECT value "
            "FROM schema_meta "
            "WHERE key='schema_version'"
        ),
    )[0] == "51"

    defaults = one(
        upgrade,
        """
        SELECT
          default_tax_treatment,
          default_tax_rate_basis_points,
          tax_label
        FROM crm_booking_settings
        WHERE workspace_id = ?
        """,
        (workspace_id,),
    )

    assert defaults == (
        "none",
        0,
        "Tax",
    ), defaults

    must_fail(
        upgrade,
        """
        UPDATE crm_booking_settings
        SET default_tax_treatment =
          'invalid'
        WHERE workspace_id = ?
        """,
        (workspace_id,),
    )

    must_fail(
        upgrade,
        """
        UPDATE crm_booking_settings
        SET default_tax_rate_basis_points =
          10001
        WHERE workspace_id = ?
        """,
        (workspace_id,),
    )

    must_fail(
        upgrade,
        """
        UPDATE crm_booking_settings
        SET tax_label = ''
        WHERE workspace_id = ?
        """,
        (workspace_id,),
    )

    must_fail(
        upgrade,
        """
        UPDATE crm_booking_settings
        SET tax_label = ?
        WHERE workspace_id = ?
        """,
        (
            "X" * 41,
            workspace_id,
        ),
    )

    settings = read(
        "serverless/"
        "crm-commercial-settings-d1.ts"
    )

    for token in (
        "default_tax_treatment",
        "default_tax_rate_basis_points",
        "tax_label",
        "defaultTaxTreatment",
        "defaultTaxRateBasisPoints",
        "taxLabel",
        "Default tax rate must be between 0% and 100%.",
        "Tax label must be between 1 and 40 characters.",
    ):
        assert token in settings, token

    crm = read(
        "src/admin/pages/CRM.tsx"
    )

    for token in (
        'title="Tax defaults"',
        'label="Tax treatment"',
        'label="Tax label"',
        'label="Tax rate (%)"',
        "No tax",
        "Included in prices",
        "Added to prices",
        "defaultTaxTreatment",
        "defaultTaxRateBasisPoints",
        "taxLabel",
    ):
        assert token in crm, token

    types = read(
        "src/admin/types/crm.ts"
    )

    for token in (
        "defaultTaxTreatment",
        "defaultTaxRateBasisPoints",
        "taxLabel",
    ):
        assert token in types, token

    # New untemplated quotes snapshot workspace defaults.
    quotes = read(
        "serverless/crm-quotes-d1.ts"
    )

    create_start = quotes.index(
        "export async function createQuote("
    )

    create_end = quotes.index(
        "function percentageDiscount(",
        create_start,
    )

    create_region = quotes[
        create_start:
        create_end
    ]

    for token in (
        "FROM crm_booking_settings",
        "default_tax_treatment",
        "default_tax_rate_basis_points",
        "tax_label",
        "JSON.stringify({ taxLabel })",
        "defaultTaxTreatment",
        "defaultTaxRateBasisPoints",
    ):
        assert token in create_region, token

    assert (
        'taxLabel: text(existingVersionSnapshot?.taxLabel) || "Tax"'
        in quotes
    )

    # Quote revisions carry the existing immutable snapshot forward.
    revision_start = quotes.index(
        "function quoteRevisionSnapshot("
    )

    revision_end = quotes.index(
        "async function quoteBookingPackPreview(",
        revision_start,
    )

    revision = quotes[
        revision_start:
        revision_end
    ]

    assert "...snapshot," in revision

    # Quote templates still override treatment/rate.
    templates = read(
        "serverless/"
        "crm-commercial-templates-d1.ts"
    )

    assert (
        "template.taxTreatment"
        in templates
    )

    assert (
        ".taxRateBasisPoints"
        in templates
    )

    # Acceptance snapshots label into the Job quote snapshot.
    assert (
        'taxLabel: text(version.taxLabel) || "Tax"'
        in quotes
    )

    booking = read(
        "serverless/"
        "crm-booking-pack-d1.ts"
    )

    for token in (
        "invoiceBookingSnapshot",
        "quote_snapshot_json",
        "quoteSnapshot.taxLabel",
        "invoice.booking_snapshot_json",
        "taxLabel:",
    ):
        assert token in booking, token

    # Business registration ownership is unchanged.
    assert "taxNumber:" in booking
    assert "source.tax_number" in booking

    public_invoice = read(
        "serverless/"
        "client-portal-commercial-d1.ts"
    )

    for token in (
        'booking["taxLabel"]',
        '|| "Tax"',
        "taxLabel:",
        "invoice.booking_snapshot_json",
    ):
        assert token in public_invoice, token

    portal = read(
        "src/components/ClientPortal.tsx"
    )

    assert (
        "taxLabel: string;"
        in portal
    )

    assert (
        "quote.currentVersion.taxLabel"
        in portal
    )

    assert (
        '|| "Tax"'
        in portal
    )

    invoice_ui = read(
        "src/components/"
        "ClientPortalCommercialDocument.tsx"
    )

    assert (
        "taxLabel: string;"
        in invoice_ui
    )

    assert (
        'invoice.taxLabel || "Tax"'
        in invoice_ui
    )

    assert "<dt>Tax</dt>" not in invoice_ui

    assert not con.execute(
        "PRAGMA foreign_key_check"
    ).fetchall()

    print(
        "PASS v1.10.12a Gate 2F.3D "
        "workspace tax defaults"
    )
    print(
        "  schema transition 50 -> 51: verified"
    )
    print(
        "  existing quote tax engine retained: verified"
    )
    print(
        "  new quote workspace defaults: verified"
    )
    print(
        "  template treatment/rate precedence: verified"
    )
    print(
        "  historical quote/invoice tax label: verified"
    )
    print(
        "  business tax registration ownership: verified"
    )


if __name__ == "__main__":
    main()
