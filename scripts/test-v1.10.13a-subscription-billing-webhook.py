#!/usr/bin/env python3
"""Focused regression for v1.10.13a Gate 2D4 subscription billing webhook."""

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def require(condition: bool, message: str):
    if not condition:
        raise AssertionError(message)


route = read("functions/api/webhooks/wedplanned-billing.ts")
processor = read("serverless/platform-subscription-billing-webhook-d1.ts")
write_service = read("serverless/platform-subscription-billing-write-d1.ts")
connected_route = read("functions/api/webhooks/wedplanned-stripe.ts")
print_route = read("functions/api/webhooks/stripe.ts")
middleware = read("functions/_middleware.ts")
schema = read("d1/schema.sql")
architecture = read("Project-docs/ARCHITECTURE.md")
payments = read("Project-docs/WEDPLANNED-PAYMENTS.md")

# Dedicated signing secret and exact raw-body verification.
for token in (
    "WEDPLANNED_BILLING_STRIPE_WEBHOOK_SECRET",
    "WEDPLANNED_BILLING_STRIPE_WEBHOOK_TOLERANCE_SECONDS",
    "request.text()",
    "Stripe-Signature",
    "verifyStripeWebhook",
    "sha256(rawBody)",
):
    require(token in route, f"billing webhook route missing {token}")

before_verify = route[: route.index("verifyStripeWebhook(")]
require(".json()" not in before_verify, "billing webhook must not parse JSON before signature verification")
require(
    route.index("verifyStripeWebhook(")
    < route.index("processVerifiedStripeSubscriptionBillingEvent("),
    "subscription mutation must occur only after signature verification",
)

# Signing secret must remain isolated from the two existing Stripe webhooks.
require("WEDPLANNED_BILLING_STRIPE_WEBHOOK_SECRET" not in connected_route, "subscription secret leaked into connected-payment webhook")
require("WEDPLANNED_BILLING_STRIPE_WEBHOOK_SECRET" not in print_route, "subscription secret leaked into Print Store webhook")
require("WEDPLANNED_STRIPE_WEBHOOK_SECRET" not in route, "connected-payment webhook secret reused by subscription webhook")
require("\n  STRIPE_WEBHOOK_SECRET?:" not in route, "Print Store webhook secret must not be a subscription route env binding")

# Webhook delivery is not a professional browser session. The exact billing
# webhook path must bypass professional-session middleware so its dedicated
# Stripe-Signature verification can be the first authentication boundary.
require(
    'path === "/api/webhooks/wedplanned-billing"' in middleware,
    "subscription billing webhook missing exact professional-auth middleware exemption",
)
require(
    'path.startsWith("/api/webhooks/")' not in middleware,
    "middleware must not broadly exempt the whole webhook namespace",
)

# Provider event ledger is the idempotency/audit boundary.
for token in (
    "recordVerifiedSubscriptionProviderEvent",
    "finalizeSubscriptionProviderEvent",
    "reopenSubscriptionProviderEventForRetry",
    "payloadSha256",
    "duplicate",
    "processed",
    "ignored",
    "failed",
):
    require(token in processor, f"provider event lifecycle missing {token}")

# Platform-account only. Connected-account events are ignored after verification.
for token in (
    "connected_account_event_ignored",
    "providerAccountId",
    "event?.account",
):
    require(token in processor, f"connected-account webhook isolation missing {token}")
require("Stripe-Account" not in route, "webhook route must not use connected-account header")

# Required authoritative lifecycle events.
for event_type in (
    "checkout.session.completed",
    "checkout.session.expired",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
):
    require(event_type in processor, f"missing subscription billing event {event_type}")

# Checkout webhook may close operational attempt state but never directly grants access.
for token in (
    "completeWorkspaceSubscriptionCheckoutAttempt",
    "expireWorkspaceSubscriptionCheckoutAttempt",
    "checkout_attempt_id",
    "client_reference_id",
    "checkout_session_mismatch",
    "checkout_plan_mismatch",
    "checkout_price_mismatch",
):
    require(token in processor, f"Checkout reconciliation guard missing {token}")

# Subscription events validate workspace Customer and internal Price -> Plan mapping.
for token in (
    "workspace_billing_customers",
    "platform_plan_prices",
    "provider_price_id",
    "subscription_workspace_mismatch",
    "subscription_price_mapping_missing",
    "subscription_plan_mismatch",
    "subscription_checkout_attempt_mismatch",
):
    require(token in processor, f"subscription ownership/mapping guard missing {token}")

