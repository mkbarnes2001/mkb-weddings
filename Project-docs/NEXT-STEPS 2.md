# Next Steps

## Current baseline
v1.6.0 adds the Print Store foundation across Admin and private Client Galleries. Schema version is 20. Payment capture and professional-lab submission are intentionally provider-neutral boundaries rather than live integrations in this release.

## v1.6.0 validation
1. Apply migration `020_print_store_foundation.sql` and confirm `schema_meta.schema_version` is `20`.
2. Open Admin → Print Store and create the starter catalogue, then edit products, variants, retail prices and studio costs.
3. Open a Client Gallery → Print Store, select an active price list, enable ordering and save the gallery settings.
4. Open the private client gallery, add a photograph/product option, change quantity and crop coordinates, then refresh and confirm the cart persists for the same visitor or verified identity.
5. Submit an order and confirm it appears in Admin → Print Store → Orders with canonical filename, product snapshot, total, crop data and client notes.
6. Change the order status, payment reference, lab connector/reference and internal notes; refresh and confirm the update persists.
7. Confirm no card is charged and no lab order is submitted: v1.6.0 records the workflow boundary only.


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
1. Payment-provider adapter and hosted checkout/webhook flow, keeping provider event IDs idempotent and order totals server-authoritative.
2. Professional lab connector interface with manual fulfilment fallback; pursue Loxley Colour first subject to commercial/API access.
3. Photographer crop-review/approval preview and per-line fulfilment submission controls.
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
