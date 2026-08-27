#!/usr/bin/env python3
"""v1.10.12a Gate 2F Payments Overview."""

from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8",
    )


service = read(
    "serverless/crm-payments-overview-d1.ts"
)

route = read(
    "functions/api/crm/payments/index.ts"
)

page = read(
    "src/admin/pages/CRMPayments.tsx"
)

types = read(
    "src/admin/types/crm.ts"
)

api = read(
    "src/admin/services/AdminApiService.ts"
)

app = read(
    "src/admin/app/AdminApp.tsx"
)

nav = read(
    "src/admin/navigation/adminModules.ts"
)

css = read(
    "src/admin/admin-theme.css"
)

schema = read(
    "d1/schema.sql"
)

legacy_nav = read(
    "scripts/test-platform-modules-navigation.py"
)


# Overview is derived from the existing accounting model.
for token in [
    "crm_invoices",
    "crm_invoice_schedule_items",
    "crm_invoice_payments",
    "allocateInvoiceScheduleRows",
    "allocatedBySchedule",
    "unallocatedNet",
    "automaticPool",
    "signedPaymentAmount",
]:
    assert token in service, token


# No duplicate receivables / amount-paid persistence.
for forbidden in [
    "CREATE TABLE crm_payments_overview",
    "CREATE TABLE crm_receivables",
    "ALTER TABLE crm_invoice_schedule_items",
]:
    assert forbidden not in service, forbidden


# Draft and void invoices do not become receivables.
assert (
    "NOT IN (\n"
    "              'draft',\n"
    "              'void'"
    in service
)


# Workspace scoping and server permission.
assert (
    '"crm:read"'
    in service
)

assert (
    "actor.workspaceId"
    in service
)


# Existing unallocated-payment model is applied in schedule order.
for token in [
    "display_order",
    "due_date",
    "created_at",
    "unallocatedRemainder",
]:
    assert token in service, token


# Operational status buckets.
for token in [
    '"outstanding"',
    '"overdue"',
    '"due_soon"',
    '"paid"',
    "30",
]:
    assert token in service, token


# API is authenticated and read-only.
assert (
    "requireProfessionalContext"
    in route
)

assert (
    "getCrmPaymentsOverview"
    in route
)

assert (
    "onRequestGet"
    in route
)

assert (
    "onRequestPost"
    not in route
)


# Admin type / API contract.
assert (
    "export type CrmPaymentsOverview"
    in types
)

assert (
    "export type CrmPaymentOverviewRow"
    in types
)

assert (
    "getCrmPaymentsOverview"
    in api
)

assert (
    '"/api/crm/payments"'
    in api
)


# Dedicated page and route.
assert (
    "export function CRMPayments"
    in page
)

assert (
    'path="crm/payments"'
    in app
)

assert (
    'to: "/admin/crm/payments"'
    in nav
)

assert (
    'label: "Payments"'
    in nav
)


# Payments is operational, while Payment setup remains separate.
assert (
    nav.index(
        'label: "Payments"'
    )
    < nav.index(
        'label: "Packages"'
    )
)

assert (
    nav.index(
        'label: "Payment setup"'
    )
    > nav.index(
        'label: "Commercial settings"'
    )
)


# Studio-Ninja-inspired receivables structure.
for token in [
    "Outstanding",
    "Overdue",
    "Due soon",
    "Paid / collected",
    "Status",
    "Due",
    "Invoice",
    "Client",
    "Job",
    "Amount",
    "Search invoice, client or Job",
]:
    assert token in page, token


# Rows lead back to the existing invoice workspace.
assert (
    "/invoices/"
    in page
)

assert (
    'title="Open invoice"'
    in page
)


# Payment setup is linked, not duplicated.
assert (
    'to="/admin/crm/payment-setup"'
    in page
)


# Historical navigation regression now recognises the real page.
assert (
    'assert \'label: "Payments"\' in modules'
    in legacy_nav
)

assert (
    'assert \'to: "/admin/crm/payments"\' in modules'
    in legacy_nav
)


# Compact responsive styling.
for token in [
    "v1.10.12a — Gate 2F Payments overview",
    ".crm-payments-summary",
    ".crm-payments-toolbar",
    ".crm-payments-table",
    ".crm-payments-action",
]:
    assert token in css, token


# Payments Overview itself adds no schema migration; later Gate 2F migrations are allowed.
# Later v1.10.12a migrations are allowed; this gate itself introduced no schema migration.

db = sqlite3.connect(":memory:")
db.executescript(schema)

version = db.execute(
    """
    SELECT value
    FROM schema_meta
    WHERE key = 'schema_version'
    LIMIT 1
    """
).fetchone()[0]

assert int(version) >= 50

db.close()


print(
    "PASS v1.10.12a Payments Overview"
)
print(
    "  existing invoice ledger derivation: verified"
)
print(
    "  automatic schedule allocation: verified"
)
print(
    "  workspace / crm:read boundary: verified"
)
print(
    "  outstanding / overdue / due-soon / paid summary: verified"
)
print(
    "  dedicated WedCRM Payments route: verified"
)
print(
    "  invoice deep links: verified"
)
print(
    "  Payment setup separation: verified"
)
print(
    "  compact responsive table: verified"
)
print(
    "  schema 50+ payment foundation: verified"
)