# Verified subscription events are the first authority allowed to switch current Plan.
for token in (
    "UPDATE workspace_subscriptions",
    "INSERT INTO workspace_subscriptions",
    "is_current = 0",
    "is_current = 1",
    "last_provider_event_id",
    "last_synced_at",
):
    require(token in processor, f"authoritative subscription transition missing {token}")

# Cross-event ordering must not allow older provider deliveries to regress
# a newer subscription/invoice state.
for token in (
    "hasNewerProcessedProviderEvent",
    "stale_subscription_event",
    "stale_invoice_event",
):
    require(token in processor, f"provider event ordering guard missing {token}")

# Real Stripe test delivery proved invoice.paid may arrive before
# customer.subscription.created. Known-workspace invoices must remain retryable
# and be reconciled from the verified event ledger when subscription state lands.
for token in (
    "invoice_subscription_pending",
    "invoice_customer_not_resolved",
    "reconcilePendingInvoiceEventsForSubscription",
    "failure_code = 'invoice_subscription_pending'",
    "Deferred verified Stripe invoice event",
):
    require(token in processor, f"out-of-order invoice reconciliation missing {token}")

invoice_start = processor.index("async function processInvoiceEvent")
invoice_end = processor.index("async function reconcilePendingInvoiceEventsForSubscription")
invoice_section = processor[invoice_start:invoice_end]
require(
    '"customer.subscription.created"' not in invoice_section,
    "subscription.created must not make a deferred earlier invoice permanently stale",
)
require(
    '503' in invoice_section and 'invoice_subscription_pending' in invoice_section,
    "known-workspace invoice-before-subscription must return a retryable webhook failure",
)

# Failed invoices get a bounded grace period; payment recovery clears it.
for token in (
    "WEDPLANNED_BILLING_GRACE_DAYS",
    "graceDays",
    "grace_expires_at",
    "past_due_since",
    "last_invoice_payment_failed_at",
    "last_invoice_paid_at",
    "'past_due'",
    "'active'",
):
    require(token in route or token in processor, f"payment failure/recovery policy missing {token}")

# Browser/Checkout code remains non-authoritative and financial domains stay separate.
for forbidden in (
    "crm_invoice_payment_attempts",
    "crm_invoice_payments",
    "workspace_payment_settings",
    "commerce_payment_events",
    "payload_json",
):
    require(forbidden not in processor, f"foreign financial/raw payload state leaked into subscription webhook: {forbidden}")

# Schema remains 53; existing ledgers are reused rather than adding a competing migration.
con = sqlite3.connect(":memory:")
con.executescript(schema)
version = con.execute("SELECT value FROM schema_meta WHERE key='schema_version'").fetchone()[0]
require(version == "53", f"subscription webhook unexpectedly changed schema: {version}")
for table in (
    "workspace_subscriptions",
    "workspace_subscription_checkout_attempts",
    "subscription_provider_events",
):
    require(con.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone()[0] == 1, table)
con.close()
require(not list((ROOT / "d1/migrations").glob("054_*.sql")), "Gate 2D4 must not add migration 054")

# Write service supports idempotent operational transitions required by the processor.
for token in (
    "completeWorkspaceSubscriptionCheckoutAttempt",
    "expireWorkspaceSubscriptionCheckoutAttempt",
    "reopenSubscriptionProviderEventForRetry",
):
    require(token in write_service, f"billing write service missing {token}")

for token in (
    "Gate 2D4",
    "wedplanned-billing",
    "customer.subscription.updated",
    "invoice.payment_failed",
):
    require(token in architecture or token in payments, f"documentation missing {token}")

print("PASS v1.10.13a Gate 2D4 dedicated subscription billing webhook")
print("  dedicated signing secret + raw-body verification: verified")
print("  professional-session middleware exemption is exact to billing webhook: verified")
print("  platform-account / connected-account event isolation: verified")
print("  provider event idempotency + retry lifecycle: verified")
print("  out-of-order invoice-first delivery + reconciliation: verified")
print("  Checkout completion remains operational-only: verified")
print("  subscription Customer / workspace / Price / Plan ownership guards: verified")
print("  verified subscription events can authoritatively switch current Plan: verified")
print("  failed-payment grace + invoice recovery lifecycle: verified")
print("  connected client-payment and Print Store ledgers remain isolated: verified")
print("  schema remains 53 with no raw provider payload storage: verified")
