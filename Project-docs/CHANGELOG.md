# MKB Intelligence — Changelog

## v1.8.2f — Gallery UI Follow-up
- Moved Venue Gallery Hero/Venue/Moments state off the thumbnails into compact H/V/M indicators below each image.
- Replaced the oversized Moments masthead actions with the shared small Admin button component.
- Forced the public/private Client Gallery, including Print Store controls and headings, onto the same Montserrat Admin typography.
- Reworked Shop Prints scrolling so the modal overlay is the scroll container, while the gallery page remains locked behind it; the store header and checkout action remain sticky.
- No migration; schema remains 25.

## v1.8.2e — Admin UI & Usability Polish
- Centred and standardised the professional login screen, renamed it **WedPlanned Pro sign in**, and uses the existing MKB favicon/logo.
- Replaced the desktop Admin sidebar brand copy with the MKB logo while preserving business/session context and workspace switching.
- Simplified Venue Gallery image cards with compact Hero/Venue/Moments tags, no star ratings or repeated source text, smaller inspector typography and denser hero/destination controls.
- Simplified Venue Gallery bulk selection to contextual Show/Hide, Assign to moment and Clear controls.
- Fixed the WedPlanned Services selector so its category list has an independent scroll region.
- Standardised private Client Gallery typography to the Admin sans-serif system and removed the obsolete per-gallery heading-font choice from the branding UI.
- Rebuilt the Client Gallery Print Store drawer so the panel itself scrolls correctly on desktop and mobile without scrolling the page behind it.
- Added optional custom Client Gallery slugs; private URLs remain capability-protected by the existing secret token, and legacy token-only links remain valid.
- Refined Moment cards with clearer separation, a full-width drag handle and smaller fields/actions.
- No migration; schema remains 25.

## v1.8.2 — Legacy Tenant Ownership Migration
- Added `workspace_id` ownership to the remaining legacy Weddings, Venues, image/gallery relationship, Suppliers, Moments and public collection-definition tables.
- Backfilled every existing legacy record to `workspace_mkb_weddings` without renaming public slugs, URLs or existing R2 objects.
- Added server-owned Admin workspace resolution from the authenticated professional membership context and verified-domain resolution for public legacy APIs.
- Scoped legacy reads, writes, publishing, managed-image deletion, Wedding Workspace compatibility writes, Asset Library relationships and Location Gallery venue reads to the resolved workspace.
- Re-audited existing workspace-owned paths and made the authenticated active business authoritative for Workspace Settings, Client Galleries, private originals, Print Store and Admin Prodigi fulfilment actions.
- Closed a Print Store cross-tenant mutation edge case when archiving a price list by scoping the dependent gallery-store update to the active workspace.
- Namespaced new managed-upload R2 keys by workspace while retaining existing MKB object keys.
- Namespaced non-MKB fixed `content_pages` storage keys while preserving historic MKB keys.
- Removed global tenant record counts from the unauthenticated D1 health endpoint.
- Added dependency-free cross-tenant regression coverage for read/infer, mutate, publish, R2-key/download lookup and public-domain isolation.
- Added migration 025; schema version advances to 25.
- Production tenant validation subsequently passed with the live `workspace_wedplanned_test` regression business, known-ID mutation/publish checks, private-original blocking and verified-domain isolation.

## v1.8.1 — Professional Identity & Tenant Context
- Added passwordless professional sign-in with single-use, SHA-256-hashed links and secure HttpOnly sessions.
- Added invitation acceptance, resend/manual delivery status and role-aware team access.
- Added server-owned active-business resolution from authenticated memberships; browser-supplied workspace IDs are no longer authoritative for the WedPlanned platform API.
- Added owner/admin/manager/content/finance/staff/viewer permission enforcement for WedPlanned business, service-area and team mutations.
- Added multi-business workspace switching restricted to active memberships.
- Added Admin sign-in, professional identity, active business selector and sign-out controls.
- Added optional Resend delivery for invitations and sign-in links, plus a disabled-by-default development-link mode.
- Added an Admin-project middleware gate controlled by `WEDPLANNED_AUTH_ENFORCED`, preserving a rollback-safe bootstrap mode during deployment.
- Added audit events for invitations, accepted links, sign-ins and workspace switching.
- Added migration 024; schema version advances to 24.
- Legacy Weddings, Venues, Suppliers, Moments and public collection definitions remain MKB-only until the next ownership migration; external business onboarding remains blocked.

