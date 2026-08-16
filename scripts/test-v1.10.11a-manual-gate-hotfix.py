#!/usr/bin/env python3
"""Regression for v1.10.11a manual production gate hotfix."""

from pathlib import Path
import re
import sqlite3


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (
        ROOT / relative
    ).read_text(
        encoding="utf-8"
    )


quotes = read(
    "serverless/crm-quotes-d1.ts"
)

page = read(
    "src/admin/pages/CRMQuote.tsx"
)

css = read(
    "src/admin/admin-theme.css"
)

schema = read(
    "d1/schema.sql"
)

con = sqlite3.connect(":memory:")
con.executescript(schema)

schema_version = con.execute(
    """
    SELECT value
    FROM schema_meta
    WHERE key='schema_version'
    """
).fetchone()

assert schema_version
assert str(schema_version[0]) == "43"

contract_columns = {
    row[1]
    for row in con.execute(
        """
        PRAGMA table_info(
          crm_contract_templates
        )
        """
    )
}

assert "version" not in contract_columns

prepared_queries = re.findall(
    r"db\.prepare\(`(.*?)`\)"
    r"\.bind\(",
    quotes,
    flags=re.DOTALL,
)

contract_preview_queries = [
    query.strip()
    for query in prepared_queries
    if (
        "FROM crm_contract_templates"
        in query
        and "ORDER BY" in query
        and "updated_at DESC" in query
    )
]

assert len(
    contract_preview_queries
) == 1, contract_preview_queries

contract_preview_query = (
    contract_preview_queries[0]
)

select_portion = (
    contract_preview_query
    .split(
        "FROM crm_contract_templates",
        1,
    )[0]
)

assert re.search(
    r"\bid\b",
    select_portion,
)

assert re.search(
    r"\bname\b",
    select_portion,
)

assert not re.search(
    r"\bversion\b",
    select_portion,
), select_portion

# Execute the exact SQL extracted from the application
# against the canonical schema. This is the regression
# that catches the production SQLITE_ERROR seen during
# the manual gate.
con.execute(
    contract_preview_query,
    ("workspace_nonexistent",),
).fetchall()

assert (
    'className="crm-quote-page-header"'
    in page
)

assert (
    'className="crm-quote-header-actions"'
    in page
)

for token in (
    "v1.10.11a manual-gate hotfix",
    ".crm-quote-page-header",
    'grid-template-areas:',
    '"brand content meta"',
    '". actions actions"',
    ".crm-quote-header-actions",
    "flex: 1 1 340px",
    "@media (max-width: 900px)",
    "@media (max-width: 640px)",
):
    assert token in css, token

assert not con.execute(
    "PRAGMA foreign_key_check"
).fetchall()

print(
    "PASS v1.10.11a manual-gate hotfix"
)

print(
    "  contract-template preview SQL "
    "executes against schema 43: verified"
)

print(
    "  unversioned contract-template "
    "schema respected: verified"
)

print(
    "  quote actions moved to dedicated "
    "responsive header row: verified"
)

print(
    "  desktop / constrained desktop / "
    "mobile header layouts: verified"
)

print(
    "  schema remains 43: verified"
)
