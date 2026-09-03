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
theme = read("src/admin/admin-theme.css")
schema = read("d1/schema.sql")

# Admin typography must explicitly neutralise the public/editorial dt/dd serif rule.
require('.admin-shell dt,' in theme, "admin dt typography override missing")
require('.admin-shell dd,' in theme, "admin dd typography override missing")
require(
    'font-family: "Montserrat", "Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif !important;' in theme,
    "canonical admin sans stack missing",
)

# Billing tab should not carry unrelated business/category/team summary cards above billing.
require('{tab !== "billing" ? (' in page, "billing tab clutter guard missing")
require('Business profile' in page and 'Categories' in page and 'Team members' in page, "business summary cards unexpectedly removed")

# Billing detail must remain compact and avoid the original colliding two-column label/value layout.
require('title="Billing details"' in page, "Billing details panel missing")
require('grid gap-x-8 gap-y-3 text-xs sm:grid-cols-2 xl:grid-cols-3' in page, "compact billing detail grid missing")
require('min-w-0' in page and 'truncate font-semibold text-neutral-900' in page, "billing detail overflow guard missing")

# Non-applicable lifecycle dates should not create empty visual rows.
require('billing.subscription?.trialEnd ? (' in page, "trial end should be conditional")
require('billing.subscription?.graceExpiresAt ? (' in page, "grace end should be conditional")
require('billing.subscription?.cancelAtPeriodEnd ? (' in page, "cancellation row should be conditional")

# Provider identifiers and plan-change actions remain outside this visual gate.
# Gate 2E may add the later Stripe Customer Portal management action.
for forbidden in (
    "Change plan",
    "Upgrade plan",
    "providerCustomerId",
    "providerSubscriptionId",
):
    require(forbidden not in page, f"billing refinement introduced forbidden action/provider identifier: {forbidden}")

connection = sqlite3.connect(":memory:")
connection.executescript(schema)
schema_version = connection.execute("SELECT value FROM schema_meta WHERE key='schema_version'").fetchone()[0]
connection.close()
require(int(schema_version) >= 52, f"schema regressed below 52: {schema_version}")

for migration in (
    "053_wedplanned_subscription_billing_ui_refinement.sql",
    "053_wedplanned_subscription_billing_ui.sql",
):
    require(not (ROOT / "d1/migrations" / migration).exists(), f"visual refinement must not add migration: {migration}")

print("PASS v1.10.13a Gate 2C3C WedNav billing UI visual refinement")
print("  admin dt/dd typography forced to canonical sans stack: verified")
print("  unrelated business summary cards hidden on billing tab: verified")
print("  billing detail remains compact and non-colliding: verified")
print("  inactive trial/grace/cancellation rows suppressed: verified")
print("  provider identifiers and plan-change actions remain absent: verified")
print("  schema remains compatible at 52+: verified")
