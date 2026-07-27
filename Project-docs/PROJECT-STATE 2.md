# Project State

## Version
Current release: **v1.6.0 — Print Store Foundation**.
Database schema version: **20**.



## Print Store Foundation — v1.6.0
- Adds a workspace-owned Print Store catalogue with products, variants, sizes, finishes, crop requirements and provider-neutral lab mapping fields.
- Adds workspace price lists with retail price, studio cost, gross markup, active/default state and currency handling.
- Adds a dedicated Admin Print Store workspace for catalogue, pricing and order review.
- Adds per-Client-Gallery Print Store settings: enable/disable, price list, minimum order, crop permission, photographer approval and client-facing introduction.
- Adds a private client cart using canonical `assets.id`, stored non-destructive crop coordinates and quantity controls.
- Adds immutable order-line snapshots for product, sell price, studio cost, crop and lab mapping, plus order status workflow and payment references/events.
- The foundation deliberately records orders without charging cards or submitting to a lab. Payment and lab providers remain replaceable adapters for later releases.
- Adds migration `020_print_store_foundation.sql`; schema advances to **20**.


## Compact Venue Location Selector — v1.5.9
- Replaces the long Venue Management location checkbox lists with one compact grouped dropdown.
- The dropdown is grouped by configured Location Intelligence type, including county, region, destination and custom areas.
- Already assigned locations are removed from the available dropdown choices.
- Current assignments appear underneath as small removable chips showing both location name and type.
- Adding or removing a location continues to save through the existing Location Intelligence API; no data model or route changes are introduced.
- No D1 migration; schema remains **19**.

## Global Admin UI System & Visual Refresh — v1.5.8
- Introduces shared Admin UI primitives for page headers, panels, toolbars, actions, icon buttons, tabs, status badges, fields and empty states.
- Establishes one compact design token system for spacing, radii, control heights, typography, borders and shadows.
- Refines the global Admin shell with a narrower sidebar, smaller navigation, compact top bar and consistent content width.
- Applies the Client Gallery compact-control language across legacy Admin buttons, inputs, selects, textareas, tables, cards, modals and status indicators without changing routes or workflows.
- Converts the main Dashboard, Weddings, Venues, Suppliers, Locations, Gallery Management, Asset Library, Client Galleries, AI Centre, SEO Centre, Settings and Publishing headers to the shared compact page-header structure.
- Remaining detail/edit pages inherit the same global controls and compact legacy-header treatment automatically.
- This is a presentation-only release: no D1 migration, API change, route change or data change. Schema remains **19**.


## Client Gallery Compact Controls — v1.5.7
- The Photos toolbar uses a fixed compact control system: 32px height, 10px labels and one-row grid alignment.
- Import, Asset Library, ordering, search, selection and upload remain visible without colliding or wrapping at normal desktop widths.
- Photo cards now contain only the image and overlay controls; filenames sit below the card as discreet, centred, single-line text with ellipsis truncation.
- Photo options and custom-order drag handles remain available as image overlays.
- Global Admin Blog / Website actions are smaller rounded rectangles with icons rather than oversized pill buttons.
- No D1 migration; schema version remains **19**.

## Client Gallery Card & Photo Ordering Refinement — v1.5.6
- Photo cards now use a ShootProof-style compact footer: discreet filename, selection circle, drag handle and one options menu.
- Removed persistent “Preview only” / “Original stored” labels from cards; original availability remains visible in the photo menu and download actions.
- Photos can be ordered by **Custom**, **Capture time**, or **Filename**.
- Custom order supports drag-and-drop in All Photos and individual albums.
- Client-facing album order respects the album-specific custom sequence.
- `client_gallery_display_settings` stores the gallery sort mode.
- `asset_capture_metadata` stores EXIF/file timestamp metadata without changing canonical asset identity. Existing assets receive a deterministic created-at fallback.
- Photo import, Asset Library, ordering, search, selection and upload controls now share one compact toolbar row.

## Client Gallery Workspace — v1.5.4
Client Gallery administration is now an operational workspace rather than one long editor form.

Workspace structure:
- persistent gallery summary sidebar with cover, status, client, photo/original counts, wedding date and last visit;
- **Photos** (default) for image operations, upload/import and gallery albums;
- **Client Activity** for favourites, selections and visitor activity;
- **Access** for email/PIN/download permissions and authorised contacts;
- **Settings** for gallery identity, wedding linkage, status and introduction;
- prominent Preview and Share actions remain available across the workspace.

Gallery albums/sections:
- `client_gallery_albums` stores named gallery sections;
- `client_gallery_album_assets` references canonical `assets.id`; images are never duplicated;
- **All Photos** remains a virtual complete view;
- an asset may belong to multiple albums;
- active albums are exposed to the private client gallery as filter/navigation sections.

The Photos workspace uses compact thumbnail selection controls and contextual album actions to reduce persistent button clutter. Advanced access/security options are grouped away from routine photo management. Schema version advances to **17**.


