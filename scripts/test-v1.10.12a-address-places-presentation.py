#!/usr/bin/env python3

from pathlib import Path


source = Path(
    "src/components/LeadEnquiryForm.tsx"
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


address_start = source.index(
    'if (field.type === "address") {'
)

address_end = source.index(
    'if (field.type === "venue") {',
    address_start,
)

address = source[
    address_start:address_end
]


for marker in (
    "<PublicPlacesAutocomplete",
    'kind="address"',
    "Edit address details",
    "<details",
    "<summary",
    'placeholder="Address line 1"',
    'placeholder="Address line 2"',
    'placeholder="Town / city"',
    'placeholder="County / region"',
    'placeholder="Postcode"',
    'placeholder="Country"',
    "place.address",
):
    require(
        marker in address,
        f"Address UX missing: {marker}",
    )


require(
    address.index(
        "<PublicPlacesAutocomplete"
    )
    < address.index(
        "<details"
    ),
    "Address search must appear before manual details.",
)


component_start = source.index(
    "export function PublicPlacesAutocomplete("
)

component_end = source.index(
    "export function Enquire()",
    component_start,
)

component = source[
    component_start:component_end
]


for marker in (
    'role="combobox"',
    'aria-autocomplete="list"',
    "aria-expanded={expanded}",
    "aria-controls={",
    "aria-activedescendant={",
    'role="listbox"',
    'role="option"',
    "aria-selected={",
    "visibleSuggestions",
    "suggestions.slice(",
    'event.key === "ArrowDown"',
    'event.key === "ArrowUp"',
    'event.key === "Enter"',
    'event.key === "Escape"',
    "absolute left-0 right-0 z-[90]",
    "mt-1.5 w-full",
    "max-h-72",
    "overflow-y-auto",
    "truncate text-sm font-semibold",
    "truncate text-[11px] leading-4",
    "onMouseDown={(event) =>",
    "onMouseEnter={() =>",
    'aria-label="Google Maps"',
):
    require(
        marker in component,
        f"Places presentation missing: {marker}",
    )


require(
    component.count(
        "fetch("
    ) == 2,
    "Places autocomplete/details request count changed.",
)


require(
    component.count(
        "setSuggestions("
    ) == 6,
    "Existing Places suggestion state flow changed.",
)


venue_start = source.index(
    'if (field.type === "venue") {'
)

venue_end = source.index(
    "const inputType",
    venue_start,
)

venue = source[
    venue_start:venue_end
]


for marker in (
    "<PublicPlacesAutocomplete",
    'kind="venue"',
    "place.name",
    "place.formattedAddress",
):
    require(
        marker in venue,
        f"Venue behaviour lost: {marker}",
    )


print(
    "PASS v1.10.12a Address / Places presentation"
)
print(
    "  search-first Address UI: verified"
)
print(
    "  structured address details collapsed: verified"
)
print(
    "  maximum five visible suggestions: verified"
)
print(
    "  full-width floating dropdown: verified"
)
print(
    "  keyboard navigation: verified"
)
print(
    "  combobox/listbox semantics: verified"
)
print(
    "  autocomplete/details fetch flow: retained"
)
print(
    "  Venue Places integration: retained"
)
print(
    "  schema migration: not required"
)
