# Next Steps

## Current baseline
v1.5.3 separates Client Gallery setup/access from operational Selections & Favourites work, while retaining v1.5.2 thumbnail review and secure full-resolution download tools. Persistent verified client identity remains the basis for cross-device favourites.

## v1.5.3 validation
1. Open any Client Gallery in Admin and confirm the default **Gallery & access** tab contains settings, uploads, images, contacts and visitors but no long favourites/selections blocks.
2. Open **Selections & favourites** and confirm favourite totals and thumbnail/download actions are present.
3. Confirm selection requests can still be created, archived and reviewed from this tab.
4. Confirm client responses still expose thumbnail review, bulk-original download, filename copy, CSV export and Reopen where applicable.
5. Switch between tabs and confirm unsaved Gallery settings remain in place until Save is clicked.
6. Confirm schema version remains 16.


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
