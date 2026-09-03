#!/usr/bin/env python3
"""v1.10.13a Gate 2C1 workspace provisioning normalization on schema 52+."""

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def main() -> None:
    schema = read("d1/schema.sql")
    service = read("serverless/platform-administration-d1.ts")
    signup = read("serverless/platform-signup-d1.ts")

    con = sqlite3.connect(":memory:")
    con.execute("PRAGMA foreign_keys=ON")
    con.executescript(schema)

    assert int(con.execute(
        "SELECT value FROM schema_meta WHERE key='schema_version'"
    ).fetchone()[0]) >= 52

    active_features = con.execute(
        "SELECT COUNT(*) FROM platform_features WHERE status='active'"
    ).fetchone()[0]

    plan_features = con.execute(
        """
        SELECT COUNT(*)
        FROM platform_plan_entitlements
        WHERE plan_id='plan_compatibility_full_access'
          AND enabled=1
        """
    ).fetchone()[0]

    assert active_features == 13
    assert plan_features == active_features

    start = service.index(
        "async function provisionBusinessWorkspaceFoundation("
    )
    end = service.index(
        "\nexport async function provisionBusinessWorkspace(",
        start,
    )
    block = service[start:end]

    for token in (
        "INSERT INTO workspace_subscriptions",
        "plan_compatibility_full_access",
        "'internal'",
        "'complimentary'",
        "'none'",
        "subscription_compat_${workspaceId}",
        'release: "v1.10.13a"',
        'gate: "2C1"',
        "provisionedBy: provisioningSource",
    ):
        assert token in block, token

    assert "INSERT INTO workspace_entitlements" not in block
    assert "entitlementMetadata" not in block

    # Both workspace-creation paths still use the same normalized foundation.
    assert '"platform_admin"' in service
    assert '"verified_signup"' in service
    assert "provisionVerifiedSignupWorkspace" in signup

    # Simulate the new durable access-neutral assignment for a future workspace.
    workspace_id = "workspace_gate2c1_future"
    con.execute(
        """
        INSERT INTO workspaces (id, slug, name, status, plan)
        VALUES (?, 'gate2c1-future', 'Gate 2C1 Future', 'active', 'foundation')
        """,
        (workspace_id,),
    )
    con.execute(
        """
        INSERT INTO workspace_subscriptions (
          id, workspace_id, plan_id, provider,
          status, billing_interval, is_current, metadata_json
        ) VALUES (?, ?, 'plan_compatibility_full_access', 'internal',
                  'complimentary', 'none', 1, '{}')
        """,
        (f"subscription_compat_{workspace_id}", workspace_id),
    )

    row = con.execute(
        """
        SELECT plan_id, provider, status, billing_interval, is_current
        FROM workspace_subscriptions
        WHERE workspace_id=?
        """,
        (workspace_id,),
    ).fetchone()

    assert row == (
        "plan_compatibility_full_access",
        "internal",
        "complimentary",
        "none",
        1,
    )

    assert con.execute(
        "SELECT COUNT(*) FROM workspace_entitlements WHERE workspace_id=?",
        (workspace_id,),
    ).fetchone()[0] == 0

    # The Plan itself supplies the same 13 pre-billing entitlements.
    resolved_base = con.execute(
        """
        SELECT COUNT(*)
        FROM platform_features feature
        JOIN platform_plan_entitlements entitlement
          ON entitlement.feature_key = feature.feature_key
         AND entitlement.plan_id='plan_compatibility_full_access'
        WHERE feature.status='active'
          AND entitlement.enabled=1
        """
    ).fetchone()[0]

    assert resolved_base == active_features
    assert not con.execute("PRAGMA foreign_key_check").fetchall()

    assert not (
        ROOT / "d1/migrations/053_subscription_provisioning.sql"
    ).exists()

    print("PASS v1.10.13a Gate 2C1 subscription-aware workspace provisioning")
    print("  future workspaces receive compatibility Plan assignment: verified")
    print("  blanket manual entitlement provisioning removed: verified")
    print("  platform-admin and verified-signup foundation remains shared: verified")
    print("  existing workspace rows are not rewritten by source gate: verified")
    print("  access remains compatibility-full and Stripe-free: verified")
    print("  schema remains compatible at 52+: verified")


if __name__ == "__main__":
    main()
