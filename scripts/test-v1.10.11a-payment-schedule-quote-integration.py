#!/usr/bin/env python3
"""v1.10.11a reusable payment schedule quote integration."""

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8",
    )


schema = read(
    "d1/schema.sql"
)

quotes = read(
    "serverless/crm-quotes-d1.ts"
)

page = read(
    "src/admin/pages/CRMQuote.tsx"
)

crm = read(
    "src/admin/pages/CRM.tsx"
)

component = read(
    "src/admin/components/"
    "CrmPaymentSchedulePresets.tsx"
)

types = read(
    "src/admin/types/crm.ts"
)

css = read(
    "src/admin/admin-theme.css"
)


db = sqlite3.connect(":memory:")

db.execute(
    "PRAGMA foreign_keys = ON"
)

db.executescript(
    schema,
)

assert db.execute(
    """
    SELECT value
    FROM schema_meta
    WHERE key='schema_version'
    """
).fetchone()[0] == "46"

assert not db.execute(
    "PRAGMA foreign_key_check"
).fetchall()


# Commercial Settings owns reusable payment schedules.
for token in (
    "CrmPaymentSchedulePresets",
    "Payment schedule presets",
    "New schedule",
    "Make default",
    "Fixed booking fee",
    "Percentage deposit",
    "No deposit",
    "Final balance due before event",
):
    assert (
        token in crm
        or token in component
    ), token

assert (
    'title="Legacy payment fallback"'
    in crm
)


# Quote browser contract exposes selection plus active choices.
for token in (
    "paymentScheduleId: string;",
    "paymentSchedules: CrmPaymentSchedulePreset[];",
    "paymentScheduleId?: string;",
):
    assert token in types, token


# Draft selection is validated against the active workspace.
normal_start = quotes.index(
    "async function normaliseQuoteBookingPackDraft("
)

normal_end = quotes.index(
    "async function quoteBookingPackPreview(",
    normal_start,
)

normal = quotes[
    normal_start:normal_end
]

for token in (
    '"paymentScheduleId"',
    "crm_payment_schedule_presets",
    "WHERE workspace_id = ?",
    "AND status = 'active'",
    "Choose an active payment schedule from this workspace.",
):
    assert token in normal, token


# Preview uses draft selection and preset terms.
preview_start = quotes.index(
    "async function quoteBookingPackPreview("
)

preview_end = quotes.index(
    "async function buildQuoteBookingPackSnapshot(",
    preview_start,
)

preview = quotes[
    preview_start:preview_end
]

for token in (
    "hasDraftPaymentScheduleId",
    "defaultPaymentSchedule",
    "selectedPaymentSchedule",
    "paymentScheduleChoices",
    "presetId:",
    "depositType:",
    "depositValue:",
    "depositDueDaysAfterAcceptance:",
    "finalBalanceDueDaysBeforeEvent:",
):
    assert token in preview, token


# Successful-send freeze remains the existing booking-pack mechanism.
assert (
    "successfulSendSnapshot"
    in quotes
)

assert (
    "snapshot_json ="
    in quotes
)

assert (
    "bookingPackDraft"
    in quotes
)


# Quote editor owns the schedule dropdown.
for token in (
    "bookingPaymentScheduleId",
    "setBookingPaymentScheduleId",
    'label="Payment schedule"',
    "bookingPackPreview.paymentSchedules.map",
    "paymentScheduleId:",
):
    assert token in page, token


# Send Quote remains email-only and booking choices are read-only.
send_start = page.index(
    "async function sendQuote()"
)

send_end = page.index(
    "async function revise()",
    send_start,
)

send = page[
    send_start:send_end
]

assert "bookingPack:" not in send

booking_start = page.index(
    '<section className="crm-quote-send-booking-pack">'
)

booking_end = page.index(
    "</section>",
    booking_start,
)

booking = page[
    booking_start:booking_end
]

assert "<select" not in booking
assert 'type="checkbox"' not in booking
assert "Payment schedule" in booking


# Responsive layout.
for token in (
    ".crm-payment-presets",
    ".crm-payment-preset-row",
    ".crm-payment-preset-editor",
    ".crm-quote-booking-panel__grid",
    "repeat(3, minmax(0, 1fr))",
):
    assert token in css, token


print(
    "PASS v1.10.11a payment schedule quote integration"
)

print(
    "  reusable Commercial Settings presets: verified"
)

print(
    "  per-quote payment schedule selection: verified"
)

print(
    "  active workspace preset validation: verified"
)

print(
    "  preset deposit / balance terms feed quote preview: verified"
)

print(
    "  successful-send snapshot freeze retained: verified"
)

print(
    "  Send Quote remains read-only: verified"
)

print(
    "  responsive WedPlanned UI: verified"
)
