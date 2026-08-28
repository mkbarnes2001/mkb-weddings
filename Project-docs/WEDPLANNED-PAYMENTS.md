# WedPlanned Payments Architecture

## Current stable baseline

Application release: **v1.10.12a — Booking Journey, CRM Refinement & Connected Payments**

- Stable tag: `v1.10.12a-booking-journey-crm-refinement-connected-payments-stable`
- Stable application commit: `e491177719ca6a64526db93d247ed3a68692a7f2`
- Production schema: **51**

## Three payment domains

The platform must keep these domains explicit and isolated.

### 1. Print Store commerce

The existing Print Store Stripe integration predates WedPlanned connected payments and uses its own Stripe secret and webhook boundary.

See `STRIPE-SETUP.md`.

### 2. Professional client payments — implemented

`Client/couple → WedCRM invoice/payment schedule → Stripe Checkout → professional connected Stripe account`

Each professional can either:

- create or set up a Stripe account through Stripe-hosted Connect onboarding; or
- connect an existing Stripe account through OAuth.

WedPlanned must never ask the professional to provide a Stripe secret key and must never persist the professional Stripe credentials.

Workspace payment state stores only the connected Stripe account identity and readiness/status required to operate the integration.

Checkout uses a **direct charge** on the professional connected account.

#### Settlement authority

Browser success or return URLs are not settlement authority.

Only verified Stripe webhook events may settle an invoice.

Settlement validates:

- professional workspace;
- connected Stripe account;
- invoice ownership;
- payment-schedule ownership;
- exact expected amount;
- exact expected currency;
- PaymentIntent deduplication.

The canonical CRM payment ledger remains the financial record after webhook verification.

#### Webhook separation

The WedPlanned connected-payment webhook is separate from the legacy Print Store Stripe webhook.

Connected-payment endpoint:

`/api/webhooks/wedplanned-stripe`

The production destination listens to relevant **Connected accounts** payment and Checkout events.

#### Configuration

Admin connected-payment runtime requires the WedPlanned platform Stripe secret plus Connect client ID and redirect URI.

Public/client-payment runtime requires the WedPlanned platform Stripe secret and the dedicated connected-payment webhook signing secret.

Only configuration names belong in documentation. Secret values must never be committed or pasted into project docs.

#### MKB Weddings production readiness at v1.10.12a release

- connection status: `ready`
- connected account type: `standard`
- country: `GB`
- currency: `GBP`
- details submitted: yes
- charges enabled: yes
- payouts enabled: yes
- WedCRM card payments enabled: yes
- live payment attempts at release: 0
- live Stripe settlement rows at release: 0

The complete Checkout → signed webhook → deduplicated settlement lifecycle was proven in Stripe sandbox before production enablement.

### 3. WedPlanned platform subscriptions — next release

Planned release:

**v1.10.13a — WedPlanned Subscription Billing & Entitlements**

`Professional/business workspace → WedPlanned platform → Stripe Billing subscription`

This is not a connected-account client-payment flow.

The subscription belongs to the **workspace/business**, not an individual professional user.

#### Required abstraction

`Stripe Price → WedPlanned Plan → Entitlements → Workspace access`

Do not hard-code access checks directly to Stripe Price IDs.

The abstraction must support:

- monthly and annual billing;
- trials;
- active subscriptions;
- past-due and grace handling;
- cancellation at period end;
- expired subscriptions;
- complimentary/internal access;
- grandfathered pricing;
- promotional plans;
- future add-ons;
- future plan migrations.

#### Stripe Billing components

Expected components:

- Stripe Customer per workspace;
- Stripe Products and Prices;
- Stripe Checkout with `mode=subscription`;
- Stripe Customer Portal;
- dedicated subscription webhook;
- internal workspace subscription state;
- entitlement resolver.

Do not create live Products or Prices until the internal model and sandbox runtime are proven.

#### Subscription webhook authority

Subscription and access state must be driven by verified Stripe Billing events rather than browser redirects.

Likely event families include:

- Checkout completion;
- subscription creation, update and deletion;
- invoice paid;
- invoice payment failed.

A payment failure should not necessarily remove access immediately.

WedPlanned should resolve explicit states such as:

- trialing;
- active;
- past_due;
- grace;
- cancelled;
- expired;
- complimentary.

## Business ownership

Payments and subscriptions are workspace-owned business capabilities.

- WedNav owns business-wide setup, readiness and subscription administration.
- WedCRM owns client invoice and payment configuration.
- WedStore owns commerce configuration.
- No module should duplicate another module payment settings.