## v1.8.0 — WedPlanned Platform Foundation
- Added neutral WedPlanned business profiles on top of the existing workspace tenant boundary.
- Added platform users and business memberships with owner, admin, manager, content, finance, staff and viewer roles.
- Added a seeded wedding-industry category taxonomy and per-business primary/additional category selection.
- Added business service areas independent from the MKB venue/location gallery model.
- Added feature definitions, workspace entitlements and platform audit events.
- Seeded MKB Weddings as the first private WedPlanned photographer business with internal entitlements.
- Added Admin → WedPlanned for business identity, categories, service areas, staged team invitations, entitlements and tenant-readiness reporting.
- Preserved all existing MKB Stripe, Prodigi, Client Gallery and publishing behaviour.
- Added migration 023; schema version advances to 23.

## v1.7.16 — Final Weddings and Venues UI Polish
- Reduced Venue card name and location typography for a denser repository grid.
- Reduced Venue summary visibility and assigned-location labels and removed the redundant location-editing instruction.
- Aligned Venue Status label/value typography and increased readability slightly.
- Removed the boxed lower-text treatment from Wedding cards while retaining clear selected-card feedback.
- Standardised Wedding summary title, venue, date and metadata typography with the shared Admin font system.
- Matched Draft/Published status chips to Ready/Missing-data chips using compact uppercase styling.
- Normalised Story, Images, Suppliers, Publish, Archive and Delete action dimensions, padding and icon sizes.
- Reduced Tags, Alt and Captions completion typography.
- Confirmed the next major phase as the WedPlanned multi-business platform foundation.
- No D1 migration; schema version remains 22.

## v1.7.15 — Admin Repository Final Polish
- Refined Weddings and Venues cards so longer names and locations fit without crowding.
- Condensed Wedding and Venue summary panels, moved completion metrics lower, removed redundant divider labels and standardised action buttons.
- Replaced Venue-list location editing with a compact read-only summary; location changes remain in venue details.
- Reworked Suppliers into a compact table-style repository with smaller summary numbers and borderless muted form controls.
- Rebuilt Client Gallery list cards into a smaller responsive grid with consistent metrics and centred actions.
- Lightened and standardised the left-navigation icon treatment while preserving the list layout.
- No migration; schema remains 22.

## v1.7.14 — Global Admin Responsive Workspaces
- Added a shared responsive master/detail layout for Admin repositories and workspaces.
- Converted Weddings, Venues, Suppliers, Asset Library, Wedding Workspace, Moment Gallery, Venue Gallery, Custom Collections and Creative Flash to the shared layout.
- Summary and inspector panels remain compact and sticky on larger desktop screens, but become normal in-flow panels on tablets and phones.
- Added a safe mobile fallback for remaining legacy inline sticky inspectors so they cannot hover over or obscure content.
- Tightened mobile headers, actions, toolbars, card grids, summary typography and table density.
- Preserved all existing data, routes and workflows. No migration; schema remains 22.

## v1.7.0 — Prodigi Professional Lab Fulfilment
- Added migration 022 with verified per-variant lab mappings, immutable order-line mapping snapshots, prepared print assets, provider-neutral lab submissions/items and idempotent lab-event history.
- Added Prodigi sandbox product verification against SKU, attributes, print area and recommended pixel dimensions.
- Added secure print-ready JPEG preparation from the private original using the saved crop/rotation and exact Prodigi dimensions.
- Kept prepared files in private R2 and exposed them only through random expiring token URLs.
- Added photographer-controlled quote, per-line/batch submission, retry-safe idempotency, reconciliation and cancellation actions.
- Added Prodigi CloudEvent callback handling with a secret callback token, source validation, duplicate-event protection and direct provider reconciliation.
- Added Admin fulfilment status, provider references, shipment carrier, dispatch and tracking details.
- Preserved manual fulfilment and prevented unpaid/unapproved orders from being submitted.
- No automatic lab submission is performed when Stripe payment succeeds.
- Schema advances to 22.

