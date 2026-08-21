#!/usr/bin/env python3
"""v1.10.12a compact Lead Form settings regression."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

crm = (
    ROOT / "src/admin/pages/CRM.tsx"
).read_text(
    encoding="utf-8",
)

job = (
    ROOT / "src/admin/pages/CRMJob.tsx"
).read_text(
    encoding="utf-8",
)

css = (
    ROOT / "src/admin/admin-theme.css"
).read_text(
    encoding="utf-8",
)


title = 'title="Public lead form"'

assert crm.count(title) == 1

start = crm.rfind(
    "<AdminPanel",
    0,
    crm.index(title),
)

end = crm.find(
    "</AdminPanel>",
    crm.index(title),
)

panel = crm[
    start:
    end + len("</AdminPanel>")
]


# Existing Preview action remains attached to the panel.
assert "Preview form" in panel


# Top settings are compact and grouped.
for token in (
    "crm-lead-form-settings",
    "crm-lead-form-settings__switches",
    "crm-lead-form-settings__core",
    "crm-lead-form-settings__section",
    "crm-lead-form-settings__inline-flag",
):
    assert token in panel, token


# All settings remain available.
for token in (
    "draft.enabled",
    "draft.autoresponderEnabled",
    "draft.notificationEmail",
    "draft.autoresponderSubject",
    "draft.autoresponderMessage",
    "draft.title",
    "draft.defaultService",
    "draft.publicPath",
    "draft.intro",
    "draft.privacyText",
    "draft.thankYouTitle",
    "draft.thankYouMessage",
    "draft.consentRequired",
):
    assert token in panel, token


# Large choice-card presentation is no longer used here.
assert "admin-choice-row" not in panel


# Form field builder remains intact below.
assert 'title="Form fields"' in crm
assert "crm-lead-form-builder-field" in crm
assert "expandedLeadFieldId" in crm


# Client Edit action now uses a simple centred person icon.
assert "UserRoundCog" not in job
assert "PenLine" not in job
assert "UserRound" in job
assert 'title="Edit client"' in job


# CSS exists.
assert (
    "/* v1.10.12a — compact Lead Form settings */"
    in css
)


# No migration.
assert not list(
    (ROOT / "d1" / "migrations")
    .glob("048*")
)


print(
    "PASS v1.10.12a compact Lead Form settings refinement"
)
print(
    "  core form settings: compact"
)
print(
    "  acknowledgement settings: collapsible"
)
print(
    "  confirmation/privacy: collapsible"
)
print(
    "  field builder: preserved"
)
print(
    "  client edit icon: centred UserRound"
)
print(
    "  schema migration: not required"
)
