# Next Steps

## Current baseline
v1.6.1 adds Stripe-hosted Checkout to the Print Store. Schema version is 21. The server creates immutable order snapshots and authoritative totals, Stripe collects payment and delivery details, and only a signed Stripe event or server-side Stripe reconciliation can change payment state. Prodigi remains the preferred future lab provider, but no order is sent to a lab in this release.

## v1.6.1 validation
1. Apply migration `021_stripe_checkout.sql` and confirm `schema_meta.schema_version` is `21`.
2. Add Stripe **test-mode** `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` values to the public Cloudflare Pages project.
3. Configure the Stripe webhook endpoint as `https://www.mkbweddings.co.uk/api/webhooks/stripe` with the event types listed in the root `README.md`.
4. Open an enabled private Client Gallery, add a product and select **Pay securely with Stripe**.
5. Complete a test payment and confirm the return page reports payment confirmation rather than trusting the browser redirect alone.
6. Open Admin → Print Store → Orders and confirm the order shows `paid`, Stripe Checkout/Payment Intent references, delivery details and payment-event history.
7. Confirm an unpaid order cannot be approved or fulfilled, and a paid order requiring photographer approval moves to `in_review`.
8. Cancel or allow a test Checkout Session to expire, then confirm the saved order can open a new secure payment attempt.
9. Send a duplicate webhook event and confirm only one provider event ID is recorded.
10. Confirm no Prodigi/lab order is created: fulfilment remains manual and photographer-controlled.


## v1.5.9 validation
1. Open Admin → Venues and select a venue with existing county/region assignments.
2. Confirm current assignments appear as compact chips rather than a long checkbox list.
3. Add a county, region or destination from the grouped dropdown and confirm it saves immediately.
4. Confirm the newly selected location disappears from the dropdown and appears as a chip.
5. Remove a chip and confirm the location becomes available in the dropdown again.
6. Switch between several venues and confirm each venue shows only its own selected locations.

## v1.5.8 validation
1. Check Dashboard, Weddings, Venues, Suppliers, Locations, Gallery Management, Asset Library and Client Galleries at normal desktop width.
2. Confirm page headers use the same compact title/action structure and that action labels remain on one line.
3. Confirm legacy detail/editor pages inherit smaller buttons, inputs, selects, panels and status badges without losing any controls.
4. Test modal/dialog actions, destructive actions and icon-only controls for clear focus, hover and disabled states.
5. Resize the browser below 1050px and confirm the narrower Admin sidebar and content area remain usable.
6. Recheck the Client Gallery Photos toolbar and cards to confirm the global design system has not altered the proven v1.5.7 layout.

## v1.5.7 validation
1. Confirm the Photos toolbar stays on one row at normal desktop widths and no labels collide.
2. Confirm Import, Library, ordering, search, Select all and Upload still work.
3. Confirm long filenames remain one discreet line below each image card and show the full value on hover.
4. Confirm the photo options menu, selection circle and Custom-order drag handle remain usable.
5. Confirm the global Blog / Website header actions are compact and clear.

## v1.5.6 validation
1. Run migration 019 and confirm both ordering tables exist before deployment.
2. Confirm all photo controls stay on one row at normal desktop widths.
3. Test Filename and Capture time ordering in Admin and the client gallery.
4. Switch to Custom, drag images in All Photos and an album, then refresh both Admin and client views.
5. Upload a JPEG with EXIF capture time and confirm it sorts correctly.

## v1.5.5 validation
1. Run migration 018 and confirm `client_gallery_branding` exists before setting schema version 18.
2. Open Client Gallery Admin → Photos and confirm each card has one vertical-options icon while the selection circle remains separate.
3. Test View photo, Download original, Set cover, Show/Hide and Remove from gallery. Confirm removal does not delete the Asset Library asset or private R2 original.
4. Create an album and use an individual photo menu to add one image to it.
5. Open Branding and test Studio logo, Custom logo and No logo.
6. Upload a transparent PNG under 2 MB and confirm the live preview updates.
7. Save each light colour preset and preview the live Client Gallery. Confirm favourites, selections, albums and downloads still work.
8. Reset to studio defaults and confirm the workspace logo/accent return.

## Next engineering sequence
1. Prodigi lab-connector adapter in sandbox mode, with manual photographer approval and manual fulfilment fallback.
2. Photographer crop-review/approval preview, print-resolution validation and per-line lab submission controls.
3. Prodigi status/tracking webhooks, retry/cancel controls and one physical sample order before live client fulfilment.
4. Lightroom Classic Publish Plugin using the same private-original ingestion and canonical asset APIs, then direct selection sync.
5. CRM / Client Portal foundation, reusing `client_identities` for persistent client access and including supplier questionnaires.
6. Large-download/background job service for ZIP64 or very large gallery exports beyond the direct streaming limit.

## Guardrails
- One photograph = one canonical asset.
- Never duplicate or delete R2 originals merely because gallery membership changes.
- Branding accepts validated theme tokens only, never arbitrary CSS/JavaScript.
- Custom logos live in public branding storage; wedding originals remain private.
- Filename is never asset identity.
- Cart and order lines reference canonical `assets.id`; product/order snapshots never create duplicate image files.
- Prices and availability are revalidated server-side before an order is created.
- Payment and lab credentials/events must remain behind provider adapters and must never be exposed in public gallery payloads.