## v1.6.1 — Stripe Hosted Checkout
- Added migration 021 with payment lifecycle, Checkout Session, Payment Intent, delivery-address and payment timestamp fields.
- Added Stripe-hosted Checkout creation with server-authoritative line items/totals and per-attempt idempotency keys.
- Added a signed raw-body Stripe webhook endpoint with duplicate-event protection and sanitised event snapshots.
- Added success, asynchronous success/failure, expiry, Payment Intent and full-refund state handling.
- Prevented stale failed/expired events from regressing a verified paid or refunded order.
- Added secure Checkout return reconciliation, retryable cancelled/expired payments and cross-gallery order/session validation.
- Added client payment-status messaging and Admin Stripe references, delivery details and payment history.
- Added payment guards so unpaid Stripe orders cannot be approved/fulfilled or manually marked paid/refunded.
- Prodigi/lab submission remains disabled and separate from payment in this release.
- Schema advances to 21.

## v1.6.0 — Print Store Foundation
- Added migration 020 and workspace-owned catalogue, variant, price-list, cart, order and payment-event tables.
- Added Admin → Print Store with catalogue editing, sizes/variants, lab mapping fields, price lists, studio costs/markup and order review.
- Added a Print Store tab to each Client Gallery for price-list assignment, minimum order, crop and photographer-approval settings.
- Added private client-gallery product browsing, per-photo ordering, persistent carts, quantity controls and non-destructive crop coordinates.
- Added server-authoritative price and gallery-membership validation before order creation.
- Added batched order creation so the order header, line snapshots and cart conversion are committed together.
- Added immutable order-line product, sell-price, studio-cost, crop and lab-mapping snapshots, plus status workflow and payment references/events.
- Added a provider-neutral foundation only: no live card charge or professional-lab submission is performed in v1.6.0.
- Schema advances to 20.

## v1.5.9 — Compact Venue Location Selector
- Replaced the large county/region/destination checkbox lists in Venue Management with one grouped location dropdown.
- Excluded already selected locations from the dropdown to prevent duplicate assignments.
- Added compact selected-location chips beneath the dropdown with an accessible remove action.
- Preserved immediate saving through the existing Location Intelligence service.
- No migration; schema remains 19.

## v1.5.8 — Global Admin UI System & Visual Refresh
- Added reusable Admin UI primitives in `src/admin/components/ui/AdminUI.tsx`.
- Added shared visual tokens and global legacy-control normalisation in `src/admin/admin-theme.css`.
- Reduced Admin sidebar width and navigation density; standardised the sticky top bar and content frame.
- Reworked top-level page mastheads into compact white page headers with consistent action placement.
- Standardised action buttons at 30–34px heights, smaller labels, aligned icons and non-pill corner radii.
- Reserved fully rounded pills for statuses/tags and reduced status typography.
- Standardised form controls, toolbars, panels, tables, progress bars, stat cards, empty states and destructive actions.
- Applied the system to Dashboard, Weddings, Venues, Suppliers, Locations, Gallery Management, Asset Library, Client Galleries, AI Centre, SEO Centre, Settings and Publishing.
- Added global compatibility styling so existing detail/editor pages adopt the same visual language without workflow rewrites.
- No migration; schema remains 19.

## v1.5.7 — Client Gallery Compact Controls
- Reworked the Client Gallery photo toolbar into one compact grid row with consistent 32px controls and 10px labels.
- Tightened the global Admin header actions to compact Blog / Website buttons.
- Moved photo options onto the image card and filenames beneath the card in discreet single-line text.
- Filenames now use explicit inline truncation so long generated names cannot expand card height.
- Preserved selection, custom drag ordering, image menus and album behaviour.
- No D1 migration required; schema version remains 19.

## v1.5.6 — Client Gallery Card & Photo Ordering Refinement
- Simplified Client Gallery photo cards and removed persistent storage-status text.
- Moved filenames into a discreet compact footer with the photo options icon.
- Added persistent Custom / Capture time / Filename ordering.
- Added drag-and-drop custom ordering for All Photos and album views.
- Added EXIF/file-time capture metadata for future private uploads with safe fallback for existing assets.
- Consolidated import, library, ordering, search, selection and upload controls into one row.
- Adds migration 019 and advances schema version to 19.


