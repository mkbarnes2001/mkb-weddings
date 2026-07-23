# Next Steps

## Current baseline
v1.1.0 adds workspace-owned Private Client Galleries on top of the validated canonical Asset Library, while leaving the proven MKB public/gallery workflows intact.

The storage model is now:

Workspace
→ Asset
→ private/public file variants
→ Wedding / Venue / Moment / Gallery relationships

Existing public images are indexed in place; no R2 duplication is introduced.

## Next engineering sequence
1. Add high-volume direct/multipart private-original upload into canonical `asset_id` records.
2. Generate controlled web previews/thumbnails in the background without exposing private originals.
3. Add secure original-file download authorization and full-gallery ZIP jobs.
4. Add client selections/shortlists alongside favourites and make them visible in Admin.
5. Allow selected client assets to be promoted into public Venue/Moment/Location/Custom Galleries without re-upload.
6. Progressively cut existing gallery managers over to canonical relationship writes only after parity is proven.
7. Begin CRM/client/job foundation after storage/access isolation and delivery workflows are proven.

## Guardrails
- Never expose private `original` keys through public APIs.
- Never use filename as asset identity.
- Do not copy existing R2 objects merely to populate the Asset Library.
- Do not bulk-remove compatibility image tables until every consumer has been audited.
- New commercial modules must always be workspace-scoped.
- Existing MKB public URLs and gallery behaviour remain the regression baseline.
