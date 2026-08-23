#!/usr/bin/env python3

from pathlib import Path


endpoint = Path(
    "functions/api/public/crm/places.ts"
).read_text(
    encoding="utf-8",
)

schema = Path(
    "d1/schema.sql"
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


require(
    "default_country TEXT NOT NULL DEFAULT 'GB'"
    in schema,
    "Workspace default country foundation missing.",
)


for marker in (
    "function placesRegionCode(",
    'countryCode === "GB"',
    'countryCode === "UK"',
    'return "uk";',
    ".toLowerCase();",
):
    require(
        marker in endpoint,
        f"Region mapping missing: {marker}",
    )


for marker in (
    "SELECT default_country",
    "FROM workspace_settings",
    "WHERE workspace_id = ?",
    "workspaceSettings",
    "?.default_country",
):
    require(
        marker in endpoint,
        f"Workspace country lookup missing: {marker}",
    )


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
    "regionCode: string,",
    "includeQueryPredictions: false",
    "...(regionCode ? { regionCode } : {}),",
):
    require(
        marker in autocomplete,
        f"Google ranking bias missing: {marker}",
    )


require(
    "includedRegionCodes"
    not in endpoint,
    "Places results must be biased, not restricted.",
)


auto_branch = endpoint.index(
    'action === "autocomplete"'
)

details_branch = endpoint.index(
    'action === "details"',
    auto_branch,
)

auto_block = endpoint[
    auto_branch:
    details_branch
]


require(
    auto_block.count(
        "SELECT default_country"
    ) == 1,
    "Expected one workspace country lookup.",
)


require(
    "regionCode,"
    in auto_block,
    "Google autocomplete call missing regionCode.",
)


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


require(
    "await googleDetails("
    in endpoint[
        details_branch:
    ],
    "Place Details flow lost.",
)


print(
    "PASS v1.10.12a Places regional bias"
)
print(
    "  workspace default_country source: verified"
)
print(
    "  GB / UK -> Google uk mapping: verified"
)
print(
    "  generic two-letter mapping: verified"
)
print(
    "  Google regionCode ranking bias: verified"
)
print(
    "  hard country restriction: absent"
)
print(
    "  destination / international results remain possible"
)
print(
    "  security/session boundaries: retained"
)
print(
    "  schema migration: not required"
)
