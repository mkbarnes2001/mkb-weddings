# Next Steps

## Current baseline
v1.7.14 keeps the completed Stripe/Prodigi sandbox workflow and adds a shared responsive Admin workspace system. Weddings, Venues, Suppliers, Asset Library and the main gallery/workspace inspectors now use responsive master/detail layouts. Schema version remains 22; fulfilment remains manual by default and no paid order is submitted automatically.

## v1.7.14 validation
1. Open Weddings and Venues at normal desktop width and confirm the card/list area and summary panel remain side by side.
2. Resize below 920px and confirm the summary panel becomes part of the normal page flow rather than hovering over the repository.
3. Test Suppliers, Asset Library and Wedding Workspace on a phone-sized viewport and confirm every form/control remains reachable by normal page scrolling.
4. Test Moment Gallery, Venue Gallery, Custom Collections and Creative Flash on tablet/mobile widths and confirm image inspectors no longer obscure the image grid.
5. Confirm page-header actions wrap without clipping and search/filter toolbars remain usable.
6. Recheck Client Gallery Admin and Print Store to confirm their existing responsive layouts are unchanged.

## v1.7.0 validation
1. Apply migration `022_prodigi_fulfilment.sql` and confirm `schema_meta.schema_version` is `22`.
2. Configure the same Prodigi sandbox API key and callback token on the Admin and public Cloudflare Pages projects, initially with `PRODIGI_ENABLED=false`.
3. Redeploy both projects, then set `PRODIGI_ENABLED=true` and redeploy both again.
4. Verify one simple Prodigi photographic-print SKU in Admin → Print Store → Catalogue and confirm recommended pixel dimensions are stored.
5. Create a paid Stripe sandbox order using that option, approve it and refresh its mapping snapshot when necessary.
6. Prepare the line and confirm the generated private JPEG exactly matches the verified dimensions while the canonical original remains unchanged.
7. Request a quote and confirm production plus shipping cost is shown without altering the client order total.
8. Submit the prepared line explicitly and confirm an `ord_...` provider reference is stored.
9. Confirm the Prodigi sandbox dashboard contains one order with the MKB order/item merchant references.
10. Refresh status and exercise a callback; confirm duplicate events are safe and local state is reconciled from Prodigi before changing.
11. Test a cancellation attempt and a retryable failed submission.
12. Keep live fulfilment disabled until one physical sample order has been inspected.


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
1. Complete the v1.7 Prodigi sandbox checklist and one controlled physical sample order; do not enable automatic submission.
2. Build the v1.8 Commercial Platform Foundation: studios/tenants, users, memberships, roles, plan entitlements and a full tenant-isolation audit.
3. Add Stripe Connect hosted onboarding and connected-account webhooks so each future studio receives its own client payments; retain the current single-account flow for MKB Weddings during migration.
4. Add Stripe Billing for photographers' platform subscriptions separately from client-to-studio payments.
5. Build the CRM / Client Portal foundation on the tenant model, reusing `client_identities` and adding enquiries, contacts, jobs, tasks, questionnaires, quotes, contracts and invoices.
6. Add online booking only after CRM, availability, contract and connected-payment ownership are established.
7. Move Lightroom Classic publishing and very-large background jobs after the commercial tenancy/payment foundation.

## Guardrails
- One photograph = one canonical asset.
- Never duplicate or delete R2 originals merely because gallery membership changes.
- Branding accepts validated theme tokens only, never arbitrary CSS/JavaScript.
- Custom logos live in public branding storage; wedding originals remain private.
- Filename is never asset identity.
- Cart and order lines reference canonical `assets.id`; product/order snapshots never create duplicate image files.
- Prices and availability are revalidated server-side before an order is created.
- Payment and lab credentials/events must remain behind provider adapters and must never be exposed in public gallery payloads.
