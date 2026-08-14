#!/usr/bin/env python3

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "d1" / "schema.sql"
MIGRATION = (
    ROOT
    / "d1"
    / "migrations"
    / "041_commercial_templates_email_delivery.sql"
)

MARKER = (
    "-- v1.10.9a — Commercial Templates, Quote Builder & "
    "Email Delivery Foundation"
)


def one(connection, query):
    row = connection.execute(query).fetchone()
    assert row is not None, query
    return row[0]


def columns(connection, table):
    return {
        row[1]: {
            "type": row[2],
            "notnull": bool(row[3]),
            "default": row[4],
            "pk": bool(row[5]),
        }
        for row in connection.execute(
            f"PRAGMA table_info({table})"
        )
    }


schema = SCHEMA.read_text(encoding="utf-8")
migration = MIGRATION.read_text(encoding="utf-8")

assert MARKER in schema
assert MARKER in migration

before, after = schema.split(MARKER, 1)

stable = sqlite3.connect(":memory:")
stable.execute("PRAGMA foreign_keys = ON")
stable.executescript(before)

assert (
    one(
        stable,
        "SELECT value FROM schema_meta "
        "WHERE key='schema_version'",
    )
    == "40"
)

stable.executescript(migration)

assert (
    one(
        stable,
        "SELECT value FROM schema_meta "
        "WHERE key='schema_version'",
    )
    == "41"
)

required_tables = {
    "crm_quote_templates",
    "crm_quote_template_packages",
    "crm_quote_template_addons",
    "crm_email_templates",
    "crm_email_credentials",
    "crm_email_settings",
}

actual_tables = {
    row[0]
    for row in stable.execute(
        "SELECT name FROM sqlite_master "
        "WHERE type='table'"
    )
}

missing = required_tables - actual_tables
assert not missing, missing

quote_template = columns(stable, "crm_quote_templates")
assert quote_template["workspace_id"]["notnull"]
assert quote_template["is_default"]["notnull"]
assert quote_template["client_introduction"]["notnull"]
assert quote_template["payment_schedule_json"]["notnull"]
assert quote_template["auto_create_invoice"]["notnull"]

template_packages = columns(
    stable,
    "crm_quote_template_packages",
)
assert template_packages["workspace_id"]["notnull"]
assert template_packages["template_id"]["notnull"]
assert template_packages["package_id"]["notnull"]
assert template_packages["recommended"]["notnull"]

template_addons = columns(
    stable,
    "crm_quote_template_addons",
)
assert template_addons["workspace_id"]["notnull"]
assert template_addons["template_id"]["notnull"]
assert template_addons["addon_id"]["notnull"]

email_template = columns(stable, "crm_email_templates")
assert email_template["workspace_id"]["notnull"]
assert email_template["purpose"]["notnull"]
assert email_template["subject_template"]["notnull"]
assert email_template["body_html"]["notnull"]
assert email_template["body_text"]["notnull"]
assert email_template["attachments_json"]["notnull"]
assert email_template["append_signature"]["notnull"]

credentials = columns(stable, "crm_email_credentials")
assert credentials["workspace_id"]["notnull"]
assert credentials["provider"]["notnull"]
assert credentials["ciphertext"]["notnull"]
assert credentials["iv"]["notnull"]
assert "password" not in credentials
assert "refresh_token" not in credentials
assert "access_token" not in credentials

email_settings = columns(stable, "crm_email_settings")
assert email_settings["workspace_id"]["pk"]
assert email_settings["delivery_mode"]["notnull"]
assert email_settings["signature_json"]["notnull"]
assert email_settings["smtp_host"]["notnull"]
assert email_settings["smtp_port"]["notnull"]
assert email_settings["smtp_security"]["notnull"]
assert "smtp_password" not in email_settings
assert "google_refresh_token" not in email_settings

quote_template_fks = {
    row[2]
    for row in stable.execute(
        "PRAGMA foreign_key_list(crm_quote_template_packages)"
    )
}
assert "crm_quote_templates" in quote_template_fks
assert "crm_packages" in quote_template_fks
assert "workspaces" in quote_template_fks

quote_addon_fks = {
    row[2]
    for row in stable.execute(
        "PRAGMA foreign_key_list(crm_quote_template_addons)"
    )
}
assert "crm_quote_templates" in quote_addon_fks
assert "crm_addons" in quote_addon_fks
assert "workspaces" in quote_addon_fks

email_setting_fks = {
    row[2]
    for row in stable.execute(
        "PRAGMA foreign_key_list(crm_email_settings)"
    )
}
assert "crm_email_credentials" in email_setting_fks
assert "workspaces" in email_setting_fks

# v1.10.9a must be additive around immutable quote snapshots.
assert "ALTER TABLE crm_quotes" not in migration
assert "ALTER TABLE crm_quote_versions" not in migration
assert "ALTER TABLE crm_quote_options" not in migration
assert "ALTER TABLE crm_quote_option_addons" not in migration
assert "ALTER TABLE crm_quote_acceptances" not in migration

assert (
    one(
        stable,
        "SELECT COUNT(*) FROM sqlite_master "
        "WHERE type='table' "
        "AND name='crm_quote_option_addons'",
    )
    == 1
)

fk_problems = list(
    stable.execute("PRAGMA foreign_key_check")
)
assert not fk_problems, fk_problems

print(
    "PASS v1.10.9a commercial templates schema foundation"
)
print(
    "  quote templates and ordered package options: verified"
)
print(
    "  global template add-ons: verified"
)
print(
    "  email templates and attachment metadata: verified"
)
print(
    "  managed/google/smtp delivery settings: verified"
)
print(
    "  encrypted credential storage only: verified"
)
print(
    "  immutable quote acceptance tables unchanged: verified"
)
print(
    "  schema transition 40 -> 41: verified"
)
