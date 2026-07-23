# MKB Intelligence — Architecture

## Current architecture
- Admin: React / Vite
- Public site: React / Vite
- API: Cloudflare Pages Functions
- Structured data: Cloudflare D1
- Assets: Cloudflare R2

## Core rule
Structured relationships/editorial state belong in D1. Binary image assets belong in R2.

## Workspace boundary
`workspaces` is the top-level commercial ownership boundary. MKB Weddings is the seeded default workspace.

Supporting tables:
- `workspace_settings`
- `workspace_domains`
- `workspace_memberships`

Existing legacy content tables are not bulk tenant-scoped yet. New commercial modules must be workspace-owned immediately.

## Gallery model
Product-facing terminology is simply **Galleries**.

### Dynamic galleries
- **Venues** — generated from structured venue records and assignments.
- **Moments** — generated from a workspace-customisable moment taxonomy.
- **Locations** — optional dynamic gallery generated from workspace-owned location areas and venue-location relationships.

### Location model — v0.9.3
A Location Gallery is not hard-coded to UK/Irish counties.

Each workspace can configure:
- public gallery/card titles;
- singular/plural terminology;
- grouping type: county, region, state/province, country, city/town, destination or custom;
- public base path;
- SEO title/description and intro;
- hero image;
- enabled/disabled state.

`location_areas` supports parent relationships so geography can evolve into hierarchies such as:

Country → Region/State → County/City → Custom destination.

`venue_location_links` provides explicit venue membership. County/country/city types can also derive matching venues from existing structured venue fields, so future matching venues are not dependent solely on manual linking.

MKB compatibility remains:
- `Explore by County`
- `/wedding-photographer`
- existing county SEO content is retained through migrated `document_json` and public fallback compatibility.

### Photographer-defined galleries
Creative Flash and user-created galleries are photographer-defined rather than platform defaults. Creative Flash retains its compatibility implementation until the unified Asset Library phase.

## Asset identity rule
A physical image is stored once and referenced by stable identity (`asset_key` / `image_id`). Filenames are not identity.

Future client delivery should become the source asset library:
- private full-resolution original;
- generated thumbnail/display derivatives;
- client-delivery permissions/favourites;
- public gallery memberships.

Selecting an asset for a public gallery must never expose its private full-resolution original.

## Supplier model
- `suppliers`: reusable master businesses.
- `wedding_supplier_links`: wedding-to-supplier relationships with wedding-specific roles/order.
- `wedding_suppliers`: denormalised compatibility/publishing representation.

## Editorial repository ordering
Venue repository:
- `gallery_visible`
- `gallery_sort_order`

Wedding repository:
- `story_sort_order`
- `story_list_visible`

## Future commercial hierarchy
Studio / Tenant
- Users
- Leads
- Clients
- Weddings / Jobs
- Venues
- Suppliers
- Locations
- Quotes
- Contracts
- Invoices / Payments
- Questionnaires
- Workflows / Tasks
- Assets
- Client Galleries
- Public Galleries
- Website Integrations

## Publishing/integration direction
1. Platform-hosted galleries
2. Customer custom domain/subdomain
3. Embeddable gallery components
4. Stable public API / SDK integrations

## Location Intelligence separation — v0.9.5
Location records are reusable structured intelligence, not a gallery-specific feature.

`location_types` defines the workspace taxonomy. A type may be:
- enabled for creating/managing Location Areas;
- eligible to power the dynamic public Location Gallery.

The public Location Gallery stores its selected source in `location_gallery_settings.grouping_level`. Public location APIs filter `location_areas.area_type` to this source type.

This supports MKB `Explore by County` today while allowing another workspace to use Region, State, Destination or a custom geography without code changes.

Venue/image geography follows inheritance:
`Image → Wedding/Venue → venue_location_links → Location Areas`.

The Venue Gallery inspector displays inherited Location destinations read-only. This prevents repetitive geography tagging and leaves direct asset-level exceptions for the unified Asset Library model.

## Canonical Asset Layer — v1.0.0
The commercial storage boundary is now explicit:

`Workspace → Asset → Asset Files → Relationships`

`assets` owns stable workspace-scoped identity and metadata. `asset_files` owns physical variants and access level:
- `original` — private full-resolution source for client delivery;
- `web` — display derivative;
- `thumb` — thumbnail derivative;
- future `preview` / `watermarked` variants.

Existing MKB R2 objects are indexed in place. Migration 010 never copies or renames them.

During the compatibility phase, current `images`, `wedding_images`, `venue_images`, `moments_json` and `collection_images` remain the live editorial sources. Canonical relationship tables are seeded as a migration snapshot, while Asset Library reads the live legacy relationships so existing managers cannot drift from the new index.

New managed uploads dual-write to both layers. This creates a safe migration path rather than a big-bang rewrite.

### Security rule for Client Galleries
A public gallery may reference the same `asset_id` as a private client gallery, but public rendering may only expose approved derivatives. Private `original` storage keys must never be emitted by public gallery APIs.

## Private Client Delivery boundary — v1.1
Client Galleries are workspace-owned delivery containers referencing canonical assets. A gallery share token is a capability URL and may optionally require a salted PBKDF2 PIN. Client favourites are keyed by gallery + browser visitor key + canonical asset ID.

Current MKB public derivatives can be reused as previews for foundation testing, but they are not considered private originals. Future client uploads must store originals privately and expose only authorized derivatives/download responses.
