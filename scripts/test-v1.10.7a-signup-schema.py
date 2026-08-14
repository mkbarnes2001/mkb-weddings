#!/usr/bin/env python3

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]

SCHEMA = ROOT / "d1/schema.sql"

MIGRATION = (
    ROOT
    / "d1/migrations/040_external_business_signup_foundation.sql"
)

assert SCHEMA.exists(), SCHEMA
assert MIGRATION.exists(), MIGRATION

schema_sql = SCHEMA.read_text(
    encoding="utf-8"
)

migration_sql = MIGRATION.read_text(
    encoding="utf-8"
)

con = sqlite3.connect(":memory:")

con.execute("PRAGMA foreign_keys = ON")

con.executescript(schema_sql)

version = con.execute(
    """
    SELECT value
    FROM schema_meta
    WHERE key = 'schema_version'
    """
).fetchone()

assert version, "schema_version row missing"
assert version[0] == "41", version

table_sql_row = con.execute(
    """
    SELECT sql
    FROM sqlite_master
    WHERE type = 'table'
      AND name = 'platform_signup_requests'
    """
).fetchone()

assert table_sql_row, (
    "platform_signup_requests table missing"
)

table_sql = table_sql_row[0]

columns = {
    row[1]: row
    for row in con.execute(
        """
        PRAGMA table_info(
          "platform_signup_requests"
        )
        """
    )
}

expected_columns = {
    "id",
    "email_normalized",
    "email",
    "owner_display_name",
    "business_name",
    "requested_slug",
    "token_hash",
    "request_fingerprint",
    "status",
    "delivery_status",
    "delivery_error",
    "failure_reason",
    "expires_at",
    "consumed_at",
    "verified_at",
    "provisioned_at",
    "workspace_id",
    "created_at",
    "updated_at",
}

assert set(columns) == expected_columns, (
    set(columns),
    expected_columns,
)

assert columns["id"][5] == 1
assert columns["email_normalized"][3] == 1
assert columns["email"][3] == 1
assert columns["business_name"][3] == 1
assert columns["token_hash"][3] == 1
assert columns["expires_at"][3] == 1

assert "raw_token" not in columns
assert "verification_token" not in columns
assert "ip_address" not in columns
assert "client_ip" not in columns

lower_table_sql = table_sql.lower()

assert "'pending'" in lower_table_sql
assert "'verified'" in lower_table_sql
assert "'provisioned'" in lower_table_sql
assert "'failed'" in lower_table_sql

indexes = {
    row[1]
    for row in con.execute(
        """
        PRAGMA index_list(
          "platform_signup_requests"
        )
        """
    )
}

required_indexes = {
    "idx_platform_signup_requests_email_recent",
    "idx_platform_signup_requests_fingerprint_recent",
    "idx_platform_signup_requests_status_expiry",
    "idx_platform_signup_requests_workspace",
}

assert required_indexes.issubset(indexes), (
    indexes,
    required_indexes,
)

foreign_keys = con.execute(
    """
    PRAGMA foreign_key_list(
      "platform_signup_requests"
    )
    """
).fetchall()

workspace_fk = [
    row
    for row in foreign_keys
    if row[3] == "workspace_id"
]

assert len(workspace_fk) == 1, foreign_keys
assert workspace_fk[0][2] == "workspaces"
assert workspace_fk[0][4] == "id"
assert workspace_fk[0][6].upper() == "SET NULL"

violations = con.execute(
    "PRAGMA foreign_key_check"
).fetchall()

assert not violations, violations

required_migration_tokens = (
    "CREATE TABLE IF NOT EXISTS platform_signup_requests",
    "token_hash TEXT NOT NULL UNIQUE",
    "request_fingerprint TEXT NOT NULL DEFAULT ''",
    "REFERENCES workspaces(id)",
    "ON DELETE SET NULL",
    "'schema_version'",
    "'40'",
)

for token in required_migration_tokens:
    assert token in migration_sql, token

for forbidden in (
    "raw_token",
    "verification_token TEXT",
    "ip_address",
    "client_ip",
):
    assert forbidden not in migration_sql.lower(), forbidden

print("RELEASE=v1.10.7a")
print("TARGET_SCHEMA=40")
print("PLATFORM_SIGNUP_REQUESTS_TABLE=PASS")
print("TOKEN_HASH_ONLY_STORAGE=PASS")
print("RAW_SIGNUP_TOKEN_STORAGE=ABSENT")
print("RAW_IP_STORAGE=ABSENT")
print("REQUEST_FINGERPRINT_STORAGE=PASS")
print("SIGNUP_STATUS_CONTRACT=PASS")
print("SIGNUP_DELIVERY_STATUS_CONTRACT=PASS")
print("WORKSPACE_LINK_FOREIGN_KEY=PASS")
print("SIGNUP_RATE_LIMIT_INDEXES=PASS")
print("FOREIGN_KEY_CHECK=PASS")
print("MIGRATION_040=PASS")
print("SIGNUP_SCHEMA_TEST=PASS")
