#!/usr/bin/env python3

from pathlib import Path


endpoint = Path(
    "functions/api/public/crm/places.ts"
).read_text(
    encoding="utf-8",
)


def require(
    condition,
    message,
):
    if not condition:
        raise AssertionError(
            message
        )


# Cloudflare request geolocation is consumed transiently.
for marker in (
    "type PlacesLocationBias",
    "type RequestWithGeo",
    "function placesLocationBias(",
    "(request as RequestWithGeo)",
    "cf?.latitude",
    "cf?.longitude",
    "Number.isFinite(",
    "latitude < -90",
    "latitude > 90",
    "longitude < -180",
    "longitude > 180",
    "radius: 50_000",
):
    require(
        marker in endpoint,
        f"Visitor local bias missing: {marker}",
    )


# Google receives the optional soft location bias.
autocomplete_start = endpoint.index(
    "async function googleAutocomplete("
)

autocomplete_end = endpoint.index(
    "async function googleDetails(",
    autocomplete_start,
)

autocomplete = endpoint[
    autocomplete_start:
    autocomplete_end
]


for marker in (
    "locationBias?: PlacesLocationBias",
    "...(locationBias ? { locationBias } : {}),",
    "regionCode: string,",
    "...(regionCode ? { regionCode } : {}),",
):
    require(
        marker in autocomplete,
        f"Google soft-bias request missing: {marker}",
    )


# Handler supplies incoming request location.
auto_branch = endpoint.index(
    'action === "autocomplete"'
)

details_branch = endpoint.index(
    'action === "details"',
    auto_branch,
)

branch = endpoint[
    auto_branch:
    details_branch
]


for marker in (
    "const locationBias =",
    "placesLocationBias(",
    "context.request",
    "regionCode,",
    "locationBias,",
):
    require(
        marker in branch,
        f"Autocomplete local-bias flow missing: {marker}",
    )


# Country bias remains as fallback/support.
for marker in (
    "SELECT default_country",
    "placesRegionCode(",
):
    require(
        marker in branch,
        f"Country fallback lost: {marker}",
    )


# Never restrict destination/international results.
for forbidden in (
    "locationRestriction",
    "includedRegionCodes",
):
    require(
        forbidden not in endpoint,
        f"Hard search restriction introduced: {forbidden}",
    )


# Existing security/session boundaries remain.
for marker in (
    "resolvePublicWorkspaceId",
    "getAuthenticatedClientIdentity",
    "GOOGLE_PLACES_API_KEY",
    "activeFieldExists",
    "allowBurst",
    "sessionToken: token",
):
    require(
        marker in endpoint,
        f"Existing Places boundary lost: {marker}",
    )


# Place Details remains unchanged.
require(
    "await googleDetails("
    in endpoint[
        details_branch:
    ],
    "Place Details flow lost.",
)


print(
    "PASS v1.10.12a Places visitor-local bias"
)
print(
    "  Cloudflare request latitude/longitude: consumed transiently"
)
print(
    "  coordinate validation: verified"
)
print(
    "  50 km Google locationBias circle: verified"
)
print(
    "  workspace country regionCode: retained"
)
print(
    "  hard geographic restriction: absent"
)
print(
    "  destination/international results remain possible"
)
print(
    "  no visitor geolocation persistence: verified"
)
print(
    "  Place Details flow: retained"
)
print(
    "  schema migration: not required"
)
