# Next Steps

## Current baseline
v1.0.1 is the validated workspace-aware canonical Asset Library baseline, with resilient thumbnail/web fallback and responsive admin polish, without replacing the proven MKB public/gallery workflows.

The storage model is now:

Workspace
→ Asset
→ private/public file variants
→ Wedding / Venue / Moment / Gallery relationships

Existing public images are indexed in place; no R2 duplication is introduced.

## Next engineering sequence
1. Build Private Client Gallery foundation around canonical `asset_id`.
2. Add private full-resolution `original` file variant and secure download authorization.
3. Add high-volume direct multipart R2 upload with resumability/background derivative generation.
4. Add client access, favourites, selections, expiry and download controls.
5. Allow client-selected assets to be promoted into public Venue/Moment/Location/Custom Galleries without re-upload.
6. Progressively cut existing gallery managers over to canonical relationship writes only after parity is proven.
7. Begin CRM/client/job foundation after storage/access isolation is proven.

## Guardrails
- Never expose private `original` keys through public APIs.
- Never use filename as asset identity.
- Do not copy existing R2 objects merely to populate the Asset Library.
- Do not bulk-remove compatibility image tables until every consumer has been audited.
- New commercial modules must always be workspace-scoped.
- Existing MKB public URLs and gallery behaviour remain the regression baseline.
