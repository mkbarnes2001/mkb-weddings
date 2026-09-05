#!/usr/bin/env python3
"""v1.10.14a real-booking integrity regression."""

from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8"
    )


wedding = read(
    "serverless/wedding-d1.ts"
)

portal = read(
    "serverless/client-portal-d1.ts"
)

quotes = read(
    "serverless/crm-quotes-d1.ts"
)

job = read(
    "src/admin/pages/CRMJob.tsx"
)

quote_ui = read(
    "src/admin/pages/CRMQuote.tsx"
)

types = read(
    "src/admin/types/crm.ts"
)

css = read(
    "src/admin/admin-theme.css"
)

schema = read(
    "d1/schema.sql"
)


# ------------------------------------------------------------
# Wedding -> Job canonical venue/date continuity.
# ------------------------------------------------------------

update_start = wedding.index(
    "export async function updateAdminWedding"
)

update_end = wedding.index(
    "\nexport async function archiveAdminWedding",
    update_start,
)

update = wedding[
    update_start:
    update_end
]

for token in (
    "UPDATE crm_jobs",
    "event_date = ?",
    "venue_text = ?",
    "venue_slug = ?",
    "venue_id = ?",
    "wedding.weddingDate",
    "wedding.venue",
    "wedding.venueSlug",
    "wedding.venueId",
    "wedding.slug",
):
    assert token in update, token

assert (
    update.index("UPDATE weddings SET")
    < update.rindex("UPDATE crm_jobs")
), (
    "Wedding update must remain in the batch before "
    "the final CRM Job canonical-value synchronisation."
)


# ------------------------------------------------------------
# Supplier approval can no longer silently approve without link.
# ------------------------------------------------------------

approve_start = portal.index(
    "export async function approveSupplierSubmission"
)

approve_end = portal.index(
    "\nexport async function rejectSupplierSubmission",
    approve_start,
)

approve = portal[
    approve_start:
    approve_end
]

for token in (
    "const weddingSlug = text(row.wedding_slug)",
    "SELECT slug",
    "FROM weddings",
    "const linked = await linkSupplierToWedding(",
    "if (!linked)",
    "Supplier approval could not be linked to the Wedding.",
    "status = 'approved'",
    "`Linked ${supplier.name}",
):
    assert token in approve, token

assert (
    approve.index("if (!linked)")
    < approve.index("status = 'approved'")
), (
    "Submission may not become approved before "
    "successful Wedding linkage."
)

assert (
    '${linked ? "Linked" : "Approved"}'
    not in approve
)


# ------------------------------------------------------------
# Admin quote returns immutable acceptance snapshot.
# ------------------------------------------------------------

get_start = quotes.index(
    "export async function getQuote("
)

get_end = quotes.index(
    "\nasync function primaryContactForEnquiry",
    get_start,
)

get_quote = quotes[
    get_start:
    get_end
]

for token in (
    "crm_quote_acceptances",
    "acceptance:",
    "selected_package_snapshot_json",
    "selected_addons_snapshot_json",
    "optionId:",
    "selectedPackage:",
    "selectedAddons:",
):
    assert token in get_quote, token


for token in (
    "export type CrmQuoteAcceptance",
    "acceptance: CrmQuoteAcceptance | null;",
    "selectedAddons:",
):
    assert token in types, token


# ------------------------------------------------------------
# Job displays the accepted add-on snapshot.
# ------------------------------------------------------------

for token in (
    "selectedBookingAddons",
    "job.addonsSnapshot",
    "Selected add-ons",
    "crm-job-selected-addon",
):
    assert token in job, token

job_compact = " ".join(
    job.split()
)

assert (
    '<AdminStatus tone="success"> Selected </AdminStatus>'
    in job_compact
), "Job selected add-on status badge missing"


# ------------------------------------------------------------
# Accepted quote selection state is based on acceptance,
# not editable draft configuration.
# ------------------------------------------------------------

for token in (
    "acceptedOptionId",
    "acceptedAddonIds",
    'quote.status === "accepted"',
    "acceptedSelected",
    "crm-quote-package-card--selected",
):
    assert token in quote_ui, token

quote_compact = " ".join(
    quote_ui.split()
)

assert (
    '<AdminStatus tone="success"> Selected </AdminStatus>'
    in quote_compact
), "Accepted Quote Selected status badge missing"

addon_start = quote_ui.index(
    "const acceptedSelected ="
)

addon_end = quote_ui.index(
    "const eligiblePackages =",
    addon_start,
)

addon_selection = quote_ui[
    addon_start:
    addon_end
]

assert (
    'quote.status === "accepted"'
    in addon_selection
)

assert (
    "acceptedAddonIds.has("
    in addon_selection
)

assert (
    "? acceptedSelected"
    in addon_selection
)


# ------------------------------------------------------------
# Presentation remains compact.
# ------------------------------------------------------------

for token in (
    ".crm-quote-package-card--selected",
    ".crm-quote-addon-grid__title",
    ".crm-job-selected-addons",
    ".crm-job-selected-addon",
):
    assert token in css, token


# ------------------------------------------------------------
# Schema remains v1.10.13a schema 53; no migration 054.
# ------------------------------------------------------------

db = sqlite3.connect(":memory:")
db.executescript(schema)

version = db.execute(
    """
    SELECT value
    FROM schema_meta
    WHERE key='schema_version'
    """
).fetchone()[0]

assert str(version) == "53", version

assert not db.execute(
    "PRAGMA foreign_key_check"
).fetchall()

db.close()

assert not list(
    (
        ROOT
        / "d1"
        / "migrations"
    ).glob(
        "054_*.sql"
    )
)


print(
    "PASS v1.10.14a real-booking integrity"
)

print(
    "  Wedding venue/date -> CRM Job continuity: verified"
)

print(
    "  supplier approval link-or-fail: verified"
)

print(
    "  Admin accepted quote snapshot: verified"
)

print(
    "  Job selected add-ons presentation: verified"
)

print(
    "  accepted package/add-on Selected state: verified"
)

print(
    "  schema: 53"
)

print(
    "  migration 054: absent"
)