## Wedding management refinement — v1.3.3
- Wedding cards now expose a direct **Workspace** action so existing weddings can enter the unified operational workflow without remembering the route.
- Wedding list/detail views provide **Archive** and guarded **Permanent delete** actions.
- Permanent deletion is relationship-safe: canonical assets, private originals, master venues, master suppliers and non-live Client Galleries are preserved.
- A live Client Gallery blocks permanent deletion until that gallery is archived.
- Wedding Workspace supplier assignments use a compact table (Role / Supplier / Instagram / Remove) instead of large stacked cards.
- No D1 migration; schema version remains **13**.


## Client Selections & Shortlists — v1.5.0
Client Galleries now support photographer-created named selection requests such as Album Selection, Parent Album, Thank-you Cards or Print Favourites.

Rules:
- selections reference canonical `assets.id`; no image files are duplicated;
- clients can save progress, return later with the same visitor identity/email, and submit when ready;
- optional minimum/maximum image counts are enforced on submit;
- submitted selections are locked until the photographer reopens them;
- Admin can review responses, copy filenames and export CSV for Lightroom/manual workflows;
- selections remain separate from lightweight favourites so both workflows can coexist.

New tables:
- `client_gallery_selection_requests`
- `client_gallery_selections`
- `client_gallery_selection_assets`



## Client Gallery Admin Tabs — v1.5.3
Client Gallery administration is now split into two focused working areas:

- **Gallery & access** — gallery settings, privacy/access controls, authorised client emails, recent visitors, full-resolution uploads, Asset Library import and image management.
- **Selections & favourites** — favourite thumbnail review/downloads, formal selection requests, client responses, filename/CSV export, reopen controls and bulk private-original downloads.

The change is presentation-only: all existing favourite, selection, identity and secure-download data models remain unchanged. No D1 migration; schema version remains **16**.

## Favourite Review & Full-Resolution Download — v1.5.2
Client Gallery Admin now includes an operational review/download workflow for favourites and formal selections.

Rules:
- favourites are shown as a thumbnail grid with original filenames;
- Admin can download each secure private original individually;
- Admin can download all available originals as a streamed ZIP without exposing private R2 keys or URLs;
- the combined favourites view deduplicates photographs favourited by more than one person;
- per-person favourite views remain available for album/client workflows;
- submitted/draft selections use the same thumbnail review and bulk-original download path;
- filename copy and CSV export remain available;
- bulk ZIP downloads are audited through `asset_download_events` with delivery `zip`;
- no D1 migration; schema version remains **16**.

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

## Gallery Visitor Identity & Permissions — v1.4.0
Client Galleries now support an optional email-identification gate before viewing. Visitor identity is persisted per gallery/browser and feeds favourites, download permissions and visitor activity.

Access rules:
- `allow_downloads` remains the gallery-wide master switch.
- `require_email` is stored in `client_gallery_access_settings` and can be enabled per gallery.
- authorised emails live in `client_gallery_contacts`; each contact can independently receive full-resolution download rights.
- guests may view/favourite but cannot download originals unless `allow_guest_downloads` is explicitly enabled.
- the existing `client_email` is automatically maintained as a `primary_client` authorised contact.
- identified visits are recorded in `client_gallery_visitors`; no raw IP address is stored.

Wedding admin refinements in the same release:
- Wedding cards use an icon-only Workspace shortcut.
- Wedding Workspace Venue and Supplier management are visually separated into distinct panels.

Schema version advances to **14**.


## Persistent Client Identity & Magic-Link Sign-In — v1.5.1
Client Galleries now support optional secure email sign-in in addition to the existing email-identification and PIN flow.

A verified client identity is workspace-owned and persists across browsers/devices through a secure, HttpOnly session cookie. One-time email links expire after 15 minutes and are stored only as SHA-256 token hashes; raw magic-link/session tokens are never stored in D1.

When a verified identity opens a gallery, existing browser visitor records for the same verified email in that gallery are linked to the identity. Favourite membership is then resolved across all linked visitor keys, so clients can add/remove favourites on one device and see the same state on another. Formal v1.5 selections continue to resolve by identified email and therefore follow the same verified identity.

The current email delivery adapter is provider-boundary based with Resend as the first implementation. The public Pages project requires `RESEND_API_KEY` and `CLIENT_AUTH_FROM_EMAIL`; `CLIENT_AUTH_FROM_NAME` and `CLIENT_AUTH_EMAIL_PROVIDER` are optional. Gallery PINs remain independent and are never bypassed by email authentication.

New tables:
- `client_identities`
- `client_identity_gallery_visitors`
- `client_identity_magic_links`
- `client_identity_sessions`

Schema version advances to **16**.

## Client Gallery Photo Menus & Branding — v1.5.5
Client Gallery Admin photo cards now use one compact vertical-options icon instead of permanently displaying multiple action buttons. The menu provides preview, secure original download, cover selection, show/hide, album assignment and safe removal from the Client Gallery. Removing a photo preserves the canonical Asset Library record and all R2 objects.

A dedicated **Branding** workspace tab now controls the client-facing private gallery presentation. Each gallery can use the workspace logo, upload a gallery-specific logo, or hide the logo. Safe theme tokens control accent, background, surface and text colours plus a limited heading-font choice. Arbitrary CSS is not accepted. A live preview and reset-to-studio-defaults action are included.

Custom logos are stored in public `MKB_IMAGES` R2 under managed branding keys. Private wedding originals remain isolated in `MKB_PRIVATE_ASSETS`. Schema version advances to **18**.

