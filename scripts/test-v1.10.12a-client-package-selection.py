#!/usr/bin/env python3

from pathlib import Path


portal = Path(
    "src/components/ClientPortal.tsx"
).read_text(
    encoding="utf-8",
)

css = Path(
    "src/index.css"
).read_text(
    encoding="utf-8",
)

server = Path(
    "serverless/crm-quotes-d1.ts"
).read_text(
    encoding="utf-8",
)


def require(condition, message):
    if not condition:
        raise AssertionError(message)


# New Pick & Choose quote: no silent recommendation/first choice.
load_start = portal.index(
    "        const accepted ="
)

load_end = portal.index(
    "        const quantities:",
    load_start,
)

load_block = portal[
    load_start:
    load_end
]

require(
    "item.recommended"
    not in load_block,
    "Pick & Choose must not silently select "
    "the recommended package.",
)

require(
    'result.quote.quoteType === "fixed"'
    in load_block,
    "Fixed quote must retain its single package.",
)

require(
    ": undefined;"
    in load_block,
    "New Pick & Choose must start unselected.",
)


# Explicit package UX.
for marker in (
    "Choose your package",
    '"Select package"',
    '"Selected package"',
):
    require(
        marker in portal,
        f"Missing client package marker: {marker}",
    )

require(
    "change your choice before accepting the quote"
    in portal,
    "Client must know the choice can change "
    "before acceptance.",
)

require(
    "aria-pressed="
    in portal,
    "Package cards must expose selection state.",
)


# No misleading £0 price before a package exists.
require(
    "portal-quote-summary--empty"
    in portal,
    "No-selection summary state missing.",
)

require(
    "Select a package to see your total"
    in portal,
    "No-selection summary instruction missing.",
)


# Acceptance remains gated.
require(
    'quote.quoteType !== "fixed" && !selectedOptionId'
    in portal,
    "Pick & Choose acceptance gate missing.",
)

require(
    '"Select a package first"'
    in portal,
    "Disabled acceptance button lacks explanation.",
)


# Fixed semantics retained.
require(
    'disabled={quote.quoteType === "fixed"'
    in portal,
    "Fixed option must remain non-switchable.",
)

require(
    'if (quote.quoteType !== "fixed") chooseQuoteOption(option);'
    in portal,
    "Only Pick & Choose may switch package.",
)


# Server remains authoritative.
require(
    '"Choose a valid package option."'
    in server,
    "Server invalid-package guard missing.",
)

require(
    "=== text(input?.optionId)"
    in server,
    "Server option ownership validation missing.",
)


for marker in (
    ".portal-package-intro",
    ".portal-package-select",
    ".portal-package-select.selected",
    ".portal-quote-summary--empty",
):
    require(
        marker in css,
        f"Missing package CSS: {marker}",
    )


print(
    "PASS v1.10.12a explicit client package selection"
)

print(
    "  silent Pick & Choose selection: removed"
)

print(
    "  Fixed quote semantics: retained"
)

print(
    "  Select / Selected package state: verified"
)

print(
    "  no-selection price summary: verified"
)

print(
    "  acceptance gate: retained"
)

print(
    "  server package validation: retained"
)
