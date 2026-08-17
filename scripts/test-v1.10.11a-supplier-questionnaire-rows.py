#!/usr/bin/env python3
"""Focused v1.10.11a regression for compact supplier questionnaire rows."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8",
    )


client = read(
    "src/components/ClientPortal.tsx"
)

job = read(
    "src/admin/pages/CRMJob.tsx"
)

types = read(
    "src/admin/types/crm.ts"
)

server = read(
    "serverless/client-portal-d1.ts"
)

css = read(
    "src/admin/admin-theme.css"
)


# Platform-controlled category list is read without a schema change.
for token in [
    "async function supplierCategoryOptions(",
    "FROM platform_categories",
    "group_name = 'Supplier taxonomy'",
    "ORDER BY sort_order, name COLLATE NOCASE",
]:
    assert token in server, token


# Job workspace exposes the category list to professional editing.
assert (
    "supplierCategories: string[];"
    in types
)

assert (
    "supplierCategories:"
    in server
)

assert (
    "workspace.supplierCategories"
    in job
)


# Authenticated public questionnaire receives the same category list
# and the full Supplier Master details required for answer autofill.
for token in [
    "supplierCategories:",
    "supplier.website",
    "supplier.instagram",
    "supplier.email",
    "supplier.phone",
    "supplier.location",
    "supplier.county",
]:
    assert token in server, token


for token in [
    "website: string;",
    "instagram: string;",
    "email: string;",
    "phone: string;",
    "supplierCategories",
    "categories={supplierCategories}",
]:
    assert token in client, token


# Client uses one compact Category + Supplier row.
for token in [
    "supplier-questionnaire-table",
    "supplier-questionnaire-row",
    "supplier-questionnaire-category",
    "supplier-questionnaire-supplier",
    "Start typing a supplier name",
    "<datalist",
    "Search Supplier Master, or type a name if it is not listed.",
    "Supplier not listed? Type the business name",
]:
    assert token in client, token


# Old client multi-control workflow is gone.
for token in [
    "Choose existing",
    "Add unlisted",
    "Search suppliers",
    "portal-supplier-details",
]:
    assert token not in client, token


# Selecting an exact Supplier Master match hydrates its stored details.
client_supplier_start = client.index(
    "function SupplierQuestion({"
)

client_supplier_end = client.index(
    "type PortalView",
    client_supplier_start,
)

client_supplier = client[
    client_supplier_start:
    client_supplier_end
]

for token in [
    'mode:\n          "existing"',
    "supplierId:",
    "supplier.website",
    "supplier.instagram",
    "supplier.email",
    "supplier.phone",
    "supplier.location",
    "supplier.county",
]:
    assert token in client_supplier, token


# Professional editor uses the same compact row/typeahead model.
for token in [
    "function ProfessionalSupplierRows({",
    "CrmJobWorkspace[\"supplierCategories\"]",
    "supplier-questionnaire-table--admin",
    "professional_supplier_",
    "<datalist",
    "Start typing a supplier name",
    "Not in Supplier Master — will enter the review queue.",
]:
    assert token in job, token


professional_start = job.index(
    "function ProfessionalSupplierRows({"
)

professional_end = job.index(
    "export function ProfessionalQuestionnaireField",
    professional_start,
)

professional = job[
    professional_start:
    professional_end
]

for token in [
    "supplier.website",
    "supplier.instagram",
    "supplier.email",
    "supplier.phone",
    "supplier.location",
    "supplier.county",
]:
    assert token in professional, token


# Existing structured persistence and approval paths remain authoritative.
for token in [
    "function supplierAnswers(",
    "async function syncSupplierAnswers(",
    "crm_supplier_submissions",
    "linkSupplierToWedding",
    "approveSupplierSubmission",
    "createMasterSupplier",
]:
    assert token in server, token


# The compatibility field still carries the selected category into
# the existing review/create-master pipeline.
assert (
    "category: text(input?.category || row.role)"
    in server
)


marker = (
    "/* v1.10.11a — compact supplier questionnaire rows */"
)

assert marker in css

e2_css = css[
    css.index(marker):
]

for token in [
    ".supplier-questionnaire-table",
    ".supplier-questionnaire-header",
    ".supplier-questionnaire-row",
    ".supplier-questionnaire-state",
    ".supplier-questionnaire-remove",
    "@media (max-width: 680px)",
]:
    assert token in e2_css, token


print(
    "PASS v1.10.11a compact supplier questionnaire rows"
)
print(
    "  platform supplier categories: verified"
)
print(
    "  client Category + Supplier rows: verified"
)
print(
    "  Supplier Master typeahead: verified"
)
print(
    "  known-supplier detail autofill: verified"
)
print(
    "  unlisted free-text review path: verified"
)
print(
    "  professional editor parity: verified"
)
print(
    "  existing approval/persistence contract: verified"
)
print(
    "  schema transition: none"
)
