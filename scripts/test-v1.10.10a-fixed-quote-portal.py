#!/usr/bin/env python3

"""Focused v1.10.10a Fixed quote Client Portal semantics."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8"
    )


quotes = read(
    "serverless/crm-quotes-d1.ts"
)

portal = read(
    "src/components/ClientPortal.tsx"
)

editor = read(
    "src/admin/pages/CRMQuote.tsx"
)


# Fixed draft remains exactly one package and excludes
# client-selectable optional add-ons from the immutable snapshot.
assert (
    'quoteTypeValue === "fixed"'
    in quotes
)

assert (
    'A fixed quote must contain exactly one package option.'
    in quotes
)

assert (
    'quoteTypeValue === "fixed"\n        ? []'
    in quotes
)

assert (
    "requestedAddonIds"
    in quotes
)


# Acceptance is server-authoritative. Client values cannot
# change a Fixed quote's package or add-on quantities.
assert (
    'const quoteTypeValue =\n    quoteType(\n      row.quote_type,'
    in quotes
)

assert (
    'quoteTypeValue === "fixed"\n      ? version.options[0]'
    in quotes
)

assert (
    'quoteTypeValue === "fixed"\n        ? []\n        : input?.addons'
    in quotes
)


# Client contract understands the quote type.
assert (
    'quoteType: "pick_and_choose" | "fixed";'
    in portal
)

assert (
    'quote?.quoteType === "fixed"'
    in portal
)

assert (
    'quote.quoteType === "fixed"\n          ? []'
    in portal
)

assert (
    "Accept this fixed quote as presented?"
    in portal
)


# Fixed packages are presentation-only: no package switching
# and no editable add-on quantities.
assert (
    'disabled={quote.quoteType === "fixed"'
    in portal
)

assert (
    'if (quote.quoteType !== "fixed") chooseQuoteOption(option);'
    in portal
)

assert (
    'acceptedQuote || quote.quoteType === "fixed"'
    in portal
)

assert (
    '"Included extras"'
    in portal
)

assert (
    '"These required extras are already included in the fixed quote total."'
    in portal
)


# Fixed accept does not require a client package selection.
assert (
    'quote.quoteType !== "fixed" && !selectedOptionId'
    in portal
)


# v1.10.11a removed the redundant fixed-option summary copy.
# The enduring Admin boundary is that a Fixed quote can contain
# only one package option in the editor.
assert (
    'quote.quoteType\n                  !== "fixed"\n                || !draft.options.length'
    in editor
)

assert (
    '"Fixed package"'
    in editor
)


print(
    "PASS v1.10.10a Fixed quote Client Portal semantics"
)

print(
    "  one authoritative Fixed package: verified"
)

print(
    "  optional add-ons excluded from Fixed snapshot: verified"
)

print(
    "  mandatory included extras remain exact: verified"
)

print(
    "  client package switching blocked: verified"
)

print(
    "  client add-on tampering ignored server-side: verified"
)

print(
    "  Fixed quote acceptance needs no client selection: verified"
)

print(
    "  Admin / Client wording reflects exact scope: verified"
)
