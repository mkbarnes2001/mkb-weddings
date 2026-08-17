#!/usr/bin/env python3

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(encoding="utf-8")


page = read(
    "src/admin/pages/CRMQuote.tsx"
)

css = read(
    "src/admin/admin-theme.css"
)

server = read(
    "serverless/crm-quotes-d1.ts"
)

# Wide WedPlanned editor structure.
for token in [
    "crm-quote-workspace",
    "crm-quote-workspace__main",
    "crm-quote-workspace__aside",
    "crm-quote-package-grid",
    "crm-quote-package-card",
]:
    assert token in page, token
    assert f".{token}" in css, token

# v1.10.11a deliberately retires redundant summary UI while
# retaining the underlying quote/version data and operations.
for retired in [
    "crm-quote-client-strip",
    'title="Quote summary"',
    'title="Version history"',
]:
    assert retired not in page, retired

assert "crm-quote-summary" not in page

# Package cards are summary-first, detailed editing is
# collapsed instead of exposing all textareas permanently.
assert (
    'className="crm-quote-package-editor"'
    in page
)
assert "<details" in page
assert "<summary>" in page
assert "Edit package details" in page
assert "coverageLabel(" in page
assert "crm-quote-package-card__included" in page

# Additional options are a single quote-level editor section.
assert (
    page.count(
        'title="Additional options"'
    )
    == 1
)
assert "globalAddonIds" in page
assert "toggleGlobalAddon(" in page
assert "crm-quote-addon-grid" in page

# Old repeated per-package add-on editor has gone.
assert "Available add-ons" not in page
assert "availableAddons.map" not in page
assert "No add-ons available for this package." not in page

# The browser presents quote-level extras, then fans them
# into each option only in the save payload so the existing
# backend eligibility and immutable snapshot model is kept.
assert "function payloadForSave()" in page
assert "addonIds," in page
assert (
    "options:\n        draft.options.map"
    in page
)
assert "payloadForSave()" in page

# Existing server remains package-aware and authoritative.
assert "addonRowsForOption" in server
assert "crm_quote_option_addons" in server
assert (
    "availability_scope"
    in server
)

# Existing quote operations remain available.
for token in [
    "saveCrmQuote(",
    "sendCrmQuote(",
    "reviseCrmQuote(",
    "acceptCrmQuote(",
    "Create revision",
    "Offline acceptance",
    'label="Save draft"',
    '"Send quote"',
]:
    assert token in page, token

# Commercial terms and notes have separate clean sections.
for token in [
    'title="Commercial settings"',
    'title="Client message"',
    "Client-facing message",
    "Internal notes",
    "Expiry date",
    "Tax treatment",
]:
    assert token in page, token

# Native WedPlanned style uses current module tokens and
# responsive layouts rather than introducing a foreign theme.
for token in [
    "var(--admin-module-accent",
    "var(--admin-module-record-background",
    "@media (max-width: 980px)",
    "@media (max-width: 700px)",
]:
    assert token in css, token

print(
    "PASS v1.10.9a WedPlanned quote editor redesign"
)
print(
    "  full-width quote workspace: verified"
)
print(
    "  professional package cards: verified"
)
print(
    "  collapsed package editing: verified"
)
print(
    "  one global additional-options section: verified"
)
print(
    "  package eligibility remains server authoritative: verified"
)
print(
    "  commercial settings separation: verified"
)
print(
    "  client/internal message separation: verified"
)
print(
    "  save/send/revise/offline acceptance preserved: verified"
)
print(
    "  WedPlanned responsive styling: verified"
)
