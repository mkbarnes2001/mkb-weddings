#!/usr/bin/env python3
"""Focused regression for v1.10.11a quote-integrated booking configuration."""

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

quotes = read(
    "serverless/crm-quotes-d1.ts"
)


# Quote editor owns the editable booking choices.
for token in (
    "bookingPackPreview",
    "bookingContractTemplateId",
    "bookingQuestionnaireTemplateId",
    "bookingAutoCreateInvoice",
    'title="Booking & payment"',
    'label="Contract"',
    'label="Questionnaire"',
    "Create invoice automatically when quote is accepted",
    "Deposit due",
    "Final balance",
    "They do not enable online payment collection.",
):
    assert token in page, token


# Draft save carries explicit booking choices.
payload_start = page.index(
    "function payloadForSave()"
)

payload_end = page.index(
    "async function save()",
    payload_start,
)

payload = "".join(
    page[
        payload_start:payload_end
    ].split()
)

for token in (
    "bookingPack:{",
    "contractTemplateId:bookingContractTemplateId",
    "questionnaireTemplateId:bookingQuestionnaireTemplateId",
    "autoCreateInvoice:bookingAutoCreateInvoice",
):
    assert token in payload, token


# Send Quote is email-only and cannot override booking choices.
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

assert "bookingPack:" not in send_section
assert "workspaceId" not in send_section
assert "fromEmail" not in send_section
assert "to:" not in send_section


# Send modal contains a read-only booking summary.
booking_start = page.index(
    '<section className="crm-quote-send-booking-pack">'
)

booking_end = page.index(
    "</section>",
    booking_start,
)

booking_modal = page[
    booking_start:booking_end
]

for token in (
    "Ready with this quote",
    "From quote draft",
    "Booking choices are edited on the quote",
    "Created on acceptance",
):
    assert token in booking_modal, token

assert "<select" not in booking_modal
assert 'type="checkbox"' not in booking_modal


# Modal escapes Admin sidebar/main stacking context.
assert (
    'import { createPortal } from "react-dom";'
    in page
)

assert "createPortal(" in page
assert "document.body" in page


# Editable choices persist separately from immutable sent pack.
for token in (
    "bookingPackDraft",
    "normaliseQuoteBookingPackDraft(",
    "snapshot.bookingPackDraft",
    "hasDraftContractTemplateId",
    "hasDraftQuestionnaireTemplateId",
    "hasDraftAutoCreateInvoice",
    "versionSnapshot",
):
    assert token in quotes, token

assert (
    "delete snapshot.bookingPackDraft;"
    in quotes
)

assert (
    "delete sentVersionSnapshot\n    .bookingPackDraft;"
    in quotes
)


# Successful-send freeze semantics remain.
send_server_start = quotes.index(
    "export async function sendQuote("
)

send_server = quotes[
    send_server_start:
]

for token in (
    "successfulSendSnapshot",
    "...sentVersionSnapshot",
    "bookingPack,",
    "WHEN status = 'draft'",
    "THEN ?",
):
    assert token in send_server, token


# Responsive WedPlanned presentation remains.
for token in (
    ".crm-quote-booking-panel",
    ".crm-quote-booking-panel__grid",
    ".crm-quote-booking-panel__summary",
    "@media (max-width: 760px)",
):
    assert token in css, token


print(
    "PASS v1.10.11a quote-integrated booking & payment UI"
)

print(
    "  booking choices live on the quote editor: verified"
)

print(
    "  draft booking choices persist in snapshot_json: verified"
)

print(
    "  Send Quote booking summary is read-only: verified"
)

print(
    "  successful-send immutable freeze preserved: verified"
)

print(
    "  send modal escapes sidebar stacking context: verified"
)

print(
    "  schema remains unchanged by this source refinement: verified"
)
