#!/usr/bin/env python3
"""Gate 2C.1 CRM permanent-delete preflight source regression."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (
        ROOT / relative
    ).read_text(
        encoding="utf-8",
    )


preflight = read(
    "serverless/crm-delete-d1.ts"
)

route = read(
    "functions/api/crm/[[path]].ts"
)

schema = read(
    "d1/schema.sql"
)


# Preflight is deliberately read-only.
upper = preflight.upper()

for forbidden in (
    "DELETE FROM",
    "INSERT INTO",
    "UPDATE CRM_",
    ".RUN()",
    ".BATCH(",
):
    assert forbidden not in upper, forbidden


for token in (
    "getCrmEnquiryDeletePreflight",
    "getCrmJobDeletePreflight",
    'policyVersion: "gate-2c.1"',
    '"crm:manage"',
    'actor.accessMode === "support"',
):
    assert token in preflight, token


# CRM operational records are deletion candidates.
for token in (
    "crm_enquiry_contacts",
    "crm_job_contacts",
    "crm_job_client_access",
    "crm_portal_invitations",
    "crm_questionnaire_instances",
    "crm_questionnaire_files",
    "crm_job_workflows",
    "crm_tasks",
    "crm_communications",
    "crm_activities",
    "crm_job_files",
    "crm_supplier_submissions",
):
    assert token in preflight, token


# Cross-module work is preserved.
for token in (
    "Wedding Workspace",
    "Wedding Story",
    "Website gallery assignments",
    "Client Galleries",
    "Wedding photographs",
    "Master client records",
    "Master supplier records",
):
    assert token in preflight, token


# Protected/client-visible history blocks destructive deletion.
for token in (
    'text(gallery.status)',
    '=== "live"',
    "Client-visible quote history",
    "Issued or paid invoice history",
    "Sent or signed contract history",
    'text(row.status)',
    '!== "draft"',
):
    assert token in preflight, token


# Both read-only endpoints exist.
for token in (
    'parts[2] === "delete-preflight"',
    "getCrmEnquiryDeletePreflight",
    "getCrmJobDeletePreflight",
):
    assert token in route, token


# No destructive CRM endpoint has been introduced by Gate 2C.1.
assert (
    "deleteCrmJobPermanently"
    in route
)


# Current schema contracts that drive the
# preflight policy. Match semantically rather
# than depending on schema line formatting.
def table_sql(name: str) -> str:
    match = re.search(
        rf"""
        CREATE\s+TABLE
        (?:\s+IF\s+NOT\s+EXISTS)?
        \s+["`]?
        {re.escape(name)}
        ["`]?
        \s*\(
        (?P<body>.*?)
        \)\s*;
        """,
        schema,
        re.IGNORECASE
        | re.DOTALL
        | re.VERBOSE,
    )

    assert match, name

    return match.group("body")


def assert_status_values(
    table: str,
    values: tuple[str, ...],
) -> None:
    body = table_sql(table)

    quoted = [
        re.escape(
            f"'{value}'"
        )
        for value in values
    ]

    pattern = (
        r"status\s+IN\s*\(\s*"
        + r"\s*,\s*".join(quoted)
        + r"\s*\)"
    )

    assert re.search(
        pattern,
        body,
        re.IGNORECASE
        | re.DOTALL,
    ), (
        table,
        values,
    )


assert_status_values(
    "client_galleries",
    (
        "draft",
        "live",
        "archived",
    ),
)

assert_status_values(
    "crm_invoices",
    (
        "draft",
        "issued",
        "part_paid",
        "paid",
        "void",
    ),
)

assert_status_values(
    "crm_contracts",
    (
        "draft",
        "sent",
        "viewed",
        "signed",
        "void",
    ),
)


assert not list(
    (
        ROOT / "d1/migrations"
    ).glob("049*")
)


print(
    "PASS v1.10.12a Gate 2C.1 CRM delete preflight"
)
print(
    "  Lead / Job preflight: read-only"
)
print(
    "  CRM-only dependencies: classified for deletion"
)
print(
    "  WedStudio / Gallery / canonical assets: preserved"
)
print(
    "  live Client Gallery: blocker"
)
print(
    "  client-visible commercial history: blocker"
)
print(
    "  Job permanent DELETE endpoint: owned by Gate 2C.3B"
)
print(
    "  schema change: none"
)