## v1.1.2 — ShootProof-style Client Gallery Hero
- Replaced the client-gallery hero serif heading with a compact geometric sans-serif treatment using Montserrat.
- Matched the reference more closely with uppercase lettering, medium weight, wider tracking, centred positioning, divider line and photograph count.
- Retained the existing serif typography elsewhere in the MKB website and client gallery.
- No D1 migration required; schema version remains 11.

## v1.1.1 — Client Gallery Visual Refinement
- Refined the private client gallery into a cleaner ShootProof-inspired layout.
- Reduced and restyled the gallery title using the existing Canela/Playfair heading stack.
- Added compact favourite and reserved download icons to image tiles and the lightbox.
- Kept download controls disabled until secure full-resolution original delivery is implemented.
- Added resilient relative-asset URL resolution against the public website origin.
- No D1 migration required; schema version remains 11.

## v0.8.0.2 — Wedding Supplier Quick Assign + Venue Order Alignment
- Added supplier assignment directly to the Master Wedding Record / blog content editor.
- Existing master suppliers can be searched and added with one click; role defaults to the supplier category and can be overridden.
- Assigned suppliers can be removed inline; supplier changes save immediately and stay synchronized with the wedding document.
- Venue admin and public Gallery by Venue now use one shared ordering source.
- Preserved the previous public venue order as the fallback until an explicit drag order is saved in D1.
- No D1 migration required.

## v0.8.0.1 — Supplier multi-role relationship fix
- Corrected wedding_supplier_links so one supplier can have multiple roles on the same wedding.
- Rebuilds links from preserved legacy wedding_suppliers data, restoring all 39 existing role relationships in the current dataset.
- Supplier linked-wedding counts now count unique weddings rather than role rows.
- Adds D1 migration 006 and advances schema version to 6.

## v0.8.0 — Supplier Master Database + Repository Refinements
- Added reusable supplier master records.
- Added wedding-to-supplier relational links.
- Migrates existing wedding supplier rows into the master database.
- Added supplier categories, contact details, location, description, internal notes and archive status.
- Added linked-wedding view to supplier management.
- Wedding supplier editor now searches master suppliers and promotes new names into the master database on save.
- Added compact Venue repository cards with venue hero thumbnails.
- Added venue drag ordering for Gallery by Venue.
- Added independent show/hide control for venues on Gallery by Venue.
- Added compact Wedding repository cards and right-side detail inspector.
- Added wedding drag ordering for Stories & Reviews.
- Added independent wedding-story listing visibility without deleting/unpublishing the wedding.
- Added `/project-docs` durable project handover system.
- D1 schema version: 5.

## v0.7.6.2 — Unified Gallery Management
- Consolidated core and custom gallery administration.
- Added central landing-card ordering and visibility.

## v0.7.6.1 — Collection Assignment Everywhere
- Added Custom Collection assignment controls across gallery managers.

## v0.7.6.0 — Custom Collections Foundation
- Added `custom_collections` and `collection_images`.
- Added dynamic collection pages and landing cards.

## v0.7.5.x — Gallery Management Expansion
- Moment Gallery Manager
- D1 chunked saving
- Compact draggable thumbnail grids
- Multi-select/exact ordering
- Creative Flash manager
- Consistent destination/moment controls
- Master gallery heroes and Gallery landing hero
- Legacy image fallback improvements

## v0.9.0 — Commercial workspace foundation
- Added additive workspace/tenant foundation tables: `workspaces`, `workspace_settings`, `workspace_domains`, `workspace_memberships`.
- Seeded MKB Weddings as the default workspace without changing existing wedding/venue/gallery table behaviour.
- Added protected `/api/workspace` admin endpoint and a real Admin → Settings workspace configuration screen.
- Added `default_workspace_id` metadata to create an explicit tenant boundary for future modules.
- Fixed Master Wedding supplier assignment UI so already-assigned suppliers do not appear in the default add list; deliberate search supports adding another role.
- Existing content tables remain unscoped in this release by design; commercial scoping will be phased to avoid destabilising MKB production.

