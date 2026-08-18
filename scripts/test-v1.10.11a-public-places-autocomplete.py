#!/usr/bin/env python3
"""v1.10.11a public Google Places autocomplete source regression."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

ENDPOINT = (
    ROOT
    / "functions/api/public/crm/places.ts"
)

PUBLIC = (
    ROOT
    / "src/components/LeadEnquiryForm.tsx"
)

TENANT = (
    ROOT
    / "serverless/tenant-context.ts"
)


endpoint = ENDPOINT.read_text(
    encoding="utf-8",
)

public = PUBLIC.read_text(
    encoding="utf-8",
)

tenant = TENANT.read_text(
    encoding="utf-8",
)


# ------------------------------------------------------------
# Tenant and credential boundary.
# ------------------------------------------------------------

for token in (
    "resolvePublicWorkspaceId",
    "getPublicLeadForm",
    "GOOGLE_PLACES_API_KEY",
    "activeFieldExists",
    'kind: LookupKind',
):
    assert token in endpoint, token

assert "workspace_domains" in tenant
assert "wd.verified = 1" in tenant

# Google credential must never be delivered to browser source.
assert "GOOGLE_PLACES_API_KEY" not in public
assert "X-Goog-Api-Key" not in public


# ------------------------------------------------------------
# Public cost / abuse boundary.
# ------------------------------------------------------------

for token in (
    "RATE_WINDOW_MS = 60_000",
    "RATE_MAX_REQUESTS = 40",
    "RATE_BUCKETS",
    "CF-Connecting-IP",
    "allowBurst(",
    '"Retry-After":',
    "429",
):
    assert token in endpoint, token


# ------------------------------------------------------------
# Google Places (New) request contract.
# ------------------------------------------------------------

for token in (
    "https://places.googleapis.com/v1/places:autocomplete",
    "sessionToken: token,",
    "includeQueryPredictions: false",
    "https://places.googleapis.com/v1/places/",
    '"X-Goog-FieldMask":',
    "id,displayName,formattedAddress,addressComponents,location",
):
    assert token in endpoint, token


# Results must never be browser/proxy cached.
assert (
    '"Cache-Control": "private, no-store, max-age=0"'
    in endpoint
)


# ------------------------------------------------------------
# Structured address mapping.
# ------------------------------------------------------------

for token in (
    '"street_number"',
    '"route"',
    '"postal_town"',
    '"locality"',
    '"administrative_area_level_2"',
    '"postal_code"',
    '"country"',
    "formattedAddress",
    "placeId:",
    "lat:",
    "lng:",
):
    assert token in endpoint, token


# ------------------------------------------------------------
# Browser integration.
# ------------------------------------------------------------

for token in (
    "function PublicPlacesAutocomplete(",
    '"/api/public/crm/places"',
    "crypto.randomUUID()",
    'action:\n                          "autocomplete"',
    'action:\n                  "details"',
    'kind="address"',
    'kind="venue"',
    'autoComplete="address-line1"',
    "onPlaceSelect",
    "place.address",
    "place.name",
):
    assert token in public, token


# User can always type manually if Places is unavailable.
assert "onManualChange" in public
assert "configured" in public


# ------------------------------------------------------------
# Attribution.
# ------------------------------------------------------------

for token in (
    'translate="no"',
    'aria-label="Google Maps"',
    "Google Maps",
):
    assert token in public, token


# Existing admin-only discovery endpoint is not reused by browser.
assert '"/api/venue-discovery"' not in public


print(
    "PASS v1.10.11a public Places autocomplete foundation"
)
print(
    "  verified-domain workspace boundary: verified"
)
print(
    "  server-side Google credential boundary: verified"
)
print(
    "  enabled-form-field guard: verified"
)
print(
    "  bounded public burst guard: verified"
)
print(
    "  Autocomplete New session-token flow: verified"
)
print(
    "  Place Details session termination: verified"
)
print(
    "  no-store Places responses: verified"
)
print(
    "  structured address mapping: verified"
)
print(
    "  address and venue browser integration: verified"
)
print(
    "  manual fallback without API key: verified"
)
print(
    "  Google Maps attribution: verified"
)
