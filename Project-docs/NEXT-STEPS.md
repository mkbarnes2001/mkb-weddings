# Next Steps

## Current baseline
v1.8.0 establishes the WedPlanned commercial foundation while preserving MKB Weddings as the first live business. Schema 23 adds neutral business profiles, users, memberships, professional categories, service areas, feature entitlements and audit events. Admin now includes a WedPlanned workspace for managing the foundation and viewing tenant readiness. External access remains disabled: staged members do not receive sign-in rights, legacy MKB content routes are not yet fully tenant-enforced, and Stripe Connect is not enabled.

## v1.8.0 validation
1. Apply migration `023_wedplanned_platform_foundation.sql` and confirm schema version 23.
2. Run `PRAGMA foreign_key_check;` and confirm no problem rows.
3. Open Admin → WedPlanned and confirm MKB Weddings appears as the first private business.
4. Save the business profile and confirm the existing Workspace Settings identity remains synchronised.
5. Select multiple categories, set Photographer as primary and refresh to confirm persistence.
6. Add and remove a service area.
7. Stage a team member, change their role and confirm the record remains isolated to MKB Weddings.
8. Confirm feature entitlements are visible and the tenant-readiness report accurately marks legacy modules as migration-required.
9. Recheck Client Galleries, Print Store, Stripe test checkout and Prodigi status views to confirm no regression.
10. Do not invite external professionals or publish marketplace profiles until professional authentication and legacy-route tenant enforcement are complete.

## v1.7.16 validation
1. Open Venues and confirm venue names and locations use the smaller hierarchy without clipping.
2. Confirm the selected Venue summary uses smaller visibility/location labels, omits the location-editing instruction and displays Status/value at matching size.
3. Open Weddings and confirm card text is no longer enclosed by a lower-card border treatment.
4. Confirm Wedding summary metadata uses standard Admin typography and Ready/Missing-data plus Draft/Published statuses use matching compact uppercase chips.
5. Confirm Story, Images, Suppliers, Publish, Archive and Delete controls have identical height, padding and icon sizing.
6. Confirm Tags, Alt and Captions labels are smaller while progress values remain readable.

## v1.7.15 validation
1. Open Weddings and confirm long couple names fit the cards, the summary is condensed, the workspace/action buttons align and the completion metrics appear below the actions.
2. Open Venues and confirm long venue names fit, only current location assignments are shown in the summary, public-order text is absent and both actions are centred.
3. Open Suppliers and confirm the list reads as a compact table, summary numbers fit their cards and detail fields use quiet borderless backgrounds.
4. Open Client Galleries and confirm multiple compact cards fit per row, metrics remain legible and action buttons are evenly spaced and centred.
5. Check the left navigation at desktop and mobile widths and confirm the lighter icon treatment remains readable.

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
1. Build **v1.8.1 Professional Identity & Tenant Enforcement**: professional sign-in, invitation acceptance, sessions, membership resolution and server-owned business context.
2. Add `workspace_id` ownership and enforced query scoping to legacy Weddings, Venues, Suppliers, Moments and public collection definitions using controlled migrations and regression tests.
3. Add cross-tenant security tests proving Business A cannot read, mutate, download or publish Business B data.
4. Add support-access controls, explicit audit events, data export and account-deletion foundations.
5. Build **v1.8.2 Stripe Connect & Billing** only after authenticated business ownership is enforced.
6. Add hosted connected-account onboarding and connected-account webhooks so each wedding professional receives their own client payments.
7. Add Stripe Billing for WedPlanned subscriptions separately from couple-to-professional payments.
8. Build the universal CRM and couple/client portal: enquiries, contacts, weddings/jobs, tasks, messages, questionnaires, quotes, contracts and invoices.
9. Add services, packages, availability and online booking after CRM, contract and connected-payment ownership are established.
10. Add the public marketplace, advertising, content creation and collaborative real-wedding publishing after the private business platform is secure.
11. Keep Lightroom Classic publishing and very-large background jobs after the commercial tenancy/payment foundation.

## Guardrails
- One photograph = one canonical asset.
- Never duplicate or delete R2 originals merely because gallery membership changes.
- Branding accepts validated theme tokens only, never arbitrary CSS/JavaScript.
- Custom logos live in public branding storage; wedding originals remain private.
- Filename is never asset identity.
- Cart and order lines reference canonical `assets.id`; product/order snapshots never create duplicate image files.
- Prices and availability are revalidated server-side before an order is created.
- Payment and lab credentials/events must remain behind provider adapters and must never be exposed in public gallery payloads.