### v0.9.0 revision — Wedding story visibility state fix
- Fixed `WeddingService` record mapping so the Weddings repository receives the authoritative D1 fields `storyEnabled`, `storyStatus`, `storyPublishedAt`, `storySortOrder`, `storyListVisible`, and `venueSlug`.
- Fixed the admin visibility control incorrectly treating already-published stories as unpublished.
- Wedding repository ordering now respects `storySortOrder` before falling back to couple name.

## v0.9.1 — Wedding Editor Consolidation

- Standardised `/admin/weddings/:slug/content` as the canonical wedding content/story editor.
- Legacy `/admin/weddings/:slug/story/edit` now redirects to the canonical editor.
- Updated the Wedding Story page edit action to open the master content editor.
- Replaced the large master-supplier button list with a compact dropdown, role field and single add action.
- Preserved multi-role supplier assignments by allowing an already assigned supplier to be selected again for a different role.
- No database migration required; schema version remains 7.

## v0.9.2 — Unified Galleries
- Simplified Gallery Management product language so all public visual groupings are presented as Galleries.
- Venues and Moments are now clearly identified as the two default dynamic gallery types.
- Moved Creative Flash visually out of the default/system group and into photographer-defined galleries alongside user-created galleries.
- Renamed Custom Collections UI language to Gallery Settings / photographer galleries while retaining compatibility routes and storage names internally.
- Clarified that Moment categories are fully customisable per photography workspace: create, rename, reorder, archive, assignment visibility and public-card visibility.
- Gallery landing-card labels now distinguish default galleries, photographer galleries and site navigation cards without exposing “system/custom collection” implementation terminology.
- No D1 migration required; schema version remains 7.

## v0.9.3 — Location Gallery Foundation
- Generalised the MKB `Explore by County` feature into a workspace-configurable Location Gallery.
- Added workspace-owned `location_gallery_settings`, `location_areas` and `venue_location_links` tables.
- Seeded existing MKB county intelligence into location areas and preserved county-to-venue relationships.
- Kept existing MKB `/wedding-photographer` and county URLs as the canonical public route to avoid SEO disruption.
- Added generic `/gallery/locations` compatibility routes for future workspaces.
- Added Admin → Gallery Management → Locations with configurable labels, grouping type, titles, SEO, hero, public path, location areas, hierarchy parent, venue assignments, order, status and visibility.
- Location types support County, Region, State/Province, Country, City/Town, Destination and Custom Area.
- Gallery landing card now reads its location title, description, hero and route from workspace location settings rather than hard-coded county terminology.
- Existing `county-meta.json` remains a public fallback during the transition.
- D1 schema version advanced to 8.

## v0.9.4 — Venue Location Assignment
- Added venue-to-location assignment directly inside Venue Management.
- Location options are loaded dynamically from workspace location areas and grouped by type (county, region, destination, custom, etc.).
- A venue can belong to multiple location areas at once using the existing `venue_location_links` relationship model.
- Location assignments save back to the shared Location configuration, so Venue Management and Location Management stay in sync.
- No D1 schema migration required; schema version remains 8.

## v0.9.5 — Location Intelligence & Unified Image Destinations
- Promoted Locations to a first-class Admin section, separate from Gallery Management.
- Added workspace-owned `location_types` configuration with enabled and gallery-eligible controls.
- Seeded County, Region, State/Province, Country, City/Town, Destination and Custom Area types while preserving MKB County as the active public gallery source.
- Added custom location type creation.
- Added a dedicated Gallery Management → Location Gallery settings screen where a photographer chooses which eligible location type powers the public gallery.
- Public Location Gallery APIs now return only areas belonging to the configured source type.
- Preserved MKB `/wedding-photographer` and existing county SEO behaviour by default.
- Updated Venue Management to use the shared Location Intelligence configuration without coupling venue assignments to gallery settings.
- Reworked Venue Gallery image details into unified destination groups: Venue, Moments, inherited Locations and Custom Galleries.
- Creative Flash is presented alongside photographer-created galleries rather than as a separate platform destination.
- Retained Wedding Story, Homepage and Portfolio controls in a secondary compatibility section.
- Added D1 migration 009; schema version advances to 9.

