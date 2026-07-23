# MKB Intelligence — Changelog

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
