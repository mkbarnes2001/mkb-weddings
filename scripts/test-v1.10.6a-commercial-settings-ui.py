#!/usr/bin/env python3
"""Source regression checks for v1.10.6a commercial settings Admin UI."""

from pathlib import Path
import re
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def main() -> None:
    crm = read("src/admin/pages/CRM.tsx")
    navigation = read("src/admin/navigation/adminModules.ts")
    api = read("src/admin/services/AdminApiService.ts")
    types = read("src/admin/types/crm.ts")
    schema = read("d1/schema.sql")

    con = sqlite3.connect(":memory:")
    con.executescript(schema)
    version = con.execute(
        "SELECT value FROM schema_meta WHERE key = 'schema_version' LIMIT 1"
    ).fetchone()

    assert version and version[0] == "39"
    assert not list(
        (ROOT / "d1/migrations").glob("040*")
    ), "v1.10.6a commercial workflow polish must remain schema 39"

    # Deep-linkable CRM settings view and canonical sidebar navigation.
    assert '"commercial-settings"' in crm
    assert '"commercial-settings", "lead-form"' in crm
    assert '"commercial-settings": "Commercial settings"' in crm
    assert 'key: "commercial-settings"' in navigation
    assert 'label: "Commercial settings"' in navigation
    assert 'to: "/admin/crm?view=commercial-settings"' in navigation
    assert 'icon: Settings' in navigation
    assert (
        'exactWithQuery("/admin/crm", "view", "commercial-settings")'
        in navigation
    )

    # Existing workspace-scoped commercial settings API is consumed directly.
    assert "function CommercialSettings(" in crm
    assert "AdminApiService.getCrmCommercialSettings()" in crm
    assert "AdminApiService.saveCrmCommercialSettings(input)" in crm
    assert "CrmCommercialSettingsPayload" in crm
    assert "CrmCommercialSettingsInput" in crm
    assert '"/api/crm/commercial/settings"' in api

    # Booking automation controls expose only configuration already owned by
    # schema 39.
    for token in [
        "Create contract automatically",
        "Default contract template",
        "Create invoice automatically",
        "Assign questionnaire automatically",
        "Default questionnaire",
        "payload.contractTemplates.map",
        "payload.questionnaireTemplates.map",
        "autoCreateContract",
        "autoCreateInvoice",
        "autoAssignQuestionnaire",
        "defaultContractTemplateId",
        "defaultQuestionnaireTemplateId",
    ]:
        assert token in crm, token

    # Payment defaults use user-facing pounds/percent values while preserving
    # stored minor-units/basis-points representation.
    for token in [
        'title="Payment schedule"',
        "Deposit type",
        "Deposit (£)",
        "Deposit (%)",
        "depositValue / 100",
        "Math.round(bounded * 100)",
        "depositDueDaysAfterAcceptance",
        "finalBalanceDueDaysBeforeEvent",
        "questionnaireDueDaysBeforeEvent",
    ]:
        assert token in crm, token

    # Invoice sequence presentation deliberately keeps next_number read-only.
    for token in [
        'title="Invoice numbering"',
        "Invoice prefix",
        "Number padding",
        "Next invoice number",
        "payload.invoiceSequence.prefix",
        "payload.invoiceSequence.padding",
        "payload.invoiceSequence.nextNumber",
        "Saving settings never resets this number.",
    ]:
        assert token in crm, token

    save_match = re.search(
        r"const input: CrmCommercialSettingsInput = \{(.*?)\n    \};",
        crm,
        flags=re.DOTALL,
    )
    assert save_match, "commercial settings save input not found"
    save_block = save_match.group(1)
    assert "invoicePrefix:" in save_block
    assert "invoicePadding:" in save_block
    assert "nextNumber" not in save_block, (
        "Admin settings must never write/reset the live invoice sequence"
    )

    next_number_match = re.search(
        r'label="Next invoice number".*?'
        r'value=\{payload\.invoiceSequence\.nextNumber\}'
        r'.*?disabled'
        r'.*?readOnly',
        crm,
        flags=re.DOTALL,
    )
    assert next_number_match, (
        "next invoice number must be visibly read-only"
    )

    # Default invoice client wording is configurable.
    for token in [
        'title="Invoice wording"',
        "invoiceNotes",
        "invoiceTerms",
        "Save commercial settings",
    ]:
        assert token in crm, token

    # CRM manage is still the UI write boundary, with support sessions reduced
    # to read-only before the server's independent support write guard.
    assert (
        'canManage={canManage && auth.accessMode !== "support"}'
        in crm
    )
    assert "disabled={!canManage || saving}" in crm
    assert "Commercial settings are read-only in this session." in crm

    # Existing type/API contracts remain the source of truth.
    for token in [
        "export type CrmCommercialSettingsPayload",
        "export type CrmCommercialSettingsInput",
        "invoicePrefix",
        "invoicePadding",
        "nextNumber",
    ]:
        assert token in types, token

    print("PASS v1.10.6a commercial settings Admin UI")
    print("  CRM navigation and deep link: verified")
    print("  booking automation/template defaults: verified")
    print("  deposit and deadline configuration: verified")
    print("  pounds/percentage storage conversion: verified")
    print("  invoice numbering without sequence reset: verified")
    print("  invoice notes and terms: verified")
    print("  crm:manage/support read-only UI boundary: verified")
    print("  schema: 39 unchanged")


if __name__ == "__main__":
    main()
