# Next Steps

## Current baseline
v1.3.3 keeps the Unified Wedding Workspace as the operational centre, makes it easier to enter from any existing Wedding, compacts the linked-supplier UI, and adds safe Archive/Permanent Delete record controls without deleting image assets.

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


## v1.3.3 validation
1. Open Admin → Weddings and confirm every Wedding card has a compact **Workspace** action.
2. Open an existing Wedding and confirm the Wedding Control Centre still exposes **Wedding Workspace** prominently.
3. Confirm the Wedding Workspace supplier section displays a compact Role / Supplier / Instagram table.
4. Archive a disposable test Wedding and confirm it remains in the repository under Archived with all assets preserved.
5. Permanently delete a disposable test Wedding by typing `DELETE`; confirm the Wedding disappears while Asset Library items, master Venue and master Suppliers remain.
6. Confirm a Wedding with a **live** Client Gallery cannot be permanently deleted until the gallery is archived.

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

## v1.3.2 validation
1. Search and link an existing venue by typing its name in the Wedding Workspace.
2. Quick-create a new venue using Country and County/administrative-area suggestions.
3. Assign an optional Region / Destination and confirm the venue appears under that Location record.
4. Confirm Supplier setup appears underneath Venue setup and the Role field only appears after selecting a supplier.
5. Check Admin action buttons on Wedding Workspace, Client Galleries, Asset Library and Gallery Management for consistent single-line rectangular presentation.
6. Optional: configure `GOOGLE_PLACES_API_KEY` on the admin Pages project and test external venue-directory lookup. Without the key, manual/internal venue workflows must continue to work normally.
