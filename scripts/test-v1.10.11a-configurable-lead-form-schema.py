#!/usr/bin/env python3
"""v1.10.11a schema-45 configurable lead-form foundation regression."""

from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]

SCHEMA = ROOT / "d1/schema.sql"

MIGRATION = (
    ROOT
    / "d1/migrations/045_crm_configurable_lead_form.sql"
)

MARKER = (
    "-- v1.10.11a: Configurable public lead forms "
    "and structured lead-response snapshots."
)


def one(
    con: sqlite3.Connection,
    sql: str,
    params=(),
):
    return con.execute(
        sql,
        params,
    ).fetchone()


def table_columns(
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

migration = MIGRATION.read_text(
    encoding="utf-8",
)


# ------------------------------------------------------------
# Source contract.
# ------------------------------------------------------------

assert schema.count(MARKER) == 1
assert migration.count(MARKER) == 1

for token in (
    "ALTER TABLE crm_lead_form_settings",
    "ADD COLUMN fields_json TEXT NOT NULL DEFAULT '[]'",
    "ALTER TABLE crm_contacts",
    "ADD COLUMN address_json TEXT NOT NULL DEFAULT '{}'",
    "ALTER TABLE crm_enquiries",
    "ADD COLUMN lead_form_schema_json TEXT NOT NULL DEFAULT '[]'",
    "ADD COLUMN lead_form_answers_json TEXT NOT NULL DEFAULT '{}'",
    "'schema_version'",
    "'45'",
):
    assert token in migration, token


upper = migration.upper()

for forbidden in (
    "DROP TABLE",
    "DROP COLUMN",
    "DELETE FROM",
    "CREATE TABLE",
):
    assert forbidden not in upper, forbidden


# ------------------------------------------------------------
# Exact schema-44 prefix.
# ------------------------------------------------------------

prefix = schema.split(
    MARKER,
    1,
)[0]

upgrade = sqlite3.connect(
    ":memory:"
)

upgrade.execute(
    "PRAGMA foreign_keys = ON"
)

upgrade.executescript(
    prefix
)

assert one(
    upgrade,
    """
    SELECT value
    FROM schema_meta
    WHERE key = 'schema_version'
    """,
)[0] == "44"


assert "fields_json" not in table_columns(
    upgrade,
    "crm_lead_form_settings",
)

assert "address_json" not in table_columns(
    upgrade,
    "crm_contacts",
)

assert "lead_form_schema_json" not in table_columns(
    upgrade,
    "crm_enquiries",
)

assert "lead_form_answers_json" not in table_columns(
    upgrade,
    "crm_enquiries",
)


before_tables = {
    row[0]
    for row in upgrade.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        """
    )
}


# ------------------------------------------------------------
# Representative existing schema-44 records.
# ------------------------------------------------------------

workspace_row = one(
    upgrade,
    """
    SELECT id
    FROM workspaces
    ORDER BY id
    LIMIT 1
    """,
)

assert workspace_row

workspace_id = workspace_row[0]


stage_row = one(
    upgrade,
    """
    SELECT id
    FROM crm_pipeline_stages
    WHERE workspace_id = ?
    ORDER BY is_default DESC, sort_order, id
    LIMIT 1
    """,
    (workspace_id,),
)

assert stage_row

stage_id = stage_row[0]


lead_before = one(
    upgrade,
    """
    SELECT
      enabled,
      public_path,
      default_service,
      title,
      intro,
      thank_you_title,
      thank_you_message,
      notification_email,
      privacy_text,
      consent_required,
      autoresponder_enabled,
      autoresponder_subject,
      autoresponder_message
    FROM crm_lead_form_settings
    WHERE workspace_id = ?
    """,
    (workspace_id,),
)

assert lead_before


upgrade.execute(
    """
    INSERT INTO crm_contacts (
      id,
      workspace_id,
      first_name,
      last_name,
      display_name,
      email_normalized,
      email,
      phone,
      source,
      notes
    )
    VALUES (
      'schema45_contact',
      ?,
      'Existing',
      'Client',
      'Existing Client',
      'existing-schema45@example.test',
      'existing-schema45@example.test',
      '0123456789',
      'website',
      'Preserve this contact'
    )
    """,
    (workspace_id,),
)


upgrade.execute(
    """
    INSERT INTO crm_enquiries (
      id,
      workspace_id,
      reference,
      stage_id,
      source,
      event_type,
      event_date,
      venue_text,
      service_interest,
      package_interest,
      notes
    )
    VALUES (
      'schema45_enquiry',
      ?,
      'ENQ-SCHEMA45',
      ?,
      'website',
      'wedding',
      '2027-06-12',
      'Existing Venue',
      'Wedding photography',
      'Full day',
      'Preserve this enquiry'
    )
    """,
    (
        workspace_id,
        stage_id,
    ),
)


contact_before = one(
    upgrade,
    """
    SELECT
      first_name,
      last_name,
      display_name,
      email,
      phone,
      source,
      notes
    FROM crm_contacts
    WHERE id = 'schema45_contact'
    """,
)


enquiry_before = one(
    upgrade,
    """
    SELECT
      reference,
      source,
      event_type,
      event_date,
      venue_text,
      service_interest,
      package_interest,
      notes
    FROM crm_enquiries
    WHERE id = 'schema45_enquiry'
    """,
)


# ------------------------------------------------------------
# Apply migration exactly once to schema 44.
# ------------------------------------------------------------

upgrade.executescript(
    migration
)


assert one(
    upgrade,
    """
    SELECT value
    FROM schema_meta
    WHERE key = 'schema_version'
    """,
)[0] == "45"


after_tables = {
    row[0]
    for row in upgrade.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        """
    )
}

