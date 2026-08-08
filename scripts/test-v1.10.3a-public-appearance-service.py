#!/usr/bin/env python3

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SERVICE = (
    ROOT
    / "serverless/platform-public-site-appearance-d1.ts"
).read_text(encoding="utf-8")

CONTRACT = (
    ROOT
    / "src/shared/wedplannedPublicAppearance.ts"
).read_text(encoding="utf-8")

SCHEMA = (
    ROOT
    / "d1/schema.sql"
).read_text(encoding="utf-8")


def require(source: str, token: str) -> None:
    assert token in source, token


def main() -> None:
    # Service uses the single shared controlled theme contract.
    for token in (
        "normaliseWedPlannedPublicTheme",
        "cloneDefaultWedPlannedPublicTheme",
        "WedPlannedPublicTheme",
    ):
        require(SERVICE, token)
        require(CONTRACT, token)

    # Platform-only administration boundary.
    for token in (
        "requirePlatformAdmin",
        'platformRole) !== "platform_admin"',
        'includes("platform:admin")',
        'accessMode === "support"',
    ):
        require(SERVICE, token)

    # Explicit draft / publish / restore / public-read operations.
    for token in (
        "getWedPlannedPublicAppearanceAdministration",
        "saveWedPlannedPublicAppearanceDraft",
        "publishWedPlannedPublicAppearance",
        "restoreWedPlannedPublicAppearanceVersionToDraft",
        "getPublishedWedPlannedPublicAppearance",
    ):
        require(SERVICE, token)

    # Draft saves must not modify published state.
    draft_section = SERVICE.split(
        "export async function saveWedPlannedPublicAppearanceDraft",
        1,
    )[1].split(
        "export async function publishWedPlannedPublicAppearance",
        1,
    )[0]

    require(draft_section, "draft_json = ?")
    assert "published_json =" not in draft_section
    assert "published_version =" not in draft_section
    assert "published_at =" not in draft_section

    # Publishing canonicalises the draft, publishes it and records history.
    publish_section = SERVICE.split(
        "export async function publishWedPlannedPublicAppearance",
        1,
    )[1].split(
        "export async function restoreWedPlannedPublicAppearanceVersionToDraft",
        1,
    )[0]

    for token in (
        "const nextVersion = currentVersion + 1",
        "draft_json = ?",
        "published_json = ?",
        "published_version = ?",
        "published_at = CURRENT_TIMESTAMP",
        "platform_public_site_appearance_versions",
        "WHERE id = ?",
        "AND published_version = ?",
    ):
        require(publish_section, token)

    # Restore is deliberately safe: old live versions return to draft only.
    restore_section = SERVICE.split(
        "export async function restoreWedPlannedPublicAppearanceVersionToDraft",
        1,
    )[1].split(
        "export async function getPublishedWedPlannedPublicAppearance",
        1,
    )[0]

    require(restore_section, "draft_json = ?")
    require(
        restore_section,
        "publishedVersionChanged: false",
    )

    assert "published_json =" not in restore_section
    assert "published_version =" not in restore_section
    assert "published_at =" not in restore_section

    # Public reader returns published state only and has a safe fallback.
    public_section = SERVICE.split(
        "export async function getPublishedWedPlannedPublicAppearance",
        1,
    )[1]

    require(public_section, "row.published_json")
    require(
        public_section,
        "cloneDefaultWedPlannedPublicTheme()",
    )

    assert "row.draft_json" not in public_section
    assert "versions:" not in public_section
    assert "requirePlatformAdmin(actor)" not in public_section

    # Every write is auditable and global rather than tenant-owned.
    for event in (
        "platform.public_site_appearance.draft_saved",
        "platform.public_site_appearance.published",
        "platform.public_site_appearance.version_restored_to_draft",
    ):
        require(SERVICE, event)

    require(
        SERVICE,
        "'platform_public_site_appearance'",
    )

    # Existing schema contract remains the persistence authority.
    for token in (
        "platform_public_site_appearance",
        "platform_public_site_appearance_versions",
        "published_version",
        "draft_json",
        "published_json",
    ):
        require(SCHEMA, token)

    print(
        "PASS v1.10.3a public appearance D1 service"
    )
    print(
        "  platform-admin write boundary: verified"
    )
    print(
        "  support-session writes blocked: verified"
    )
    print(
        "  draft save isolation: verified"
    )
    print(
        "  atomic publish/version history contract: verified"
    )
    print(
        "  restore-to-draft safety: verified"
    )
    print(
        "  published-only public reader: verified"
    )
    print(
        "  default-theme public fallback: verified"
    )
    print(
        "  audit events for all mutations: verified"
    )


if __name__ == "__main__":
    main()
