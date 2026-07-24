# Next Steps

## Current baseline
v1.3.0 adds the Unified Wedding Workspace on top of the proven v1.2 private-original delivery pipeline. A newly created wedding can now move through venue, suppliers, Client Gallery, full-resolution previews, Preview Set publishing and Instagram caption generation from one operational page.

## Immediate validation
1. Create a test wedding and confirm the success action opens the Wedding Workspace.
2. Link a venue and several reusable suppliers.
3. Create a linked Client Gallery.
4. Upload 2–5 full-resolution JPEG previews from the Wedding Workspace.
5. Confirm uploads automatically join the Wedding Day Preview Set.
6. Add the Preview Set to the linked Venue plus at least one Moment and one photographer Gallery.
7. Confirm only web derivatives appear publicly; secure originals remain downloadable only through authorized Client Gallery access.
8. Generate and copy the Instagram preview caption and verify supplier handles are normalized correctly.

## Next engineering sequence
1. Gallery Visitor Identity: optional required email before entry.
2. Linked-client vs guest permissions, including per-email full-resolution entitlement.
3. Client selections / shortlists alongside favourites.
4. Print Store foundation with products, price lists, cart, crop choices, checkout and order management.
5. Professional lab connector interface; pursue Loxley Colour integration first, subject to partner/API access.
6. Lightroom Classic Publish Plugin using the same private-original ingestion API.
7. Begin CRM / Client Portal foundation, including client-entered venue and supplier questionnaires with duplicate-safe supplier review.

## Guardrails
- One photograph = one canonical asset.
- Never duplicate R2 originals merely because an asset appears in multiple galleries.
- Never expose private-original object keys or URLs publicly.
- Public publishing uses safe derivatives only.
- Clients may link/suggest suppliers but may not overwrite shared master supplier records without studio approval.
- Filename is never asset identity.
