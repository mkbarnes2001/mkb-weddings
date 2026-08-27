#!/usr/bin/env python3
"""v1.10.12a canonical Lead Source continuity regression."""

from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]

schema_path = ROOT / "d1/schema.sql"

migration_path = (
    ROOT
    / "d1/migrations/048_crm_lead_source_continuity.sql"
)

crm_path = ROOT / "serverless/crm-d1.ts"

types_path = ROOT / "src/admin/types/crm.ts"

marker = (
    "-- v1.10.12a: CRM Lead Source continuity "
    "(schema 48)."
)


schema = schema_path.read_text(
    encoding="utf-8",
)

migration = migration_path.read_text(
    encoding="utf-8",
)

crm = crm_path.read_text(
    encoding="utf-8",
)

types = types_path.read_text(
    encoding="utf-8",
)


def schema_version(db):
    row = db.execute(
        """
        SELECT value
        FROM schema_meta
        WHERE key='schema_version'
        """
    ).fetchone()

    assert row
    return str(row[0])


def columns(db, table):
    return {
        row[1]: row
        for row in db.execute(
            f"PRAGMA table_info('{table}')"
        )
    }


# Fresh canonical schema.
fresh = sqlite3.connect(":memory:")
fresh.execute("PRAGMA foreign_keys = ON")
fresh.executescript(schema)

assert int(schema_version(fresh)) >= 49

assert not fresh.execute(
    "PRAGMA foreign_key_check"
).fetchall()


for table in (
    "crm_enquiries",
    "crm_jobs",
):
    column = columns(
        fresh,
        table,
    )["lead_source"]

    assert (
        str(column[2]).upper()
        == "TEXT"
    )

    assert int(
        column[3]
    ) == 1

    assert str(
        column[4]
    ) == "''"


# Exact schema-47 predecessor upgrades to 48.
schema47 = schema.split(
    marker,
    1,
)[0]

upgrade = sqlite3.connect(":memory:")
upgrade.execute("PRAGMA foreign_keys = ON")
upgrade.executescript(schema47)

assert schema_version(upgrade) == "47"

assert (
    "lead_source"
    not in columns(
        upgrade,
        "crm_enquiries",
    )
)

assert (
    "lead_source"
    not in columns(
        upgrade,
        "crm_jobs",
    )
)

upgrade.executescript(
    migration
)

assert schema_version(upgrade) == "48"

assert not upgrade.execute(
    "PRAGMA foreign_key_check"
).fetchall()


# Lead Source is a canonical but configurable system field.
system_start = crm.index(
    "const LEAD_FORM_SYSTEM_KEYS"
)

system_end = crm.index(
    "]);",
    system_start,
)

assert (
    '"leadSource"'
    in crm[
        system_start:
        system_end
    ]
)

locked_start = crm.index(
    "const LEAD_FORM_LOCKED_SYSTEM_KEYS"
)

locked_end = crm.index(
    "]);",
    locked_start,
)

assert (
    '"leadSource"'
    not in crm[
        locked_start:
        locked_end
    ]
)


field_start = crm.index(
    '      id: "leadSource",'
)

field_end = crm.index(
    'id: "packageInterest",',
    field_start,
)

field = crm[
    field_start:
    field_end
]

for token in (
    'type: "select"',
    'label: "How did you hear about us?"',
    'placeholder: "Choose an option"',
    'systemKey: "leadSource"',
    "locked: false",
    '"Google"',
    '"Instagram"',
    '"Referral"',
    '"Wedding venue"',
    '"Other"',
):
    assert token in field, token


# Lead Source is optional in the configurable public form.
# Once a workspace has explicitly removed it, normalisation must
# preserve that omission rather than silently resurrecting it.
# The booking-critical identity/date fields remain protected.
normalise_start = crm.index(
    "function normalizeLeadFormFields("
)

normalise_end = crm.index(
    "function normalizeLeadAddress(",
    normalise_start,
)

normalise = crm[
    normalise_start:
    normalise_end
]

assert (
    'if (!systemKeys.has("leadSource"))'
    not in normalise
)

for token in (
    '"firstName"',
    '"email"',
    '"eventDate"',
    "protectedField",
    "fields.unshift(",
):
    assert token in normalise, token


# Both CRM read models expose Lead Source.
assert (
    crm.count(
        "leadSource: text(row.lead_source)"
    )
    >= 2
)


# Professional editing keeps technical source separate.
assert (
    "source = ?, lead_source = ?, campaign = ?"
    in crm
)

assert (
    "text(input?.source ?? current.source)"
    in crm
)

assert (
    "text(input?.leadSource ?? current.lead_source)"
    in crm
)


# Public form resolves the selected source through the
# canonical form-field mapping.
submit = crm[
    crm.index(
        "export async function submitPublicEnquiry"
    ):
]

assert (
    'const leadSource = text('
    in submit
)

lead_block = submit[
    submit.index(
        "const leadSource = text("
    ):
    submit.index(
        "const packageInterest = text("
    )
]

assert (
    '"leadSource"'
    in lead_block
)


# Public and Admin enquiry inserts both persist lead_source.
assert (
    crm.count(
        "INSERT INTO crm_enquiries"
    )
    == 2
)

assert (
    crm.count(
        "lead_source"
    )
    >= 8
)

assert (
    "text(input?.leadSource)"
    in crm
)

assert (
    "fingerprint,\n"
    "      leadSource,"
    in crm
)


# Job conversion carries the Lead Source snapshot.
assert (
    "quote_snapshot_json, lead_source, created_at"
    in crm
)

assert (
    "text(enquiryRow.lead_source)"
    in crm
)


# Technical source/provenance remains untouched.
for token in (
    'source: text(row.source)',
    'text(input?.source || "manual")',
    "'open', 'website'",
    "crm: { enquiryId, source: text(enquiryRow.source) }",
):
    assert token in crm, token

assert (
    "source: leadSource"
    not in crm
)

assert (
    "source = lead_source"
    not in crm
)


# Front-end type contract.
for token in (
    "source: string;",
    "leadSource: string;",
    "source?: string;",
    "leadSource?: string;",
):
    assert token in types, token


print(
    "PASS v1.10.12a canonical Lead Source continuity"
)

print(
    "  schema transition: 47 -> 48"
)

print(
    "  technical source provenance: preserved"
)

print(
    "  Lead Source: separate canonical field"
)

print(
    "  public choice field: configurable"
)

print(
    "  saved Lead Form optional-field omission: respected"
)

print(
    "  Admin/Public Lead persistence: verified"
)

print(
    "  Lead -> Job continuity: verified"
)

print(
    "  foreign-key integrity: verified"
)
