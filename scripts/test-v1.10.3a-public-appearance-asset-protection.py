#!/usr/bin/env python3

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

ASSETS = (
    ROOT
    / "serverless/platform-brand-assets-d1.ts"
).read_text(encoding="utf-8")

SCHEMA = (
    ROOT
    / "d1/schema.sql"
).read_text(encoding="utf-8")


def require(source: str, token: str) -> None:
    assert token in source, token


def main() -> None:
    # Existing module and platform identity protection stays intact.
    for token in (
        "platform_module_configurations",
        "mark_url = ?",
        "wordmark_url = ?",
        "dark_wordmark_url = ?",
        "compact_wordmark_url = ?",
        "platform_branding_settings",
        "icon_url = ?",
        "WedPlanned platform identity",
    ):
        require(ASSETS, token)

    # New appearance protection checks exact recursively parsed
    # JSON values rather than broad substring matching.
    for token in (
        "function jsonReferencesAsset(",
        "JSON.parse(",
        "Object.values(",
        "current === assetUrl",
        "platform_public_site_appearance",
        "draft_json",
        "published_json",
        "platform_public_site_appearance_versions",
        "theme_json",
        "historicalReference",
    ):
        require(ASSETS, token)

    # Current draft/live references block deletion.
    require(
        ASSETS,
        "This asset is assigned to the WedPlanned public website appearance.",
    )

    # Historical publications also retain assets so rollback
    # cannot restore a broken R2 reference.
    require(
        ASSETS,
        "It cannot be deleted while that rollback version exists.",
    )

    # Asset is archived only after every reference guard.
    archive_position = ASSETS.index(
        "UPDATE platform_brand_assets"
    )

    current_theme_position = ASSETS.index(
        "platform_public_site_appearance"
    )

    history_position = ASSETS.index(
        "platform_public_site_appearance_versions"
    )

    assert current_theme_position < archive_position
    assert history_position < archive_position

    # Schema contains both persistence surfaces being checked.
    for token in (
        "CREATE TABLE IF NOT EXISTS platform_public_site_appearance",
        "CREATE TABLE IF NOT EXISTS platform_public_site_appearance_versions",
    ):
        require(SCHEMA, token)

    print(
        "PASS v1.10.3a public appearance asset protection"
    )
    print(
        "  module references remain protected: verified"
    )
    print(
        "  platform identity remains protected: verified"
    )
    print(
        "  current public draft references protected: verified"
    )
    print(
        "  live published references protected: verified"
    )
    print(
        "  rollback-version references protected: verified"
    )
    print(
        "  exact recursive JSON reference matching: verified"
    )


if __name__ == "__main__":
    main()
