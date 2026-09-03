#!/usr/bin/env python3
"""Focused regression for v1.10.13a subscription model and entitlement resolver foundation."""

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]

MIGRATION = ROOT / "d1/migrations/052_wedplanned_subscription_model.sql"
MARKER = "-- v1.10.13a Gate 2A: subscription model and entitlement resolver foundation."


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def one(con: sqlite3.Connection, sql: str, params=()):
    return con.execute(sql, params).fetchone()


def must_fail(con: sqlite3.Connection, sql: str, params=()):
    try:
        con.execute(sql, params)
    except sqlite3.DatabaseError:
        return
    raise AssertionError("Expected SQLite constraint failure: " + sql)


def table_columns(con: sqlite3.Connection, table: str):
    return {row[1] for row in con.execute(f"PRAGMA table_info({table})")}


def main() -> None:
    migration = MIGRATION.read_text(encoding="utf-8")
    schema = read("d1/schema.sql")
    resolver = read("serverless/platform-entitlements-d1.ts")

    assert migration.startswith(MARKER)
    assert schema.count(MARKER) == 1
    assert "Schema 51 -> 52" in migration

    for token in (
        "CREATE TABLE platform_plans",
        "CREATE TABLE platform_plan_entitlements",
        "CREATE TABLE platform_plan_prices",
        "CREATE TABLE workspace_billing_customers",
        "CREATE TABLE workspace_subscriptions",
        "idx_workspace_subscriptions_current",
        "plan_compatibility_full_access",
        "compatibility-full-access",
        "'complimentary'",
        "'schema_version'",
        "'52'",
    ):
        assert token in migration, token
        assert token in schema, token

    # Gate 2A is deliberately provider-configuration neutral.
    for forbidden in (
        "sk_live_",
        "sk_test_",
        "cus_",
        "price_1",
        "prod_",
        "acct_",
    ):
        assert forbidden not in migration, forbidden

    # Fresh canonical schema remains compatible at 52 or later.
    con = sqlite3.connect(":memory:")
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript(schema)

    assert int(one(
        con,
        "SELECT value FROM schema_meta WHERE key='schema_version'",
    )[0]) >= 52

    for table in (
        "platform_plans",
        "platform_plan_entitlements",
        "platform_plan_prices",
        "workspace_billing_customers",
        "workspace_subscriptions",
        "workspace_entitlements",
    ):
        assert one(
            con,
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",
            (table,),
        )[0] == 1, table

    assert {
        "id",
        "plan_key",
        "name",
        "plan_type",
        "status",
        "is_public",
    } <= table_columns(con, "platform_plans")

    assert {
        "plan_id",
        "feature_key",
        "enabled",
        "limit_value",
    } <= table_columns(con, "platform_plan_entitlements")

    assert {
        "plan_id",
        "provider_product_id",
        "provider_price_id",
        "billing_interval",
        "currency",
        "unit_amount_minor",
        "status",
    } <= table_columns(con, "platform_plan_prices")

    assert {
        "workspace_id",
        "provider",
        "provider_customer_id",
        "last_synced_at",
    } <= table_columns(con, "workspace_billing_customers")

    assert {
        "workspace_id",
        "plan_id",
        "plan_price_id",
        "provider",
        "provider_subscription_id",
        "provider_price_id",
        "status",
        "billing_interval",
        "current_period_start",
        "current_period_end",
        "trial_start",
        "trial_end",
        "cancel_at_period_end",
        "past_due_since",
        "grace_expires_at",
        "last_invoice_paid_at",
        "last_invoice_payment_failed_at",
        "is_current",
    } <= table_columns(con, "workspace_subscriptions")

    active_features = one(
        con,
        "SELECT COUNT(*) FROM platform_features WHERE status='active'",
    )[0]

    compatibility_entitlements = one(
        con,
        """
        SELECT COUNT(*)
        FROM platform_plan_entitlements
        WHERE plan_id='plan_compatibility_full_access'
          AND enabled=1
        """,
    )[0]

    assert compatibility_entitlements == active_features

    workspace_count = one(con, "SELECT COUNT(*) FROM workspaces")[0]
    current_compatibility = one(
        con,
        """
        SELECT COUNT(*)
        FROM workspace_subscriptions
        WHERE plan_id='plan_compatibility_full_access'
          AND provider='internal'
          AND status='complimentary'
          AND is_current=1
        """,
    )[0]

    assert current_compatibility == workspace_count

    # Gate 2A creates no Stripe-side customer or price identity.
    assert one(con, "SELECT COUNT(*) FROM workspace_billing_customers")[0] == 0
    assert one(con, "SELECT COUNT(*) FROM platform_plan_prices")[0] == 0

    # Existing workspace entitlement state remains intact and separate.
    assert one(
        con,
        """
        SELECT COUNT(*)
        FROM workspace_entitlements
        WHERE workspace_id='workspace_mkb_weddings'
        """,
    )[0] == active_features

    # One current subscription per workspace is a database invariant.
    must_fail(
        con,
        """
        INSERT INTO workspace_subscriptions (
          id, workspace_id, plan_id, provider,
          status, billing_interval, is_current
        ) VALUES (
          'subscription_duplicate_current',
          'workspace_mkb_weddings',
          'plan_compatibility_full_access',
          'internal', 'complimentary', 'none', 1
        )
        """,
    )

    # Exact additive upgrade 51 -> 52.
    prefix = schema.split(MARKER, 1)[0]
    upgrade = sqlite3.connect(":memory:")
    upgrade.execute("PRAGMA foreign_keys = ON")
    upgrade.executescript(prefix)

    assert one(
        upgrade,
        "SELECT value FROM schema_meta WHERE key='schema_version'",
    )[0] == "51"

    upgrade.execute(
        """
        INSERT INTO workspaces (
          id, slug, name, status, plan
        ) VALUES (
          'workspace_subscription_regression',
          'subscription-regression',
          'Subscription Regression',
          'active',
          'foundation'
        )
        """
    )

    before_entitlements = one(
        upgrade,
        "SELECT COUNT(*) FROM workspace_entitlements",
    )[0]

    upgrade.executescript(migration)

    assert one(
        upgrade,
        "SELECT value FROM schema_meta WHERE key='schema_version'",
    )[0] == "52"

    assert one(
        upgrade,
        "SELECT COUNT(*) FROM workspace_entitlements",
    )[0] == before_entitlements

    assignment = one(
        upgrade,
        """
        SELECT plan_id, provider, status, billing_interval, is_current
        FROM workspace_subscriptions
        WHERE workspace_id='workspace_subscription_regression'
        """,
    )

    assert assignment == (
        "plan_compatibility_full_access",
        "internal",
        "complimentary",
        "none",
        1,
    )

    assert not upgrade.execute("PRAGMA foreign_key_check").fetchall()
    assert not con.execute("PRAGMA foreign_key_check").fetchall()

    # Resolver is internal-plan based, honours temporal overrides and keeps
    # billing lifecycle separate from the feature catalogue.
    for token in (
        "resolveWorkspaceEntitlements",
        "hasWorkspaceEntitlement",
        'status === "complimentary" || status === "active"',
        'status === "past_due"',
        'status === "cancelled"',
        '? "grace"',
        'return "recovery"',
        "platform_plan_entitlements",
        "workspace_entitlements",
        "datetime(starts_at) <= datetime(?)",
        "datetime(ends_at) > datetime(?)",
        "if (override)",
        "planAccessEnabled && bool(row.plan_enabled)",
    ):
        assert token in resolver, token

    for forbidden in (
        "WEDPLANNED_STRIPE_SECRET_KEY",
        "Stripe-Account",
        "crm_invoice_payment_attempts",
        "crm_invoice_payments",
        "workspace_payment_settings",
    ):
        assert forbidden not in resolver, forbidden

    architecture = read("Project-docs/ARCHITECTURE.md")
    database = read("Project-docs/DATABASE.md")

    for token in (
        "Stripe Price → WedPlanned Plan → Entitlements → Workspace access",
        "platform_plan_prices",
        "workspace_subscriptions",
        "workspace_entitlements",
    ):
        assert token in architecture, token

    for token in (
        "platform_plans",
        "platform_plan_entitlements",
        "platform_plan_prices",
        "workspace_billing_customers",
        "workspace_subscriptions",
        "schema 52",
    ):
        assert token in database, token

    print("PASS v1.10.13a Gate 2A subscription foundation")
    print("  schema transition 51 -> 52: verified")
    print("  Price -> Plan -> entitlement abstraction: verified")
    print("  workspace-owned subscription state: verified")
    print("  compatibility plan access-neutral seed: verified")
    print("  workspace entitlement override layer preserved: verified")
    print("  lifecycle/grace resolver foundation: verified")
    print("  Stripe/client-payment runtime separation: verified")


if __name__ == "__main__":
    main()
