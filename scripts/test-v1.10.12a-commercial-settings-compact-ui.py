#!/usr/bin/env python3
"""v1.10.12a compact Commercial Settings presentation."""

from pathlib import Path
import re
import sqlite3

ROOT = Path(__file__).resolve().parents[1]

crm = (
    ROOT / "src/admin/pages/CRM.tsx"
).read_text(
    encoding="utf-8",
)

start = crm.index(
    "function CommercialSettings({"
)

end = crm.index(
    "function LeadFormSettings(",
    start,
)

commercial = crm[start:end]

# All eight settings/state panels use compact AdminPanel.
assert commercial.count(
    "<AdminPanel"
) == 8

compact_lines = re.findall(
    r"^\s*compact\s*$",
    commercial,
    flags=re.MULTILINE,
)

assert len(compact_lines) == 8, (
    len(compact_lines)
)

# Field and panel helper copy has been removed.
assert "help=" not in commercial

for text in (
    "Choose what WedCRM prepares automatically",
    "Build reusable contract wording.",
    "Set the default deposit and deadline rules",
    "Set the tax treatment copied to new quotes",
    "Control the workspace invoice prefix",
    "Default client-facing notes and payment terms",
    "Generate the booking contract from the active",
    "Build the first invoice and payment schedule from",
    "Add the selected questionnaire to the booking pack",
    "These values are defaults for new quotes only.",
    "Create an inactive template, enter your own contract wording",
):
    assert text not in commercial, text

# Essential state messaging and actual professional content remain.
for text in (
    "Loading commercial settings…",
    "Unable to load commercial settings.",
    "Loading contract templates…",
    "template.description",
):
    assert text in commercial, text

# Tax defaults use concise labels.
for text in (
    'title="Tax defaults"',
    'label="Tax treatment"',
    'label="Tax label"',
    'label="Tax rate (%)"',
    "No tax",
    "Included in prices",
    "Added to prices",
):
    assert text in commercial, text

# Applicable actions are square icon-only controls.
assert commercial.count(
    "<AdminIconButton"
) == 2

assert (
    'label="New contract template"'
    in commercial
)

assert (
    'label="Save commercial settings"'
    in commercial
)

assert "<AdminButton" not in commercial

# Invoice wording remains editable in a denser layout.
assert "min-h-28" not in commercial
assert commercial.count(
    "min-h-20"
) == 2

# Final Commercial Settings finishing pass.
assert commercial.count(
    "crm-commercial-choice-row"
) == 3

assert (
    "crm-commercial-empty-row"
    in commercial
)

assert (
    'title="No contract templates"'
    not in commercial
)

payment_presets = (
    ROOT
    / "src/admin/components"
    / "CrmPaymentSchedulePresets.tsx"
).read_text(
    encoding="utf-8",
)

assert (
    'title="Payment schedule presets"'
    in payment_presets
)

assert (
    "Create reusable deposit and final-balance schedules"
    not in payment_presets
)

assert (
    "<AdminButton"
    not in payment_presets
)

assert payment_presets.count(
    "<AdminIconButton"
) == 4

for token in (
    'label="New schedule"',
    '"Save schedule"',
    '"Create schedule"',
    'label="Make default"',
    'label="Archive"',
    "Fixed booking fee",
    "Percentage deposit",
    "No deposit",
    "Final balance due before event",
    "Default for new quotes",
):
    assert token in payment_presets, token

admin_css = (
    ROOT
    / "src/admin/admin-theme.css"
).read_text(
    encoding="utf-8",
)

for token in (
    "v1.10.12a — Gate 2F compact Commercial settings finishing",
    ".crm-commercial-choice-row",
    ".crm-commercial-empty-row",
    ".crm-payment-preset-editor__actions",
):
    assert token in admin_css, token


# Presentation-only refinement preserves schema 51.
schema = (
    ROOT / "d1/schema.sql"
).read_text(
    encoding="utf-8",
)

db = sqlite3.connect(":memory:")

try:
    db.executescript(schema)

    version = db.execute(
        """
        SELECT value
        FROM schema_meta
        WHERE key='schema_version'
        LIMIT 1
        """
    ).fetchone()

    assert version
    assert version[0] == "51"

finally:
    db.close()

print(
    "PASS v1.10.12a compact Commercial Settings presentation"
)
print(
    "  eight compact panels: verified"
)
print(
    "  nonessential helper copy removed: verified"
)
print(
    "  essential state/business content retained: verified"
)
print(
    "  compact tax controls: verified"
)
print(
    "  icon-only actions: verified"
)
print(
    "  schema / behaviour unchanged: verified"
)
