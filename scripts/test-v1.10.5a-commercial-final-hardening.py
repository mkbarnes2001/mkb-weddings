#!/usr/bin/env python3
"""Final schema-39 hardening checks for v1.10.5a."""

from pathlib import Path
import re
import sqlite3


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (
        ROOT / relative
    ).read_text(
        encoding="utf-8"
    )


def provider_unique_indexes(
    con: sqlite3.Connection,
):
    rows = []

    for index in con.execute(
        'PRAGMA index_list("crm_invoice_payments")'
    ):
        name = index[1]
        unique = bool(index[2])

        if not unique:
            continue

        columns = [
            row[2]
            for row in con.execute(
                f'PRAGMA index_info("{name}")'
            )
        ]

        if (
            "provider" in columns
            and "provider_payment_id" in columns
        ):
            sql = con.execute(
                """
                SELECT sql
                FROM sqlite_master
                WHERE type='index'
                  AND name=?
                """,
                (name,),
            ).fetchone()

            rows.append(
                (
                    name,
                    columns,
                    sql[0] if sql else "",
                )
            )

    return rows


def main() -> None:
    schema = read("d1/schema.sql")
    migration = read(
        "d1/migrations/"
        "039_crm_booking_pack_commercial_foundation.sql"
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

    indexes = provider_unique_indexes(con)

    assert len(indexes) == 1, indexes

    name, columns, sql = indexes[0]

    assert "workspace_id" in columns, (
        name,
        columns,
    )
    assert "provider" in columns
    assert "provider_payment_id" in columns

    # Tenant is part of the uniqueness key, so two independent
    # businesses are not forced to share one provider-ID namespace.
    assert columns.index("workspace_id") < columns.index(
        "provider"
    )

    # Preserve the existing partial-index behaviour for blank
    # provider references.
    assert "WHERE" in sql.upper()
    assert "provider" in sql
    assert "provider_payment_id" in sql

    provider_source_indexes = re.findall(
        r"""
        CREATE\s+UNIQUE\s+INDEX
        .*?
        ON\s+crm_invoice_payments
        \s*\(([^)]*)\)
        \s*(?:WHERE\s+.*?)?;
        """,
        migration,
        flags=re.IGNORECASE
        | re.DOTALL
        | re.VERBOSE,
    )

    provider_source_indexes = [
        columns_text
        for columns_text in provider_source_indexes
        if (
            "provider" in columns_text.lower()
            and "provider_payment_id"
            in columns_text.lower()
        )
    ]

    assert len(provider_source_indexes) == 1

    source_columns = [
        column.strip().lower()
        for column
        in provider_source_indexes[0].split(",")
    ]

    assert "workspace_id" in source_columns

    # Technical network/audit details do not belong in a portable
    # workspace export. The signed legal record still does.
    assert (
        'crm_contract_signatures: '
        '["ip_address", "user_agent", "audit_json"]'
        in operations
    )

    redaction_match = re.search(
        r"""
        crm_contract_signatures
        \s*:\s*
        \[(.*?)\]
        """,
        operations,
        flags=re.DOTALL | re.VERBOSE,
    )

    assert redaction_match

    redaction_entry = redaction_match.group(1)

    for required in (
        "ip_address",
        "user_agent",
        "audit_json",
    ):
        assert required in redaction_entry

    for retained in (
        "signature_text",
        "consent_text",
        "signer_name",
        "signer_email",
    ):
        assert retained not in redaction_entry

    assert (
        "Contract signer identity, signature text and consent "
        "remain part of the signed business record"
        in operations
    )

    # Previously-reviewed booking-settings relationship guards
    # remain part of the canonical schema.
    trigger = con.execute(
        """
        SELECT sql
        FROM sqlite_master
        WHERE type='trigger'
          AND name=
            'trg_crm_booking_settings_workspace_update'
        """
    ).fetchone()

    assert trigger

    trigger_sql = trigger[0]

    assert (
        "default_contract_template_id"
        in trigger_sql
    )
    assert (
        "default_questionnaire_template_id"
        in trigger_sql
    )
    assert (
        "template.workspace_id = NEW.workspace_id"
        in trigger_sql
    )

    assert not con.execute(
        "PRAGMA foreign_key_check"
    ).fetchall()

    print(
        "PASS v1.10.5a final commercial schema hardening"
    )
    print(
        "  provider payment IDs: workspace-scoped"
    )
    print(
        "  signature IP/user-agent/audit export metadata: redacted"
    )
    print(
        "  signature text/consent/signer identity: retained"
    )
    print(
        "  booking settings template relationships: guarded"
    )
    print(
        "  schema: 39"
    )


if __name__ == "__main__":
    main()
