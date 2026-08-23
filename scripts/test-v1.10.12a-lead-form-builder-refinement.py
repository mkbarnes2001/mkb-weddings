#!/usr/bin/env python3
"""v1.10.12a compact Lead Form builder regression."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

crm = (
    ROOT / "src/admin/pages/CRM.tsx"
).read_text(encoding="utf-8")

shared = (
    ROOT
    / "src/admin/components/crm/CRMWeddingWorkspaceShared.tsx"
).read_text(encoding="utf-8")

css = (
    ROOT / "src/admin/admin-theme.css"
).read_text(encoding="utf-8")

server = (
    ROOT / "serverless/crm-d1.ts"
).read_text(encoding="utf-8")


start = crm.index(
    'title="Form fields"'
)

end = crm.index(
    "function QuestionnaireLibrary",
    start,
)

builder = crm[start:end]


# Compact, expandable field-builder architecture.
for token in (
    "expandedLeadFieldId",
    "leadFieldDragIndex",
    "crm-lead-form-builder",
    "crm-lead-form-builder-field",
    "crm-lead-form-builder-field__handle",
    "crm-lead-form-builder-field__editor",
    "Drag to reorder",
    "aria-expanded={expanded}",
):
    assert token in builder, token


# Only expanded records expose editing controls.
for token in (
    "Field label",
    "Field type",
    "Help text",
    "Placeholder",
    "Choices",
):
    assert token in builder, token


# Standard CRM mapping is protected.
assert (
    "Boolean(\n"
    "                                    field.systemKey,"
    in builder
    or "Boolean(field.systemKey)" in builder
)

assert "field.locked" in builder
assert "CRM mapping" in builder
assert "Protected" in builder


# Old permanently-expanded presentation is gone.
for forbidden in (
    "↑ Move up",
    "↓ Move down",
    'rounded-xl border border-black/10 bg-white p-4',
):
    assert forbidden not in builder, forbidden


# Wedding date is structurally protected server-side.
event_date_start = server.index(
    'id: "eventDate"'
)

event_date_block = server[
    event_date_start:
    event_date_start + 300
]

for token in (
    "required: true",
    "enabled: true",
    'systemKey: "eventDate"',
    "locked: true",
):
    assert token in event_date_block, token

assert '"eventDate",' in server
assert (
    'Wedding date is required.'
    in server
)


# Pen/pencil edit symbol removed from shared Client action.
assert "PenLine" not in shared
assert 'title="Edit client"' in shared


# New builder styling exists and uses configured record surface.
assert (
    "/* v1.10.12a — compact Lead Form builder */"
    in css
)

assert (
    "--admin-module-record-background"
    in css
)


# v1.10.12a now owns schema 48 for canonical Lead Source continuity.
assert (
    ROOT
    / "d1/migrations/048_crm_lead_source_continuity.sql"
).is_file()


print(
    "PASS v1.10.12a compact Lead Form builder refinement"
)
print(
    "  compact expandable fields: verified"
)
print(
    "  drag/reorder controls: verified"
)
print(
    "  standard CRM mappings protected: verified"
)
print(
    "  wedding date locked required: verified"
)
print(
    "  client management icon replaces pen: verified"
)
print(
    "  release schema: 48 · Lead Source continuity"
)
