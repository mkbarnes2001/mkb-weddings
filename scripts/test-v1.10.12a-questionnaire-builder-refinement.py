#!/usr/bin/env python3
"""v1.10.12a compact Questionnaire builder and supplier taxonomy."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (
        ROOT / relative
    ).read_text(
        encoding="utf-8"
    )


page = read(
    "src/admin/pages/CRMQuestionnaireTemplate.tsx"
)

css = read(
    "src/admin/admin-theme.css"
)

crm_types = read(
    "src/admin/types/crm.ts"
)

platform_types = read(
    "src/admin/types/platform.ts"
)

api = read(
    "src/admin/services/AdminApiService.ts"
)


# Existing questionnaire JSON already carries the supplier
# metadata needed by the compact builder.
for token in (
    "supplierRole: string;",
    "supplierCategory: string;",
    '"address"',
    '"venue"',
    '"supplier"',
):
    assert token in crm_types, token


# Canonical taxonomy remains platform-owned but business-readable.
assert (
    "supplierTaxonomy: PlatformSupplierTaxonomy;"
    in platform_types
)

for token in (
    "static async getWedPlannedPlatform()",
    '"/api/platform"',
):
    assert token in api, token

for token in (
    ".getWedPlannedPlatform()",
    "platform.supplierTaxonomy?.categories",
    "platform.supplierTaxonomy?.roles",
    "normaliseSupplierTaxonomy",
):
    assert token in page, token


# Old overlapping type-button palette has gone.
assert (
    'className="questionnaire-field-palette"'
    not in page
)

for token in (
    'className="admin-select questionnaire-builder-add-field"',
    'aria-label="Add questionnaire field"',
    "Add field…",
):
    assert token in page, token


# Compact expandable rows mirror the Lead Form interaction.
for token in (
    "expandedQuestionnaireFieldId",
    "questionnaire-builder-field__summary",
    "questionnaire-builder-field__toggle",
    "questionnaire-builder-field__identity",
    "questionnaire-builder-field__meta",
    "questionnaire-builder-field__chevron",
    "questionnaire-builder-field__actions",
    "questionnaire-builder-field__editor",
    'title="Move up"',
    'title="Move down"',
    'title="Remove field"',
):
    assert token in page, token


# Supplier configuration consumes category + category-filtered role.
for token in (
    'label="Supplier category"',
    'label="Wedding role"',
    "supplierTaxonomy.categories",
    "supplierRolesForCategory",
    "role.category",
    "=== field.supplierCategory",
    "roleInSelectedCategory",
    "Supplier Master matching and review behaviour are unchanged.",
):
    assert token in page, token


# Existing Places field types stay part of the same builder contract.
for token in (
    'address: "Address"',
    'venue: "Venue"',
):
    assert token in page, token


# Compact styling remains normal-Admin scoped.
for token in (
    "v1.10.12a — compact Questionnaire builder",
    ".questionnaire-builder-add-field",
    ".questionnaire-builder-field__summary",
    ".questionnaire-builder-field__editor",
    ".questionnaire-builder-supplier-config__grid",
    "--admin-module-record-background",
    "--admin-role-main-size",
    "--admin-role-helper-size",
):
    assert token in css, token


assert not list(
    (ROOT / "d1/migrations").glob("050*")
)


print(
    "PASS v1.10.12a compact Questionnaire builder refinement"
)
print(
    "  compact Add field control: verified"
)
print(
    "  collapsed expandable rows: verified"
)
print(
    "  compact field actions: verified"
)
print(
    "  business-safe platform taxonomy read: verified"
)
print(
    "  supplier category + filtered Wedding roles: verified"
)
print(
    "  Address / Venue Places contract preserved: verified"
)
print(
    "  schema remains 49: verified"
)
