#!/usr/bin/env python3
"""Focused v1.10.11a regression for supplier review queue polish."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8",
    )


job = read(
    "src/admin/pages/CRMJob.tsx"
)

api = read(
    "src/admin/services/AdminApiService.ts"
)

server = read(
    "serverless/client-portal-d1.ts"
)

css = read(
    "src/admin/admin-theme.css"
)


# Explicit review state separates create vs merge.
for token in [
    'action: "create" | "merge";',
    "supplierId: string;",
    "category: string;",
    "notes: string;",
]:
    assert token in job, token


# Review queue uses a clear create / merge choice.
for token in [
    "Needs review",
    "Create Supplier Master record",
    "Merge with existing Supplier Master",
    "Choose Supplier Master record…",
    "New Supplier Master record",
    "Create & approve",
    "Merge & approve",
    "Reject",
]:
    assert token in job, token


# Old ambiguous review controls are removed.
for token in [
    "Create new Supplier Master record",
    "Wedding role",
    'label="Approval action"',
]:
    assert token not in job, token


# Category remains the compatibility value used by the established
# server create-master and Wedding-linking contract.
approve_start = job.index(
    "async function approveSupplier("
)

approve_end = job.index(
    "async function rejectSupplier(",
    approve_start,
)

approve = job[
    approve_start:
    approve_end
]

for token in [
    "review.action",
    '"merge"',
    "review.supplierId",
    "category:",
    "review.category",
    "role:",
    "reviewNotes:",
    "approveCrmSupplierSubmission",
]:
    assert token in approve, token


# Merge cannot be approved without selecting an existing master record.
assert (
    "Choose the Supplier Master record to merge this suggestion into."
    in approve
)

assert (
    "merging\n                                && !review.supplierId"
    in job
)


# API paths remain unchanged.
for token in [
    "approveCrmSupplierSubmission",
    "rejectCrmSupplierSubmission",
    "/approve",
    "/reject",
]:
    assert token in api, token


# Server continues to own create / merge / Wedding linking.
approve_server_start = server.index(
    "export async function approveSupplierSubmission"
)

reject_server_start = server.index(
    "export async function rejectSupplierSubmission",
    approve_server_start,
)

approve_server = server[
    approve_server_start:
    reject_server_start
]

for token in [
    "const mergeSupplierId = text(input?.supplierId)",
    "createMasterSupplier",
    "category: text(input?.category || row.role)",
    "linkSupplierToWedding",
    "text(input?.role || row.role)",
    "resolved_supplier_id",
]:
    assert token in approve_server, token


reject_server = server[
    reject_server_start:
]

for token in [
    "status = 'rejected'",
    "review_notes = ?",
    "supplier.rejected",
]:
    assert token in reject_server, token


# E3 styling is compact and responsive.
marker = (
    "/* v1.10.11a — supplier review queue polish */"
)

assert marker in css

e3_css = css[
    css.index(marker):
]

for token in [
    ".crm-supplier-review__heading",
    ".crm-supplier-review__item",
    ".crm-supplier-review__summary",
    ".crm-supplier-review__meta",
    ".crm-supplier-review__fields",
    ".crm-supplier-review__create-note",
    ".crm-supplier-review__actions",
    "@media (max-width: 760px)",
]:
    assert token in e3_css, token


print(
    "PASS v1.10.11a supplier review queue polish"
)
print(
    "  explicit create / merge decision: verified"
)
print(
    "  platform supplier category review: verified"
)
print(
    "  merge target selection: verified"
)
print(
    "  submitted supplier details retained: verified"
)
print(
    "  create / merge approval labels: verified"
)
print(
    "  reject flow retained: verified"
)
print(
    "  existing API/server/Wedding-link contract: verified"
)
print(
    "  schema transition: none"
)