## v0.9.5.1 — Gallery creation reliability
- Added a dedicated static `POST /api/custom-collections/create` endpoint for photographer-defined gallery creation.
- Gallery Management now opens a newly created gallery immediately so creation has an obvious success state.
- Creation errors are displayed beside the Add Gallery controls instead of only at the top of the long management page.
- No database migration; schema version remains 9.

## v1.0.0 — Workspace Asset Library Foundation
- Added workspace-owned canonical `assets` registry and variant-based `asset_files` storage model.
- Indexed existing MKB images without copying or renaming R2 objects.
- Explicitly distinguishes current public web/thumb derivatives from future private full-resolution originals.
- Added canonical relationship tables for Weddings, Venues, Moments and photographer Galleries.
- Added Admin → Asset Library with workspace-wide grid, search, filters, inherited Locations and a unified asset inspector.
- Asset Library reads current live compatibility relationships so existing gallery managers remain authoritative during the transition.
- Added registry sync endpoint to index any legacy images that bypass canonical writes.
- New managed image uploads dual-write into the canonical asset registry and derivative records.
- Managed image deletion now cleans canonical asset records as well as legacy image records.
- No existing public URLs or R2 object keys are changed.
- D1 schema version advances to 10.

## v1.0.1 — Asset Library Polish
- Added resilient thumbnail rendering: dedicated thumbnail first, then web derivative fallback, then placeholder.
- Applied the same fallback behaviour to the Asset inspector preview.
- Cleaned asset-card labels while retaining full filenames in detail views/tooltips.
- Added Wedding badges to cards and corrected singular/plural Gallery badge labels.
- Improved filter and inspector wrapping for narrower admin layouts.
- No D1 migration; schema version remains 10.

## v1.1.0 — Private Client Galleries Foundation
- Added workspace-owned `client_galleries`, `client_gallery_assets` and `client_gallery_favourites` tables.
- Added Admin → Client Galleries with create/manage flows, Wedding linking and automatic import from canonical Wedding asset relationships.
- Added manual Asset Library search/add, cover selection, image hide/remove controls and live/draft/archive status.
- Added unguessable private share tokens, optional salted PBKDF2 PIN protection and optional expiry.
- Added standalone `/client-gallery/:token` client delivery view with responsive image grid, lightbox and browser-scoped favourites.
- Existing public web/thumb derivatives are reused as previews only; no existing R2 objects are copied.
- Full-resolution downloads remain intentionally disabled until private `original` upload and authorization are implemented.
- D1 schema version advances to 11.

## v1.2.0 — Private Original Upload & Secure Delivery
- Added a dedicated private-original multipart upload pipeline for full-resolution JPEGs.
- Added resumable upload sessions with 8 MB parts, persisted uploaded-part state and automatic retry support.
- Added browser-side generation of 2400px WebP display derivatives and 640px WebP thumbnails.
- New original assets are created under canonical workspace-owned `assets.id` identities and linked directly to their Client Gallery and linked Wedding.
- Added secure individual original downloads through token/PIN/status/expiry/membership authorization.
- Private R2 storage keys are never exposed to public gallery clients.
- Added download audit events and download totals in Client Gallery admin.
- Activated per-image client download controls only when the gallery allows downloads and an original exists.
- Added a dedicated `MKB_PRIVATE_ASSETS` R2 binding requirement for both admin and public Pages projects.
- Applied Montserrat consistently across the full Admin application through a scoped central theme.
- Added D1 migration 012; schema version advances to 12.


