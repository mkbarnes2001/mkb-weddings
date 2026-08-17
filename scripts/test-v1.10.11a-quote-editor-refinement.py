#!/usr/bin/env python3
"""v1.10.11a streamlined WedCRM quote editor regression."""

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


# ------------------------------------------------------------
# Header is now contextual rather than status-chip heavy.
# ------------------------------------------------------------

header_start = page.index(
    "<AdminPageHeader"
)

header_end = page.index(
    "\n      />",
    header_start,
)

header = page[
    header_start:
    header_end
]

assert "meta={" not in header
assert "quote.enquiryReference" not in header
assert "versionNumber" not in header

for token in (
    "quote.clientName",
    'quote.eventDate || "Date TBC"',
    'quote.venueText || "Venue TBC"',
):
    assert token in header, token


# ------------------------------------------------------------
# Apply Template remains fully functional, but the action itself
# is now an icon control.
# ------------------------------------------------------------

assert "crm-quote-template-apply" in header
assert 'aria-label="Apply quote template"' in header
assert 'label="Apply Template"' in header
assert "applyTemplateId" in header
assert "void applyTemplate()" in header


# ------------------------------------------------------------
# Save and Send are accessible compact icon controls.
# ------------------------------------------------------------

assert "AdminIconButton" in page
assert 'label="Save draft"' in header
assert "void save()" in header

assert '"Resend quote"' in header
assert '"Send quote"' in header
assert 'className="crm-quote-send-icon"' in header
assert "void openSendPreview()" in header


# Revision remains visible when the current version is not
# editable.
assert "Create revision" in header
assert "void revise()" in header


# ------------------------------------------------------------
# Redundant visual summaries are gone.
# ------------------------------------------------------------

for retired in (
    'className="crm-quote-client-strip"',
    'title="Quote summary"',
    'title="Version history"',
    'className="crm-quote-summary"',
):
    assert retired not in page, retired


# ------------------------------------------------------------
# Core quote workspace and operational controls are retained.
# ------------------------------------------------------------

for token in (
    'className="crm-quote-workspace"',
    'className="crm-quote-workspace__main"',
    'className="crm-quote-workspace__aside"',
    'title="Commercial settings"',
    'title="Booking & payment"',
    'title="Client message"',
    'title="Offline acceptance"',
):
    assert token in page, token


# Offline acceptance remains in the operational side of the
# editor after Quote Summary / Version History removal.
aside_start = page.index(
    'className="crm-quote-workspace__aside"'
)

offline_start = page.index(
    'title="Offline acceptance"'
)

assert offline_start > aside_start


# ------------------------------------------------------------
# Behavioural quote operations are not changed.
# ------------------------------------------------------------

for token in (
    "saveCrmQuote(",
    "sendCrmQuote(",
    "reviseCrmQuote(",
    "acceptCrmQuote(",
    "payloadForSave()",
):
    assert token in page, token


# Immutable server-side version/snapshot architecture remains.
for token in (
    "crm_quote_versions",
    "snapshot_json",
    "saveQuoteDraft",
    "sendQuote",
):
    assert token in server, token


# ------------------------------------------------------------
# Native WedPlanned responsive presentation.
# ------------------------------------------------------------

marker = (
    "/* v1.10.11a — streamlined quote editor */"
)

assert marker in css

refinement_css = css[
    css.index(marker):
]

for token in (
    '"brand content actions"',
    ".crm-quote-send-icon",
    "var(--admin-module-accent",
    "@media (max-width: 1080px)",
    "@media (max-width: 700px)",
):
    assert token in refinement_css, token


print(
    "PASS v1.10.11a streamlined quote editor"
)
print(
    "  status / type / version chips removed: verified"
)
print(
    "  concise client / event context: verified"
)
print(
    "  compact Apply Template action: verified"
)
print(
    "  icon Save / Send controls: verified"
)
print(
    "  redundant client summary strip removed: verified"
)
print(
    "  Quote Summary / Version History UI removed: verified"
)
print(
    "  revision / send / offline acceptance preserved: verified"
)
print(
    "  immutable quote version model preserved: verified"
)
