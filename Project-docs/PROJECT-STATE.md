# Project State

## Version
Current release: **v1.3.1 — Wedding Workspace Quick Create & Asset Original Status**.  
Database schema version: **13**.

## Working production model
- Cloudflare D1 is the structured source of truth.
- Cloudflare R2 stores image objects.
- MKB Weddings is the seeded default workspace: `workspace_mkb_weddings`.
- `/admin/weddings/:slug/content` is the canonical wedding content/story editor.
- Product-facing public visual groupings are called **Galleries**.

## Intelligence vs publishing
Structured intelligence and public gallery presentation remain deliberately separate:

**Intelligence**
- Venues
- Locations
- Moments
- Suppliers

**Publishing / Galleries**
- Venues — default dynamic gallery
- Moments — default dynamic gallery
- Location Gallery — optional dynamic gallery powered by a selected Location Type
- Photographer galleries — Creative Flash plus workspace-created galleries

## Workspace boundary
`workspaces` is the top-level commercial ownership boundary. MKB Weddings remains the default workspace while legacy content tables are phased into tenant-aware architecture safely.

New commercial modules must use workspace ownership from day one.

## Asset Library foundation — v1.0.0
A canonical `assets` registry now sits above the legacy `images` table.

Rules:
- one photograph has one canonical asset identity;
- existing `asset_key` values remain stable compatibility identities;
- filenames are never identity;
- existing R2 objects are not copied or renamed by the migration;
- existing processed `full_src` images are registered as public `web` derivatives, not private originals;
- future full-resolution client originals use `asset_files.variant = 'original'` with private access.

Supporting tables:
- `assets`
- `asset_files`
- `asset_wedding_links`
- `asset_venue_links`
- `asset_moment_links`
- `asset_gallery_links`

Existing gallery managers remain authoritative during the compatibility phase. The new Asset Library reads live Wedding/Venue/Moment/Gallery relationships from the proven existing tables while canonical asset identity is established underneath.

New browser uploads dual-write into the canonical registry. Managed deletion also removes canonical asset records.

## Asset Library polish — v1.0.1
- Asset cards fall back from a missing/broken thumbnail to the web derivative before showing a placeholder.
- The inspector uses the same resilient image fallback behaviour.
- Card labels are cleaned for readability while preserving the full original filename in the tooltip/inspector.
- Filter and inspector layout wraps more cleanly at narrower admin window widths.
- No database migration; schema version remains **10**.


## Client Gallery visual refinement — v1.1.2
- Public client galleries use a cleaner ShootProof-inspired presentation while retaining MKB branding.
- The hero title now uses Montserrat in uppercase with medium weight, wider tracking and centred positioning to match the supplied ShootProof reference more closely.
- Image tiles use compact overlay controls for favourites and the future secure-download action.
- Download icons are deliberately non-functional until private originals and authorised download endpoints are available.
- Relative legacy asset URLs are resolved against the workspace/public website origin before display.
- No database migration; schema version remains **11**.

## Admin Asset Library
`Admin → Asset Library` provides:
- workspace-wide visual asset grid;
- search by filename/alt/caption;
- filters by Wedding, Venue, Moment and Gallery;
- inherited Location visibility;
- current public derivative status;
- private-original readiness status;
- registry sync for legacy records that bypassed canonical writes.

The v1.0.0 Asset Library is deliberately not yet the authoritative assignment editor. Assignment cutover happens progressively after the registry is proven against production MKB data.

## Location model
`Admin → Locations` manages workspace geography/destination intelligence. `location_types` defines available types and whether they may power the public Location Gallery.

MKB remains configured as:
- Source type: County
- Label: Explore by County
- Public base path: `/wedding-photographer`

Venue images inherit Locations through `venue_location_links`; direct asset-level geographic overrides remain deferred.

## Private Client Galleries — v1.1.0
A workspace-owned private delivery layer now sits on top of canonical `assets`.

Adds:
- `client_galleries`
- `client_gallery_assets`
- `client_gallery_favourites`
- Admin → Client Galleries
- secure unguessable share tokens
- optional salted PBKDF2 PIN protection
- expiry/status controls
- wedding-linked automatic asset import
- manual Asset Library additions
- cover/visibility controls
- browser-scoped client favourites
- standalone `/client-gallery/:token` delivery route

Important boundary: legacy MKB website derivatives remain preview-only. New private-original uploads use dedicated private R2 storage and authorized download delivery; legacy public derivatives are never reclassified as originals.

