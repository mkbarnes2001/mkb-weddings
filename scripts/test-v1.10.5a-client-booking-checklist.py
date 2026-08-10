#!/usr/bin/env python3
"""Focused source checks for v1.10.5a Client Portal commercial documents."""

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def main() -> None:
    service = read("serverless/client-portal-commercial-d1.ts")
    portal_service = read("serverless/client-portal-d1.ts")
    portal_ui = read("src/components/ClientPortal.tsx")
    document_ui = read("src/components/ClientPortalCommercialDocument.tsx")
    contract_route = read("functions/api/public/client-portal/contracts/[id].ts")
    invoice_route = read("functions/api/public/client-portal/invoices/[id].ts")
    css = read("src/index.css")

    con = sqlite3.connect(":memory:")
    con.executescript(read("d1/schema.sql"))
    version = con.execute(
        "SELECT value FROM schema_meta WHERE key='schema_version'"
    ).fetchone()[0]
    assert version == "39"

    # All commercial reads use the authenticated client identity and
    # an active Job portal-access relationship as their authority.
    for token in [
        "getAuthenticatedClientIdentity",
        "identity.workspaceId !== workspaceId",
        "crm_job_client_access",
        "access.identity_id = ?",
        "access.status = 'active'",
        "access.workspace_id = ?",
        "job.status NOT IN ('cancelled', 'archived')",
        "authoriseJob",
    ]:
        assert token in service, token

    # Draft/void commercial documents are not client-visible.
    assert "contract.status IN ('sent', 'viewed', 'signed')" in service
    assert "status IN ('sent', 'viewed', 'signed')" in service
    assert "status IN ('issued', 'part_paid', 'paid')" in service

    # Exact schema-39 commercial names are used.
    for token in [
        "content_json",
        "required_signatures",
        "due_date",
        "schedule_type",
        "schedule_item_id",
        "payment_type",
        "unit_price_amount",
        "line_total_amount",
    ]:
        assert token in service, token

    assert "due_at" not in service

    # The public read model deliberately excludes signature-capture
    # and technical audit fields. The same service file now also
    # contains the authenticated signing write path, so restrict
    # these exposure checks to the read-only portion.
    read_service = service.split(
        "export async function signPublicContract",
        1,
    )[0]

    assert "signer_name" in read_service
    assert "signer_email" in read_service
    assert "actor_type" in read_service

    for technical_field in (
        "signature_text",
        "ip_address",
        "user_agent",
        "audit_json",
    ):
        assert technical_field not in read_service, technical_field

    # Payment/refund allocation honours explicit schedule targeting
    # before FIFO allocation and keeps refund handling coherent.
    for token in [
        "signedPaymentAmount",
        "allocateSchedule",
        "const targetId = text(payment.schedule_item_id)",
        "if (target)",
        "for (const item of schedule)",
        "for (const item of [...schedule].reverse())",
        "Math.max(0, netPaid)",
        "Math.max(",
        "totalAmount - paidAmount",
    ]:
        assert token in service, token

    # The new service is read-only.
    for forbidden in [
        "INSERT INTO",
        "UPDATE crm_",
        "DELETE FROM",
    ]:
        assert forbidden not in read_service, forbidden

    # Main portal payload now includes per-Job commercial summary.
    assert 'import { getPublicJobCommercialSummary } from "./client-portal-commercial-d1";' in portal_service
    assert "const commercial = await getPublicJobCommercialSummary(" in portal_service
    assert "commercial," in portal_service

    # Both document endpoints use the existing tenant resolver and
    # private/no-store response pattern.
    for route, function_name in [
        (contract_route, "getPublicContract"),
        (invoice_route, "getPublicInvoice"),
    ]:
        assert function_name in route
        assert "resolveClientPortalWorkspaceId" in route
        assert '"Cache-Control": "private, no-store"' in route
        assert "context.request" in route

    # Client Portal exposes the commercial navigation and checklist.
    for token in [
        'type PortalView = "home" | "quotes" | "contracts" | "invoices" | "questionnaires" | "galleries"',
        "commercial: PortalCommercialSummary",
        "selectedContractId",
        "selectedInvoiceId",
        'setView("contracts")',
        'setView("invoices")',
        "client-portal-booking-checklist",
        "Your booking checklist",
        "allContracts",
        "allInvoices",
        'kind="contract"',
        'kind="invoice"',
    ]:
        assert token in portal_ui, token

    # Detail documents are read-only, printable and contain all
    # commercial information needed for the first portal slice.
    for token in [
        "/api/public/client-portal/contracts/",
        "/api/public/client-portal/invoices/",
        "Print / Save PDF",
        "Invoice items",
        "Payment schedule",
        "Payment history",
        "requiredSignatures",
        "Contract terms",
        "ClientPortalContractSignature",
    ]:
        assert token in document_ui, token

    for selector in [
        ".client-portal-booking-checklist",
        ".client-portal-checklist-item",
        ".client-portal-document",
        ".client-portal-invoice-table",
        ".client-portal-payment-schedule",
        ".client-portal-payment-history",
        "@media print",
    ]:
        assert selector in css, selector

    assert not con.execute("PRAGMA foreign_key_check").fetchall()

    assert "onRequestPost" in contract_route
    assert "onRequestPost" not in invoice_route
    assert "ClientPortalContractSignature" in document_ui
    assert "currentIdentitySigned" in document_ui

    print("PASS v1.10.5a Client Portal booking checklist and commercial views")
    print("  client authority: active Job portal access")
    print("  contracts: sent/viewed/signed read-only")
    print("  invoices: issued/part-paid/paid read-only")
    print("  payment allocation: schedule-aware")
    print("  signature technical metadata: not exposed")
    print("  booking checklist: integrated")
    print("  print/PDF document presentation: integrated")
    print("  schema: 39")


if __name__ == "__main__":
    main()
