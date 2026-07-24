# Next Steps

## Current baseline
v1.2.0 provides workspace-owned canonical assets, private Client Galleries, resumable full-resolution JPEG upload, generated web derivatives, secure individual original downloads, download auditing and a consistent Montserrat Admin design system.

Storage model:

Workspace
→ Canonical Asset
→ Private original in `MKB_PRIVATE_ASSETS`
→ Web/thumbnail derivatives in `MKB_IMAGES`
→ Wedding / Venue / Moment / Gallery relationships
→ Client Gallery access and download policy

## Next engineering sequence
1. Add queued full-gallery ZIP generation with progress, caching and expiry.
2. Add upload-session administration: abandoned-session cleanup, explicit abort and storage usage summaries.
3. Move derivative generation from browser-only processing to a background processing worker for very large deliveries.
4. Add client selections/shortlists alongside favourites and expose them in Admin.
5. Add bulk gallery ordering, section dividers and gallery-level display preferences.
6. Allow client-selected canonical assets to be promoted into Venue/Moment/Location/Custom Galleries without re-upload.
7. Add client email delivery templates and access-event reporting.
8. Begin CRM/client/job foundation once storage isolation and delivery workflows are proven.

## Guardrails
- Never expose private original object keys or public bucket URLs for originals.
- Never treat a web derivative as a full-resolution original.
- Never identify an asset by filename.
- Keep all new storage and delivery records workspace-scoped.
- Existing MKB public assets and URLs remain the regression baseline.
- Full-gallery ZIP delivery must be queued/cached rather than assembled synchronously in a request.