## v1.3.0 — Unified Wedding Workspace & Preview Workflow
- Added `/admin/weddings/:slug/workspace` as the post-wedding operational centre.
- New Wedding creation now leads directly into the Wedding Workspace.
- Added inline venue linking and reusable supplier assignment.
- Added linked Client Gallery creation / management from the same page.
- Reused the v1.2 resumable private-original pipeline for direct preview uploads.
- Added workspace-owned `wedding_preview_sets` and `wedding_preview_assets`.
- Uploaded previews are automatically added to the Wedding Day Preview Set.
- Added additive preview publishing to the linked Venue, selected Moments, Creative Flash and custom Galleries.
- Private-upload assets are promoted into legacy/public compatibility records with web derivatives only; private originals remain protected.
- Added editable Instagram preview caption generation using structured venue and supplier Instagram usernames.
- Updated Weddings management and Wedding Control Centre links to prioritise the Wedding Workspace.
- Added migration 013; schema version advances to 13.


## v1.3.1 — Wedding Workspace Quick Create & Asset Original Status
- Added inline `+ Add new venue` to the Wedding Workspace.
- New venues can be created with essential identity/location/contact fields and are linked to the Wedding immediately.
- Added possible-match suggestions to reduce duplicate Venue creation.
- Added inline `+ Create new supplier` to the Wedding Workspace.
- New master suppliers are created and linked with a wedding-specific role in one flow.
- Added possible-match suggestions to reduce duplicate Supplier Master records.
- Instagram preview captions refresh from newly linked venue/supplier data.
- Corrected Asset Library private-original status so secure R2 originals no longer appear as “Not yet stored” simply because they have no public URL.
- Added Asset Library original-status filtering: Private original stored / Preview only.
- No D1 migration; schema version remains 13.

## v1.3.2 — Global Venue Discovery & Admin UI Refinement
- Reworked Wedding Workspace setup into a single vertical flow: Venue first, then Suppliers.
- Replaced the venue-only select with a searchable existing-venue picker and explicit Link venue action.
- Added searchable global country suggestions without restricting studios to one national geography model.
- County/administrative-area suggestions now come from workspace Location Intelligence while still allowing free-form values for new regions.
- Added optional Region / Destination assignment during venue quick-create using existing Location records.
- Newly created venues are automatically linked back into matching County and selected Location records when available.
- Added an optional venue-discovery endpoint with a Google Places adapter when `GOOGLE_PLACES_API_KEY` is configured; manual and internal search remain fully functional when it is absent.
- Simplified supplier add flow so the wedding role field only appears after a supplier is selected.
- Replaced cramped pill-style action controls with compact rectangular action buttons; pills remain for statuses/tags.
- No D1 migration; schema version remains 13.

## v1.3.3 — Wedding Navigation, Safe Deletion & Compact Supplier Table
- Added a direct Workspace action to every Wedding card while retaining the full Open Wedding Workspace action in the details pane/control centre.
- Added Archive controls for normal non-destructive removal from active work.
- Added guarded permanent Wedding deletion requiring the user to type `DELETE`.
- Permanent deletion removes wedding-specific records/relationships only and preserves canonical assets, private originals, master venues, master suppliers and non-live Client Galleries.
- Live Client Galleries block permanent deletion until archived.
- Compactified Wedding Workspace supplier assignments into a table with Role, Supplier, Instagram and Remove columns.
- No D1 migration; schema version remains 13.


## v1.4.0 — Gallery Visitor Identity & Permissions
- Added optional required-email entry for private Client Galleries.
- Added per-gallery authorised client contacts with per-email full-resolution download entitlement.
- Added optional guest full-resolution download permission while retaining the gallery-wide master download switch.
- Added visitor identity/activity records keyed by gallery + browser visitor key; no raw IP storage.
- Existing `client_email` values are seeded as authorised `primary_client` contacts.
- Client Gallery admin now shows authorised contacts and recent identified visitors.
- Public gallery access now distinguishes authorised clients from guests before enabling original downloads.
- Added email/visitor indicators to Client Gallery management cards.
- Replaced Wedding card Workspace text buttons with compact icon-only shortcuts.
- Made Wedding Workspace Venue and Supplier areas visually distinct standalone panels.
- Added migration 014; schema version advances to 14.

## v1.5.0 — Client Selections & Shortlists
- Added named Client Gallery selection requests with instructions and optional minimum/maximum counts.
- Added visitor/email-linked draft selections with automatic saving and final submission.
- Added per-image selection controls to the public Client Gallery alongside favourites and secure downloads.
- Submitted selections are locked until reopened by Admin.
- Added Admin response review, selected filename copy and CSV export for Lightroom/manual selection workflows.
- Added migration 015; schema version advances to 15.


