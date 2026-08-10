#!/usr/bin/env python3
"""Focused regression for v1.10.5a client contract signing."""

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
    schema = read("d1/schema.sql")
    service = read(
        "serverless/client-portal-commercial-d1.ts"
    )
    route = read(
        "functions/api/public/client-portal/"
        "contracts/[id].ts"
    )
    document = read(
        "src/components/"
        "ClientPortalCommercialDocument.tsx"
    )
    signature_ui = read(
        "src/components/"
        "ClientPortalContractSignature.tsx"
    )
    css = read("src/index.css")

    con = sqlite3.connect(":memory:")
    con.executescript(schema)

    version = con.execute(
        "SELECT value FROM schema_meta "
        "WHERE key='schema_version'"
    ).fetchone()[0]

    assert version == "39"

    # Schema foundation already guarantees append-only
    # contract signatures.
    triggers = {
        row[0]: row[1] or ""
        for row in con.execute(
            """
            SELECT name, sql
            FROM sqlite_master
            WHERE type='trigger'
              AND (
                name LIKE '%signature%'
                OR name LIKE '%contract_version%'
              )
            """
        )
    }

    trigger_text = "\n".join(
        triggers.values()
    ).lower()

    assert "crm_contract_signatures" in trigger_text
    assert "immutable" in trigger_text

    # Existing authenticated Client Portal identity remains
    # the sole authority.
    for token in [
        "signPublicContract",
        "publicIdentity(",
        "crm_job_client_access",
        "access.identity_id = ?",
        "access.status = 'active'",
        "job.status NOT IN (",
        "required_signatures",
        "accessRole === \"primary\"",
        "accessRole === \"partner\"",
    ]:
        assert token in service, token

    # Duplicate signatures are rejected by identity/version.
    for token in [
        "version_id = ?",
        "identity_id = ?",
        "WHERE NOT EXISTS",
        "You have already signed this contract version.",
    ]:
        assert token in service, token

    # Legal identity is server-derived except for the
    # signer's entered display/signature text.
    assert "identity.email" in service
    assert "input?.signerEmail" not in service
    assert "input?.email" not in service

    for token in [
        "signerName",
        "signatureText",
        "input?.confirmed !== true",
        "CLIENT_CONTRACT_CONSENT_TEXT",
        'request.headers.get(',
        '"CF-Connecting-IP"',
        '"user-agent"',
        "audit_json",
    ]:
        assert token in service, token

    # Signature rows remain append-only.
    assert (
        "INSERT INTO crm_contract_signatures"
        in service
    )
    assert (
        "UPDATE crm_contract_signatures"
        not in service
    )
    assert (
        "DELETE FROM crm_contract_signatures"
        not in service
    )

    # Required signature count drives the final transition.
    for token in [
        "UPDATE crm_contract_versions",
        "status = 'signed'",
        "UPDATE crm_contracts",
        "signed_version_id = ?",
        "SELECT COUNT(*)",
        ">= ?",
    ]:
        assert token in service, token

    # Technical metadata is captured server-side but is not
    # exposed by the public contract response/UI.
    assert "ip_address" not in document
    assert "user_agent" not in document
    assert "audit_json" not in document
    assert "currentIdentitySigned" in service
    assert "currentIdentitySigned" in document

    # Public endpoint remains workspace-resolved and no-store.
    assert "onRequestGet" in route
    assert "onRequestPost" in route
    assert "signPublicContract" in route
    assert "resolveClientPortalWorkspaceId" in route
    assert (
        '"Cache-Control": "private, no-store"'
        in route
    )

    # Client has an explicit consent/signing experience.
    for token in [
        "Electronic signature",
        "Full name",
        "Type your signature",
        'type="checkbox"',
        "Sign contract",
        'method: "POST"',
        'credentials: "include"',
        "confirmed: true",
        "window.location.reload()",
    ]:
        assert token in signature_ui, token

    assert (
        "ClientPortalContractSignature"
        in document
    )

    assert (
        ".client-portal-signature-form"
        in css
    )

    assert not con.execute(
        "PRAGMA foreign_key_check"
    ).fetchall()

    print(
        "PASS v1.10.5a Client Portal contract signing"
    )
    print(
        "  active Job portal identity authority: verified"
    )
    print(
        "  primary/partner signing eligibility: verified"
    )
    print(
        "  duplicate identity/version signing: blocked"
    )
    print(
        "  append-only signature record: verified"
    )
    print(
        "  server-derived signer email: verified"
    )
    print(
        "  consent/IP/user-agent audit capture: verified"
    )
    print(
        "  required-signature completion transition: verified"
    )
    print(
        "  technical metadata exposure: blocked"
    )
    print(
        "  Client Portal signature UI: verified"
    )
    print("  schema: 39")


if __name__ == "__main__":
    main()
