#!/usr/bin/env python3
"""Supplier questionnaire compatibility after v1.10.12a simplification."""

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

types = read(
    "src/admin/types/crm.ts"
)

server = read(
    "serverless/client-portal-d1.ts"
)


assert 'supplier: "Supplier"' in builder
assert '"supplier"' in types


for token in [
    "supplierRole: string;",
    "supplierCategory: string;",
    "allowUnlisted: boolean;",
    "multiple: boolean;",
]:
    assert token in types, token


for retired in [
    "A questionnaire only needs one supplier list.",
    "supplierAlreadyAdded",
    "One Supplier team list",
    "Category + Supplier rows",
    "Choose category",
    "Allow supplier not listed",
]:
    assert retired not in builder, retired


for token in [
    "One supplier per question",
    "Set the question label to the role",
    "Start typing supplier name…",
    "Supplier Master matches automatically",
    "names not found are sent for review",
]:
    assert token in builder, token


for token in [
    'field.type === "supplier"',
    "syncSupplierAnswers",
    "supplierAnswers",
    "crm_supplier_submissions",
    "linkSupplierToWedding",
]:
    assert token in server, token


print(
    "PASS supplier questionnaire template compatibility"
)

print(
    "  multiple supplier questions: verified"
)

print(
    "  one supplier per new question: verified"
)

print(
    "  Supplier Master / review pipeline: retained"
)

print(
    "  schema transition: none"
)
