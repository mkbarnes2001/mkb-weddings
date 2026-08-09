#!/usr/bin/env python3
"""v1.10.4a explicit workspace service-boundary regression."""

from pathlib import Path
import re
import sqlite3

ROOT = Path(__file__).resolve().parents[1]

CORE_SERVICES = [
    "serverless/wedding-d1.ts",
    "serverless/venue-d1.ts",
    "serverless/supplier-d1.ts",
    "serverless/wedding-workspace-d1.ts",
    "serverless/image-d1.ts",
]


def read(path: str) -> str:
    return (ROOT / path).read_text(
        encoding="utf-8"
    )


def function_source(
    source: str,
    function_name: str,
) -> str:
    match = re.search(
        rf"export\s+async\s+function\s+"
        rf"{re.escape(function_name)}"
        rf"\([^)]*\)\s*\{{.*?\n\}}",
        source,
        re.S,
    )

    assert match, (
        f"{function_name}: function not found"
    )

    return match.group(0)


def main() -> None:
    schema = read("d1/schema.sql")

    con = sqlite3.connect(":memory:")
    con.executescript(schema)

    version = con.execute(
        "SELECT value FROM schema_meta "
        "WHERE key='schema_version'"
    ).fetchone()[0]

    assert version == "38", version

    # Core business-data services must never silently
    # select the MKB workspace.
    forbidden = (
        'workspaceId = "workspace_mkb_weddings"'
    )

    for path in CORE_SERVICES:
        source = read(path)

        assert forbidden not in source, (
            f"{path}: implicit MKB workspace "
            "parameter remains"
        )

    # Admin workspace authority must come exclusively
    # from authenticated ProfessionalContext.
    tenant = read(
        "serverless/tenant-context.ts"
    )

    resolver = function_source(
        tenant,
        "resolveAdminWorkspaceId",
    )

    assert (
        "professionalContext?.workspaceId"
        in resolver
    )

    assert (
        "Authenticated workspace context is required."
        in resolver
    )

    assert (
        "getDefaultWorkspaceId"
        not in resolver
    )

    # Public resolution deliberately retains the
    # compatibility/default-workspace behaviour.
    assert (
        "resolvePublicWorkspaceId"
        in tenant
    )

    assert (
        "getDefaultWorkspaceId"
        in tenant
    )

    # Critical HTTP boundaries must resolve the active
    # workspace before invoking core services.
    admin_routes = {
        "functions/api/weddings/index.ts": [
            "resolveAdminWorkspaceId",
            "listAdminWeddings",
            "createAdminWedding",
            "workspaceId",
        ],
        "functions/api/weddings/[[path]].ts": [
            "resolveAdminWorkspaceId",
            "getAdminWedding",
            "workspaceId",
        ],
        "functions/api/venues/index.ts": [
            "resolveAdminWorkspaceId",
            "listAdminVenues",
            "createAdminVenue",
            "workspaceId",
        ],
        "functions/api/venues/[[path]].ts": [
            "resolveAdminWorkspaceId",
            "getAdminVenue",
            "workspaceId",
        ],
        "functions/api/suppliers.ts": [
            "resolveAdminWorkspaceId",
            "listMasterSuppliers",
            "workspaceId",
        ],
        "functions/api/wedding-workspace/[slug].ts": [
            "resolveAdminWorkspaceId",
            "getWeddingWorkspace",
            "workspaceId",
        ],
        "functions/api/uploads/image.ts": [
            "resolveAdminWorkspaceId",
            "registerUploadedImage",
            "workspaceId",
        ],
    }

    for path, needles in admin_routes.items():
        source = read(path)

        for needle in needles:
            assert needle in source, (
                f"{path}: missing {needle}"
            )

    public_routes = {
        "functions/api/public/weddings/index.ts": [
            "resolvePublicWorkspaceId",
            "listPublicWeddings",
            "workspaceId",
        ],
        "functions/api/public/weddings/[slug].ts": [
            "resolvePublicWorkspaceId",
            "getPublicWedding",
            "workspaceId",
        ],
        "functions/api/public/venues/index.ts": [
            "resolvePublicWorkspaceId",
            "listPublicVenues",
            "workspaceId",
        ],
        "functions/api/public/venues/[slug].ts": [
            "resolvePublicWorkspaceId",
            "getPublicVenue",
            "workspaceId",
        ],
    }

    for path, needles in public_routes.items():
        source = read(path)

        for needle in needles:
            assert needle in source, (
                f"{path}: missing {needle}"
            )

    # Existing MKB compatibility identity remains
    # available for legacy/public resolution only.
    workspace = read(
        "serverless/workspace-d1.ts"
    )

    assert (
        'DEFAULT_WORKSPACE_ID = '
        '"workspace_mkb_weddings"'
        in workspace
    )

    # No schema migration belongs to this slice.
    assert not (
        ROOT
        / "d1/migrations/"
        "039_workspace_provisioning.sql"
    ).exists()

    print(
        "PASS v1.10.4a explicit workspace "
        "service boundary"
    )
    print(
        "  admin workspace authority: "
        "authenticated context required"
    )
    print(
        "  core wedding/venue/supplier/image "
        "services: explicit workspace required"
    )
    print(
        "  public compatibility resolution: "
        "preserved"
    )
    print(
        "  schema: 38 unchanged"
    )


if __name__ == "__main__":
    main()
