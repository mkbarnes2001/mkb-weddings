# Next Steps

## Current baseline
v1.5.0 adds identified client selections/shortlists on top of the working private-original, visitor identity, favourites and download-permission stack.

## v1.5.0 validation
1. Run migration 015 and verify schema version 15 plus the three new selection tables.
2. Open a Client Gallery in Admin and create an `Album Selection` request.
3. Set an optional maximum (for example 30 images), save, and open the live private gallery.
4. Select several photographs with the check control; refresh/reopen and confirm the draft persists.
5. Submit the selection and confirm the public selection locks.
6. Return to Admin and confirm the response shows the client email, selected count and filenames.
7. Test Copy filenames and Download CSV.
8. Reopen the submitted selection from Admin and confirm the client can edit/submit again.
9. Confirm favourites still work independently from formal selections.

## Next engineering sequence
1. Print Store foundation: products, sizes, workspace price lists/markup, cart, crop choices, order records and payment-provider boundary.
2. Professional lab connector interface; pursue Loxley Colour first subject to commercial/API access.
3. Lightroom Classic Publish Plugin using the same private-original ingestion and canonical asset APIs, then direct selection sync.
4. CRM / Client Portal foundation, including client-entered venue/supplier questionnaires with duplicate-safe supplier review.
5. Full-gallery ZIP delivery, storage usage reporting and background processing.

## Guardrails
- One photograph = one canonical asset.
- Never duplicate R2 originals because an asset appears in multiple galleries or selections.
- Never expose private-original object keys or URLs publicly.
- Public publishing uses safe derivatives only.
- Filename is never asset identity.
- Client selections reference canonical asset IDs and must remain distinct from casual favourites.
- Clients may link/suggest suppliers but may not overwrite shared master supplier records without studio approval.
