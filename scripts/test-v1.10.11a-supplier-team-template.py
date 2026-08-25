#!/usr/bin/env python3
"""Supplier questionnaire compatibility after v1.10.12a refinement.

Current contract:
- Supplier category and Wedding role are configured in the template builder.
- New client/professional Supplier questions expose one supplier-name input.
- Legacy Category + Supplier rows remain for versioned multiple=true snapshots.
"""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8",
    )


builder = read(
    "src/admin/pages/CRMQuestionnaireTemplate.tsx"
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


# Supplier remains an explicit questionnaire field type with the
# compatibility metadata required by persisted questionnaire snapshots.
assert 'supplier: "Supplier"' in builder
assert '"supplier"' in types

for token in [
    "supplierRole: string;",
    "supplierCategory: string;",
    "allowUnlisted: boolean;",
    "multiple: boolean;",
]:
    assert token in types, token


# Builder now owns canonical category + Wedding-role configuration.
for token in [
    'label="Supplier category"',
    'label="Wedding role"',
    "Choose category…",
    "Choose Wedding role…",
    "supplierRolesForCategory",
    "role.category",
    "field.supplierCategory",
    "field.supplierRole",
    "Supplier categories and Wedding roles come from the platform supplier taxonomy.",
]:
    assert token in builder, token


# Obsolete builder concepts remain retired.
for retired in [
    "A questionnaire only needs one supplier list.",
    "supplierAlreadyAdded",
    "One Supplier team list",
    "Category + Supplier rows",
    "Allow supplier not listed",
    "One supplier per question",
    "Set the question label to the role",
    "names not found are sent for review",
]:
    assert retired not in builder, retired


# Builder preview retains the simple supplier-name presentation.
for token in [
    "Start typing supplier name…",
    "Supplier Master matches automatically",
    "Other names are sent for review.",
]:
    assert token in builder, token


# New client Supplier fields do not ask the client to choose category.
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
    "field.supplierRole",
    "Start typing supplier name…",
    "<datalist",
]:
    assert token in simple_client, token

assert (
    "supplier-questionnaire-category"
    not in simple_client
)


# Professional simple Supplier entry follows the same contract.
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
    "field.supplierRole",
    "Start typing supplier name…",
    "<datalist",
]:
    assert token in simple_pro, token

assert (
    "supplier-questionnaire-category"
    not in simple_pro
)


# Versioned legacy multi-row snapshots retain their old renderer.
for token in [
    "field.multiple ? (",
    "<SupplierQuestion",
    "<SimpleSupplierQuestion",
]:
    assert token in client, token

for token in [
    "return field.multiple ? (",
    "<ProfessionalSupplierRows",
    "<SimpleProfessionalSupplierQuestion",
]:
    assert token in job, token


# Existing Supplier Master / review persistence remains authoritative.
for token in [
    'field.type === "supplier"',
    "syncSupplierAnswers",
    "supplierAnswers",
    "crm_supplier_submissions",
    "linkSupplierToWedding",
]:
    assert token in server, token


assert not list(
    (ROOT / "d1/migrations").glob("050*")
)


print(
    "PASS supplier questionnaire template compatibility"
)
print(
    "  builder Supplier category configuration: verified"
)
print(
    "  builder Wedding role filtering: verified"
)
print(
    "  client category selector absent for new fields: verified"
)
print(
    "  professional category selector absent for new fields: verified"
)
print(
    "  legacy multi-row snapshots: retained"
)
print(
    "  Supplier Master / review pipeline: retained"
)
print(
    "  schema transition: none"
)
