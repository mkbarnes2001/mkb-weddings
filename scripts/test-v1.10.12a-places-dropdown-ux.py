#!/usr/bin/env python3

from pathlib import Path
import re


source = Path(
    "src/components/LeadEnquiryForm.tsx"
).read_text(
    encoding="utf-8",
)

start = source.index(
    "function PublicPlacesAutocomplete("
)

component = source[start:]


def require(
    condition,
    message,
):
    if not condition:
        raise AssertionError(
            message
        )


# Accessible autocomplete state.
require(
    'aria-autocomplete="list"'
    in component,
    "Autocomplete semantic missing.",
)

require(
    "aria-expanded={"
    in component,
    "Autocomplete expanded state missing.",
)


# Suggestions should no longer overlay later form fields.
require(
    "absolute z-40 mt-2 w-full"
    not in component,
    "Legacy absolute suggestion overlay remains.",
)

for marker in (
    "max-h-72",
    "overflow-y-auto",
    "rounded-xl",
    "shadow-[0_12px_30px_rgba(0,0,0,0.12)]",
):
    require(
        marker in component,
        f"Missing dropdown marker: {marker}",
    )


# Compact result presentation.
for marker in (
    "px-3 py-2.5",
    "truncate text-sm font-semibold",
    "text-[11px] leading-4",
    "focus:outline-none",
):
    require(
        marker in component,
        f"Missing result-row marker: {marker}",
    )


# No behavioural regression.
require(
    'endpoint = "/api/public/crm/places"'
    in component,
    "Default Places endpoint changed unexpectedly.",
)

fetch_targets = re.findall(
    r"fetch\(\s*([A-Za-z_][A-Za-z0-9_]*),",
    component,
)

require(
    fetch_targets.count("endpoint") == 2,
    "Both Places requests must use the reusable endpoint.",
)

for marker in (
    "onManualChange",
    "onPlaceSelect",
    "crypto.randomUUID()",
    'aria-label="Google Maps"',
    "Google Maps",
):
    require(
        marker in component,
        f"Existing Places behaviour lost: {marker}",
    )


print(
    "PASS v1.10.12a Places dropdown UX"
)

print(
    "  non-overlapping suggestion layout: verified"
)

print(
    "  compact result presentation: verified"
)

print(
    "  autocomplete accessibility state: verified"
)

print(
    "  Google Places request flow: retained"
)

print(
    "  manual fallback: retained"
)

print(
    "  Google Maps attribution: retained"
)
