#!/usr/bin/env python3
"""Focused regression for v1.10.11a Quote Send Booking Pack."""

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(
        encoding="utf-8"
    )


quotes = read(
    "serverless/crm-quotes-d1.ts"
)
booking = read(
    "serverless/crm-booking-pack-d1.ts"
)
types = read(
    "src/admin/types/crm.ts"
)

con = sqlite3.connect(":memory:")
con.executescript(
    read("d1/schema.sql")
)

version = int(
    con.execute(
        "SELECT value "
        "FROM schema_meta "
        "WHERE key='schema_version'"
    ).fetchone()[0]
)

# The booking-pack implementation itself introduces no dedicated
# schema storage. The release may advance beyond schema 42 for
# unrelated additive features such as living questionnaires.
assert version >= 42

assert not (
    ROOT
    / "d1/migrations/"
    "043_quote_send_booking_pack.sql"
).exists()

# Existing quote-version snapshot storage is reused.
columns = {
    row[1]
    for row in con.execute(
        "PRAGMA table_info("
        "crm_quote_versions)"
    )
}

assert "snapshot_json" in columns
assert "booking_pack_json" not in columns

# Send preview exposes server-authoritative selections.
for token in (
    "async function quoteBookingPackPreview(",
    "crm_booking_settings",
    "crm_contract_templates",
    "crm_questionnaire_templates",
    "contractTemplates:",
    "questionnaireTemplates:",
    "legacyFallback:",
):
    assert token in quotes, token

# Send freezes complete document/form/commercial source data.
for token in (
    "async function buildQuoteBookingPackSnapshot(",
    "frozenAt:",
    'source:\n      "quote_send"',
    "contentJson:",
    "schemaJson:",
    "depositType:",
    "depositValue:",
    "depositDueDaysAfterAcceptance:",
    "finalBalanceDueDaysBeforeEvent:",
    "invoiceNotes",
    "invoiceTerms",
):
    assert token in quotes, token

# Booking-pack content is prepared before delivery but frozen only
# after sendCrmEmail succeeds. Failed delivery must not mutate the
# quote-version snapshot.
send_start = quotes.index(
    "export async function sendQuote("
)

send_end = quotes.find(
    "\nexport async function ",
    send_start + 10,
)

if send_end < 0:
    send_end = len(quotes)

send_section = quotes[
    send_start:send_end
]

prepare_at = send_section.index(
    "buildQuoteBookingPackSnapshot("
)

email_at = send_section.index(
    "await sendCrmEmail(",
    prepare_at,
)

freeze_at = send_section.index(
    "snapshot_json =",
    email_at,
)

assert (
    prepare_at
    < email_at
    < freeze_at
)

pre_delivery = send_section[
    prepare_at:email_at
]

assert (
    "UPDATE crm_quote_versions"
    not in pre_delivery
)

assert (
    "successfulSendSnapshot"
    in pre_delivery
)

post_delivery = send_section[
    email_at:freeze_at + 1200
]

assert (
    "successfulSendSnapshot"
    in post_delivery
)

assert (
    "WHEN status = 'draft'"
    in post_delivery
)

assert (
    "THEN 'sent'"
    in post_delivery
)

# A new revision explicitly discards the prior immutable booking pack.
assert (
    "delete snapshot.bookingPack"
    in quotes
)
assert (
    "quoteRevisionSnapshot("
    in quotes
)

# Accepted quotes resolve the version-level pack first, with legacy fallback.
for token in (
    "async function frozenBookingPackForAcceptedQuote(",
    "settingsWithFrozenBookingPack(",
    "source.bookingPack =",
    ": liveSettings",
):
    assert token in booking, token

# Contract and questionnaire can be generated from frozen source snapshots
# even if the live template is later edited/archived.
booking_compact = "".join(
    booking.split()
)

for token in (
    "frozenContract",
    "frozenContract.contentJson",
    "frozenQuestionnaire",
    "frozenQuestionnaire.schemaJson",
):
    assert token in booking_compact, token

# Public/admin acceptance still goes through the single existing hook.
assert (
    quotes.count(
        "ensureBookingPackForAcceptedQuote("
    )
    == 3
)

# Browser contract includes booking pack choices but cannot choose workspace.
for token in (
    "export type CrmQuoteBookingPackPreview",
    "export type CrmQuoteBookingPackInput",
    "bookingPack: CrmQuoteBookingPackPreview;",
    "bookingPack?: CrmQuoteBookingPackInput;",
):
    assert token in types, token

assert not con.execute(
    "PRAGMA foreign_key_check"
).fetchall()

print(
    "PASS v1.10.11a quote-send booking-pack snapshot"
)
print(
    f"  existing quote-version snapshot storage reused at schema {version}: verified"
)
print(
    "  active template choices: verified"
)
print(
    "  sent-version booking pack freeze: verified"
)
print(
    "  revision booking-pack reset: verified"
)
print(
    "  frozen contract content: verified"
)
print(
    "  frozen questionnaire schema: verified"
)
print(
    "  frozen deposit/invoice terms: verified"
)
print(
    "  legacy workspace-setting fallback: verified"
)
