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

### v1.10.13a Gate 2C2 — billing read and permission boundary

WedPlanned subscription administration now has dedicated workspace permissions before Stripe Billing runtime is enabled:

- owner/admin: `billing:read` and `billing:manage`;
- finance: `billing:read`;
- manager/content/staff/viewer: no subscription-billing permission;
- support access: no subscription-billing permission, including manage-scoped support grants.

The GET-only `/api/platform-billing` endpoint resolves the authenticated workspace server-side and returns only internal Plan/subscription/access state, a non-sensitive internal Price summary when present, and whether a platform Stripe Customer identity has been configured. Stripe Customer, Price and Subscription identifiers are not returned to the browser.

This gate is deliberately read-only. No Checkout, Customer Portal, Stripe API call, webhook, provider event ledger or subscription mutation exists yet. The WedPlanned platform-subscription boundary remains separate from WedCRM connected-account client payments and from the Print Store payment flow. Schema remains 52.

### v1.10.13a Gate 2C3 — WedNav Plan & Billing read-only UI

WedNav includes a permission-scoped `Plan & billing` destination that reads `/api/platform-billing`. Owners/admins and finance users can view current internal Plan, subscription status, billing interval, period/trial/grace dates, cancellation state, access state, price summary and whether a platform Stripe Customer identity is configured.

The UI is deliberately read-only. No `billing:manage` action, Stripe Checkout, Customer Portal, plan-change control or provider identifier is exposed in this gate. WedCRM Payment Setup remains exclusively responsible for professional connected-account client payments. Schema remains 52.

### v1.10.13a Gate 2D1 — subscription billing write ledger foundation

Schema 53 establishes the write-side operational ledgers before any Stripe Billing API is enabled:

- `workspace_subscription_checkout_attempts` records a server-approved workspace subscription Checkout intention and immutable internal Price snapshot.
- `subscription_provider_events` is the separate Stripe Billing event deduplication/audit boundary for events that a later webhook route has already signature-verified.

The new service boundary is `serverless/platform-subscription-billing-write-d1.ts`. It performs D1-only state preparation and event recording. Gate 2D1 has no subscription Checkout endpoint, no Customer Portal endpoint, no subscription webhook route and no Stripe network call. It does not reuse `crm_invoice_payment_attempts`, `crm_invoice_payments`, `workspace_payment_settings` or `commerce_payment_events`.

Raw Stripe webhook payloads, cards and payment-method details are not persisted. Only provider identifiers required for verified lifecycle reconciliation plus a SHA-256 payload hash may enter the subscription event ledger.

Checkout-attempt state is never subscription authority. Browser redirects remain presentation-only; later verified Stripe Billing events must be the authority for `workspace_subscriptions` lifecycle changes and entitlement/access resolution.

### v1.10.13a Gate 2D2 — platform Stripe Customer + subscription Checkout foundation

WedPlanned platform-subscription Checkout now has a dedicated Stripe Billing service and POST boundary, still separate from professional connected-account payments.

`Authenticated billing manager → internal WedPlanned Plan Price → workspace_subscription_checkout_attempts → WedPlanned platform Stripe Customer → Stripe Checkout (mode=subscription)`

The browser may provide only the internal Plan Price ID. The server resolves the Stripe Product/Price mapping and authenticated workspace, rejects unavailable/private Prices and prevents a second Checkout when the workspace already has a current Stripe subscription in `trialing`, `active` or `past_due` state.

A Stripe Customer is owned one-to-one by the workspace and created idempotently only when `workspace_billing_customers` has no provider Customer ID. Only the Customer identifier and non-sensitive sync metadata are persisted; no card or payment-method data is stored.

Checkout uses the WedPlanned platform Stripe account directly and never sends `Stripe-Account`. Session and resulting Subscription metadata carry the internal workspace, Checkout-attempt, Plan and Plan-Price references needed for later verified webhook reconciliation. The browser receives only the internal attempt ID, hosted Checkout URL and expiry.

Gate 2D2 remains deliberately non-authoritative for subscription state. Success/cancel redirects do not activate a Plan, `workspace_subscriptions` is not mutated, and no subscription webhook or Customer Portal exists yet. The dedicated live-enable latch remains off by default, so local/mock and Stripe test mode must be proven before any live billing configuration is allowed. Schema remains 53.

### v1.10.13a Gate 2D2D — subscription Checkout retry hardening

Repeated requests for the same active workspace, internal Plan Price and requesting professional reuse the existing `created`/`open` `workspace_subscription_checkout_attempts` row. The Stripe Checkout call therefore reuses the same server-owned idempotency key. If the attempt is already `open`, Stripe must return the same Checkout Session ID; the service returns that hosted Session without rebinding the D1 row or creating another attempt. A mismatched provider Session is rejected.

An already-open attempt is not marked failed merely because a later browser retry experiences a transient Stripe request error. Customer reuse remains workspace-owned, browser returns remain non-authoritative, and no subscription access/lifecycle state is changed by this retry path. Schema remains 53.

### v1.10.13a Gate 2D4 — verified platform-subscription webhook authority

The dedicated WedPlanned subscription webhook is `/api/webhooks/wedplanned-billing`. It is not the existing `/api/webhooks/wedplanned-stripe` connected-account invoice-payment webhook and does not use the Print Store webhook secret. Subscription webhook verification uses `WEDPLANNED_BILLING_STRIPE_WEBHOOK_SECRET` and exact raw-body `Stripe-Signature` verification before the event reaches `serverless/platform-subscription-billing-webhook-d1.ts`.

Supported verified events are `checkout.session.completed`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid` and `invoice.payment_failed`. Checkout events reconcile the operational attempt only. `customer.subscription.*` events are the authority that may replace the compatibility assignment with the Stripe-backed WedPlanned Plan after Customer/workspace ownership, internal Plan Price mapping, provider Price identity and Checkout metadata have been validated.

Every verified event is deduplicated through `subscription_provider_events`. Only routing identifiers, processing state and the SHA-256 hash of the exact verified payload are persisted; raw webhook JSON, card details and payment-method data are not stored. Failed processing can be retried under the same Stripe event ID, while processed/ignored duplicates are no-ops. Stale provider events are ignored so older delivery order cannot regress a newer subscription state.

Real Stripe test-mode delivery confirmed that `invoice.paid` can arrive before `customer.subscription.created`. A verified invoice for a known WedPlanned Customer whose Stripe Subscription row is not available yet is therefore treated as transient (`invoice_subscription_pending`) rather than permanently ignored. The webhook returns a retryable non-2xx response, records the event as failed, and the subsequent verified subscription event reconciles any such pending invoice events from the provider-event ledger without storing raw webhook JSON. `customer.subscription.created` alone does not make an earlier deferred invoice stale; later subscription updates/deletion or newer invoice events still retain ordering protection.

Payment failure does not immediately remove access. `invoice.payment_failed` moves an eligible Stripe subscription to `past_due` and establishes the existing grace deadline or a configurable new deadline using `WEDPLANNED_BILLING_GRACE_DAYS` (seven days by default). Further failures do not roll the deadline forward. `invoice.paid` clears the failure/grace state for an eligible subscription. Connected-account Stripe events are ignored by this platform-subscription webhook.

Schema remains 53. No Customer Portal, live subscription billing configuration, connected-client-payment mutation or Print Store payment mutation is introduced by Gate 2D4.
