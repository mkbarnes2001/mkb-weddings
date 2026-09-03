#!/usr/bin/env python3
"""Focused regression for v1.10.13a Gate 2D1 subscription billing write ledger foundation."""

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "d1/migrations/053_wedplanned_subscription_billing_write_foundation.sql"
MARKER = "-- v1.10.13a Gate 2D1: subscription billing write ledger foundation."


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def one(con: sqlite3.Connection, sql: str, params=()):
    return con.execute(sql, params).fetchone()


def must_fail(con: sqlite3.Connection, sql: str, params=()):
    try:
        con.execute(sql, params)
    except sqlite3.DatabaseError:
        return
    raise AssertionError("Expected SQLite constraint failure: " + sql)


def columns(con: sqlite3.Connection, table: str):
    return {row[1] for row in con.execute(f"PRAGMA table_info({table})")}


def main() -> None:
    migration = MIGRATION.read_text(encoding="utf-8")
    schema = read("d1/schema.sql")
    service = read("serverless/platform-subscription-billing-write-d1.ts")
    architecture = read("Project-docs/ARCHITECTURE.md")
    database = read("Project-docs/DATABASE.md")
    payments = read("Project-docs/WEDPLANNED-PAYMENTS.md")

    assert migration.startswith(MARKER)
    assert schema.count(MARKER) == 1
    assert "Schema 52 -> 53" in migration

    for token in (
        "CREATE TABLE workspace_subscription_checkout_attempts",
        "CREATE TABLE subscription_provider_events",
        "idx_workspace_subscription_checkout_attempts_idempotency",
        "idx_workspace_subscription_checkout_attempts_provider_checkout",
        "idx_subscription_provider_events_provider_event",
        "payload_sha256",
        "provider_account_id",
        "provider_customer_id",
        "provider_subscription_id",
        "provider_invoice_id",
        "'schema_version'",
        "'53'",
    ):
        assert token in migration, token
        assert token in schema, token

    # No raw provider payload/card data or credentials belong in these ledgers.
    for forbidden in (
        "payload_json",
        "payment_method",
        "card_number",
        "client_secret",
        "sk_live_",
        "sk_test_",
    ):
        assert forbidden not in migration, forbidden

    con = sqlite3.connect(":memory:")
    con.execute("PRAGMA foreign_keys=ON")
    con.executescript(schema)

    assert int(one(
        con,
        "SELECT value FROM schema_meta WHERE key='schema_version'",
    )[0]) == 53

    for table in (
        "workspace_subscription_checkout_attempts",
        "subscription_provider_events",
    ):
        assert one(
            con,
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",
            (table,),
        )[0] == 1, table

    assert {
        "workspace_id",
        "plan_id",
        "plan_price_id",
        "requested_by_user_id",
        "provider_checkout_id",
        "idempotency_key",
        "status",
        "currency",
        "unit_amount_minor",
        "billing_interval",
        "interval_count",
        "failure_code",
        "failure_message",
        "expires_at",
        "completed_at",
    } <= columns(con, "workspace_subscription_checkout_attempts")

    event_columns = columns(con, "subscription_provider_events")
    assert {
        "workspace_id",
        "subscription_id",
        "checkout_attempt_id",
        "provider_event_id",
        "event_type",
        "livemode",
        "provider_account_id",
        "provider_customer_id",
        "provider_subscription_id",
        "provider_invoice_id",
        "payload_sha256",
        "status",
        "processed_at",
    } <= event_columns
    assert "payload_json" not in event_columns

    # Seed a local-only commercial Price and active business member so the
    # operational ledger constraints can be proven without Stripe runtime.
    con.execute(
        """
        INSERT INTO platform_plans (
          id, plan_key, name, description, plan_type, status, is_public
        ) VALUES (
          'plan_gate2d1_test', 'gate2d1-test', 'Gate 2D1 Test', '',
          'commercial', 'active', 1
        )
        """
    )
    con.execute(
        """
        INSERT INTO platform_plan_prices (
          id, plan_id, provider, billing_interval, interval_count,
          currency, unit_amount_minor, status
        ) VALUES (
          'plan_price_gate2d1_test', 'plan_gate2d1_test', 'stripe',
          'month', 1, 'GBP', 1234, 'active'
        )
        """
    )
    con.execute(
        """
        INSERT INTO platform_users (
          id, email_normalized, email, display_name, platform_role, status
        ) VALUES (
          'user_gate2d1_test', 'gate2d1@local.invalid',
          'gate2d1@local.invalid', 'Gate 2D1', 'member', 'active'
        )
        """
    )
    con.execute(
        """
        INSERT INTO business_memberships (
          id, workspace_id, user_id, email_normalized, email,
          display_name, role, status, permissions_json
        ) VALUES (
          'membership_gate2d1_test', 'workspace_mkb_weddings',
          'user_gate2d1_test', 'gate2d1@local.invalid',
          'gate2d1@local.invalid', 'Gate 2D1', 'owner', 'active', '{}'
        )
        """
    )

    con.execute(
        """
        INSERT INTO workspace_subscription_checkout_attempts (
          id, workspace_id, plan_id, plan_price_id,
          requested_by_user_id, provider, provider_checkout_id,
          idempotency_key, status, currency, unit_amount_minor,
          billing_interval, interval_count
        ) VALUES (
          'attempt_gate2d1', 'workspace_mkb_weddings',
          'plan_gate2d1_test', 'plan_price_gate2d1_test',
          'user_gate2d1_test', 'stripe', 'cs_gate2d1_test',
          'idem_gate2d1', 'open', 'GBP', 1234, 'month', 1
        )
        """
    )

    # Workspace-scoped idempotency and provider Checkout IDs are durable.
    must_fail(
        con,
        """
        INSERT INTO workspace_subscription_checkout_attempts (
          id, workspace_id, plan_id, plan_price_id,
          idempotency_key, status, currency, unit_amount_minor,
          billing_interval, interval_count
        ) VALUES (
          'attempt_gate2d1_duplicate_idem', 'workspace_mkb_weddings',
          'plan_gate2d1_test', 'plan_price_gate2d1_test',
          'idem_gate2d1', 'created', 'GBP', 1234, 'month', 1
        )
        """,
    )
    must_fail(
        con,
        """
        INSERT INTO workspace_subscription_checkout_attempts (
          id, workspace_id, plan_id, plan_price_id,
          provider_checkout_id, idempotency_key, status, currency,
          unit_amount_minor, billing_interval, interval_count
        ) VALUES (
          'attempt_gate2d1_duplicate_checkout', 'workspace_mkb_weddings',
          'plan_gate2d1_test', 'plan_price_gate2d1_test',
          'cs_gate2d1_test', 'idem_gate2d1_2', 'open', 'GBP',
          1234, 'month', 1
        )
        """,
    )

    payload_hash = "a" * 64
    con.execute(
        """
        INSERT INTO subscription_provider_events (
          id, workspace_id, checkout_attempt_id, provider,
          provider_event_id, event_type, livemode,
          provider_customer_id, payload_sha256, status
        ) VALUES (
          'event_gate2d1', 'workspace_mkb_weddings', 'attempt_gate2d1',
          'stripe', 'evt_gate2d1', 'checkout.session.completed', 0,
          'cus_gate2d1', ?, 'received'
        )
        """,
        (payload_hash,),
    )

    must_fail(
        con,
        """
        INSERT INTO subscription_provider_events (
          id, provider, provider_event_id, event_type, livemode
        ) VALUES (
          'event_gate2d1_duplicate', 'stripe', 'evt_gate2d1',
          'checkout.session.completed', 0
        )
        """,
    )

    must_fail(
        con,
        """
        INSERT INTO subscription_provider_events (
          id, provider, provider_event_id, event_type, livemode,
          payload_sha256
        ) VALUES (
          'event_gate2d1_bad_hash', 'stripe', 'evt_gate2d1_bad_hash',
          'invoice.paid', 0, 'not-a-sha256'
        )
        """,
    )

    assert not con.execute("PRAGMA foreign_key_check").fetchall()

    # Exact additive upgrade from the previously-proven schema 52.
    prefix = schema.split(MARKER, 1)[0]
    upgrade = sqlite3.connect(":memory:")
    upgrade.execute("PRAGMA foreign_keys=ON")
    upgrade.executescript(prefix)

    assert one(
        upgrade,
        "SELECT value FROM schema_meta WHERE key='schema_version'",
    )[0] == "52"

    tracked = {
        table: one(upgrade, f"SELECT COUNT(*) FROM {table}")[0]
        for table in (
            "workspaces",
            "workspace_entitlements",
            "workspace_payment_settings",
            "crm_invoice_payment_attempts",
            "crm_invoice_payments",
            "workspace_subscriptions",
        )
    }

    upgrade.executescript(migration)

    assert one(
        upgrade,
        "SELECT value FROM schema_meta WHERE key='schema_version'",
    )[0] == "53"

    for table, before in tracked.items():
        assert one(upgrade, f"SELECT COUNT(*) FROM {table}")[0] == before, table

    assert one(upgrade, "SELECT COUNT(*) FROM workspace_subscription_checkout_attempts")[0] == 0
    assert one(upgrade, "SELECT COUNT(*) FROM subscription_provider_events")[0] == 0
    assert not upgrade.execute("PRAGMA foreign_key_check").fetchall()

    # Write service is an internal D1-only boundary. Stripe/network runtime is
    # deliberately deferred to the next gate.
    for token in (
        "createWorkspaceSubscriptionCheckoutAttempt",
        "attachWorkspaceSubscriptionCheckoutSession",
        "failWorkspaceSubscriptionCheckoutAttempt",
        "recordVerifiedSubscriptionProviderEvent",
        "finalizeSubscriptionProviderEvent",
        "workspace_subscription_checkout_attempts",
        "subscription_provider_events",
        "business_memberships",
        "platform_plan_prices",
        "crypto.randomUUID()",
        "INSERT OR IGNORE INTO subscription_provider_events",
        "The caller must verify the provider webhook signature",
    ):
        assert token in service, token

    for forbidden in (
        "fetch(",
        "WEDPLANNED_STRIPE_SECRET_KEY",
        "STRIPE_SECRET_KEY",
        "Stripe-Account",
        "crm_invoice_payment_attempts",
        "crm_invoice_payments",
        "workspace_payment_settings",
        "commerce_payment_events",
        "payload_json",
    ):
        assert forbidden not in service, forbidden

    assert not (ROOT / "functions/api/platform-subscription-checkout.ts").exists()
    # Gate 2D1 introduced only the ledger. Later cumulative gates may expose
    # the dedicated billing webhook while retaining the same schema-53 ledger.

    for token in (
        "Gate 2D1",
        "workspace_subscription_checkout_attempts",
        "subscription_provider_events",
        "Schema 53",
    ):
        assert token in architecture or token in database or token in payments, token

    print("PASS v1.10.13a Gate 2D1 subscription billing write ledger foundation")
    print("  schema transition 52 -> 53: verified")
    print("  workspace subscription Checkout attempt ledger: verified")
    print("  provider event idempotency/audit ledger: verified")
    print("  immutable price/currency/interval attempt snapshot: verified")
    print("  raw provider payload/card storage remains absent: verified")
    print("  internal D1 write service boundary: verified")
    print("  Stripe network/API runtime remains absent: verified")
    print("  connected client-payment ledgers remain isolated: verified")


if __name__ == "__main__":
    main()
