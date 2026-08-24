#!/usr/bin/env python3
"""Gate 2C.3B source regression: guarded booked Job permanent deletion."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8",
    )


actions = read(
    "serverless/crm-delete-actions-d1.ts"
)

preflight = read(
    "serverless/crm-delete-d1.ts"
)

route = read(
    "functions/api/crm/[[path]].ts"
)

lead_test = read(
    "scripts/test-v1.10.12a-crm-lead-permanent-delete.py"
)

schema = read(
    "d1/schema.sql"
)

# Server-side authority.
for token in (
    "deleteCrmJobPermanently",
    'confirmation !== "DELETE"',
    "getCrmJobDeletePreflight",
    "preflight.canDelete",
    "preflight.blockers",
):
    assert token in actions, token

# Hidden immutable/client-visible history is promoted into preflight.
for token in (
    "hiddenCommercialHistoryBlockers",
    "hidden-quote-version-history",
    "hidden-quote-acceptance-history",
    "hidden-invoice-history",
    "hidden-contract-version-history",
    "hidden-contract-history",
    "crm_quote_acceptances",
    "crm_quote_versions",
    "crm_contract_versions",
):
    assert token in preflight, token

# Private files are physically removed before D1 parents disappear.
assert (
    "strictDeletePrivateObjects"
    in actions
)

assert (
    "crm_job_files"
    in actions
)

assert (
    "crm_questionnaire_files"
    in actions
)

assert (
    "await bucket.delete("
    in actions
)

assert (
    "deletedStorageKeys ="
    in actions
)

storage_pos = actions.index(
    "deletedStorageKeys ="
)

job_delete_pos = actions.index(
    "DELETE FROM crm_jobs",
    storage_pos,
)

assert storage_pos < job_delete_pos

# Permanent deletion must not swallow R2 failures.
strict_start = actions.index(
    "async function strictDeletePrivateObjects"
)

strict_end = actions.index(
    "async function jobDeleteRows",
    strict_start,
)

strict_block = actions[
    strict_start:strict_end
]

assert ".catch(" not in strict_block
assert "catch {" in strict_block

# Booking pointer is broken before the Job parent disappears.
assert (
    "accepted_job_id = NULL"
    in actions
)

assert (
    "quote_id = NULL"
    in actions
)

assert (
    "quote_version_id = NULL"
    in actions
)

# Draft-only commercial destruction.
assert (
    "DELETE FROM crm_quotes"
    in actions
)

assert (
    "DELETE FROM crm_invoices"
    in actions
)

assert (
    "DELETE FROM crm_contracts"
    in actions
)

assert actions.count(
    "status = 'draft'"
) >= 6

# Protected immutable history is never explicitly erased.
assert (
    "DELETE FROM crm_invoice_payments"
    not in actions
)

assert (
    "DELETE FROM crm_contract_signatures"
    not in actions
)

assert (
    "DELETE FROM crm_quote_acceptances"
    not in actions
)

# Shared/master and cross-module data is preserved.
for forbidden in (
    "DELETE FROM crm_contacts",
    "DELETE FROM weddings",
    "DELETE FROM client_galleries",
    "DELETE FROM assets",
    "DELETE FROM asset_wedding_links",
    "DELETE FROM asset_gallery_links",
    "DELETE FROM asset_venue_links",
    "DELETE FROM asset_moment_links",
    "DELETE FROM custom_collections",
):
    assert forbidden not in actions, forbidden

# Persistent destructive audit survives deleted CRM parents.
assert (
    "crm.job.deleted_permanently"
    in actions
)

assert (
    "platform_audit_events"
    in actions
)

assert (
    "preservedContactIds"
    in actions
)

assert (
    "weddingStory: true"
    in actions
)

assert (
    "clientGalleries: true"
    in actions
)

assert (
    "canonicalAssets: true"
    in actions
)

assert (
    "websiteAssignments: true"
    in actions
)

# Catch-all route gains R2 only for this deliberate permanent deletion path.
assert (
    "MKB_PRIVATE_ASSETS: R2Bucket;"
    in route
)

assert (
    'parts[0] === "jobs"'
    in route
)

assert (
    "deleteCrmJobPermanently("
    in route
)

assert (
    "context.env.MKB_PRIVATE_ASSETS"
    in route
)

# Existing Lead destructive behavior remains present.
assert (
    "deleteCrmEnquiryPermanently"
    in actions
)

assert (
    "deleteCrmEnquiryPermanently"
    in route
)

assert (
    "DELETE FROM crm_contacts"
    not in actions
)

assert (
    "guardDraftQuoteHistory"
    in actions
), (
    "Existing Lead hidden-history guard "
    "must remain."
)

# Database itself confirms immutable history.
assert (
    "Quote acceptances are immutable"
    in schema
)

assert (
    "Sent quote versions cannot be deleted"
    in schema
)

# No UI is part of 2C.3B.
job_page = read(
    "src/admin/pages/CRMJob.tsx"
)

assert (
    "deleteCrmJobPermanently"
    not in job_page
)

assert (
    "getCrmJobDeletePreflight"
    not in job_page
)

# No schema change.
assert not list(
    (
        ROOT
        / "d1"
        / "migrations"
    ).glob("049*")
)

print(
    "PASS v1.10.12a Gate 2C.3B "
    "guarded Job permanent-delete backend"
)

print(
    "  exact DELETE confirmation: required"
)
print(
    "  dependency preflight: re-run server-side"
)
print(
    "  hidden commercial history: blocked"
)
print(
    "  Job + questionnaire private files: strict R2 cleanup"
)
print(
    "  originating Lead lifecycle: removable"
)
print(
    "  master contacts: preserved"
)
print(
    "  Wedding / Story / Gallery / assets: preserved"
)
print(
    "  deletion audit: retained"
)
print(
    "  Job delete UI: absent"
)
print(
    "  schema change: none"
)
