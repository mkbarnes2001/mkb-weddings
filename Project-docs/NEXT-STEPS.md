# Next Steps

## Current baseline
v1.0.0 establishes the workspace-aware canonical Asset Library without replacing the proven MKB public/gallery workflows.

The storage model is now:

Workspace
→ Asset
→ private/public file variants
→ Wedding / Venue / Moment / Gallery relationships

Existing public images are indexed in place; no R2 duplication is introduced.

## Next engineering sequence
1. Verify migration 010 counts against production `images`, `wedding_images` and `venue_images`.
2. Verify Admin → Asset Library filters and relationship inspector against real MKB data.
3. Build Private Client Gallery foundation around canonical `asset_id`.
4. Add private full-resolution `original` file variant and secure download authorization.
5. Add high-volume direct multipart R2 upload with resumability/background derivative generation.
6. Add client access, favourites, selections, expiry and download controls.
7. Allow client-selected assets to be promoted into public Venue/Moment/Location/Custom Galleries without re-upload.
8. Progressively cut existing gallery managers over to canonical relationship writes only after parity is proven.
9. Begin CRM/client/job foundation after storage/access isolation is proven.

## Guardrails
- Never expose private `original` keys through public APIs.
- Never use filename as asset identity.
- Do not copy existing R2 objects merely to populate the Asset Library.
- Do not bulk-remove compatibility image tables until every consumer has been audited.
- New commercial modules must always be workspace-scoped.
- Existing MKB public URLs and gallery behaviour remain the regression baseline.
