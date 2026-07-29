# WedPlanned Legacy Tenant Ownership — v1.8.2

## Purpose
v1.8.2 moves the remaining legacy MKB content model behind the WedPlanned business boundary established in v1.8.0 and authenticated in v1.8.1.

The durable tenant key remains `workspaces.id`. Existing MKB Weddings records are backfilled to `workspace_mkb_weddings`. Existing published slugs, public URLs and R2 object keys are not renamed by migration 025.

## Ownership added in schema 25
Migration `d1/migrations/025_legacy_tenant_ownership.sql` adds `workspace_id` to:
- `venues`
- `weddings`
- `images`
- `venue_images`
- `wedding_images`
- `story_images`
- `published_story_images`
- `wedding_suppliers`
- `suppliers`
- `wedding_supplier_links`
- `moments`
- `custom_collections`
- `collection_images`
- `content_pages`
- `asset_wedding_links`
- `asset_venue_links`
- `asset_moment_links`
- `asset_gallery_links`

All pre-existing rows are explicitly assigned to `workspace_mkb_weddings`. Workspace-prefixed indexes support the new query boundary.

## Request ownership rules
### Admin
Protected Admin APIs use the workspace stored by professional-auth middleware in `context.data.professionalContext.workspaceId`. That value comes from an active `business_memberships` record. A browser query/body workspace ID is not used as access-control authority.

Bootstrap/local rollback mode may fall back to the configured default workspace only when professional auth has not supplied a professional context.

### Public
Public legacy content resolves its business from a verified `workspace_domains` row for the request hostname. Unknown production custom domains resolve no business and therefore cannot fall through to another tenant. Localhost and Cloudflare Pages preview hosts may use the default MKB workspace for development compatibility.

### Fixed public page definitions
Historic MKB `content_pages.slug` values remain unchanged. Non-MKB fixed definitions use an internal workspace-prefixed storage key, while the public/API logical name remains unchanged. This avoids primary-key collisions without changing MKB content keys.

## Image and R2 rules
- Existing MKB R2 objects are not moved or renamed.
- New managed uploads are namespaced under `workspaces/<workspace_id>/...`.
- Image lookup must succeed inside the resolved workspace before source metadata or R2 keys can be returned or deleted.
- Legacy relationship rows carry the same workspace as the parent image/content relationship.
- Asset Library legacy synchronisation imports only legacy images owned by the active workspace.

## Dependent compatibility paths included
Because they read the migrated legacy tables, v1.8.2 also scopes:
- Asset Library facets/relationships and legacy sync;
- Location Gallery venue reads;
- Wedding Workspace legacy compatibility writes;
- Creative Flash and Gallery landing/master-hero definitions;
- HTML venue/wedding SEO snapshot lookup;
- database health output, which no longer exposes global tenant record counts;
- existing workspace-owned Client Galleries, private-original uploads and downloads;
- Print Store Admin, Client Gallery store settings and Admin Prodigi fulfilment actions;
- the legacy `/api/workspace` settings endpoint, which now derives the workspace from the authenticated professional session.

## Validation
Run before deployment:

```bash
python scripts/test-legacy-tenant-isolation.py
npm run build
npm run build:admin
```

The tenant-isolation test must report PASS for:
- read/infer isolation;
- mutation isolation;
- publish isolation;
- R2 key/download lookup isolation;
- verified public-domain resolution;
- schema version 25.

Then validate the migration against production D1:

```sql
SELECT value FROM schema_meta WHERE key = 'schema_version';
PRAGMA foreign_key_check;
```

Expected schema version after migration: `25`. `PRAGMA foreign_key_check` must return no rows.

## Deployment sequence
1. Take the normal D1 backup/export used for production rollbacks.
2. Apply `025_legacy_tenant_ownership.sql` while v1.8.1 is still serving traffic. The migration only adds/backfills ownership columns and indexes, so v1.8.1 can continue to operate against schema 25.
3. Confirm schema version 25, the MKB ownership backfill and a clean foreign-key check.
4. Deploy the v1.8.2 tenant-aware code before opening any external business onboarding.
5. Confirm MKB Weddings Admin lists, detail pages, publishing, uploads, Asset Library, Client Galleries, Print Store, Moments, Locations and Galleries still show the existing data.
6. Confirm the public venue, wedding, moment, location, photographer-gallery and private Client Gallery routes still render the same MKB URLs.
7. Confirm an authenticated test business cannot retrieve or mutate a known MKB legacy slug/ID, Workspace Settings, Client Gallery, Print Store order/catalogue or Prodigi action while that test business is active.
8. Confirm a verified test public domain resolves only that business's public data.
9. Keep external onboarding closed until those production checks pass.

## Rollback
The migration is additive and leaves all existing MKB values, URLs and R2 objects in place. If application rollback is required, deploy the previous code release. The extra `workspace_id` columns and indexes can remain in D1; they are backward-compatible with v1.8.1 code and do not require destructive rollback.

## Compatibility note
Several historic legacy identifiers remain globally unique at the physical SQLite key level. v1.8.2 does not use that uniqueness for authorisation; every migrated service query is workspace-scoped. The generated IDs used for assets/suppliers/collections are collision-resistant, while fixed non-MKB `content_pages` keys are explicitly namespaced. A future storage-normalisation migration may move public slugs to fully composite physical keys if identical venue/wedding slugs across businesses become a product requirement.
