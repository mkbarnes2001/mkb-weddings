#!/usr/bin/env python3
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def require(condition: bool, message: str):
    if not condition:
        raise AssertionError(message)


page = read("src/admin/pages/WedPlannedPlatform.tsx")
schema = read("d1/schema.sql")

# Keep the compact four-card billing summary that already passed visual review.
for label in ("Current plan", "Subscription", "Billing", "Access"):
    require(label in page, f"billing summary card missing: {label}")

# The lower half should carry only secondary billing detail, not repeat the summary.
require('title="Billing details"' in page, "compact Billing details panel missing")
require('title="Plan & billing"' not in page, "duplicated Plan & billing detail panel still present")
require('title="Access state"' not in page, "oversized Access state panel still present")
require('sm:grid-cols-2 xl:grid-cols-3' in page, "compact responsive billing details grid missing")
require('Billing account' in page, "billing account readiness missing")
require('Period end' in page, "billing period end missing")
require('Workspace access' in page, "workspace access summary missing")

# Implementation/provider details belong in the service layer, not prominent professional UI.
for obsolete in (
    '>Plan type<',
    '>Provider<',
    '>Price<',
    '>Billing customer<',
):
    require(obsolete not in page, f"low-value implementation detail still shown: {obsolete}")

# Plan/status/price are already represented by the four summary cards and should not be
# repeated as lower detail labels.
billing_details = page.split('title="Billing details"', 1)[1].split('</AdminPanel>', 1)[0]
for repeated in ('>Plan<', '>Status<', '>Price<'):
    require(repeated not in billing_details, f"billing summary value repeated in detail panel: {repeated}")

# Lifecycle rows remain conditional and therefore appear only when relevant.
require('billing.subscription?.trialEnd ? (' in billing_details, "trial detail should remain conditional")
require('billing.subscription?.graceExpiresAt ? (' in billing_details, "grace detail should remain conditional")
require('billing.subscription?.cancelAtPeriodEnd ? (' in billing_details, "cancellation detail should remain conditional")

# Provider identifiers and plan-change actions remain outside this density gate.
# Gate 2E may add the later Stripe Customer Portal management action.
for forbidden in (
    "Change plan",
    "Upgrade plan",
    "providerCustomerId",
    "providerSubscriptionId",
):
    require(forbidden not in page, f"density refinement introduced forbidden action/provider identifier: {forbidden}")

connection = sqlite3.connect(":memory:")
connection.executescript(schema)
schema_version = connection.execute("SELECT value FROM schema_meta WHERE key='schema_version'").fetchone()[0]
connection.close()
require(int(schema_version) >= 52, f"schema regressed below 52: {schema_version}")

for migration in (
    "053_wedplanned_subscription_billing_ui_density.sql",
    "053_wedplanned_subscription_billing_ui_refinement.sql",
):
    require(not (ROOT / "d1/migrations" / migration).exists(), f"density refinement must not add migration: {migration}")

print("PASS v1.10.13a Gate 2C3D WedNav billing UI density refinement")
print("  four-card billing summary retained: verified")
print("  repeated lower plan/status/price detail removed: verified")
print("  billing detail reduced to compact responsive grid: verified")
print("  workspace access reduced to panel-header status: verified")
print("  provider/plan-type implementation detail removed from UI: verified")
print("  conditional lifecycle detail preserved: verified")
print("  provider identifiers and plan-change actions remain absent: verified")
print("  schema remains compatible at 52+: verified")
