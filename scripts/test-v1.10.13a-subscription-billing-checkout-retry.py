#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")

def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL: {message}")

service = read("serverless/platform-subscription-stripe.ts")
write = read("serverless/platform-subscription-billing-write-d1.ts")
schema = read("d1/schema.sql")
payments = read("Project-docs/WEDPLANNED-PAYMENTS.md")
architecture = read("Project-docs/ARCHITECTURE.md")

# Existing attempt lookup must stay keyed to workspace + internal Price + requester.
for token in (
    "workspace_id = ?",
    "plan_price_id = ?",
    "COALESCE(requested_by_user_id, '') = ?",
    "'created'",
    "'open'",
):
    require(token in write, f"attempt reuse contract missing: {token}")

# Open-attempt retries must reuse the stored provider binding and skip re-bind.
require('const attemptWasAlreadyOpen = attempt.status === "open"' in service,
        "open-attempt retry state missing")
require("const existingProviderCheckoutId = text(attempt.providerCheckoutId)" in service,
        "stored provider Checkout binding not loaded")
require('existingProviderCheckoutId !== sessionId' in service,
        "provider Session mismatch guard missing")
require("returned a different Checkout Session" in service,
        "provider Session mismatch error missing")

open_branch = re.search(
    r'if \(attemptWasAlreadyOpen\) \{(.*?)\n    \}\n\n    await attachWorkspaceSubscriptionCheckoutSession',
    service,
    re.S,
)
require(open_branch is not None, "open-attempt short-circuit branch missing")
require("attachWorkspaceSubscriptionCheckoutSession" not in open_branch.group(1),
        "open retry must not rebind D1 attempt")
require("attemptId: attempt.id" in open_branch.group(1) and "url: checkoutUrl" in open_branch.group(1),
        "open retry must return same internal attempt + hosted URL")

# Same D1 idempotency key must still be used for the provider request.
require("attempt.idempotencyKey" in service, "attempt idempotency key not used")
require('"Idempotency-Key"' in service, "Stripe idempotency header missing")

# A transient retry failure must not corrupt an already-open attempt.
require('if (!providerSessionCreated && attempt.status === "created")' in service,
        "failure transition must be limited to created attempts")

# Retry handling remains non-authoritative for subscription/access state.
for forbidden in (
    "UPDATE workspace_subscriptions",
    "INSERT INTO workspace_subscriptions",
    "resolveWorkspaceEntitlements",
    "Stripe-Account",
):
    require(forbidden not in service, f"retry boundary leaked authority/account behavior: {forbidden}")

require("Gate 2D2D" in payments, "payments retry note missing")
require("Gate 2D2D" in architecture, "architecture retry note missing")

# No schema change for retry hardening.
require("'53'" in schema or '"53"' in schema, "canonical schema 53 missing")
require(not list((ROOT / "d1/migrations").glob("054_*.sql")),
        "retry hardening must not add migration 054")

print("PASS v1.10.13a Gate 2D2D subscription Checkout retry hardening")
print("  existing created/open attempt reuse contract: verified")
print("  Stripe idempotency key reuse: verified")
print("  open provider Session identity guard: verified")
print("  open retry skips duplicate D1 provider binding: verified")
print("  transient retry failure preserves open attempt: verified")
print("  browser Checkout remains non-authoritative: verified")
print("  platform-account / connected-payment separation preserved: verified")
print("  schema remains 53: verified")
