#!/usr/bin/env python3
"""v1.10.12a Gate 2D.2B1 venue identity schema regression."""

from pathlib import Path
import json
import sqlite3


ROOT = Path(__file__).resolve().parents[1]

SCHEMA = ROOT / "d1/schema.sql"

MIGRATION = (
    ROOT
    / "d1/migrations/049_crm_wedstudio_venue_identity.sql"
)

MARKER = (
    "-- v1.10.12a: CRM / WedStudio venue identity "
    "continuity (schema 49)."
)


def one(
    db: sqlite3.Connection,
    sql: str,
    params=(),
):
    return db.execute(
        sql,
        params,
    ).fetchone()


def schema_version(
    db: sqlite3.Connection,
) -> str:
    row = one(
        db,
        """
        SELECT value
        FROM schema_meta
        WHERE key='schema_version'
        """,
    )

    assert row
    return str(row[0])


def columns(
    db: sqlite3.Connection,
    table: str,
):
    return {
        row[1]: row
        for row in db.execute(
            f'PRAGMA table_info("{table}")'
        )
    }


def assert_text_column(
    db: sqlite3.Connection,
    table: str,
    column: str,
    default: str,
):
    row = columns(
        db,
        table,
    )[column]

    assert (
        str(row[2]).upper()
        == "TEXT"
    )

    assert int(
        row[3]
    ) == 1

    assert str(
        row[4]
    ) == default


def index_row(
    db: sqlite3.Connection,
    table: str,
    name: str,
):
    rows = list(
        db.execute(
            f'PRAGMA index_list("{table}")'
        )
    )

    row = next(
        (
            item
            for item in rows
            if item[1] == name
        ),
        None,
    )

    assert row, (
        table,
        name,
    )

    return row


def index_columns(
    db: sqlite3.Connection,
    name: str,
):
    return [
        row[2]
        for row in db.execute(
            f'PRAGMA index_info("{name}")'
        )
    ]


def insert_venue(
    db: sqlite3.Connection,
    *,
    workspace_id: str,
    slug: str,
    venue_id: str,
    name: str,
    google_place_id: str = "",
):
    document = json.dumps(
        {
            "schemaVersion": 1,
            "id": venue_id,
            "slug": slug,
            "name": name,
        },
        separators=(",", ":"),
    )

    db.execute(
        """
        INSERT INTO venues (
          slug,
          id,
          name,
          town,
          county,
          country,
          status,
          hero_asset_id,
          seo_title,
          seo_description,
          document_json,
          published_json,
          published_at,
          updated_at,
          workspace_id,
          google_place_id
        )
        VALUES (
          ?, ?, ?,
          '', '', 'Northern Ireland',
          'draft',
          '', '', '',
          ?,
          '',
          NULL,
          CURRENT_TIMESTAMP,
          ?,
          ?
        )
        """,
        (
            slug,
            venue_id,
            name,
            document,
            workspace_id,
            google_place_id,
        ),
    )


schema = SCHEMA.read_text(
    encoding="utf-8",
)

migration = MIGRATION.read_text(
    encoding="utf-8",
)


# ------------------------------------------------------------
# Source contract.
# ------------------------------------------------------------

assert schema.count(
    MARKER
) == 1

assert migration.count(
    MARKER
) == 1

for token in (
    "ALTER TABLE crm_enquiries",
    "ADD COLUMN venue_place_id TEXT NOT NULL DEFAULT ''",
    "ADD COLUMN venue_place_json TEXT NOT NULL DEFAULT '{}'",
    "ALTER TABLE crm_jobs",
    "ALTER TABLE venues",
    "ADD COLUMN google_place_id TEXT NOT NULL DEFAULT ''",
    "idx_venues_workspace_google_place_id",
    "ON venues(workspace_id, google_place_id)",
    "WHERE google_place_id <> ''",
    "idx_crm_enquiries_workspace_venue_place_id",
    "idx_crm_jobs_workspace_venue_place_id",
    "'schema_version'",
    "'49'",
):
    assert token in migration, token


upper = migration.upper()

for forbidden in (
    "DROP TABLE",
    "DROP COLUMN",
    "DELETE FROM",
):
    assert forbidden not in upper, forbidden


