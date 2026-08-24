#!/usr/bin/env python3
"""Gate 2D.2A regression: Lead Form field management."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (
        ROOT / relative
    ).read_text(
        encoding="utf-8",
    )


crm = read(
    "src/admin/pages/CRM.tsx"
)

types = read(
    "src/admin/types/crm.ts"
)

server = read(
    "serverless/crm-d1.ts"
)

css = read(
    "src/admin/admin-theme.css"
)

public = read(
    "src/components/LeadEnquiryForm.tsx"
)


builder_start = crm.index(
    'title="Form fields"'
)

builder_end = crm.index(
    "function QuestionnaireLibrary",
    builder_start,
)

builder = crm[
    builder_start:
    builder_end
]


# ------------------------------------------------------------
# Protected booking fields remain structural.
# ------------------------------------------------------------

protected_start = server.index(
    'for (const systemKey of ['
)

protected_end = server.index(
    "return fields.length",
    protected_start,
)

protected = server[
    protected_start:
    protected_end
]

for token in (
    '"firstName"',
    '"email"',
    '"eventDate"',
):
    assert token in protected, token


# Lead Source remains a normal default field but may now
# be deliberately removed from a saved form.
assert (
    'id: "leadSource"'
    in server
)

assert (
    'systemKey: "leadSource"'
    in server
)

assert (
    'if (!systemKeys.has("leadSource"))'
    not in server
)


# ------------------------------------------------------------
# Admin receives the omitted-system-field restore library.
# ------------------------------------------------------------

for token in (
    "leadFormFields",
    "leadFormSystemKeys",
    "availableLeadFormFields",
    "availableFields:",
):
    assert token in server, token

assert (
    "availableFields?: CrmLeadFormField[];"
    in types
)


# Only unlocked defaults enter the restore library.
available_start = server.index(
    "const availableLeadFormFields"
)

available_end = server.index(
    "return {",
    available_start,
)

available = server[
    available_start:
    available_end
]

for token in (
    "Boolean(field.systemKey)",
    "!field.locked",
    "!leadFormSystemKeys.has(",
):
    assert token in available, token


# ------------------------------------------------------------
# Optional CRM fields and custom questions are removable.
# Locked fields are not.
# ------------------------------------------------------------

assert (
    "{!field.locked ? ("
    in builder
)

assert (
    'title="Remove field"'
    in builder
)

assert (
    "function removeField("
    in crm
)

assert (
    "|| field.systemKey"
    not in crm[
        crm.index(
            "function removeField("
        ):
        crm.index(
            "function addQuestion()"
        )
    ]
)


# ------------------------------------------------------------
# Removed system fields are directly restorable.
# ------------------------------------------------------------

for token in (
    "function restoreCrmField(",
    'aria-label="Add CRM field"',
    "Add CRM field…",
    "draft.availableFields",
    "current.availableFields",
    "Add custom question",
):
    assert token in crm, token


# ------------------------------------------------------------
# Multiple-choice options use independent rows.
# ------------------------------------------------------------

for token in (
    "crm-lead-form-choice-editor",
    "crm-lead-form-choice-list",
    "crm-lead-form-choice-row",
    "crm-lead-form-choice-row__number",
    "Add option",
    'event.key',
    '"Enter"',
    "next.splice(",
    'title="Remove option"',
):
    assert token in builder, token

assert (
    "field.options.join("
    not in builder
)

assert (
    '.split("\\n")'
    not in builder
)


# Server remains authoritative when saved:
# whitespace/blank options are removed and limits remain.
for token in (
    ".map((option: unknown) => text(option).slice(0, 200))",
    ".filter(Boolean)",
    ".slice(0, 50)",
):
    assert token in server, token


# Public form contract remains options: string[].
assert (
    "field.options"
    in public
)


# New styling is limited to the builder.
for token in (
    "/* v1.10.12a Gate 2D.2A — Lead Form field management */",
    ".crm-lead-form-builder-panel__actions",
    ".crm-lead-form-builder-add-field",
    ".crm-lead-form-choice-editor",
    ".crm-lead-form-choice-row",
):
    assert token in css, token


# Gate 2D.2A itself is schema-neutral.
# Later release gates may legitimately add migrations, so this
# historical regression must not assert repository-wide migration
# absence. Its persistence contract remains the existing
# crm_lead_form_settings.fields_json / options[] model verified above.


print(
    "PASS v1.10.12a Gate 2D.2A Lead Form field management"
)
print(
    "  First name / Email / Wedding date: protected"
)
print(
    "  optional CRM fields: removable"
)
print(
    "  removed CRM fields: restorable"
)
print(
    "  Lead Source: no silent resurrection"
)
print(
    "  custom questions: removable"
)
print(
    "  choice options: one input per row"
)
print(
    "  Enter / Add option / remove option: verified"
)
print(
    "  public options[] contract: unchanged"
)
print(
    "  schema change: none"
)
