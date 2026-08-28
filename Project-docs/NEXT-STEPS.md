# Next Steps

## Current stable baseline

The verified stable application baseline is **v1.10.12a — Booking Journey, CRM Refinement & Connected Payments**.

- Stable tag: `v1.10.12a-booking-journey-crm-refinement-connected-payments-stable`
- Stable application commit: `e491177719ca6a64526db93d247ed3a68692a7f2`
- Production schema: **51**

The stable tag is immutable and must not be altered when beginning the next release.

## Next release — v1.10.13a Subscription Billing & Entitlements

The next engineering phase adds the second Stripe relationship:

`professional/business workspace → WedPlanned platform → recurring Stripe Billing subscription`

This remains separate from the implemented client-payment relationship:

`client/couple → professional connected Stripe account`

### Gate 0 — baseline and architecture inspection

1. Start from the latest source on `main`.
2. Verify the v1.10.12a stable tag and application commit.
3. Verify production schema remains 51.
4. Inspect workspace/business ownership, professional authentication, WedNav, existing `workspace_entitlements`, Stripe Connect and payment webhook boundaries.
5. Inspect the current D1 schema and migration conventions.
6. Define the subscription, plan and entitlement architecture before modifying source.
7. Make no production, Stripe or database changes during this inspection.

### Gate 1 — internal plan and subscription model

Design the internal model before writing a migration.

The required abstraction is:

`Stripe Price → WedPlanned Plan → Entitlements → Workspace access`

The design must support:

- workspace-owned subscriptions;
- durable internal plan identifiers;
- monthly and annual billing;
- trials;
- active state;
- past-due state;
- grace periods;
- cancellation at period end;
- cancelled and expired states;
- complimentary/internal access;
- grandfathered pricing;
- promotional plans;
- future add-ons;
- future plan migrations.

Do not hard-code application access directly to Stripe Price IDs.

Do not create live Stripe Products or Prices during Gate 1.

### Gate 2 — local schema and entitlement resolver

After the model is approved:

1. add only the minimum required D1 migration;
2. update canonical `d1/schema.sql`;
3. implement workspace plan/subscription persistence;
4. implement entitlement resolution;
5. reconcile with existing `workspace_entitlements` rather than creating competing entitlement state;
6. add tenant-isolation and permission regression tests;
7. prove canonical fresh schema locally;
8. prove the exact upgrade migration locally.

### Gate 3 — Stripe Billing integration

Only after the internal model is stable:

- create or resolve a Stripe Customer per workspace;
- integrate Stripe Checkout with `mode=subscription`;
- integrate Stripe Customer Portal;
- implement a dedicated subscription webhook;
- persist verified subscription state;
- keep subscription billing isolated from connected-account client payments;
- never grant or remove authoritative access solely from a browser success redirect.

### Gate 4 — WedNav billing UI

Business-wide subscription administration belongs under WedNav / business administration.

WedNav should surface:

- current plan;
- subscription status;
- trial or grace state;
- billing interval;
- renewal or period-end date;
- manage billing;
- change or upgrade plan;
- entitlement/readiness state.

Specialist modules must not duplicate subscription configuration.

### Gate 5 — Stripe sandbox runtime

Before production:

1. create subscription in sandbox;
2. verify successful Checkout;
3. verify webhook-driven activation;
4. verify successful renewal;
5. verify failed invoice and grace behaviour;
6. verify cancellation at period end;
7. verify entitlement transitions;
8. verify Customer Portal behaviour;
9. confirm connected client payments remain unaffected.

### Gate 6 — controlled production rollout

Only after local and sandbox gates pass:

1. capture a production D1 rollback point;
2. apply the exact approved migration;
3. verify production schema and workspace state;
4. create/configure live Stripe subscription Products and Prices;
5. configure the dedicated live subscription webhook;
6. deploy controlled production code;
7. verify the production billing path;
8. push and tag only after production verification.

## Future product roadmap

### Wed Connect

Professional network for:

- second-shooter requests;
- stand-ins;
- associates and support photographers;
- event support labour;
- availability and request matching;
- professional reputation and recommendation signals.

### Wed Marketplace

Client-facing professional discovery using:

- professional profiles;
- service/category and geography;
- verified client reviews;
- professional recommendations;
- ranking and standing signals;
- future enquiry and booking integration into WedCRM.

Marketplace publication must be explicit. Private CRM, client and internal business data must never become marketplace content implicitly.

## Ongoing architecture guardrails

- Workspace/business remains the durable tenant boundary.
- Professional membership determines access to a workspace.
- Client portal identity remains separate from professional identity.
- WedNav orchestrates setup/readiness while specialist modules own configuration.
- Client invoice payments and WedPlanned subscriptions remain separate Stripe relationships.
- Browser redirects are not authoritative settlement or subscription state.
- Never store professional Stripe secret keys.
- Do not create unnecessary migrations.
- Prefer read-only inspection before writes.
- Keep production changes behind explicit verified gates.
