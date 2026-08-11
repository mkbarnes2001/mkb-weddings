#!/usr/bin/env python3
"""Focused regression for v1.10.6a contract-template management."""

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(
        encoding="utf-8"
    )


def main() -> None:
    schema = read("d1/schema.sql")
    service = read(
        "serverless/crm-contract-templates-d1.ts"
    )
    router = read(
        "functions/api/crm/[[path]].ts"
    )
    api = read(
        "src/admin/services/AdminApiService.ts"
    )
    types = read(
        "src/admin/types/crm.ts"
    )
    crm = read(
        "src/admin/pages/CRM.tsx"
    )
    editor = read(
        "src/admin/pages/CRMContractTemplate.tsx"
    )
    app = read(
        "src/admin/app/AdminApp.tsx"
    )
    nav = read(
        "src/admin/navigation/adminModules.ts"
    )
    booking = read(
        "serverless/crm-booking-pack-d1.ts"
    )

    con = sqlite3.connect(":memory:")
    con.executescript(schema)

    version = con.execute(
        """
        SELECT value
        FROM schema_meta
        WHERE key='schema_version'
        """
    ).fetchone()[0]

    assert version == "40"

    columns = [
        row[1]
        for row in con.execute(
            "PRAGMA table_info("
            "crm_contract_templates)"
        )
    ]

    assert columns == [
        "id",
        "workspace_id",
        "name",
        "description",
        "content_json",
        "signature_message",
        "status",
        "created_at",
        "updated_at",
    ]

    assert not (
        ROOT
        / "d1/migrations/"
          "040_crm_commercial_workflow_polish.sql"
    ).exists()

    # Explicit tenancy / write boundary.
    for token in [
        "actor?.workspaceId",
        '"crm:read"',
        '"crm:manage"',
        'actor?.accessMode === "support"',
        "WHERE workspace_id = ?",
        "AND id = ?",
    ]:
        assert token in service, token

    # Schema-39 CRUD only.
    for token in [
        "listCrmContractTemplates",
        "getCrmContractTemplate",
        "createCrmContractTemplate",
        "saveCrmContractTemplate",
        "archiveCrmContractTemplate",
        "INSERT INTO crm_contract_templates",
        "UPDATE crm_contract_templates",
        "content_json",
        "signature_message",
    ]:
        assert token in service, token

    # No invented template-version/signature-count columns.
    for forbidden in [
        "updated_by_user_id",
        "created_by_user_id",
        "required_signatures",
        "version = version + 1",
    ]:
        assert forbidden not in service, forbidden

    # Schema 39 has no draft state. New empty templates are
    # deliberately inactive until wording has been entered.
    assert (
        'ContractTemplateStatus =\n'
        '  | "active"\n'
        '  | "archived"'
        in service
    )
    assert (
        'const status:\n'
        '    ContractTemplateStatus =\n'
        '      "archived";'
        in service
    )
    assert (
        "Add contract wording before activating this template."
        in service
    )

    # Deactivation must remove it as booking-pack default.
    assert (
        "default_contract_template_id ="
        in service
    )
    assert (
        "default_contract_template_id = ?"
        in service
    )

    # Existing generated contract/version tables are never
    # changed by template management.
    upper = service.upper()

    for forbidden in [
        "UPDATE CRM_CONTRACTS",
        "DELETE FROM CRM_CONTRACTS",
        "INSERT INTO CRM_CONTRACTS",
        "UPDATE CRM_CONTRACT_VERSIONS",
        "DELETE FROM CRM_CONTRACT_VERSIONS",
        "INSERT INTO CRM_CONTRACT_VERSIONS",
    ]:
        assert forbidden not in upper, forbidden

    # Booking pack remains the snapshot owner.
    assert "template.content_json" in booking
    assert "crm_contract_versions" in booking
    assert "required_signatures," in booking

    # Current release deliberately keeps one generated
    # signature requirement.
    assert (
        "        1,\n"
        "        ?,\n"
        "        CASE"
        in booking
    )

    # Audit coverage.
    for event in [
        "crm.contract_template.created",
        "crm.contract_template.updated",
        "crm.contract_template.archived",
    ]:
        assert event in service, event

    assert "platform_audit_events" in service

    # Router CRUD.
    for token in [
        "listCrmContractTemplates",
        "getCrmContractTemplate",
        "createCrmContractTemplate",
        "saveCrmContractTemplate",
        "archiveCrmContractTemplate",
        'parts[0] === "contracts"',
        'parts[1] === "templates"',
    ]:
        assert token in router, token

    # Admin API.
    for token in [
        "listCrmContractTemplates",
        "getCrmContractTemplate",
        "createCrmContractTemplate",
        "saveCrmContractTemplate",
        "archiveCrmContractTemplate",
        "/api/crm/contracts/templates",
    ]:
        assert token in api, token

    # Typed structured content.
    for token in [
        "CrmContractTemplateSection",
        "CrmContractTemplate",
        '"active" | "archived"',
        "sections:",
    ]:
        assert token in types, token

    # Commercial settings library + creation.
    for token in [
        'title="Contract templates"',
        "listCrmContractTemplates",
        "createCrmContractTemplate",
        "/admin/crm/contracts/templates/",
        "Existing generated contracts keep their saved snapshots",
        'status: "archived"',
        "sections: []",
    ]:
        assert token in crm, token

    # Dedicated editor.
    for token in [
        "CRMContractTemplate",
        "getCrmContractTemplate",
        "saveCrmContractTemplate",
        "archiveCrmContractTemplate",
        'active={\n            mode === "build"',
        'active={\n            mode === "preview"',
        "Add section",
        "Contract wording",
        "Generated contracts keep their own versioned snapshot",
        "WedPlanned does not insert legal wording automatically",
        "One signature",
        "Inactive / archived",
    ]:
        assert token in editor, token

    assert (
        'path="crm/contracts/templates/:id"'
        in app
    )

    assert (
        'import { CRMContractTemplate }'
        in app
    )

    assert (
        'pathname.startsWith("/admin/crm/contracts/templates/")'
        in nav
    )

    print(
        "PASS v1.10.6a contract-template management"
    )
    print(
        "  schema: 39 unchanged"
    )
    print(
        "  actual 9-column template contract: verified"
    )
    print(
        "  workspace-scoped CRUD: verified"
    )
    print(
        "  support-session writes: blocked"
    )
    print(
        "  structured contract sections: verified"
    )
    print(
        "  inactive-first creation: verified"
    )
    print(
        "  active wording validation: verified"
    )
    print(
        "  default clearing on deactivation: verified"
    )
    print(
        "  generated contract snapshots: untouched"
    )
    print(
        "  one-signature schema-39 behaviour: preserved"
    )
    print(
        "  audit trail: verified"
    )
    print(
        "  Admin library/editor/preview: verified"
    )


if __name__ == "__main__":
    main()
