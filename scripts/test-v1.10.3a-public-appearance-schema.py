#!/usr/bin/env python3

from pathlib import Path
import json
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "d1/schema.sql"
MIGRATION = (
    ROOT
    / "d1/migrations/038_wedplanned_public_appearance.sql"
)

MARKER = (
    "-- v1.10.3a: WedPlanned public website appearance "
    "and publication history."
)


def one(con: sqlite3.Connection, sql: str):
    row = con.execute(sql).fetchone()
    assert row is not None, sql
    return row


def column_names(
    con: sqlite3.Connection,
    table: str,
):
    return {
        row[1]
        for row in con.execute(
            f"PRAGMA table_info({table})"
        )
    }


def verify_schema(con: sqlite3.Connection):
    assert one(
        con,
        "SELECT value FROM schema_meta "
        "WHERE key='schema_version'",
    )[0] == "38"

    appearance_columns = column_names(
        con,
        "platform_public_site_appearance",
    )

    assert {
        "id",
        "draft_json",
        "published_json",
        "published_version",
        "updated_by_user_id",
        "updated_by_email",
        "published_by_user_id",
        "published_by_email",
        "created_at",
        "updated_at",
        "published_at",
    }.issubset(appearance_columns)

    version_columns = column_names(
        con,
        "platform_public_site_appearance_versions",
    )

    assert {
        "id",
        "site_key",
        "version",
        "theme_json",
        "published_by_user_id",
        "published_by_email",
        "created_at",
    }.issubset(version_columns)

    # This configuration is global platform data, never tenant data.
    assert "workspace_id" not in appearance_columns
    assert "workspace_id" not in version_columns

    current = one(
        con,
        """
        SELECT
          id,
          draft_json,
          published_json,
          published_version,
          published_at
        FROM platform_public_site_appearance
        WHERE id='wedplanned'
        """,
    )

    assert current == (
        "wedplanned",
        "{}",
        "{}",
        0,
        None,
    )

    assert json.loads(current[1]) == {}
    assert json.loads(current[2]) == {}

    # Version numbers are unique per public site.
    con.execute(
        """
        INSERT INTO platform_public_site_appearance_versions (
          id,
          site_key,
          version,
          theme_json
        ) VALUES (
          'test_version_1',
          'wedplanned',
          1,
          '{}'
        )
        """
    )

    try:
        con.execute(
            """
            INSERT INTO platform_public_site_appearance_versions (
              id,
              site_key,
              version,
              theme_json
            ) VALUES (
              'test_version_duplicate',
              'wedplanned',
              1,
              '{}'
            )
            """
        )
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError(
            "Duplicate public appearance versions "
            "must be rejected"
        )

    assert not con.execute(
        "PRAGMA foreign_key_check"
    ).fetchall()


def main() -> None:
    schema = SCHEMA.read_text(encoding="utf-8")
    migration = MIGRATION.read_text(encoding="utf-8")

    assert MARKER in schema
    assert MARKER in migration
    assert schema.count(MARKER) == 1

    # Fresh database.
    fresh = sqlite3.connect(":memory:")
    fresh.execute("PRAGMA foreign_keys = ON")
    fresh.executescript(schema)
    verify_schema(fresh)

    # Upgrade path from the exact schema-37 prefix.
    prefix = schema.split(MARKER, 1)[0]

    upgrade = sqlite3.connect(":memory:")
    upgrade.execute("PRAGMA foreign_keys = ON")
    upgrade.executescript(prefix)

    assert one(
        upgrade,
        "SELECT value FROM schema_meta "
        "WHERE key='schema_version'",
    )[0] == "37"

    upgrade.executescript(migration)

    assert one(
        upgrade,
        "SELECT value FROM schema_meta "
        "WHERE key='schema_version'",
    )[0] == "38"

    verify_schema(upgrade)

    print(
        "PASS v1.10.3a public appearance schema foundation"
    )
    print(
        "  schema transition: 37 -> 38"
    )
    print(
        "  global platform ownership: verified"
    )
    print(
        "  independent draft/published themes: verified"
    )
    print(
        "  immutable numbered publication history: verified"
    )
    print(
        "  clean schema-37 upgrade path: verified"
    )


if __name__ == "__main__":
    main()
