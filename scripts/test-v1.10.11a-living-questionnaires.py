#!/usr/bin/env python3
"""Focused regression for v1.10.11a living shared questionnaires."""

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(
        encoding="utf-8"
    )


schema = read(
    "d1/schema.sql"
)
migration = read(
    "d1/migrations/043_living_questionnaires.sql"
)
portal = read(
    "serverless/client-portal-d1.ts"
)
route = read(
    "functions/api/crm/[[path]].ts"
)
api = read(
    "src/admin/services/AdminApiService.ts"
)
types = read(
    "src/admin/types/crm.ts"
)
client = read(
    "src/components/ClientPortal.tsx"
)

# Full current schema is schema 45.
db = sqlite3.connect(":memory:")
db.executescript(schema)

version = db.execute(
    "SELECT value "
    "FROM schema_meta "
    "WHERE key='schema_version'"
).fetchone()[0]

assert str(version) == "45"

instance_columns = {
    row[1]
    for row in db.execute(
        "PRAGMA table_info("
        "crm_questionnaire_instances)"
    )
}

for column in (
    "last_saved_by_type",
    "last_saved_by_user_id",
    "last_saved_by_identity_id",
    "last_saved_by_label",
):
    assert column in instance_columns, column

response_columns = {
    row[1]
    for row in db.execute(
        "PRAGMA table_info("
        "crm_questionnaire_responses)"
    )
}

assert (
    "updated_by_user_id"
    in response_columns
)

assert not db.execute(
    "PRAGMA foreign_key_check"
).fetchall()

# Migration itself is independently executable against the
# pre-43 table shapes.
upgrade = sqlite3.connect(":memory:")
upgrade.executescript(
    """
    CREATE TABLE schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT
    );

    INSERT INTO schema_meta (
      key,
      value,
      updated_at
    ) VALUES (
      'schema_version',
      '42',
      CURRENT_TIMESTAMP
    );

    CREATE TABLE crm_questionnaire_instances (
      id TEXT PRIMARY KEY
    );

    CREATE TABLE crm_questionnaire_responses (
      instance_id TEXT NOT NULL,
      field_key TEXT NOT NULL,
      PRIMARY KEY (
        instance_id,
        field_key
      )
    );
    """
)

upgrade.executescript(migration)

assert upgrade.execute(
    "SELECT value "
    "FROM schema_meta "
    "WHERE key='schema_version'"
).fetchone()[0] == "43"

# Completion is no longer an edit lock.
assert (
    "This questionnaire has already been submitted."
    not in portal
)

assert (
    'status === "completed"'
    in client
)

assert (
    'disabled={questionnaire.status === "completed"}'
    not in client
)

assert (
    'saving || questionnaire.status === "completed"'
    not in client
)

for token in (
    "Save changes",
    "Submit updates",
    "Mark as complete",
    "You can continue updating them at any time.",
    "Planning target",
):
    assert token in client, token

# Completed questionnaires retain the same editable save path,
# but present an explicit update-submission action to the client.
completed_action = client[
    client.index(
        '<footer className="portal-questionnaire-actions">'
    ):
    client.index(
        "</footer>",
        client.index(
            '<footer className="portal-questionnaire-actions">'
        ),
    )
]

assert (
    'questionnaire.status === "completed"'
    in completed_action
)
assert '"Submit updates"' in completed_action
assert '"Save changes"' in completed_action
assert "void save(false)" in completed_action
assert "void save(true)" in completed_action

# Completion remains a milestone rather than resetting on edit.
assert (
    "ELSE status"
    in portal
)
assert (
    "COALESCE("
    in portal
)
assert (
    "completed_at"
    in portal
)

# Client attribution uses client identity and clears professional user.
for token in (
    "last_saved_by_type =\n        'client'",
    "last_saved_by_identity_id",
    "updated_by_identity_id",
    "updated_by_user_id =\n          NULL",
):
    assert token in portal, token

# Professional editing uses the same response table / instance.
for token in (
    "export async function saveQuestionnaireInstanceAdmin(",
    "crm_questionnaire_responses",
    "crm_questionnaire_instances",
    "last_saved_by_type =\n          'professional'",
    "updated_by_user_id",
    "last_saved_by_label",
):
    assert token in portal, token

# Support sessions cannot mutate client questionnaire answers.
assert (
    'actor.accessMode === "support"'
    in portal
)
assert (
    "Support sessions cannot edit client questionnaire responses."
    in portal
)

# Workspace authority is server-derived from the professional actor.
professional_start = portal.index(
    "export async function saveQuestionnaireInstanceAdmin("
)

professional_end = portal.index(
    "export async function uploadQuestionnaireFile(",
    professional_start,
)

professional = portal[
    professional_start:
    professional_end
]

assert (
    "actor.workspaceId"
    in professional
)

assert (
    "input?.workspaceId"
    not in professional
)

# Admin transport is explicit and typed.
assert (
    "saveQuestionnaireInstanceAdmin,"
    in route
)

assert (
    'parts[1] === "instances"'
    in route
)

assert (
    "static async saveQuestionnaireInstance("
    in api
)

for token in (
    "lastSavedByType?",
    "lastSavedByUserId?",
    "lastSavedByIdentityId?",
    "lastSavedByLabel?",
):
    assert token in types, token

# Due date remains advisory; there is no expiration mutation.
assert (
    "questionnaire_due_days_before_event"
    not in professional
)
assert (
    "expired"
    not in professional.lower()
)

print(
    "PASS v1.10.11a living questionnaire foundation"
)
print(
    "  schema transition 42 -> 43: verified"
)
print(
    "  client editing after completion: verified"
)
print(
    "  completion retained as workflow milestone: verified"
)
print(
    "  advisory planning target: verified"
)
print(
    "  client/professional edit attribution: verified"
)
print(
    "  shared professional response API: verified"
)
print(
    "  workspace isolation: verified"
)
print(
    "  support-mode mutation guard: verified"
)
