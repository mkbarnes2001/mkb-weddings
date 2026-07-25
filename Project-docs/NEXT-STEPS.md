# Next Steps

## Current baseline
v1.5.4 consolidates Client Gallery management into a dedicated workspace with Photos, Client Activity, Access and Settings. Client Gallery albums/sections now organise canonical assets without duplication and are available to the private client-facing gallery.

## v1.5.4 validation
1. Run migration 017 and confirm `client_gallery_albums` and `client_gallery_album_assets` exist before setting schema version 17.
2. Open a Client Gallery and confirm **Photos** is the default workspace tab with the persistent gallery summary sidebar.
3. Create albums such as Getting Ready / Ceremony, select several thumbnails and add them to an album. Confirm no new Asset Library records are created.
4. Preview the live client gallery and confirm All Photos plus active album filters show the expected photographs.
5. Confirm Client Activity still exposes favourites, bulk original downloads, selection responses and visitor activity.
6. Confirm Access saves email/PIN/download permissions and authorised contacts.
7. Confirm Settings saves title, client, wedding linkage, status and introduction.
8. Confirm Preview and Share work from every workspace tab.

## Next engineering sequence
1. Print Store foundation: products, sizes, workspace price lists/markup, cart, crop choices, order records and payment-provider boundary.
2. Professional lab connector interface; pursue Loxley Colour first subject to commercial/API access.
3. Lightroom Classic Publish Plugin using the same private-original ingestion and canonical asset APIs, then direct selection sync.
4. CRM / Client Portal foundation, reusing `client_identities` for persistent client access and including supplier questionnaires.
5. Large-download/background job service for ZIP64 or very large gallery exports beyond the direct streaming limit.

## Guardrails
- One photograph = one canonical asset.
- Never duplicate R2 originals because an asset appears in multiple galleries, favourites or selections.
- Never expose private-original object keys or URLs publicly.
- Filename is never asset identity.
- Bulk downloads must remain authenticated Admin operations and auditable.
