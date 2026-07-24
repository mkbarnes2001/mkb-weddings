# Next Steps

## Current baseline
v1.5.1 adds verified, persistent client identity and cross-device favourite synchronisation on top of v1.5 selections/shortlists.

## v1.5.1 validation
1. Run migration 016 and verify schema version 16 plus the four new identity/auth tables.
2. Configure the public Cloudflare Pages project with `RESEND_API_KEY` and `CLIENT_AUTH_FROM_EMAIL`.
3. Open a live Client Gallery, enter an email and add several favourites on device/browser A.
4. Use **Sign in** / **Email secure sign-in link**, open the emailed one-time link and confirm the gallery shows **Signed in**.
5. Open the same gallery on device/browser B, request/sign in with the same verified email, and confirm the favourites from device A appear.
6. Remove a favourite on device B, refresh device A, and confirm it is removed there too.
7. Confirm formal draft selections still persist across the verified email identity and submitted selections remain locked until Admin reopens them.
8. Confirm a gallery PIN, when enabled, is still required after magic-link authentication.
9. Confirm Sign out revokes the secure session without deleting favourites or selections.

## Next engineering sequence
1. Print Store foundation: products, sizes, workspace price lists/markup, cart, crop choices, order records and payment-provider boundary.
2. Professional lab connector interface; pursue Loxley Colour first subject to commercial/API access.
3. Lightroom Classic Publish Plugin using the same private-original ingestion and canonical asset APIs, then direct selection sync.
4. CRM / Client Portal foundation, reusing `client_identities` for persistent client access and including supplier questionnaires.
5. Full-gallery ZIP delivery, storage usage reporting and background processing.

## Guardrails
- One photograph = one canonical asset.
- Never duplicate R2 originals because an asset appears in multiple galleries, favourites or selections.
- Never expose private-original object keys or URLs publicly.
- Raw magic-link/session tokens are never stored in D1.
- Email identification is not treated as verified authentication until the one-time link is consumed.
- Gallery PINs remain an independent access layer.
- Filename is never asset identity.
