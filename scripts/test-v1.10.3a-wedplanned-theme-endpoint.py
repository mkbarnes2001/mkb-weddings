#!/usr/bin/env python3

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CONFIG = (
    ROOT
    / "config/wedplanned/wrangler.toml"
).read_text(encoding="utf-8")

API = (
    ROOT
    / "config/wedplanned/functions/api/theme.ts"
).read_text(encoding="utf-8")

SERVICE = (
    ROOT
    / "serverless/platform-public-site-appearance-d1.ts"
).read_text(encoding="utf-8")


def require(source: str, token: str) -> None:
    assert token in source, token


def main() -> None:
    # WedPlanned gets its own Pages configuration.
    for token in (
        'name = "wedplanned"',
        'pages_build_output_dir = "../../build-wedplanned"',
        '[[d1_databases]]',
        'binding = "MKB_DB"',
        'database_name = "mkb-intelligence-prod"',
        'database_id = "47a3d7f6-6586-4d54-8cfc-bf065ef879dc"',
    ):
        require(CONFIG, token)

    assert CONFIG.count(
        '[[d1_databases]]'
    ) == 1

    # Public runtime exposes only the published theme reader.
    require(
        API,
        "getPublishedWedPlannedPublicAppearance",
    )
    require(
        SERVICE,
        "getPublishedWedPlannedPublicAppearance",
    )

    for token in (
        "onRequestGet",
        "onRequestOptions",
        "publishedVersion",
        "publishedAt",
        "appearance.theme",
        '"Cache-Control": "no-store"',
        '"Access-Control-Allow-Origin": "*"',
        '"X-Content-Type-Options": "nosniff"',
    ):
        require(API, token)

    # No private/admin mutation surface in the public Function.
    forbidden = (
        "saveWedPlannedPublicAppearanceDraft",
        "publishWedPlannedPublicAppearance",
        "restoreWedPlannedPublicAppearanceVersionToDraft",
        "getWedPlannedPublicAppearanceAdministration",
        "getProfessionalContext",
        "professionalAuthEnforced",
        "resolvePublicWorkspaceId",
        "workspaceId",
        "draft_json",
        "published_json",
        "platform_public_site_appearance_versions",
    )

    for token in forbidden:
        assert token not in API, token

    # The WedPlanned function tree is deliberately independent
    # from the repository-wide MKB/Admin Functions middleware.
    assert '../../../../functions/' not in API
    assert 'functions/_middleware' not in API

    print(
        "PASS v1.10.3a isolated WedPlanned theme endpoint"
    )
    print(
        "  dedicated Pages configuration: verified"
    )
    print(
        "  MKB_DB production binding declaration: verified"
    )
    print(
        "  published-only GET surface: verified"
    )
    print(
        "  draft/admin data excluded: verified"
    )
    print(
        "  MKB tenant middleware excluded: verified"
    )
    print(
        "  public no-store response contract: verified"
    )


if __name__ == "__main__":
    main()
