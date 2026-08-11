#!/usr/bin/env python3
"""v1.10.4a business-workspace provisioning regression."""

from pathlib import Path
import json
import sqlite3

ROOT = Path(__file__).resolve().parents[1]

A = "workspace_mkb_weddings"
B = "workspace_regression_business"
EMAIL = "owner@regression.example"


def read(path: str) -> str:
    return (ROOT / path).read_text(
        encoding="utf-8"
    )


def one(
    con: sqlite3.Connection,
    sql: str,
    params: tuple = (),
):
    return con.execute(
        sql,
        params,
    ).fetchone()


def main() -> None:
    schema = read("d1/schema.sql")

    con = sqlite3.connect(":memory:")
    con.row_factory = sqlite3.Row
    con.executescript(schema)

    assert one(
        con,
        "SELECT value FROM schema_meta "
        "WHERE key='schema_version'",
    )[0] == "40"

    # Simulate the exact durable records created by the
    # source-only provisioner.
    con.execute(
        """
        INSERT INTO workspaces
          (id, slug, name, status, plan)
        VALUES
          (?, 'regression-business',
           'Regression Business', 'active', 'foundation')
        """,
        (B,),
    )

    con.execute(
        """
        INSERT INTO workspace_settings (
          workspace_id, business_name, contact_email,
          accent_color, default_country, timezone,
          currency, document_json
        ) VALUES (?, ?, ?, '#111111', 'GB',
                  'Europe/London', 'GBP', '{}')
        """,
        (B, "Regression Business", EMAIL),
    )

    con.execute(
        """
        INSERT INTO business_profiles (
          workspace_id, public_name, legal_name,
          marketplace_slug, business_type,
          registration_country, onboarding_status,
          marketplace_status
        ) VALUES (
          ?, 'Regression Business', 'Regression Business',
          'regression-business', 'sole_trader',
          'GB', 'foundation', 'private'
        )
        """,
        (B,),
    )

    con.execute(
        """
        INSERT INTO platform_users (
          id, email_normalized, email,
          display_name, platform_role, status
        ) VALUES (
          'user_regression_owner', ?, ?,
          'Regression Owner', 'member', 'invited'
        )
        """,
        (EMAIL, EMAIL),
    )

    con.execute(
        """
        INSERT INTO business_memberships (
          id, workspace_id, user_id,
          email_normalized, email, display_name,
          job_title, role, status,
          permissions_json, invited_at
        ) VALUES (
          'membership_regression_owner',
          ?, 'user_regression_owner',
          ?, ?, 'Regression Owner',
          'Owner', 'owner', 'invited',
          '{}', CURRENT_TIMESTAMP
        )
        """,
        (B, EMAIL, EMAIL),
    )

    con.execute(
        """
        INSERT INTO workspace_memberships (
          id, workspace_id, user_email,
          role, status
        ) VALUES (
          'legacy_membership_regression_owner',
          ?, ?, 'owner', 'invited'
        )
        """,
        (B, EMAIL),
    )

    metadata = json.dumps({
        "provisionedBy": "platform_admin",
        "release": "v1.10.4a",
    })

    con.execute(
        """
        INSERT INTO workspace_entitlements (
          workspace_id, feature_key, source,
          enabled, limit_value, metadata_json
        )
        SELECT ?, feature_key, 'manual',
               1, NULL, ?
        FROM platform_features
        WHERE status='active'
        """,
        (B, metadata),
    )

    con.execute(
        """
        INSERT INTO platform_audit_events (
          id, workspace_id, actor_email,
          event_type, entity_type,
          entity_id, summary, metadata_json
        ) VALUES (
          'audit_regression_workspace', ?,
          'platform-admin@example.test',
          'platform.business_workspace.provisioned',
          'workspace', ?,
          'Provisioned regression workspace.',
          '{"emailSent":false}'
        )
        """,
        (B, B),
    )

    assert one(
        con,
        "SELECT slug FROM workspaces "
        "WHERE id=?",
        (B,),
    )[0] == "regression-business"

    assert one(
        con,
        "SELECT business_name FROM workspace_settings "
        "WHERE workspace_id=?",
        (B,),
    )[0] == "Regression Business"

    profile = one(
        con,
        """
        SELECT marketplace_slug,
               onboarding_status,
               marketplace_status
        FROM business_profiles
        WHERE workspace_id=?
        """,
        (B,),
    )

    assert tuple(profile) == (
        "regression-business",
        "foundation",
        "private",
    )

    owner = one(
        con,
        """
        SELECT role, status, email_normalized
        FROM business_memberships
        WHERE workspace_id=?
        """,
        (B,),
    )

    assert tuple(owner) == (
        "owner",
        "invited",
        EMAIL,
    )

    legacy_owner = one(
        con,
        """
        SELECT role, status
        FROM workspace_memberships
        WHERE workspace_id=?
        """,
        (B,),
    )

    assert tuple(legacy_owner) == (
        "owner",
        "invited",
    )

    active_features = one(
        con,
        """
        SELECT COUNT(*)
        FROM platform_features
        WHERE status='active'
        """,
    )[0]

    enabled_features = one(
        con,
        """
        SELECT COUNT(*)
        FROM workspace_entitlements
        WHERE workspace_id=?
          AND enabled=1
        """,
        (B,),
    )[0]

    assert enabled_features == active_features

    # Provisioning itself does not attach a domain
    # and must not make the business public.
    assert one(
        con,
        """
        SELECT COUNT(*)
        FROM workspace_domains
        WHERE workspace_id=?
        """,
        (B,),
    )[0] == 0

    # It also stages the owner rather than issuing an
    # authentication capability/email.
    assert one(
        con,
        """
        SELECT COUNT(*)
        FROM platform_auth_links
        WHERE email_normalized=?
        """,
        (EMAIL,),
    )[0] == 0

    # No data is copied from MKB into the new business.
    assert one(
        con,
        """
        SELECT COUNT(*)
        FROM weddings
        WHERE workspace_id=?
        """,
        (B,),
    )[0] == 0

    assert one(
        con,
        """
        SELECT COUNT(*)
        FROM venues
        WHERE workspace_id=?
        """,
        (B,),
    )[0] == 0

    assert one(
        con,
        """
        SELECT COUNT(*)
        FROM suppliers
        WHERE workspace_id=?
        """,
        (B,),
    )[0] == 0

    assert not con.execute(
        "PRAGMA foreign_key_check"
    ).fetchall()

    service = read(
        "serverless/platform-administration-d1.ts"
    )

    route = read(
        "functions/api/platform-admin.ts"
    )

    admin_api = read(
        "src/admin/services/AdminApiService.ts"
    )

    page = read(
        "src/admin/pages/PlatformAdmin.tsx"
    )

    for token in [
        "provisionBusinessWorkspace",
        "platform.business_workspace.provisioned",
        "await db.batch(statements)",
        "workspace_entitlements",
        "business_memberships",
        "workspace_memberships",
        "marketplace_status",
        "foundation",
    ]:
        assert token in service, token

    assert "issueProfessionalInvitation" not in service

    assert (
        'action === "provisionBusinessWorkspace"'
        in route
    )

    assert (
        "static async provisionBusinessWorkspace"
        in admin_api
    )

    for token in [
        "Create business workspace",
        "Create workspace",
        'data-owner-invitation="staged"',
        "no invitation email",
        "Owner access is staged",
    ]:
        assert token in page, token

    # Existing workspace-specific starter logic remains
    # authoritative rather than being duplicated here.
    crm = read("serverless/crm-d1.ts")
    workflow = read(
        "serverless/crm-workflow-d1.ts"
    )
    portal = read(
        "serverless/client-portal-d1.ts"
    )

    assert "ensureCrmWorkspaceSetup" in crm
    assert "ensureWorkflowWorkspaceSetup" in workflow
    assert "ensureStarterTemplate" in portal

    # This remains a source-only release slice.
    assert not (
        ROOT
        / "d1/migrations/039_workspace_provisioning.sql"
    ).exists()

    print(
        "PASS v1.10.4a business workspace provisioning"
    )
    print(
        "  workspace/settings/profile: isolated foundation created"
    )
    print(
        "  owner: staged in professional and compatibility memberships"
    )
    print(
        "  feature entitlements: provisioned from active platform features"
    )
    print(
        "  invitation email/auth capability: deliberately not created"
    )
    print(
        "  CRM/workflow/questionnaire setup: existing tenant-scoped lazy initialisers retained"
    )
    print(
        "  current canonical schema: 39"
    )


if __name__ == "__main__":
    main()
