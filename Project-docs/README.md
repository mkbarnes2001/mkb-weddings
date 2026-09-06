# MKB Intelligence Project Documentation

## Current release — v1.10.15a

The CRM/Studio updates and booking/Calendar setup are live, released 6 September 2026 from `d26b89f737e95a6bbffec4a38a2ec4f08b6c8bd1`. Canonical and production schema are **54**. Both production deployments and smoke checks pass. Public client booking and new provider/email activation remain closed pending acceptance. See [v1.10.15a release record](RELEASE-v1.10.15a.md). Earlier version-specific sections below are historical.

This folder is the durable handover and planning record for the MKB Intelligence / WedPlanned platform.

## Current planning baseline

Stable application release: **v1.10.12a — Booking Journey, CRM Refinement & Connected Payments**

- Stable tag: `v1.10.12a-booking-journey-crm-refinement-connected-payments-stable`
- Stable application commit: `e491177719ca6a64526db93d247ed3a68692a7f2`
- Production D1 schema: **51**
- Public production deployment at release: `2dfc0628-7208-41ed-a962-9cc08f584317`
- Admin production deployment at release: `6c0eb68d-befe-4bf9-86b7-c88eb2e6b6c9`
- Stable source archive SHA256: `2e258cbe65631b1a5654e3424de1747ae4865588c42e06b20b434335350013b0`
- Live MKB Weddings Stripe Connect state at release: **ready**
- Connected account model: **Standard, GB, GBP**
- WedCRM card payments: **enabled**
- Live client-payment attempts at release: **0**
- Live Stripe invoice settlement rows at release: **0**

The stable tag is immutable. Documentation-only commits may exist on `main` after the tag without changing the v1.10.12a application baseline.

## Starting a new development conversation

Start from the latest source and read these first:

1. `README.md`
2. `PROJECT-STATE.md`
3. `NEXT-STEPS.md`
4. `ROADMAP.md`
5. `ARCHITECTURE.md`
6. `DATABASE.md`
7. `WEDPLANNED-PAYMENTS.md`
8. relevant specialist WedPlanned documents

Then inspect the actual source and migrations before making changes.

The source, D1 schema/migrations and these canonical documents are authoritative. Chat history is supplementary.

## Current product ownership

- **WedNav** — central business setup, onboarding, readiness and business-wide administration.
- **WedCRM** — Leads, Contacts, Jobs, questionnaires, booking/commercial workflow, client portal and client invoice payments.
- **WedStudio** — website connection, content, publishing, galleries and related website tooling.
- **WedStore** — commerce.

Specialist modules own their configuration. WedNav surfaces readiness and links to the owning module rather than duplicating settings.

## Payment architecture

WedPlanned has two deliberately separate financial relationships:

1. **Client payments:** couple/client → professional connected Stripe account through WedCRM.
2. **Platform subscriptions:** professional/business → WedPlanned platform Stripe account through Stripe Billing.

Connected client payments are implemented in v1.10.12a.

Platform subscription billing is the next planned release and must not reuse connected-account payment state.

See `WEDPLANNED-PAYMENTS.md`.

## Next planned release

**v1.10.13a — WedPlanned Subscription Billing & Entitlements**

The subscription belongs to the business workspace, not an individual professional user.

The intended access model is:

`Stripe Price → WedPlanned Plan → Entitlements → Workspace access`

Do not hard-code module access directly to Stripe Price IDs.

## End-of-release checklist

1. Update `PROJECT-STATE.md`.
2. Add the release to `CHANGELOG.md`.
3. Update `NEXT-STEPS.md`.
4. Update `DATABASE.md` whenever the D1 schema changes.
5. Update `ARCHITECTURE.md` for architectural decisions.
6. Update `ROADMAP.md` for product priorities.
7. Update specialist architecture documents when their ownership or boundary changes.
8. Remove obsolete duplicate documentation copies rather than leaving competing sources of truth.
9. Keep a stable Git tag and verified source archive for major milestones.

**Principle:** the project itself is the memory.