## Immediate next major module
Gallery Visitor Identity & Permissions: optional required-email entry, linked-client identities and per-person full-resolution download entitlements, followed by print-store / lab fulfilment foundations.

## Private Original Upload & Secure Delivery — v1.2.0
The platform now supports full-resolution JPEG originals for Client Galleries without changing the existing 2,329 indexed public assets.

Storage boundary:
- `MKB_PRIVATE_ASSETS`: dedicated private R2 bucket for original JPEGs;
- `MKB_IMAGES`: existing public/controlled R2 bucket for generated WebP previews and thumbnails;
- D1 `asset_files.variant = 'original'`: private storage key only, with no public URL;
- D1 `asset_files.variant = 'web'/'thumb'`: generated derivatives used for gallery display.

Upload workflow:
1. browser decodes the selected JPEG and prepares WebP display/thumbnail derivatives;
2. the original uploads to private R2 in resumable 8 MB multipart chunks;
3. D1 tracks uploaded parts in `asset_upload_sessions`;
4. the multipart original is finalised;
5. generated derivatives are stored in the existing image bucket;
6. the canonical asset is immediately linked to the Client Gallery and linked Wedding where applicable.

Secure delivery:
- downloads require a live, unexpired gallery;
- PIN validation is reused when enabled;
- `allow_downloads` must be enabled;
- the requested asset must be a visible gallery member with an active private original;
- private R2 keys are never returned by the public API;
- the download Function streams the object with attachment/no-store headers;
- each successful delivery is recorded in `asset_download_events`.

Admin typography is now centrally scoped through `src/admin/admin-theme.css`, using Montserrat consistently across navigation, headings, controls, cards, labels and tables. The public MKB site remains unchanged.


## Unified Wedding Workspace — v1.3.0
`Admin → Weddings → Wedding Workspace` is the operational post-wedding centre.

It combines:
- wedding / venue setup;
- reusable supplier assignment;
- linked Client Gallery creation and access;
- private full-resolution preview upload through the v1.2 multipart pipeline;
- reusable `Wedding Day Previews` sets;
- additive publishing of preview assets into Venue, Moment and photographer Gallery destinations;
- editable Instagram preview captions generated from structured venue / supplier Instagram data.

Preview publication never exposes the private original. A canonical private-upload asset is promoted to compatibility/public publishing records using only its web and thumbnail derivatives. The original remains in `MKB_PRIVATE_ASSETS` and continues to require Client Gallery authorization for download.

New tables:
- `wedding_preview_sets`
- `wedding_preview_assets`

New weddings now lead naturally into the Wedding Workspace after creation, while legacy wedding admin routes remain available.


## Wedding Workspace Quick Create — v1.3.1
The Wedding Workspace now supports creating missing Venues and Suppliers without leaving the wedding.

Venue quick-create:
- name, town/city, county/region, country, website and Instagram;
- possible existing venue suggestions are shown before creation;
- newly created Venue records are immediately linked to the Wedding;
- full venue intelligence can still be completed later from Admin → Venues.

Supplier quick-create:
- business name, category, wedding role, website, Instagram and email;
- possible existing Supplier Master records are suggested before creation;
- newly created suppliers are immediately linked to the Wedding with the chosen role;
- Instagram caption generation refreshes from the structured supplier data.

Asset Library private-original status now derives from the active private `asset_files` original storage record rather than requiring a public URL. Private originals therefore display as **Stored securely** while remaining inaccessible by direct public URL. The Asset Library also supports filtering between **Private original stored** and **Preview only** assets.

No D1 migration is required; schema version remains **13**.

## Venue discovery and Wedding Workspace UI — v1.3.2
Wedding setup is now a single-column operational flow. Existing venues are searchable by text, and missing venues can be quick-created inline.

Venue quick-create geography is commercially portable:
- Country uses a searchable global suggestion list but still permits a custom value.
- County / administrative area suggestions are supplied by workspace Location Intelligence.
- An optional Region / Destination can be linked from any active non-county Location record.
- Matching structured Location records receive the new Venue relationship automatically.

An optional `/api/venue-discovery` connector can query Google Places when the admin project has `GOOGLE_PLACES_API_KEY`. The platform's own Venue record remains authoritative; external discovery only assists lookup and prefilling.

Admin action controls now use compact rectangular buttons. Fully rounded pills are reserved for statuses and tags. No D1 migration is required; schema version remains **13**.
