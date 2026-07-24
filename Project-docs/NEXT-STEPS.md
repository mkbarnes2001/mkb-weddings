# Next Steps

## Current baseline
v1.3.1 refines the Unified Wedding Workspace so missing Venues and Suppliers can be created and linked inline, without leaving the wedding. It also corrects secure private-original status in the Asset Library and adds original-status filtering.

## Immediate validation
1. Create a test wedding and confirm the success action opens the Wedding Workspace.
2. Create one new Venue inline and confirm it is added to Admin → Venues and linked immediately.
3. Create one new Supplier inline and confirm it is added to the Supplier Master Database and linked with the selected role.
4. Verify possible-match suggestions appear for similar existing Venue/Supplier names.
5. Create a linked Client Gallery.
6. Upload 2–5 full-resolution JPEG previews from the Wedding Workspace.
7. Confirm uploads automatically join the Wedding Day Preview Set.
8. Add the Preview Set to the linked Venue plus at least one Moment and one photographer Gallery.
9. Confirm only web derivatives appear publicly; secure originals remain downloadable only through authorized Client Gallery access.
10. Open Asset Library and confirm uploaded originals show `Stored securely`, then test the Private original stored / Preview only filter.
11. Generate and copy the Instagram preview caption and verify supplier handles are normalized correctly.

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
