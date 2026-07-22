# MKB Intelligence — Database Notes

Always inspect the actual migration files before assuming a table/column exists.

## Schema version
Current target schema version: **9**. Migrations 005–009 must be read in sequence when reconstructing production state.

## Core domains
- `venues`
- `weddings`
- `images`
- `venue_images`
- `wedding_images`
- `story_images`
- `published_story_images`
- `moments`
- `custom_collections`
- `collection_images`
- `content_pages`

## Supplier domain
Legacy compatibility:
- `wedding_suppliers`

Master model added in schema v5:
- `suppliers`
- `wedding_supplier_links`

`suppliers` stores reusable business data.
`wedding_supplier_links` stores wedding relationships, role and order. Its relationship key is `(wedding_slug, supplier_id, role)` so one supplier can legitimately serve multiple roles on the same wedding.

Migration 005 seeds master suppliers by normalised existing supplier name and creates links from existing `wedding_suppliers` rows.

## Editorial fields added in schema v5
`venues`:
- `gallery_visible`
- `gallery_sort_order`

`weddings`:
- `story_sort_order`
- `story_list_visible`

## Database rules
1. Prefer stable IDs/relations over duplicated names.
2. Never identify an image by filename alone.
3. Preserve existing relationships during migrations.
4. Migrations must be documented and production-run before code that depends on them.
5. Do not remove compatibility data until public/admin consumers have been audited.
6. Future commercial entities must be designed around tenant ownership.

## Schema version 7
Migration: `007_commercial_workspace_foundation.sql`

Adds:
- `workspaces`
- `workspace_settings`
- `workspace_domains`
- `workspace_memberships`
- `schema_meta.default_workspace_id`

Seeds `workspace_mkb_weddings` as the current default workspace. No existing wedding, venue, supplier, image, moment or collection rows are rewritten by this migration.

## Schema version 8
Migration: `008_location_gallery_foundation.sql`

Adds:
- `location_gallery_settings`
- `location_areas`
- `venue_location_links`

MKB county data was recovered/migrated into the generic location model while preserving the legacy `counties` table for compatibility.

## Schema version 9
Migration: `009_location_types_and_gallery_sources.sql`

Adds:
- `location_types`

`location_types` is workspace-owned and defines the reusable geography/destination taxonomy. `type_key` remains the stable value stored by `location_areas.area_type` and `location_gallery_settings.grouping_level`.

The MKB seed keeps `county` as the only gallery-eligible source initially, preserving Explore by County. Other standard types remain available for Location Intelligence and can be enabled as gallery sources through Admin.

## Schema version 10
Migration: `010_workspace_asset_library_foundation.sql`

Adds the workspace-owned canonical asset layer:
- `assets`
- `asset_files`
- `asset_wedding_links`
- `asset_venue_links`
- `asset_moment_links`
- `asset_gallery_links`

Migration behaviour:
- registers existing `images.asset_key` records as canonical assets using deterministic IDs: `asset:<legacy_asset_key>`;
- registers `images.full_src` as `web` derivatives and `images.thumb_src` as `thumb` derivatives;
- does not create an `original` variant for existing public images because the current browser pipeline stores processed derivatives rather than the private camera-original JPEG;
- snapshots current wedding, venue, moment and custom-gallery relationships;
- does not copy, rename or delete R2 objects;
- leaves existing image/gallery tables in place as compatibility authority during phased cutover.

New commercial image features should use `assets.id` as canonical identity and `workspace_id` as the ownership boundary.
