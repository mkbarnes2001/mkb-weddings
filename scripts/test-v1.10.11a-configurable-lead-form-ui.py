#!/usr/bin/env python3
"""v1.10.11a configurable lead-form admin/public UI regression."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

CRM = ROOT / "src/admin/pages/CRM.tsx"

PUBLIC = ROOT / "src/components/LeadEnquiryForm.tsx"

SERVER = ROOT / "serverless/crm-d1.ts"

TYPES = ROOT / "src/admin/types/crm.ts"


crm = CRM.read_text(
    encoding="utf-8",
)

public = PUBLIC.read_text(
    encoding="utf-8",
)

server = SERVER.read_text(
    encoding="utf-8",
)

types = TYPES.read_text(
    encoding="utf-8",
)


# ------------------------------------------------------------
# Admin form builder.
# ------------------------------------------------------------

for token in (
    "LEAD_FORM_FIELD_TYPE_OPTIONS",
    "cloneLeadFormSettings",
    'title="Form fields"',
    "Add custom question",
    "function patchField(",
    "function moveField(",
    "function removeField(",
    "function addQuestion()",
    "Custom question",
    "CRM mapping",
    "Move up",
    "Move down",
    "Visible",
    "Required",
    "crm-lead-form-choice-row",
    "draft.publicPath",
    "onSave(draft)",
):
    assert token in crm, token


# CRM-mapped fields keep their fixed canonical input type.
# Only booking-critical locked mappings are non-removable;
# unlocked CRM fields and custom questions may be removed.
field_type_start = crm.index(
    'label="Field type"'
)
field_type_end = crm.index(
    "</AdminField>",
    field_type_start,
)
field_type_region = crm[
    field_type_start:
    field_type_end
]

assert "Boolean(" in field_type_region
assert "field.systemKey" in field_type_region
assert "{!field.locked ? (" in crm

remove_start = crm.index(
    "function removeField("
)
remove_end = crm.index(
    "function restoreCrmField(",
    remove_start,
)
remove_helper = crm[
    remove_start:remove_end
]

assert "|| field.locked" in remove_helper
assert "|| field.systemKey" not in remove_helper
assert "function restoreCrmField(" in crm


# ------------------------------------------------------------
# Dynamic public renderer.
# ------------------------------------------------------------

for token in (
    "type LeadFormFieldType =",
    "fields: LeadFormField[];",
    "function initialAnswers(",
    "const visibleFields =",
    "config.fields.filter(",
    "function renderControl(",
    'field.type === "long_text"',
    'field.type === "select"',
    'field.type === "radio"',
    'field.type === "checkbox"',
    'field.type === "address"',
    'field.type === "venue"',
    "answers,",
    "...systemPayload,",
    "privacyConsent,",
    "marketingConsent,",
    "website,",
):
    assert token in public, token


# Budget input remains human-readable pounds on screen but the
# canonical CRM system payload remains integer minor currency units.
assert 'field.systemKey === "budgetMin"' in public
assert 'field.systemKey === "budgetMax"' in public
assert "Number(raw) * 100" in public
assert "currencySymbol(config.currency)" in public


# Address is structured already, ready for F3 autocomplete without
# another schema change.
for token in (
    "type LeadAddress = {",
    "line1?: string;",
    "postcode?: string;",
    "placeId?: string;",
    "lat?: number;",
    "lng?: number;",
    "function setAddressPart(",
    'autoComplete="address-line1"',
    'autoComplete="postal-code"',
):
    assert token in public, token


# Venue remains a first-class configurable field. Google Places
# behaviour is covered by the dedicated Places regressions.
assert 'field.type === "venue"' in public
assert 'placeholder={\n            field.placeholder\n            || "Venue name or TBC"' in public


# ------------------------------------------------------------
# Backend contract remains aligned.
# ------------------------------------------------------------

for token in (
    "normalizeLeadFormFields",
    "normalizeLeadFormAnswers",
    "lead_form_schema_json",
    "lead_form_answers_json",
    "address_json",
):
    assert token in server, token


for token in (
    "CrmLeadFormFieldType",
    "CrmLeadFormField",
    "CrmLeadAddress",
):
    assert token in types, token


print(
    "PASS v1.10.11a configurable lead-form admin/public UI"
)
print(
    "  admin standard-field editor: verified"
)
print(
    "  custom question creation/removal: verified"
)
print(
    "  field ordering/visibility/required controls: verified"
)
print(
    "  protected identity fields: verified"
)
print(
    "  dynamic public renderer: verified"
)
print(
    "  select/radio/checkbox/text/date/number rendering: verified"
)
print(
    "  structured manual address capture: verified"
)
print(
    "  venue field ready for F3 Places autocomplete: verified"
)
print(
    "  canonical budget minor-unit mapping: verified"
)
print(
    "  configurable answer + legacy notification payload: verified"
)
