# Stripe Setup for MKB Intelligence v1.6.1

## Scope note

This document originated with the Print Store / hosted Checkout Stripe integration.

WedCRM connected client payments are a separate Stripe Connect domain documented in `WEDPLANNED-PAYMENTS.md`. The existing Print Store Stripe configuration/webhook boundary must remain isolated from the WedPlanned connected-payment configuration.

WedPlanned platform subscription billing is a third, separate Stripe relationship planned for **v1.10.13a — Subscription Billing & Entitlements**.

Never commit Stripe secret values to this repository or documentation.


Use Stripe test mode until the complete Client Gallery payment flow has been verified. Stripe payment and Prodigi fulfilment remain separate: v1.6.1 records a verified payment but never sends an order to a print lab.

## 1. Apply the database migration

Apply `d1/migrations/021_stripe_checkout.sql` to the same remote D1 database used by the deployed website before deploying v1.6.1.

Read-only verification:

```bash
npx wrangler d1 execute YOUR_DATABASE_NAME --remote --command="SELECT key, value FROM schema_meta WHERE key = 'schema_version';"
```

Expected schema version: `21`.

Do not apply migration 021 repeatedly after it has succeeded.

## 2. Add Stripe test credentials to Cloudflare

In Stripe, switch to **Test mode** and copy the test secret key. It starts with `sk_test_`.

In the Cloudflare Pages project that serves `www.mkbweddings.co.uk`, add these production-environment variables and secrets:

| Name | Type | Initial value |
|---|---|---|
| `STRIPE_SECRET_KEY` | Encrypted secret | Stripe test secret key beginning `sk_test_` |
| `STRIPE_SHIPPING_COUNTRIES` | Plain text | `GB,IE` |
| `STRIPE_CHECKOUT_ENABLED` | Plain text | `true` |
| `PUBLIC_SITE_ORIGIN` | Plain text | `https://www.mkbweddings.co.uk` |

Do not add the secret key to `.env` files committed to Git, frontend source, browser code or GitHub variables visible to the client bundle.

Redeploy the public Pages project after changing environment variables.

## 3. Create the Stripe webhook

In Stripe test mode, create a webhook endpoint with this URL:

```text
https://www.mkbweddings.co.uk/api/webhooks/stripe
```

Subscribe it to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

Reveal and copy the endpoint signing secret. It starts with `whsec_`.

Add it to the same Cloudflare Pages project as an encrypted secret:

| Name | Type | Value |
|---|---|---|
| `STRIPE_WEBHOOK_SECRET` | Encrypted secret | Signing secret beginning `whsec_` |

Redeploy the public Pages project again so the webhook secret becomes available to the function.

The test-mode and live-mode webhook endpoints have different signing secrets. Do not reuse the test signing secret when switching to live mode.

## 4. Build and deploy

From the extracted v1.6.1 project folder:

```bash
npm ci
npm run build
npm run build:admin
```

Commit and push the full source project only after both builds pass. Generated `build`, `build-admin`, `.wrangler`, `node_modules` and environment-secret files must remain untracked.

## 5. Test the complete payment path

1. Open Admin → Print Store and confirm the catalogue and active price list are available.
2. Open an existing Client Gallery and enable its store.
3. Open the private client link, add a print product and select **Pay securely with Stripe**.
4. Complete a Stripe test payment.
5. Return to the Client Gallery and confirm the order reports a verified payment.
6. Open Admin → Print Store → Orders.
7. Confirm the order shows `paid` or `in_review`, a Checkout Session reference, a Payment Intent reference, delivery details and payment-event history.
8. Confirm the order was not submitted to Prodigi or another lab.
9. Test a cancelled or expired Checkout Session and confirm the saved order can start a new payment attempt.
10. Test a refund in Stripe and confirm the Admin order becomes refunded after the signed event arrives.

## 6. Switch to live mode later

Only switch after successful test-mode payments and a deliberate production-readiness review.

1. Activate the Stripe account and complete required business details.
2. Replace `STRIPE_SECRET_KEY` with the live key beginning `sk_live_`.
3. Create a separate live-mode webhook using the same endpoint URL and event list.
4. Replace `STRIPE_WEBHOOK_SECRET` with the live webhook signing secret.
5. Redeploy.
6. Place one low-value real order to an address you control.
7. Confirm payment, delivery details, Admin status and refund handling before enabling payment broadly.

## Operational safeguards

- The browser return page is not proof of payment; only a verified Stripe event or server-side Stripe reconciliation changes payment state.
- Stripe prices are created from the immutable, server-validated MKB order snapshot.
- Unpaid orders cannot be approved or fulfilled.
- Duplicate Stripe event IDs are ignored safely.
- No card details are stored by MKB Intelligence.
- No order is automatically sent to Prodigi in v1.6.1.