# ------------------------------------------------------------
# Fresh canonical release schema = 51.
#
# Venue Identity itself remains the exact historical 48 -> 49
# migration tested separately below.
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

assert (
    schema_version(fresh)
    == "51"
)


for table in (
    "crm_enquiries",
    "crm_jobs",
):
    assert_text_column(
        fresh,
        table,
        "venue_place_id",
        "''",
    )

    assert_text_column(
        fresh,
        table,
        "venue_place_json",
        "'{}'",
    )


assert_text_column(
    fresh,
    "venues",
    "google_place_id",
    "''",
)


venue_index = index_row(
    fresh,
    "venues",
    "idx_venues_workspace_google_place_id",
)

# PRAGMA index_list:
# seq, name, unique, origin, partial
assert int(
    venue_index[2]
) == 1

assert int(
    venue_index[4]
) == 1

assert index_columns(
    fresh,
    "idx_venues_workspace_google_place_id",
) == [
    "workspace_id",
    "google_place_id",
]


for table, name in (
    (
        "crm_enquiries",
        "idx_crm_enquiries_workspace_venue_place_id",
    ),
    (
        "crm_jobs",
        "idx_crm_jobs_workspace_venue_place_id",
    ),
):
    row = index_row(
        fresh,
        table,
        name,
    )

    assert int(
        row[2]
    ) == 0

    assert int(
        row[4]
    ) == 1

    assert index_columns(
        fresh,
        name,
    ) == [
        "workspace_id",
        "venue_place_id",
    ]


# ------------------------------------------------------------
# Workspace-scoped Google identity.
# ------------------------------------------------------------

A = "workspace_gate2d2b_a"
B = "workspace_gate2d2b_b"

fresh.execute(
    """
    INSERT INTO workspaces (
      id,
      slug,
      name
    )
    VALUES (?, ?, ?)
    """,
    (
        A,
        "gate2d2b-a",
        "Gate 2D.2B A",
    ),
)

fresh.execute(
    """
    INSERT INTO workspaces (
      id,
      slug,
      name
    )
    VALUES (?, ?, ?)
    """,
    (
        B,
        "gate2d2b-b",
        "Gate 2D.2B B",
    ),
)


PLACE = "ChIJ_GATE_2D2B_PLACE"


insert_venue(
    fresh,
    workspace_id=A,
    slug="gate2d2b-a-place",
    venue_id="venue_gate2d2b_a_place",
    name="Gate Venue A",
    google_place_id=PLACE,
)


# Same Place ID in the same workspace is rejected.
try:
    insert_venue(
        fresh,
        workspace_id=A,
        slug="gate2d2b-a-duplicate",
        venue_id="venue_gate2d2b_a_duplicate",
        name="Gate Venue A Duplicate",
        google_place_id=PLACE,
    )

    raise AssertionError(
        "Duplicate Google Place ID was accepted "
        "inside one workspace."
    )
except sqlite3.IntegrityError:
    pass


# The same external place identifier remains tenant scoped.
insert_venue(
    fresh,
    workspace_id=B,
    slug="gate2d2b-b-place",
    venue_id="venue_gate2d2b_b_place",
    name="Gate Venue B",
    google_place_id=PLACE,
)


assert one(
    fresh,
    """
    SELECT COUNT(*)
    FROM venues
    WHERE google_place_id = ?
    """,
    (
        PLACE,
    ),
)[0] == 2


# Multiple manual / legacy venues may have no Google identity.
insert_venue(
    fresh,
    workspace_id=A,
    slug="gate2d2b-manual-1",
    venue_id="venue_gate2d2b_manual_1",
    name="Manual Venue One",
)

insert_venue(
    fresh,
    workspace_id=A,
    slug="gate2d2b-manual-2",
    venue_id="venue_gate2d2b_manual_2",
    name="Manual Venue Two",
)

assert one(
    fresh,
    """
    SELECT COUNT(*)
    FROM venues
    WHERE workspace_id = ?
      AND google_place_id = ''
      AND slug LIKE 'gate2d2b-manual-%'
    """,
    (
        A,
    ),
)[0] == 2


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


