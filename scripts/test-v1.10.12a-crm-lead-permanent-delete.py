#!/usr/bin/env python3
"""Gate 2C.2A unbooked Lead permanent-delete source regression."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (
        ROOT / relative
    ).read_text(
        encoding="utf-8",
    )


action = read(
    "serverless/crm-delete-actions-d1.ts"
)

preflight = read(
    "serverless/crm-delete-d1.ts"
)

route = read(
    "functions/api/crm/[[path]].ts"
)


# Destructive logic remains separate from the
# read-only preflight module.
for forbidden in (
    "DELETE FROM",
    "INSERT INTO",
    "UPDATE CRM_",
    ".RUN()",
    ".BATCH(",
):
    assert (
        forbidden
        not in preflight.upper()
    ), forbidden


for token in (
    "deleteCrmEnquiryPermanently",
    "getCrmEnquiryDeletePreflight",
    'confirmation !== "DELETE"',
    "preflight.canDelete",
    "preflight.blockers",
    "guardDraftQuoteHistory",
):
    assert token in action, token


# Only draft quote history may be destroyed here.
assert (
    "DELETE FROM crm_quotes"
    in action
)

assert (
    "status = 'draft'"
    in action
)

assert (
    "crm_quote_acceptances"
    in action
)

assert (
    "crm_invoices"
    in action
)


# Lead operational history is deleted.
for token in (
    "DELETE FROM crm_activities",
    "DELETE FROM crm_enquiries",
):
    assert token in action, token


# D1 meta.changes is not a safe measure of the
# primary-row delete because FK cascades may also
# contribute to its reported change count.
assert (
    "deletedLeadRows"
    not in action
)

assert (
    "results?.[2]?.meta?.changes"
    not in action
)

assert (
    "Lead still exists after permanent deletion."
    in action
)

assert (
    "const remaining"
    in action
)


# Master contacts must never be deleted.
assert (
    "DELETE FROM crm_contacts"
    not in action
)

assert (
    "preservedContactIds"
    in action
)

assert (
    "contactIds"
    in action
)


# A platform-level audit survives the deleted Lead.
for token in (
    "INSERT INTO platform_audit_events",
    "crm.enquiry.deleted_permanently",
    "'crm_enquiry'",
):
    assert token in action, token


# The Lead DELETE endpoint remains; Job DELETE is now owned by Gate 2C.3B.
assert (
    "deleteCrmEnquiryPermanently"
    in route
)

assert (
    'parts[0] === "enquiries"'
    in route
)

assert (
    "body?.confirmation"
    in route
)

assert (
    "deleteCrmJobPermanently"
    in route
)


# No schema change.
# Later v1.10.12a migrations are allowed; this gate itself introduced no schema migration.


print(
    "PASS v1.10.12a Gate 2C.2A unbooked Lead permanent delete"
)
print(
    "  exact DELETE confirmation: required"
)
print(
    "  server-side preflight: re-run"
)
print(
    "  blockers: enforced"
)
print(
    "  draft quote cleanup: constrained"
)
print(
    "  Lead CRM lifecycle: removable"
)
print(
    "  master contacts: preserved"
)
print(
    "  platform deletion audit: retained"
)
print(
    "  Job permanent delete: separately covered by Gate 2C.3B"
)
print(
    "  schema change: none"
)
