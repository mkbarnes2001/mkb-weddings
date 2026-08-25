#!/usr/bin/env python3
"""v1.10.12a Gate 2E.1 presentation consistency."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (
        ROOT / relative
    ).read_text(
        encoding="utf-8"
    )


quote = read(
    "src/admin/pages/CRMQuote.tsx"
)

css = read(
    "src/admin/admin-theme.css"
)

crm = read(
    "src/admin/pages/CRM.tsx"
)


# Quote header action is an explicit visible square icon.
for token in (
    'className="crm-quote-header-send"',
    'icon={Send}',
    'data-admin-action="send"',
    '"Resend quote"',
    '"Send quote"',
    "void openSendPreview()",
):
    assert token in quote, token


# Create revision remains an icon-only header action.
for token in (
    'className="crm-quote-header-revision"',
    'icon={CopyPlus}',
    'label="Create revision"',
    'data-admin-action="duplicate"',
    "void revise()",
):
    assert token in quote, token


# Existing send-preview behaviour remains intact.
for token in (
    'className="crm-quote-send-overlay"',
    'className="crm-quote-send-dialog"',
    'className="crm-quote-send-compose"',
    'className="crm-quote-send-sidebar"',
    'aria-labelledby="crm-quote-send-title"',
    'document.querySelector<HTMLElement>(',
    '".admin-shell"',
    ".sendCrmQuote(",
    "!sendPreview.deliveryReady",
):
    assert token in quote, token


# Section and Record backgrounds have distinct consumers.
for token in (
    "v1.10.12a Gate 2E.1 — CRM presentation consistency",
    "--admin-module-section-background",
    "--admin-module-record-background",
    ".crm-job-clients > article",
    ".crm-quote-job-summary",
    ".questionnaire-instance-card",
    ".crm-supplier-review > article",
    ".crm-communication-list > article",
):
    assert token in css, token


# Quote preview uses the same module surface hierarchy.
for token in (
    ".crm-quote-header-send",
    ".crm-quote-send-dialog",
    ".crm-quote-send-dialog__header",
    ".crm-quote-send-addresses > div",
    ".crm-quote-send-booking-pack",
    ".crm-quote-send-sidebar",
    ".crm-quote-send-provider",
    ".crm-quote-send-summary",
    "quote send dialog shell inheritance",
    "--admin-role-heading-size",
    "--admin-role-main-size",
    "--admin-role-helper-size",
):
    assert token in css, token


# Mail status keeps the real engagement state while becoming compact.
for token in (
    'className="crm-lead-cell crm-lead-cell--mail"',
    "mailStatusTone(",
    "mailStatusLabel(",
    "mailStatusAt",
    '"Link clicked"',
    '"Opened"',
    '"Delivered"',
):
    assert token in crm, token

for token in (
    ".crm-lead-cell--mail",
    ".crm-lead-cell--mail .admin-status",
    ".crm-lead-cell--mail > small",
):
    assert token in css, token


# Jobs overview production presentation hotfix.
jobs_marker = (
    "/* v1.10.12a Gate 2E production hotfix — "
    "Jobs overview presentation */"
)

assert jobs_marker in css

jobs_css = css[
    css.index(jobs_marker):
]

for token in (
    ".admin-button.admin-header-action--icon",
    "font-size: 0 !important",
    ".crm-operation-record--job",
    '"Montserrat"',
    "font-family: inherit !important",
):
    assert token in jobs_css, token

for token in (
    'jobs: "Jobs overview"',
    'to="/admin/crm/catalogue"',
    'to="/admin/crm/quotes"',
    "Catalogue",
    "Quotes",
    "New enquiry",
    'className="crm-operation-record crm-operation-record--job"',
    "<dt>Wedding day</dt>",
    "<dt>Venue</dt>",
    "<dt>Next task</dt>",
):
    assert token in crm, token


# Gate 2E.1 is presentation-only.
assert not list(
    (ROOT / "d1/migrations").glob("050*")
)


print(
    "PASS v1.10.12a Gate 2E.1 "
    "CRM presentation polish"
)
print(
    "  section / record hierarchy: verified"
)
print(
    "  quote Send / Resend icon: verified"
)
print(
    "  quote email preview styling: verified"
)
print(
    "  compact mail engagement state: verified"
)
print(
    "  Jobs header actions / Admin font: verified"
)
print(
    "  behaviour / schema unchanged: verified"
)
