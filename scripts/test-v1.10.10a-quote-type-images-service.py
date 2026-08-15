#!/usr/bin/env python3

"""Focused v1.10.10a quote type and image model checks."""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8"
    )


def section(
    text: str,
    start: str,
    end: str,
) -> str:
    left = text.index(start)
    right = text.index(end, left)
    return text[left:right]


def main() -> None:
    quotes = read(
        "serverless/crm-quotes-d1.ts"
    )

    templates = read(
        "serverless/crm-commercial-templates-d1.ts"
    )

    types = read(
        "src/admin/types/crm.ts"
    )

    # Quote root.
    assert (
        'function quoteType(value: unknown)'
        in quotes
    )

    assert (
        'quoteType: quoteType(row.quote_type)'
        in quotes
    )

    assert (
        "status, quote_type, currency"
        in quotes
    )

    assert (
        'quoteTypeValue === "fixed"'
        in quotes
    )

    assert (
        "A fixed quote must contain exactly one package option."
        in quotes
    )

    # Catalogue add-on image persistence.
    assert (
        "requirement = ?, image_url = ?"
        in quotes
    )

    addon_insert = re.search(
        r"INSERT INTO crm_addons "
        r"\([^`]+?\) VALUES "
        r"\(([^`]+?)\)`",
        quotes,
    )

    assert addon_insert

    assert (
        addon_insert.group(1).count("?")
        == 14
    )

    # Immutable issued quote imagery.
    assert (
        "imageUrl: text(inputOption.imageUrl ?? catalogue?.image_url)"
        in quotes
    )

    assert (
        "client_notes, image_url, recommended"
        in quotes
    )

    assert (
        "imageUrl: text(addon.image_url)"
        in quotes
    )

    assert (
        "display_order, image_url, addon_snapshot_json"
        in quotes
    )

    assert (
        "quoteType: quoteTypeValue"
        in quotes
    )

    # Reusable templates.
    assert (
        "row?.quote_type"
        in templates
    )

    assert (
        '|| "pick_and_choose"'
        in templates
    )

    assert (
        "addon.image_url"
        in templates
    )

    assert (
        "AS addon_image_url"
        in templates
    )

    assert (
        "row?.addon_image_url"
        in templates
    )

    normalise = section(
        templates,
        "async function normaliseQuoteTemplate(",
        "async function writeQuoteTemplate(",
    )

    assert (
        'quoteType === "fixed"'
        in normalise
    )

    assert (
        "A fixed quote template must contain exactly one package."
        in normalise
    )

    assert (
        "quoteType,"
        in normalise
    )

    write = section(
        templates,
        "async function writeQuoteTemplate(",
        "export async function createQuoteTemplate(",
    )

    assert (
        "quote_type,"
        in write
    )

    assert (
        "quote_type = ?"
        in write
    )

    assert (
        write.count(
            "value.quoteType"
        ) == 2
    )

    assert (
        "quoteType:\n          template.quoteType"
        in templates
    )

    # Admin contracts.
    assert (
        "export type CrmQuoteType ="
        in types
    )

    assert (
        '| "pick_and_choose"'
        in types
    )

    assert (
        '| "fixed";'
        in types
    )

    assert (
        "imageUrl: string;"
        in section(
            types,
            "export type CrmAddon = {",
            "export type CrmQuoteItem = {",
        )
    )

    assert (
        "imageUrl: string;"
        in section(
            types,
            "export type CrmQuoteAddonOption = {",
            "export type CrmQuoteOption = {",
        )
    )

    assert (
        "imageUrl: string;"
        in section(
            types,
            "export type CrmQuoteOption = {",
            "export type CrmQuoteVersion = {",
        )
    )

    assert (
        "quoteType: CrmQuoteType;"
        in section(
            types,
            "export type CrmQuote = {",
            "export type CrmQuoteOverview = {",
        )
    )

    assert (
        "quoteType: CrmQuoteType;"
        in section(
            types,
            "export type CrmQuoteTemplate = {",
            "export type CrmQuoteTemplateInput = {",
        )
    )

    assert (
        "quoteType?: CrmQuoteType;"
        in section(
            types,
            "export type CrmQuoteTemplateInput = {",
            "export type CrmEmailTemplatePurpose",
        )
    )

    print(
        "PASS v1.10.10a quote type / image server models"
    )

    print(
        "  catalogue add-on image persistence: verified"
    )

    print(
        "  immutable package/add-on image snapshots: verified"
    )

    print(
        "  Pick & Choose / Fixed quote persistence: verified"
    )

    print(
        "  reusable template quote type propagation: verified"
    )

    print(
        "  Admin CRM contracts: verified"
    )


if __name__ == "__main__":
    main()
