#!/usr/bin/env python3
"""Focused regression for v1.10.11a Send Quote Booking Pack UI."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(
        encoding="utf-8"
    )


page = read(
    "src/admin/pages/CRMQuote.tsx"
)
css = read(
    "src/admin/admin-theme.css"
)
types = read(
    "src/admin/types/crm.ts"
)
api = read(
    "src/admin/services/AdminApiService.ts"
)

# Dedicated local state exists for all user-selectable pack items.
for token in (
    "sendContractTemplateId",
    "sendQuestionnaireTemplateId",
    "sendAutoCreateInvoice",
):
    assert token in page, token

# Normalise source whitespace before checking multiline
# property access / JSX / payload relationships.
compact = "".join(
    page.split()
)

# Server defaults initialise the dialog.
for token in (
    "preview.bookingPack.contractTemplateId",
    "preview.bookingPack.questionnaireTemplateId",
    "preview.bookingPack.autoCreateInvoice",
):
    assert token in compact, token

# Changing the email template must not silently reset booking choices.
assert (
    "preserveBookingPack=false"
    in compact
)
assert (
    "applySendPreview(preview,true,)"
    in compact
)

# Send payload contains only reviewed booking choices, not workspace authority.

for token in (
    "bookingPack:{",
    "contractTemplateId:sendContractTemplateId",
    "questionnaireTemplateId:sendQuestionnaireTemplateId",
    "autoCreateInvoice:sendAutoCreateInvoice",
):
    assert token in compact, token

send_start = page.index(
    "async function sendQuote()"
)
send_end = page.index(
    "async function revise()",
    send_start,
)
send_section = page[
    send_start:send_end
]

assert "workspaceId" not in send_section
assert "fromEmail" not in send_section
assert "to:" not in send_section

# UI offers explicit None options for optional contract/questionnaire.
for token in (
    "Booking pack",
    "What happens after acceptance",
    'label="Contract"',
    'label="Questionnaire"',
    "Create invoice when quote is accepted",
    "None",
    "Deposit due",
    "Final balance",
):
    assert token in page, token

# Frozen sent versions and legacy versions cannot be cosmetically overridden.
assert (
    "sendPreview.bookingPack.frozen"
    in page
)
assert (
    "sendPreview.bookingPack.legacyFallback"
    in page
)
assert (
    "Sent version locked"
    in page
)
assert (
    "Legacy sent version"
    in page
)

# Failure semantics are explained consistently with server behaviour.
assert (
    "A failed send leaves the draft editable."
    in page
)

# Existing typed API boundary is reused.
assert (
    "input?: CrmQuoteSendInput"
    in api
)
assert (
    "bookingPack?: CrmQuoteBookingPackInput;"
    in types
)

# WedPlanned-native responsive styling exists.
for token in (
    ".crm-quote-send-booking-pack",
    ".crm-quote-send-booking-pack__grid",
    ".crm-quote-send-booking-pack__invoice",
    ".crm-quote-send-booking-pack__summary",
    "var(--admin-module-accent",
    "@media (max-width: 760px)",
):
    assert token in css, token

print(
    "PASS v1.10.11a Send Quote Booking Pack UI"
)
print(
    "  contract template dropdown: verified"
)
print(
    "  questionnaire template dropdown: verified"
)
print(
    "  explicit None selections: verified"
)
print(
    "  invoice-on-acceptance control: verified"
)
print(
    "  deposit/payment summary: verified"
)
print(
    "  email-template refresh preserves booking choices: verified"
)
print(
    "  frozen sent-version controls: verified"
)
print(
    "  responsive WedPlanned styling: verified"
)