## v1.5.1 — Persistent Client Identity & Magic-Link Sign-In
- Added workspace-level verified client identities for Client Galleries.
- Added secure one-time email sign-in links with 15-minute expiry and one-time consumption.
- Added 30-day revocable client sessions using HttpOnly/SameSite cookies.
- Added a provider boundary for authentication email delivery with Resend as the first adapter.
- Added a public **Sign in** flow to every Client Gallery, including email-gated galleries.
- Verified clients can now sync favourites across browsers/devices and continue to add/remove favourites at any time.
- Existing favourites are preserved and aggregated through verified identity-to-visitor links; no image or favourite backfill/copy is required.
- Selection state continues to follow identified email and works with the verified session identity.
- Gallery PIN checks remain independent and are not bypassed by magic-link authentication.
- Added migration 016; schema version advances to 16.

## v1.5.2 — Favourite Review & Full-Resolution Download
- Added a dedicated Admin thumbnail review page for Client Gallery favourites.
- Added combined deduplicated favourites plus per-person favourite filters.
- Added secure individual full-resolution original download from Admin.
- Added streamed ZIP download of all available private originals for favourites.
- Added the same thumbnail review and Download All workflow for formal client selections.
- Preserved original filenames for direct import into album design software.
- Added filename copy and CSV export on the review screen.
- Bulk downloads stream private R2 originals and do not expose storage keys or permanent public URLs.
- Added ZIP audit events using the existing `asset_download_events` table.
- No D1 migration; schema version remains 16.

## v1.5.3 — Client Gallery Admin Tabs
- Split Client Gallery Admin into two focused tabs: **Gallery & access** and **Selections & favourites**.
- Moved favourites review/download controls out of the already-busy Gallery settings sidebar.
- Moved selection requests, client responses, filename/CSV tools, reopen controls and full-resolution download actions into the dedicated Selections & favourites tab.
- Preserved the existing thumbnail review and secure streamed bulk-original download workflow.
- Kept visitor access, authorised client emails, recent visitors, uploads and gallery image management on the Gallery & access tab.
- No D1 migration; schema version remains 16.



## v1.5.4 — Client Gallery Workspace
- Rebuilt Client Gallery Admin as a four-area operational workspace: **Photos**, **Client Activity**, **Access** and **Settings**.
- Made Photos the default gallery screen instead of opening into a settings-heavy editor.
- Added a persistent summary sidebar with cover image, live/draft status, client, photo/original counts, wedding date and latest visit.
- Added prominent Preview and Share actions with a compact private-link/security summary panel.
- Reworked photo management into a cleaner selectable thumbnail grid with contextual bulk album actions.
- Added Client Gallery albums/sections with no image duplication; album membership references canonical asset IDs.
- Added public Client Gallery album navigation while retaining a virtual **All Photos** view.
- Consolidated favourites, selections and visitor history into a compact Client Activity area.
- Moved email/PIN/download controls and authorised contacts into a dedicated Access area.
- Moved general gallery metadata and wedding linkage into Settings; advanced security options are collapsed until needed.
- Added migration 017; schema version advances to 17.

## v1.5.5 — Client Gallery Photo Menus & Branding
- Replaced the three persistent action icons on every Client Gallery photo card with one compact vertical-options button.
- Added an accessible photo menu for preview, secure original download, set cover, show/hide, add to album and remove from gallery.
- Added confirmation text clarifying that removing a gallery photo preserves the canonical asset and private original.
- Added an Admin image-preview overlay and retained bulk-selection controls separately.
- Added a dedicated **Branding** workspace tab.
- Added workspace-logo, custom-logo and no-logo modes.
- Added managed PNG/JPEG/WebP logo upload to public R2 with a 2 MB limit and replacement cleanup.
- Added light colour presets, individual colour controls, limited heading styles, studio-name visibility and a live client-gallery preview.
- Applied branding to the private gallery header, access screen, page surfaces, album navigation and primary actions.
- Added migration 018; schema version advances to 18.
