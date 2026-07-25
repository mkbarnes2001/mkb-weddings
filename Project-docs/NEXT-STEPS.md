# Next Steps

## Current baseline
v1.5.5 completes the Client Gallery workspace consolidation with compact photo action menus and per-gallery client-facing branding. Schema version is 18.

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
1. Print Store foundation: products, sizes, workspace price lists/markup, cart, crop choices, order records and payment-provider boundary.
2. Professional lab connector interface; pursue Loxley Colour first subject to commercial/API access.
3. Lightroom Classic Publish Plugin using the same private-original ingestion and canonical asset APIs, then direct selection sync.
4. CRM / Client Portal foundation, reusing `client_identities` for persistent client access and including supplier questionnaires.
5. Large-download/background job service for ZIP64 or very large gallery exports beyond the direct streaming limit.

## Guardrails
- One photograph = one canonical asset.
- Never duplicate or delete R2 originals merely because gallery membership changes.
- Branding accepts validated theme tokens only, never arbitrary CSS/JavaScript.
- Custom logos live in public branding storage; wedding originals remain private.
- Filename is never asset identity.
