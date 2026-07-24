# Next Steps

## Current baseline
v1.5.2 adds thumbnail review plus secure individual and bulk full-resolution downloads for Client Gallery favourites and formal selections. Persistent verified client identity remains the basis for cross-device favourites.

## v1.5.2 validation
1. Open a Client Gallery with existing favourites and click **View favourites**.
2. Confirm thumbnails, filenames and full-resolution availability are shown.
3. Switch between **All favourites** and individual client/visitor groups.
4. Confirm the combined view deduplicates the same photograph favourited by multiple people.
5. Download one full-resolution original and verify the original filename and image dimensions.
6. Click **Download all originals**, extract the ZIP and confirm the files can be imported directly into album design software.
7. Open a formal client selection and confirm **View selection thumbnails** and **Download all selection originals** work.
8. Confirm private R2 object keys are never exposed in the browser UI.

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
