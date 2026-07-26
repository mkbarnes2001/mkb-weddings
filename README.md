# MKB Intelligence

MKB Weddings public website, Admin workspace, private Client Galleries and Print Store.

## Local setup

```bash
npm ci
npm run dev:website
npm run dev:admin
```

Production builds:

```bash
npm run build
npm run build:admin
```

## v1.6.1 Stripe configuration

Apply `d1/migrations/021_stripe_checkout.sql` before deploying v1.6.1.

Configure these values on the Cloudflare Pages project that serves `www.mkbweddings.co.uk` and its `/api/public` and `/api/webhooks` routes:

- `STRIPE_SECRET_KEY` — start with a Stripe test-mode secret key.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the MKB webhook endpoint.
- `STRIPE_SHIPPING_COUNTRIES` — optional comma-separated ISO country codes; defaults to `GB,IE`.
- `STRIPE_CHECKOUT_ENABLED` — optional; set `false` to disable Checkout without removing credentials.
- `PUBLIC_SITE_ORIGIN` — recommended production value: `https://www.mkbweddings.co.uk`.

Stripe webhook endpoint:

```text
https://www.mkbweddings.co.uk/api/webhooks/stripe
```

Subscribe that endpoint to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

Use test-mode keys and a test-mode webhook first. v1.6.1 records verified payments and delivery details but does not submit an order to Prodigi or any other lab.

Detailed deployment and test instructions: `Project-docs/STRIPE-SETUP.md`.

## Project handover

Read `Project-docs/PROJECT-STATE.md` and `Project-docs/NEXT-STEPS.md` before starting the next phase.