# ------------------------------------------------------------
# Exact schema 48 -> 49 upgrade.
# ------------------------------------------------------------

schema48 = schema.split(
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
    schema48
)

assert (
    schema_version(upgrade)
    == "48"
)


for table, column in (
    (
        "crm_enquiries",
        "venue_place_id",
    ),
    (
        "crm_enquiries",
        "venue_place_json",
    ),
    (
        "crm_jobs",
        "venue_place_id",
    ),
    (
        "crm_jobs",
        "venue_place_json",
    ),
    (
        "venues",
        "google_place_id",
    ),
):
    assert (
        column
        not in columns(
            upgrade,
            table,
        )
    )


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
    ORDER BY is_default DESC,
             sort_order,
             id
    LIMIT 1
    """,
    (
        workspace_id,
    ),
)

assert stage_row

stage_id = stage_row[0]


# Representative schema-48 Lead.
upgrade.execute(
    """
    INSERT INTO crm_enquiries (
      id,
      workspace_id,
      reference,
      stage_id,
      event_date,
      venue_text
    )
    VALUES (
      'gate2d2b_legacy_lead',
      ?,
      'ENQ-GATE2D2B',
      ?,
      '2028-06-12',
      'Legacy Lead Venue'
    )
    """,
    (
        workspace_id,
        stage_id,
    ),
)


# Representative schema-48 Job.
upgrade.execute(
    """
    INSERT INTO crm_jobs (
      id,
      workspace_id,
      reference,
      enquiry_id,
      title,
      event_date
    )
    VALUES (
      'gate2d2b_legacy_job',
      ?,
      'JOB-GATE2D2B',
      'gate2d2b_legacy_lead',
      'Legacy Job',
      '2028-06-12'
    )
    """,
    (
        workspace_id,
    ),
)


legacy_doc = json.dumps(
    {
        "schemaVersion": 1,
        "id": "venue_gate2d2b_legacy",
        "slug": "gate2d2b-legacy-venue",
        "name": "Legacy Venue",
    },
    separators=(",", ":"),
)


upgrade.execute(
    """
    INSERT INTO venues (
      slug,
      id,
      name,
      town,
      county,
      country,
      status,
      hero_asset_id,
      seo_title,
      seo_description,
      document_json,
      published_json,
      published_at,
      updated_at,
      workspace_id
    )
    VALUES (
      'gate2d2b-legacy-venue',
      'venue_gate2d2b_legacy',
      'Legacy Venue',
      '',
      '',
      'Northern Ireland',
      'draft',
      '',
      '',
      '',
      ?,
      '',
      NULL,
      CURRENT_TIMESTAMP,
      ?
    )
    """,
    (
        legacy_doc,
        workspace_id,
    ),
)


upgrade.executescript(
    migration
)

assert (
    schema_version(upgrade)
    == "49"
)


assert one(
    upgrade,
    """
    SELECT
      venue_place_id,
      venue_place_json
    FROM crm_enquiries
    WHERE id='gate2d2b_legacy_lead'
    """,
) == (
    "",
    "{}",
)


assert one(
    upgrade,
    """
    SELECT
      venue_place_id,
      venue_place_json
    FROM crm_jobs
    WHERE id='gate2d2b_legacy_job'
    """,
) == (
    "",
    "{}",
)


assert one(
    upgrade,
    """
    SELECT google_place_id
    FROM venues
    WHERE slug='gate2d2b-legacy-venue'
    """,
)[0] == ""


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


print(
    "PASS v1.10.12a Gate 2D.2B1 venue identity schema"
)
print(
    "  schema transition: 48 -> 49"
)
print(
    "  CRM Lead Google venue identity: additive"
)
print(
    "  CRM Job Google venue identity: additive"
)
print(
    "  WedStudio Google Place identity: additive"
)
print(
    "  venue_id / venue_slug internal meaning: unchanged"
)
print(
    "  Google identity uniqueness: workspace scoped"
)
print(
    "  blank/manual venue identities: allowed"
)
print(
    "  existing schema-48 records: safe defaults"
)
print(
    "  automatic WedStudio venue creation: not introduced"
)
print(
    "  foreign-key / quick / integrity checks: verified"
)
