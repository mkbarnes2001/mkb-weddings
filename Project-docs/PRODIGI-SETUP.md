# Prodigi Sandbox Setup — v1.7.0

This release adds photographer-controlled Prodigi fulfilment. A paid order is never sent automatically. Admin must verify the product mapping, approve the order, prepare the exact-size JPEG and explicitly submit the selected line(s).

## 1. Deploy prerequisites

1. Apply `d1/migrations/022_prodigi_fulfilment.sql` and confirm `schema_meta.schema_version` is `22`.
2. Run both production builds:

```bash
npm run build
npm run build:admin
```

3. Confirm both Cloudflare Pages projects retain the existing `MKB_DB` D1 binding and `MKB_PRIVATE_ASSETS` private R2 binding.
4. Deploy the source with Prodigi disabled first.

## 2. Prodigi sandbox account

Use the Prodigi sandbox API, not live fulfilment, for the first rollout.

- Sandbox API base: `https://api.sandbox.prodigi.com`
- Live API base: `https://api.prodigi.com`
- API authentication: `X-API-Key`

Obtain the sandbox API key from the Prodigi dashboard. Never store it in source control, a public `.env` file or browser code.

## 3. Generate the callback token

On the Mac terminal, generate a random token:

```bash
openssl rand -hex 32
```

The result is a 64-character secret. Keep it private. The same value must be configured on the Admin and public Pages projects.

## 4. Cloudflare variables

### Admin Pages project

Add these Production variables/secrets to the project serving `admin.mkbweddings.co.uk`:

```text
PRODIGI_API_KEY=<sandbox API key>          Secret
PRODIGI_ENVIRONMENT=sandbox               Plain text
PRODIGI_ENABLED=false                     Plain text
PRODIGI_LIVE_SUBMISSION_ENABLED=false     Plain text
PRODIGI_CALLBACK_TOKEN=<random token>      Secret
PUBLIC_SITE_ORIGIN=https://www.mkbweddings.co.uk
```

The Admin project needs these values for product verification, quotes and manual order submission.

### Public Pages project

Add these Production variables/secrets to the project serving `www.mkbweddings.co.uk`:

```text
PRODIGI_API_KEY=<same sandbox API key>     Secret
PRODIGI_ENVIRONMENT=sandbox               Plain text
PRODIGI_ENABLED=false                     Plain text
PRODIGI_LIVE_SUBMISSION_ENABLED=false     Plain text
PRODIGI_CALLBACK_TOKEN=<same random token> Secret
PUBLIC_SITE_ORIGIN=https://www.mkbweddings.co.uk
```

The public project receives Prodigi callbacks and serves short-lived tokenised print-ready assets from private R2.

Redeploy both projects after adding or changing variables.

## 5. Enable the sandbox connector

After both disabled deployments succeed, change this variable on both projects:

```text
PRODIGI_ENABLED=true
```

Redeploy both projects again.

Do not set `PRODIGI_ENVIRONMENT=live` during initial testing.

## 6. Map one simple print product

In Admin → Print Store → Catalogue:

1. Open one simple photographic print product.
2. Save it first so each option has an MKB variant ID.
3. Enter the exact Prodigi SKU for one size.
4. Enter required attributes as comma-separated `key=value` pairs. Leave blank when the SKU has no selectable attributes.
5. Keep `Print area` as `default` for a single-image print unless Prodigi documents another area.
6. Choose the sizing rule. `fillPrintArea` is the normal photographic-print choice.
7. Select **Verify with Prodigi**.
8. Confirm the recommended pixel dimensions appear and the mapping status becomes `verified`.
9. Save the product.

Verification calls Prodigi's Product Details endpoint and stores an exact SKU/attribute/print-area snapshot plus its recommended pixel dimensions.

## 7. Create or use a paid test order

Use a private Client Gallery that only you control.

1. Enable its Print Store and select an active price list.
2. Place a Stripe sandbox order using a mapped print size.
3. Confirm the order is marked paid by the verified Stripe webhook.
4. Open Admin → Print Store → Orders.
5. Select the test order.
6. If the order predates the mapping, select **Refresh mappings** before preparing a file.
7. Change the order status to `approved` and select **Save order**.

Unpaid orders cannot be approved or submitted.

## 8. Prepare the print-ready JPEG

For each line:

1. Review the thumbnail and stored client crop.
2. Select **Prepare JPEG**.
3. The Admin browser securely downloads the private original, applies the non-destructive crop/rotation and renders a JPEG at Prodigi's exact recommended dimensions.
4. The prepared JPEG is uploaded to `MKB_PRIVATE_ASSETS` under a separate managed key.
5. Confirm the line shows `Print-ready`, dimensions and file size.

The canonical original is never modified or duplicated into the public gallery. Prepared files use random, expiring access tokens and are served with `private, no-store` headers.

## 9. Quote and submit

1. Choose a shipping method.
2. Select **Quote line** or **Quote mapped lines**.
3. Review the returned production-and-shipping estimate. It does not alter the client's already-paid price.
4. Select **Submit line** or **Submit prepared lines**.
5. Confirm the warning dialog.
6. Confirm an `ord_...` Prodigi reference appears.

The create-order request includes:

- the paid order's delivery address;
- immutable order-line SKU, attributes and quantity;
- one tokenised print-ready asset URL per print area;
- an idempotency key;
- a per-order callback URL;
- the MKB order/item IDs as merchant references.

Sandbox orders are not charged and are not physically fulfilled.

## 10. Status, tracking and cancellation

- Select **Refresh lab status** to reconcile directly with Prodigi.
- Prodigi callbacks also trigger a direct API reconciliation before MKB changes status.
- Shipment carrier, dispatch date, tracking number and tracking link appear when Prodigi returns them.
- **Attempt cancellation** calls Prodigi's cancellation action. Cancellation is not guaranteed after production begins.
- Failed submissions retain their idempotency key so a retry does not intentionally create a second order after an ambiguous network failure.

Callback endpoint used automatically per order:

```text
https://www.mkbweddings.co.uk/api/webhooks/prodigi?token=<PRODIGI_CALLBACK_TOKEN>
```

Prodigi's callback documentation does not define a webhook-signature header. MKB therefore requires the random callback token, checks the CloudEvent source/id/type and then retrieves the current order from Prodigi before changing local fulfilment state.

## 11. Before live fulfilment

Do not switch to live fulfilment until all of the following are complete:

1. Verify several real Prodigi SKUs and destination availability.
2. Test crop-sensitive landscape, portrait and square products.
3. Test a failed mapping and failed asset download.
4. Test cancellation while it is still available.
5. Confirm callbacks and manual reconciliation agree.
6. Configure a suitable Prodigi order pause window for photographer review.
7. Submit one live sample order to yourself.
8. Inspect colour, crop, packaging, branding, delivery time and tracking.
9. Replace the sandbox API key with the live key on both projects.
10. Change `PRODIGI_ENVIRONMENT=live` while keeping `PRODIGI_LIVE_SUBMISSION_ENABLED=false`, then redeploy and verify quotes/status access.
11. Set `PRODIGI_LIVE_SUBMISSION_ENABLED=true` on the Admin project only after the physical sample is approved, redeploy, and enable only selected products/galleries initially.

Manual fulfilment remains a supported fallback. Disabling `PRODIGI_ENABLED` stops new API actions without removing orders, mappings or history.
