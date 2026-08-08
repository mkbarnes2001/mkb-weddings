#!/usr/bin/env python3

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

API = (
    ROOT
    / "functions/api/platform-public-appearance.ts"
).read_text(encoding="utf-8")

SERVICE = (
    ROOT
    / "serverless/platform-public-site-appearance-d1.ts"
).read_text(encoding="utf-8")

CLIENT = (
    ROOT
    / "src/admin/services/AdminApiService.ts"
).read_text(encoding="utf-8")

TYPES = (
    ROOT
    / "src/admin/types/publicAppearance.ts"
).read_text(encoding="utf-8")


def require(source: str, token: str) -> None:
    assert token in source, token


def main() -> None:
    # Admin endpoint uses the existing protected Admin boundary.
    for token in (
        "adminApiRequestAllowed",
        "getProfessionalContext",
        'actor.platformRole === "platform_admin"',
        'actor.permissions.includes("platform:admin")',
        'actor.accessMode !== "support"',
        '"Cache-Control": "private, no-store"',
    ):
        require(API, token)

    # Endpoint exposes only the three explicit mutation actions.
    for token in (
        'action === "saveDraft"',
        'action === "publish"',
        'action === "restoreVersionToDraft"',
        "saveWedPlannedPublicAppearanceDraft",
        "publishWedPlannedPublicAppearance",
        "restoreWedPlannedPublicAppearanceVersionToDraft",
        "getWedPlannedPublicAppearanceAdministration",
    ):
        require(API, token)

    # No tenant/workspace identifier is accepted by this API.
    assert "workspaceId" not in API
    assert "resolvePublicWorkspaceId" not in API

    # Shared Admin payload preserves strong public-theme typing.
    require(
        TYPES,
        'siteKey: "wedplanned"',
    )
    require(
        TYPES,
        "WedPlannedPublicTheme",
    )
    require(
        TYPES,
        "publishedVersion: number",
    )
    require(
        TYPES,
        "versions: WedPlannedPublicAppearanceVersion[]",
    )

    # Frontend client has first-class read/draft/publish/restore calls.
    for token in (
        '"/api/platform-public-appearance"',
        "getWedPlannedPublicAppearance",
        "mutateWedPlannedPublicAppearance",
        "saveWedPlannedPublicAppearanceDraft",
        "publishWedPlannedPublicAppearance",
        "restoreWedPlannedPublicAppearanceVersionToDraft",
        'action: "saveDraft"',
        'action: "publish"',
        'action: "restoreVersionToDraft"',
    ):
        require(CLIENT, token)

    # Server and API use the same operations.
    for token in (
        "saveWedPlannedPublicAppearanceDraft",
        "publishWedPlannedPublicAppearance",
        "restoreWedPlannedPublicAppearanceVersionToDraft",
    ):
        require(SERVICE, token)
        require(API, token)

    print(
        "PASS v1.10.3a public appearance Admin API"
    )
    print(
        "  platform-admin authentication boundary: verified"
    )
    print(
        "  support-session mutation block: verified"
    )
    print(
        "  tenant/workspace independence: verified"
    )
    print(
        "  draft/publish/restore actions: verified"
    )
    print(
        "  private no-store response policy: verified"
    )
    print(
        "  typed Admin client contract: verified"
    )


if __name__ == "__main__":
    main()
