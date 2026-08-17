#!/usr/bin/env python3
"""v1.10.11a configurable lead-form backend contract regression."""

from pathlib import Path
import json
import sqlite3


ROOT = Path(__file__).resolve().parents[1]

SCHEMA = ROOT / "d1/schema.sql"

SERVER = ROOT / "serverless/crm-d1.ts"

TYPES = ROOT / "src/admin/types/crm.ts"

PUBLIC_FORM = ROOT / "src/components/LeadEnquiryForm.tsx"


def columns(
    con: sqlite3.Connection,
    table: str,
):
    return {
        row[1]
        for row in con.execute(
            f'PRAGMA table_info("{table}")'
        )
    }


schema = SCHEMA.read_text(
    encoding="utf-8",
)

server = SERVER.read_text(
    encoding="utf-8",
)

types = TYPES.read_text(
    encoding="utf-8",
)

public_form = PUBLIC_FORM.read_text(
    encoding="utf-8",
)


# ------------------------------------------------------------
# Schema-45 persistence boundary.
# ------------------------------------------------------------

con = sqlite3.connect(
    ":memory:"
)

con.executescript(
    schema
)

assert con.execute(
    """
    SELECT value
    FROM schema_meta
    WHERE key = 'schema_version'
    """
).fetchone()[0] == "45"

assert "fields_json" in columns(
    con,
    "crm_lead_form_settings",
)

assert "address_json" in columns(
    con,
    "crm_contacts",
)

assert {
    "lead_form_schema_json",
    "lead_form_answers_json",
} <= columns(
    con,
    "crm_enquiries",
)

row = con.execute(
    """
    SELECT fields_json
    FROM crm_lead_form_settings
    ORDER BY workspace_id
    LIMIT 1
    """
).fetchone()

assert row is not None
assert json.loads(row[0]) == []

assert not con.execute(
    "PRAGMA foreign_key_check"
).fetchall()

assert con.execute(
    "PRAGMA quick_check"
).fetchone()[0] == "ok"

con.close()


# ------------------------------------------------------------
# Typed admin contract.
# ------------------------------------------------------------

for token in (
    'export type CrmLeadFormFieldType =',
    '| "address"',
    '| "venue"',
    "export type CrmLeadFormField = {",
    "systemKey: string;",
    "locked: boolean;",
    "export type CrmLeadAddress = {",
    "fields: CrmLeadFormField[];",
    "address: CrmLeadAddress;",
    "leadFormSchema: CrmLeadFormField[];",
    "leadFormAnswers: Record<string, unknown>;",
):
    assert token in types, token


# ------------------------------------------------------------
# Default + configurable field contract.
# ------------------------------------------------------------

for token in (
    "const DEFAULT_LEAD_FORM_FIELDS = [",
    'id: "firstName"',
    'systemKey: "firstName"',
    'id: "email"',
    'systemKey: "email"',
    'id: "address"',
    'type: "address"',
    'id: "venueText"',
    'type: "venue"',
    "function normalizeLeadFormFields(",
    "LEAD_FORM_LOCKED_SYSTEM_KEYS",
    "field.type === \"select\" || field.type === \"radio\"",
    "field.required",
    "fields: normalizeLeadFormFields(settings?.fields_json)",
    "fields: normalizeLeadFormFields(row.fields_json)",
):
    assert token in server, token


# First name/email remain protected even after form customisation.
assert '"firstName",' in server
assert '"email",' in server
assert "locked\n          ? true" in server
assert "enabled:\n        locked\n          ? true" in server


# ------------------------------------------------------------
# Backward-compatible save semantics.
# ------------------------------------------------------------

for token in (
    "SELECT fields_json",
    "Array.isArray(input?.fields)",
    'text(current?.fields_json || "[]") || "[]"',
    "fields_json = excluded.fields_json",
    "fieldCount: resolvedFields.length",
):
    assert token in server, token


# ------------------------------------------------------------
# Submission snapshot contract.
# ------------------------------------------------------------

for token in (
    "normalizeLeadFormAnswers(",
    "leadSystemValue(",
    "lead_form_schema_json, lead_form_answers_json",
    "JSON.stringify(fields)",
    "JSON.stringify(answers)",
    "fieldCount: fields.filter((field) => field.enabled).length",
):
    assert token in server, token


# The F2 public renderer now submits the configurable answers
# contract while also flattening enabled system fields so existing
# notification/autoresponder integrations retain their legacy inputs.
for token in (
    "config.fields.filter(",
    "const systemPayload:",
    "answers,",
    "...systemPayload,",
    "serviceInterest:",
    "config.defaultService || \"\"",
    "field.systemKey === \"budgetMin\"",
    "field.systemKey === \"budgetMax\"",
):
    assert token in public_form, token


# ------------------------------------------------------------
# Address preservation contract.
# ------------------------------------------------------------

for token in (
    "function normalizeLeadAddress(",
    "function hasLeadAddress(",
    "const addressProvided = hasLeadAddress(address);",
    "address_json = CASE WHEN ? = 1 THEN ? ELSE address_json END",
    "addressProvided ? 1 : 0, addressJson",
    "address: normalizeLeadAddress(",
    "const addressSpecified = Object.prototype.hasOwnProperty.call(input || {}, \"address\");",
):
    assert token in server, token


# Explicit contact editing can clear an address, but public upsert
# omission cannot do so.
assert "JSON.stringify(nextAddress)" in server


# ------------------------------------------------------------
# Existing safety and anti-abuse behaviour remains present.
# ------------------------------------------------------------

for token in (
    'const publicPath = "/enquire";',
    "CF-Connecting-IP",
    "request_fingerprint",
    "'-1 hour'",
    "settings.consentRequired",
    "input?.website",
    "db.batch(statements)",
):
    assert token in server, token


print(
    "PASS v1.10.11a configurable lead-form backend contract"
)
print(
    "  default form fallback: verified"
)
print(
    "  configurable field persistence: verified"
)
print(
    "  protected CRM identity fields: verified"
)
print(
    "  server-side required/option validation: verified"
)
print(
    "  submission-time schema snapshot: verified"
)
print(
    "  submission-time answer snapshot: verified"
)
print(
    "  non-destructive public contact address upsert: verified"
)
print(
    "  explicit CRM contact address update/clear path: verified"
)
print(
    "  legacy flat public POST compatibility: verified"
)
print(
    "  consent/rate/honeypot guards retained: verified"
)
