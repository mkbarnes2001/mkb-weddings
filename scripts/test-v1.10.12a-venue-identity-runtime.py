#!/usr/bin/env python3
"""v1.10.12a Gate 2D.2B2 venue identity runtime source regression."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

lead = (
    ROOT / "src/components/LeadEnquiryForm.tsx"
).read_text(encoding="utf-8")

crm = (
    ROOT / "serverless/crm-d1.ts"
).read_text(encoding="utf-8")

types = (
    ROOT / "src/admin/types/crm.ts"
).read_text(encoding="utf-8")

venue = (
    ROOT / "serverless/venue-d1.ts"
).read_text(encoding="utf-8")

venue_types = (
    ROOT / "src/admin/types/venue.ts"
).read_text(encoding="utf-8")

workspace = (
    ROOT / "src/admin/pages/WeddingWorkspace.tsx"
).read_text(encoding="utf-8")

schema = (
    ROOT / "d1/schema.sql"
).read_text(encoding="utf-8")


# ------------------------------------------------------------
# Schema 49 is reused; Gate 2D.2B2 adds no migration.
# ------------------------------------------------------------

assert "'49'" in schema

assert not list(
    (ROOT / "d1/migrations").glob("050*")
)


# ------------------------------------------------------------
# Public Venue answer stays a string while the full selected
# Google identity travels separately.
# ------------------------------------------------------------

venue_control_start = lead.index(
    'if (field.type === "venue")'
)

venue_control_end = lead.index(
    "    const inputType",
    venue_control_start,
)

venue_control = lead[
    venue_control_start:
    venue_control_end
]

for token in (
    'kind="venue"',
    'setAnswer(',
    '"__venuePlace"',
    "place.placeId",
    "place.name",
    "place.formattedAddress",
    "place.address?.city",
    "place.address?.county",
    "place.address?.country",
    "place.address?.lat",
    "place.address?.lng",
):
    assert token in venue_control, token

# Manual typing explicitly invalidates Google identity.
manual_start = venue_control.index(
    "onManualChange="
)

manual_end = venue_control.index(
    "onPlaceSelect=",
    manual_start,
)

manual = venue_control[
    manual_start:manual_end
]

assert '"__venuePlace"' in manual
assert "null" in manual


# ------------------------------------------------------------
# Server snapshot is bounded and structured.
# ------------------------------------------------------------

for token in (
    "function normalizeLeadVenuePlace(",
    '"name"',
    '"formattedAddress"',
    '"town"',
    '"county"',
    '"country"',
    "snapshot.lat",
    "snapshot.lng",
):
    assert token in crm, token


# ------------------------------------------------------------
# Exact Google identity match only.
# ------------------------------------------------------------

matcher_start = crm.index(
    "async function exactVenueForGooglePlace("
)

matcher_end = crm.index(
    "\n\nfunction",
    matcher_start,
)

matcher = crm[
    matcher_start:matcher_end
]

for token in (
    "FROM venues",
    "WHERE workspace_id = ?",
    "AND google_place_id = ?",
    "LIMIT 1",
):
    assert token in matcher, token


# ------------------------------------------------------------
# Public Lead persistence.
# ------------------------------------------------------------

submit_start = crm.index(
    "export async function submitPublicEnquiry("
)

submit = crm[submit_start:]

for token in (
    "input?.answers",
    "?.__venuePlace",
    "normalizeLeadVenuePlace(",
    "exactVenueForGooglePlace(",
    "venue_place_id",
    "venue_place_json",
    "venueId",
    "venueSlug",
    "JSON.stringify(",
):
    assert token in submit, token

# Public submission must never create a canonical WedStudio venue.
assert "INSERT INTO venues" not in submit


# ------------------------------------------------------------
# Lead / Job API hydration.
# ------------------------------------------------------------

enquiry_hydrator = crm[
    crm.index("function hydrateEnquiry("):
    crm.index("function hydrateLeadMail(")
]

for token in (
    "venuePlaceId:",
    "row.venue_place_id",
    "venuePlace:",
    "row.venue_place_json",
):
    assert token in enquiry_hydrator, token


job_hydrator = crm[
    crm.index("function hydrateJob("):
    crm.index("const ENQUIRY_SELECT")
]

for token in (
    "venuePlaceId:",
    "row.venue_place_id",
    "venuePlace:",
    "row.venue_place_json",
):
    assert token in job_hydrator, token


# ------------------------------------------------------------
# Booking conversion:
# - no name auto-link
# - no fabricated internal slug
# - exact Place identity may resolve late
# - Google snapshot copied to Job
# - internal resolved relationship written back to Lead
# ------------------------------------------------------------

accept_start = crm.index(
    "export async function acceptEnquiry("
)

accept_end = crm.index(
    "\nexport async function",
    accept_start + 10,
)

accept = crm[
    accept_start:accept_end
]

assert "lower(name) = lower(?)" not in accept
assert "slugify(venueName)" not in accept

# Gate 2D.2B2 runtime conversion-scope regression.
# The real Pages runtime caught a JavaScript ReferenceError when
# resolvedVenueId / resolvedVenueSlug were declared inside the
# new-Wedding `else` branch but consumed later by crm_jobs and
# crm_enquiries writes. Keep canonical venue resolution at
# acceptEnquiry function scope before either Wedding path.
accept_scope = crm[
    accept_start:
    accept_end
]

linked_wedding_branch = accept_scope.index(
    "if (linkedWeddingSlug)"
)

for declaration in (
    "const venueMatch =",
    "const resolvedVenueSlug =",
    "const resolvedVenueId =",
):
    assert accept_scope.count(declaration) == 1, declaration
    assert (
        accept_scope.index(declaration)
        < linked_wedding_branch
    ), (
        f"{declaration} must remain before "
        "the existing/new Wedding branch"
    )

job_insert_position = accept_scope.index(
    "INSERT INTO crm_jobs"
)

enquiry_conversion_position = accept_scope.index(
    "venue_id = ?"
)

assert (
    accept_scope.index("const resolvedVenueId =")
    < job_insert_position
)
assert (
    accept_scope.index("const resolvedVenueSlug =")
    < job_insert_position
)
assert (
    accept_scope.index("const resolvedVenueId =")
    < enquiry_conversion_position
)
assert (
    accept_scope.index("const resolvedVenueSlug =")
    < enquiry_conversion_position
)


for token in (
    "exactVenueForGooglePlace(",
    "resolvedVenueSlug",
    "resolvedVenueId",
    "venue_place_id",
    "venue_place_json",
    "enquiryRow.venue_place_id",
    "enquiryRow.venue_place_json",
    "venue_id = ?",
    "venue_slug = ?",
):
    assert token in accept, token


# ------------------------------------------------------------
# Front-end CRM contract.
# ------------------------------------------------------------

for token in (
    "export type CrmVenuePlaceSnapshot",
    "placeId: string;",
    "formattedAddress: string;",
    "town: string;",
    "county: string;",
    "country: string;",
    "venuePlaceId: string;",
    "venuePlace: CrmVenuePlaceSnapshot;",
):
    assert token in types, token


# ------------------------------------------------------------
# WedStudio canonical venue owns the external Google identity.
# ------------------------------------------------------------

assert "googlePlaceId: string;" in venue_types

for token in (
    "googlePlaceId:",
    "row.google_place_id",
    "venue.googlePlaceId",
    "google_place_id",
    "This Google venue is already linked",
):
    assert token in venue, token


# ------------------------------------------------------------
# Explicit Wedding Workspace discovery/create path preserves
# Google identity but remains user-triggered.
# ------------------------------------------------------------

discovery_start = workspace.index(
    "const useDiscoveredVenue"
)

discovery_end = workspace.index(
    "const linkCreatedVenueToLocations",
    discovery_start,
)

discovery = workspace[
    discovery_start:discovery_end
]

for token in (
    "venue.id",
    "venue.formattedAddress",
    "venue.googleMapsUrl",
):
    assert token in discovery, token


create_start = workspace.index(
    "const createAndLinkVenue"
)

create_end = workspace.index(
    "const createAndLinkSupplier",
    create_start,
)

create = workspace[
    create_start:create_end
]

for token in (
    "AdminApiService.createVenue",
    "googlePlaceId:",
    "newVenue.googlePlaceId",
    "newVenue.formattedAddress",
    "newVenue.googleMapsUrl",
):
    assert token in create, token

# Creation remains explicit and attached to the existing action.
assert "const createAndLinkVenue" in workspace
assert "onClick={createAndLinkVenue}" in workspace


print(
    "PASS v1.10.12a Gate 2D.2B2 venue identity runtime continuity"
)
print(
    "  public Venue answer: text contract preserved"
)
print(
    "  Google Place identity snapshot: retained"
)
print(
    "  manual Venue edit: stale Google identity cleared"
)
print(
    "  Lead exact Place-ID match: workspace scoped"
)
print(
    "  unmatched Lead: canonical venue link remains blank"
)
print(
    "  Lead -> Job Google identity: copied"
)
print(
    "  booking-time exact Place match: supported"
)
print(
    "  automatic name/fuzzy linking: absent"
)
print(
    "  fabricated canonical venue slug: absent"
)
print(
    "  automatic WedStudio venue creation: absent"
)
print(
    "  explicit Create & link retains Google identity"
)
print(
    "  schema change: none beyond existing 49"
)
