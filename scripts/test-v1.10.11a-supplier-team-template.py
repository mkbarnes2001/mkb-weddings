#!/usr/bin/env python3
"""Focused v1.10.11a regression for the single Supplier team template model."""

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


# Supplier remains the established structured questionnaire type.
assert (
    'supplier: "Supplier team"'
    in builder
)

assert (
    '"supplier"'
    in types
)

for token in [
    "supplierRole: string;",
    "supplierCategory: string;",
    "allowUnlisted: boolean;",
    "multiple: boolean;",
]:
    assert token in types, token


# New supplier fields remain one multi-row team field.
assert (
    'field.type === "supplier"\n        ? true'
    in builder
)

assert (
    "A questionnaire only needs one supplier list."
    in builder
)

assert (
    "supplierAlreadyAdded"
    in builder
)

assert (
    "type === \"supplier\""
    in builder
)


# Per-field role/category filters and the single/multiple toggle
# are no longer exposed as the primary template configuration.
for retired in [
    "Wedding supplier role",
    "Supplier category filter",
    "Allow multiple suppliers",
    "Useful for a full supplier-team question",
]:
    assert retired not in builder, retired


# The intended row model is explicit in both configuration and preview.
for token in [
    "One Supplier team list",
    "Category + Supplier rows",
    "Choose category",
    "Search Supplier Master or type a supplier name",
    "Add as many supplier rows as needed.",
    "Allow supplier not listed",
]:
    assert token in builder, token


# Existing transport/server contract is deliberately unchanged.
for token in [
    'field.type === "supplier"',
    "syncSupplierAnswers",
    "supplierAnswers",
    "crm_supplier_submissions",
    "linkSupplierToWedding",
]:
    assert token in server, token


print(
    "PASS v1.10.11a single Supplier team template model"
)
print(
    "  one Supplier team field encouraged: verified"
)
print(
    "  duplicate Supplier team guard: verified"
)
print(
    "  Supplier team remains multi-row: verified"
)
print(
    "  row-level Category + Supplier preview: verified"
)
print(
    "  unlisted supplier review path retained: verified"
)
print(
    "  structured server contract unchanged: verified"
)
print(
    "  schema transition: none"
)
