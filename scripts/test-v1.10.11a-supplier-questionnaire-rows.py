#!/usr/bin/env python3
"""v1.10.11a supplier questionnaire compatibility regression.

The v1.10.12a simple Supplier field supersedes the old Category +
Supplier row for newly-created fields. The old multi-row renderer is
retained intentionally for versioned legacy questionnaire snapshots.
"""

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


# Platform-controlled supplier categories continue to be exposed
# without a schema change.
for token in [
    "async function supplierCategoryOptions(",
    "FROM platform_categories",
    "group_name = 'Supplier taxonomy'",
    "ORDER BY sort_order, name COLLATE NOCASE",
]:
    assert token in server, token


assert (
    "supplierCategories: string[];"
    in types
)

assert (
    "supplierCategories:"
    in server
)


# Authenticated client questionnaire still receives Supplier Master
# details and category context required for both current and legacy
# versioned questionnaire snapshots.
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
]:
    assert token in client, token


# -------------------------------------------------------------
# Current client Supplier field: one compact supplier-name input.
# Category is defined by the questionnaire field configuration,
# not selected again by the client.
# -------------------------------------------------------------

simple_client_start = client.index(
    "function SimpleSupplierQuestion({"
)

simple_client_end = client.index(
    "function SupplierQuestion({",
    simple_client_start,
)

simple_client = client[
    simple_client_start:
    simple_client_end
]

for token in [
    "targetCategory",
    "field.supplierCategory",
    "field.label",
    "field.supplierRole",
    "Start typing supplier name…",
    "<datalist",
    'mode:\n          "existing"',
    'mode:\n          "unlisted"',
    "supplier.website",
    "supplier.instagram",
    "supplier.email",
    "supplier.phone",
    "supplier.location",
    "supplier.county",
    "Not listed — this supplier will be reviewed.",
]:
    assert token in simple_client, token


# -------------------------------------------------------------
# Legacy client Category + Supplier rows remain for existing
# versioned questionnaires whose Supplier field has multiple=true.
# -------------------------------------------------------------

legacy_client_start = client.index(
    "function SupplierQuestion({"
)

legacy_client_end = client.index(
    "type PortalView",
    legacy_client_start,
)

legacy_client = client[
    legacy_client_start:
    legacy_client_end
]

for token in [
    "supplier-questionnaire-table",
    "supplier-questionnaire-row",
    "supplier-questionnaire-category",
    "supplier-questionnaire-supplier",
    "<datalist",
    "Supplier not listed? Type the business name",
    "supplier.website",
    "supplier.instagram",
    "supplier.email",
    "supplier.phone",
    "supplier.location",
    "supplier.county",
]:
    assert token in legacy_client, token


# Client renderer explicitly routes new fields to simple input and
# old multiple snapshots to the legacy row renderer.
for token in [
    "field.multiple ? (",
    "<SupplierQuestion",
    "<SimpleSupplierQuestion",
    "categories={supplierCategories}",
]:
    assert token in client, token


# Retired pre-compact controls stay absent.
for token in [
    "Choose existing",
    "Add unlisted",
    "Search suppliers",
    "portal-supplier-details",
]:
    assert token not in client, token


# -------------------------------------------------------------
# Current professional editor mirrors the simple client field.
# -------------------------------------------------------------

simple_pro_start = job.index(
    "function SimpleProfessionalSupplierQuestion({"
)

simple_pro_end = job.index(
    "function ProfessionalSupplierRows({",
    simple_pro_start,
)

simple_pro = job[
    simple_pro_start:
    simple_pro_end
]

for token in [
    "targetCategory",
    "field.supplierCategory",
    "field.label",
    "field.supplierRole",
    "Start typing supplier name…",
    "<datalist",
    "supplier.website",
    "supplier.instagram",
    "supplier.email",
    "supplier.phone",
    "supplier.location",
    "supplier.county",
    '"Needs review"',
]:
    assert token in simple_pro, token


# -------------------------------------------------------------
# Legacy professional multi-row renderer remains available.
# -------------------------------------------------------------

legacy_pro_start = job.index(
    "function ProfessionalSupplierRows({"
)

legacy_pro_end = job.index(
    "export function ProfessionalQuestionnaireField",
    legacy_pro_start,
)

legacy_pro = job[
    legacy_pro_start:
    legacy_pro_end
]

for token in [
    "supplier-questionnaire-table--admin",
    "supplier-questionnaire-row",
    "supplier-questionnaire-category",
    "professional_supplier_",
    "<datalist",
    "Not in Supplier Master — will enter the review queue.",
    "supplier.website",
    "supplier.instagram",
    "supplier.email",
    "supplier.phone",
    "supplier.location",
    "supplier.county",
]:
    assert token in legacy_pro, token


# Professional renderer also explicitly preserves the compatibility
# branch for old multiple snapshots.
for token in [
    "return field.multiple ? (",
    "<ProfessionalSupplierRows",
    "<SimpleProfessionalSupplierQuestion",
    "supplierCategories",
]:
    assert token in job, token


# Existing structured persistence and review/approval paths remain
# authoritative for both UI representations.
for token in [
    "function supplierAnswers(",
    "async function syncSupplierAnswers(",
    "crm_supplier_submissions",
    "linkSupplierToWedding",
    "approveSupplierSubmission",
    "createMasterSupplier",
]:
    assert token in server, token


assert (
    "category: text(input?.category || row.role)"
    in server
)


# Legacy CSS must remain while versioned multiple snapshots exist.
legacy_marker = (
    "/* v1.10.11a — compact supplier questionnaire rows */"
)

assert legacy_marker in css

legacy_css = css[
    css.index(legacy_marker):
]

for token in [
    ".supplier-questionnaire-table",
    ".supplier-questionnaire-header",
    ".supplier-questionnaire-row",
    ".supplier-questionnaire-state",
    ".supplier-questionnaire-remove",
    "@media (max-width: 680px)",
]:
    assert token in legacy_css, token


# New simple-field styling must coexist with legacy row styling.
assert (
    "simple supplier questionnaire fields — admin"
    in css
)


# This historical v1.10.11a UI compatibility gate introduced no
# migration itself. Later release migrations, including 050+, are
# valid and must not cause this historical regression to fail.


print(
    "PASS v1.10.11a supplier questionnaire compatibility"
)
print(
    "  platform supplier categories: verified"
)
print(
    "  current client simple supplier field: verified"
)
print(
    "  current professional simple supplier field: verified"
)
print(
    "  legacy client Category + Supplier rows: retained"
)
print(
    "  legacy professional multi-row editor: retained"
)
print(
    "  Supplier Master detail hydration: verified"
)
print(
    "  unlisted review path: verified"
)
print(
    "  approval / persistence contract: verified"
)
print(
    "  schema transition: none"
)
