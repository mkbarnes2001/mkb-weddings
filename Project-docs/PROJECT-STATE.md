# Project State

## Version
Current release: **v1.0.1 — Asset Library Polish**.  
Database schema version: **10**.

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

## Immediate next major module
Private Client Gallery foundation using canonical `assets` + private `original` files, followed by the high-volume direct-to-R2 upload/derivative pipeline.
