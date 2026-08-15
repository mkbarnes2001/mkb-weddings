#!/usr/bin/env python3

"""Focused schema checks for v1.10.10a Lead Workspace foundation."""

from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]

SCHEMA = ROOT / "d1" / "schema.sql"

MIGRATION = (
    ROOT
    / "d1"
    / "migrations"
    / "042_wedcrm_lead_workspace_client_journey.sql"
)

MARKER = (
    "-- v1.10.10a: WedCRM lead workspace "
    "and client journey foundation."
)


def value(
    connection: sqlite3.Connection,
    sql: str,
    params: tuple = (),
):
    row = connection.execute(
        sql,
        params,
    ).fetchone()

    return row[0] if row else None


def columns(
    connection: sqlite3.Connection,
    table: str,
) -> dict[str, sqlite3.Row]:
    return {
        row[1]: row
        for row in connection.execute(
            f"PRAGMA table_info({table})"
        )
    }


def fresh_database(
    sql: str,
) -> sqlite3.Connection:
    connection = sqlite3.connect(
        ":memory:"
    )

    connection.execute(
        "PRAGMA foreign_keys = ON"
    )

    connection.executescript(
        sql
    )

    return connection


def main() -> None:
    schema = SCHEMA.read_text(
        encoding="utf-8"
    )

    migration = MIGRATION.read_text(
        encoding="utf-8"
    )

    assert migration.startswith(
        MARKER
    )

    assert schema.count(
        MARKER
    ) == 1

    assert (
        "ALTER TABLE crm_quote_templates"
        in migration
    )

    assert (
        "ALTER TABLE crm_quotes"
        in migration
    )

    assert (
        "quote_type IN "
        "('pick_and_choose', 'fixed')"
        in migration
    )

    assert (
        "ALTER TABLE crm_addons"
        in migration
    )

    assert (
        "ALTER TABLE crm_quote_options"
        in migration
    )

    assert (
        "ALTER TABLE crm_quote_option_addons"
        in migration
    )

    for field in [
        "open_tracking_token_hash",
        "delivered_at",
        "opened_at",
        "clicked_at",
    ]:
        assert field in migration

    assert (
        "CREATE TABLE crm_job_files"
        in migration
    )

    assert (
        "CRM job file workspace mismatch"
        in migration
    )

    # The current canonical schema must contain the complete
    # v1.10.10a foundation. Later additive releases may advance
    # schema_meta beyond 42.
    database = fresh_database(
        schema
    )

    current_schema_version = int(
        value(
            database,
            """
            SELECT value
            FROM schema_meta
            WHERE key = 'schema_version'
            """,
        )
    )

    assert current_schema_version >= 42

    quote_template_columns = columns(
        database,
        "crm_quote_templates",
    )

    quote_columns = columns(
        database,
        "crm_quotes",
    )

    addon_columns = columns(
        database,
        "crm_addons",
    )

    quote_option_columns = columns(
        database,
        "crm_quote_options",
    )

    quote_addon_columns = columns(
        database,
        "crm_quote_option_addons",
    )

    communication_columns = columns(
        database,
        "crm_communications",
    )

    file_columns = columns(
        database,
        "crm_job_files",
    )

    assert (
        quote_template_columns[
            "quote_type"
        ][4]
        == "'pick_and_choose'"
    )

    assert (
        quote_columns[
            "quote_type"
        ][4]
        == "'pick_and_choose'"
    )

    assert (
        "image_url"
        in addon_columns
    )

    assert (
        "image_url"
        in quote_option_columns
    )

    assert (
        "image_url"
        in quote_addon_columns
    )

    for field in [
        "open_tracking_token_hash",
        "delivered_at",
        "opened_at",
        "clicked_at",
    ]:
        assert (
            field
            in communication_columns
        )

    for field in [
        "id",
        "workspace_id",
        "job_id",
        "identity_id",
        "actor_user_id",
        "source",
        "storage_key",
        "original_filename",
        "mime_type",
        "file_size",
        "status",
        "uploaded_at",
        "deleted_at",
        "updated_at",
    ]:
        assert field in file_columns

    indexes = {
        row[1]
        for row in database.execute(
            "PRAGMA index_list(crm_job_files)"
        )
    }

    assert (
        "idx_crm_job_files_job"
        in indexes
    )

    assert (
        "idx_crm_job_files_identity"
        in indexes
    )

    communication_indexes = {
        row[1]
        for row in database.execute(
            "PRAGMA index_list("
            "crm_communications"
            ")"
        )
    }

    assert (
        "idx_crm_communications_"
        "open_tracking_token"
        in communication_indexes
    )

    assert (
        "idx_crm_communications_"
        "enquiry_engagement"
        in communication_indexes
    )

    triggers = {
        row[0]
        for row in database.execute(
            """
            SELECT name
            FROM sqlite_master
            WHERE type = 'trigger'
            """
        )
    }

    assert (
        "trg_crm_job_file_"
        "workspace_insert"
        in triggers
    )

    assert (
        "trg_crm_job_file_"
        "workspace_update"
        in triggers
    )

    assert not database.execute(
        "PRAGMA foreign_key_check"
    ).fetchall()

    # Prove migration 041 -> 042 works against the real accumulated schema.
    base_schema, separator, _ = (
        schema.partition(
            MARKER
        )
    )

    assert separator == MARKER

    upgrade = fresh_database(
        base_schema
    )

    assert value(
        upgrade,
        """
        SELECT value
        FROM schema_meta
        WHERE key = 'schema_version'
        """,
    ) == "41"

    upgrade.executescript(
        migration
    )

    assert value(
        upgrade,
        """
        SELECT value
        FROM schema_meta
        WHERE key = 'schema_version'
        """,
    ) == "42"

    # Prove same-workspace Job files are accepted and cross-workspace
    # relationships are rejected by the new ownership trigger.
    upgrade.execute(
        """
        INSERT INTO workspaces (
          id,
          slug,
          name
        )
        VALUES (
          'workspace-a',
          'workspace-a',
          'Workspace A'
        )
        """
    )

    upgrade.execute(
        """
        INSERT INTO workspaces (
          id,
          slug,
          name
        )
        VALUES (
          'workspace-b',
          'workspace-b',
          'Workspace B'
        )
        """
    )

    upgrade.execute(
        """
        INSERT INTO crm_jobs (
          id,
          workspace_id,
          reference
        )
        VALUES (
          'job-b',
          'workspace-b',
          'JOB-B'
        )
        """
    )

    upgrade.execute(
        """
        INSERT INTO crm_job_files (
          id,
          workspace_id,
          job_id,
          source,
          storage_key,
          original_filename
        )
        VALUES (
          'file-b',
          'workspace-b',
          'job-b',
          'workspace',
          'workspaces/workspace-b/crm/jobs/job-b/reference.jpg',
          'reference.jpg'
        )
        """
    )

    assert value(
        upgrade,
        """
        SELECT original_filename
        FROM crm_job_files
        WHERE id = 'file-b'
          AND workspace_id = 'workspace-b'
        """,
    ) == "reference.jpg"

    try:
        upgrade.execute(
            """
            INSERT INTO crm_job_files (
              id,
              workspace_id,
              job_id,
              source,
              storage_key,
              original_filename
            )
            VALUES (
              'cross-workspace-file',
              'workspace-a',
              'job-b',
              'workspace',
              'workspaces/workspace-a/crm/jobs/job-b/private.jpg',
              'private.jpg'
            )
            """
        )
    except sqlite3.IntegrityError as error:
        assert (
            "CRM job file workspace mismatch"
            in str(error)
        )
    else:
        raise AssertionError(
            "Cross-workspace Job file "
            "relationship was accepted."
        )

    assert not upgrade.execute(
        "PRAGMA foreign_key_check"
    ).fetchall()

    print(
        "PASS v1.10.10a Lead Workspace "
        "schema foundation"
    )

    print(
        "  schema transition 41 -> 42: verified"
    )

    print(
        "  pick-and-choose/fixed quote type: verified"
    )

    print(
        "  catalogue and quote image fields: verified"
    )

    print(
        "  communication engagement fields: verified"
    )

    print(
        "  Job file tenant isolation: verified"
    )


if __name__ == "__main__":
    main()