assert after_tables == before_tables


assert "fields_json" in table_columns(
    upgrade,
    "crm_lead_form_settings",
)

assert "address_json" in table_columns(
    upgrade,
    "crm_contacts",
)

assert "lead_form_schema_json" in table_columns(
    upgrade,
    "crm_enquiries",
)

assert "lead_form_answers_json" in table_columns(
    upgrade,
    "crm_enquiries",
)


# Existing lead-form settings remain byte-for-byte equivalent
# across all existing columns.
lead_after = one(
    upgrade,
    """
    SELECT
      enabled,
      public_path,
      default_service,
      title,
      intro,
      thank_you_title,
      thank_you_message,
      notification_email,
      privacy_text,
      consent_required,
      autoresponder_enabled,
      autoresponder_subject,
      autoresponder_message
    FROM crm_lead_form_settings
    WHERE workspace_id = ?
    """,
    (workspace_id,),
)

assert lead_after == lead_before


assert one(
    upgrade,
    """
    SELECT fields_json
    FROM crm_lead_form_settings
    WHERE workspace_id = ?
    """,
    (workspace_id,),
)[0] == "[]"


assert one(
    upgrade,
    """
    SELECT
      first_name,
      last_name,
      display_name,
      email,
      phone,
      source,
      notes
    FROM crm_contacts
    WHERE id = 'schema45_contact'
    """,
) == contact_before


assert one(
    upgrade,
    """
    SELECT address_json
    FROM crm_contacts
    WHERE id = 'schema45_contact'
    """,
)[0] == "{}"


assert one(
    upgrade,
    """
    SELECT
      reference,
      source,
      event_type,
      event_date,
      venue_text,
      service_interest,
      package_interest,
      notes
    FROM crm_enquiries
    WHERE id = 'schema45_enquiry'
    """,
) == enquiry_before


assert one(
    upgrade,
    """
    SELECT
      lead_form_schema_json,
      lead_form_answers_json
    FROM crm_enquiries
    WHERE id = 'schema45_enquiry'
    """,
) == (
    "[]",
    "{}",
)


assert not upgrade.execute(
    "PRAGMA foreign_key_check"
).fetchall()

assert one(
    upgrade,
    "PRAGMA quick_check",
)[0] == "ok"

assert one(
    upgrade,
    "PRAGMA integrity_check",
)[0] == "ok"

upgrade.close()


# ------------------------------------------------------------
# Fresh canonical schema path.
# ------------------------------------------------------------

fresh = sqlite3.connect(
    ":memory:"
)

fresh.execute(
    "PRAGMA foreign_keys = ON"
)

fresh.executescript(
    schema
)


assert one(
    fresh,
    """
    SELECT value
    FROM schema_meta
    WHERE key = 'schema_version'
    """,
)[0] == "47"


assert "fields_json" in table_columns(
    fresh,
    "crm_lead_form_settings",
)

assert "address_json" in table_columns(
    fresh,
    "crm_contacts",
)

assert "lead_form_schema_json" in table_columns(
    fresh,
    "crm_enquiries",
)

assert "lead_form_answers_json" in table_columns(
    fresh,
    "crm_enquiries",
)


# Commerce shipping data remains unrelated and untouched.
assert "shipping_address_json" in table_columns(
    fresh,
    "commerce_orders",
)


assert not fresh.execute(
    "PRAGMA foreign_key_check"
).fetchall()

assert one(
    fresh,
    "PRAGMA quick_check",
)[0] == "ok"

assert one(
    fresh,
    "PRAGMA integrity_check",
)[0] == "ok"

fresh.close()


print(
    "PASS v1.10.11a configurable lead-form schema foundation"
)
print(
    "  schema transition: 44 -> 45"
)
print(
    "  no new tables: verified"
)
print(
    "  existing lead-form settings preserved: verified"
)
print(
    "  configurable field-definition persistence: verified"
)
print(
    "  reusable CRM contact address JSON: verified"
)
print(
    "  enquiry form-schema snapshots: verified"
)
print(
    "  enquiry answer snapshots: verified"
)
print(
    "  historical canonical CRM values preserved: verified"
)
print(
    "  commerce shipping address remains independent: verified"
)
print(
    "  foreign-key / quick / integrity checks: verified"
)
