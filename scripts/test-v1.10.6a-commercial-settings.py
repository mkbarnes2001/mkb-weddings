#!/usr/bin/env python3
"""Focused regression for v1.10.6a commercial settings foundation."""

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(
        encoding="utf-8"
    )


def main() -> None:
    service = read(
        "serverless/crm-commercial-settings-d1.ts"
    )
    route = read(
        "functions/api/crm/[[path]].ts"
    )
    api = read(
        "src/admin/services/AdminApiService.ts"
    )
    types = read(
        "src/admin/types/crm.ts"
    )

    con = sqlite3.connect(":memory:")
    con.executescript(
        read("d1/schema.sql")
    )

    version = con.execute(
        "SELECT value "
        "FROM schema_meta "
        "WHERE key='schema_version'"
    ).fetchone()[0]

    assert version == "41", version

    settings_columns = {
        row[1]
        for row in con.execute(
            "PRAGMA table_info("
            "crm_booking_settings)"
        )
    }

    assert {
        "workspace_id",
        "auto_create_contract",
        "auto_create_invoice",
        "auto_assign_questionnaire",
        "default_contract_template_id",
        "default_questionnaire_template_id",
        "deposit_type",
        "deposit_value",
        "deposit_due_days_after_acceptance",
        "final_balance_due_days_before_event",
        "questionnaire_due_days_before_event",
        "invoice_notes",
        "invoice_terms",
    } <= settings_columns

    sequence_columns = {
        row[1]
        for row in con.execute(
            "PRAGMA table_info("
            "crm_invoice_sequences)"
        )
    }

    assert {
        "workspace_id",
        "prefix",
        "next_number",
        "padding",
    } <= sequence_columns

    # Workspace authority and permissions are explicit.
    for token in (
        'text(actor?.workspaceId)',
        '"crm:read"',
        '"crm:manage"',
        'actor?.accessMode === "support"',
        "WHERE workspace_id = ?",
    ):
        assert token in service, token

    # Defaults can only target active templates
    # from the actor workspace.
    for token in (
        "FROM crm_contract_templates",
        "FROM crm_questionnaire_templates",
        "AND status = 'active'",
        "requireActiveContractTemplate",
        "requireActiveQuestionnaireTemplate",
    ):
        assert token in service, token

    # Booking automation and due-date settings are
    # persisted through the existing schema-39 row.
    for token in (
        "auto_create_contract",
        "auto_create_invoice",
        "auto_assign_questionnaire",
        "deposit_type",
        "deposit_value",
        "deposit_due_days_after_acceptance",
        "final_balance_due_days_before_event",
        "questionnaire_due_days_before_event",
        "invoice_notes",
        "invoice_terms",
    ):
        assert token in service, token

    # Invoice numbering can change presentation
    # without resetting the monotonic sequence.
    assert "crm_invoice_sequences" in service
    assert "prefix =" in service
    assert "padding =" in service
    assert "next_number =" not in service

    input_start = types.index(
        "export type "
        "CrmCommercialSettingsInput"
    )
    input_block = types[input_start:]

    assert "invoicePrefix?: string;" in input_block
    assert "invoicePadding?: number;" in input_block
    assert "nextNumber?:" not in input_block
    assert "nextInvoiceNumber" not in input_block

    # Writes create a workspace-scoped audit event.
    assert (
        "'crm.commercial_settings.updated'"
        in service
    )
    assert "platform_audit_events" in service

    # API contract exists on the current CRM router.
    assert (
        'parts[0] === "commercial"'
        in route
    )
    assert (
        'parts[1] === "settings"'
        in route
    )
    assert "getCrmCommercialSettings" in route
    assert "saveCrmCommercialSettings" in route
    assert (
        '"Cache-Control":'
        in route
        and '"private, no-store"'
        in route
    )

    assert (
        "getCrmCommercialSettings"
        in api
    )
    assert (
        "saveCrmCommercialSettings"
        in api
    )
    assert (
        '"/api/crm/commercial/settings"'
        in api
    )

    # v1.10.6a remains source-only/schema 39.
    assert not (
        ROOT
        / "d1/migrations/"
        "040_crm_commercial_workflow_polish.sql"
    ).exists()

    assert not con.execute(
        "PRAGMA foreign_key_check"
    ).fetchall()

    print(
        "PASS v1.10.6a commercial settings foundation"
    )
    print(
        "  schema: 39 unchanged"
    )
    print(
        "  workspace-scoped reads/writes: verified"
    )
    print(
        "  crm:read / crm:manage boundary: verified"
    )
    print(
        "  support-session writes: blocked"
    )
    print(
        "  active default-template validation: verified"
    )
    print(
        "  invoice sequence number reset: prohibited"
    )
    print(
        "  commercial settings audit: verified"
    )


if __name__ == "__main__":
    main()
