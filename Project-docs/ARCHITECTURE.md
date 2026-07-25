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

## Private original storage and delivery — v1.2
Private client delivery uses two distinct R2 bindings:

- `MKB_PRIVATE_ASSETS`: non-public original JPEG storage;
- `MKB_IMAGES`: display derivatives and thumbnails.

Original object layout:
`workspaces/{workspace_id}/assets/{asset_id}/original/{safe_filename}.jpg`

Derivative layout:
- `workspaces/{workspace_id}/assets/{asset_id}/web/display.webp`
- `workspaces/{workspace_id}/assets/{asset_id}/thumb/thumb.webp`

A browser upload is restartable by re-selecting the same file. The client fingerprint (`name:size:lastModified`) locates an incomplete upload session, and previously accepted multipart parts are skipped.

Security invariants:
- private original storage keys never appear in public gallery payloads;
- public download authorization checks gallery token, live state, expiry, optional PIN, download permission, visible membership and private-original availability;
- downloads are streamed through the Function rather than redirected to R2;
- download auditing stores gallery/asset/visitor metadata but not raw IP addresses;
- existing website-only assets remain preview-only because no original is fabricated.


## Post-wedding Wedding Workspace
The Wedding Workspace orchestrates existing domains rather than creating duplicate records:

Wedding → Venue / Suppliers → Client Gallery → Canonical Assets → Preview Set → Venue / Moments / Galleries → Social caption.

Private originals remain isolated in private R2. When a private-upload asset is selected for public publishing, the compatibility layer registers only its web / thumbnail derivative URLs in legacy publishing tables.

Future CRM / Client Portal work must write structured client-entered venue and supplier selections back into the same Wedding relationships. Unknown suppliers enter a review / merge workflow; clients never directly mutate the global Supplier Master record.

## External venue discovery connector
`/api/venue-discovery` is an optional admin-only lookup boundary. It never replaces the canonical `venues` table.

Current adapter contract:
- internal Venue search remains local and always available;
- if `GOOGLE_PLACES_API_KEY` is configured, the endpoint can return transient Google Places search suggestions;
- the user reviews/prefills a new Venue record, and Intelligence creates its own canonical Venue identity;
- absence or failure of an external provider must never block Wedding creation or manual Venue creation.

Location relationships continue to use `venue_location_links`; external providers do not define the platform's geography model.

## Client Gallery identity boundary
Private gallery access now supports a lightweight identity layer before the full CRM exists:

Gallery → visitor email identity → contact match → effective permissions.

A gallery-wide download switch is always required. When email gating is enabled, original downloads are additionally restricted to authorised `client_gallery_contacts` unless guest downloads are explicitly enabled. This layer is intentionally designed so future CRM contacts can be linked without changing the public gallery permission model.

## Client selection boundary
Client selections sit above canonical assets and identified gallery visitors:

`Client Gallery → Selection Request → Visitor Selection → Canonical Asset memberships`

Favourites remain lightweight personal markers. Selection requests are explicit photographer workflows with constraints and a submit/lock lifecycle. This keeps album choices, print shortlists and other decisions independent from casual favourites. The future Lightroom plugin should consume the same selection data/asset IDs rather than create a separate selection store.


## Persistent client identity
The identity boundary is now:

`workspace -> client identity -> gallery/browser visitor links -> favourites / selections / permissions`

Email entry alone remains an identification convenience and does not prove mailbox ownership. Secure sign-in verifies mailbox control with a one-time link. The resulting session is stored as an HttpOnly cookie and resolved server-side on every Client Gallery request.

Favourites remain keyed by legacy gallery/browser visitor keys for backwards compatibility. Verified identities aggregate those keys through `client_identity_gallery_visitors`, avoiding a destructive rewrite and preserving existing favourite history. Removing a favourite while authenticated removes that asset from all visitor keys linked to the same identity for that gallery.

The email transport sits behind a small provider boundary. v1.5.1 implements Resend through its HTTPS API, while core identity/session storage is provider-independent.


## Client Gallery workspace and albums — v1.5.4
Client Gallery Admin is organised by operational responsibility rather than by implementation tables:

- **Photos**: canonical gallery membership, private-original upload, Asset Library import, cover/visibility controls and album organisation.
- **Client Activity**: favourites, formal selections, downloads/review tools and visitor activity.
- **Access**: identification, magic-link-ready client contacts, PIN, expiry and original-download policy.
- **Settings**: gallery identity, wedding linkage, status and presentation copy.

Album sections are presentation relationships only. `client_gallery_album_assets` links albums to canonical assets; R2 objects and `assets` rows are never duplicated. Public Client Galleries receive active album metadata and filter the same canonical gallery assets by album membership.

## Client Gallery branding boundary — v1.5.5
Client Gallery branding is presentation metadata, not image content:

`Workspace branding defaults → optional gallery override → safe public theme tokens`

The workspace logo/accent remains the default. `client_gallery_branding` can override logo mode, a managed custom logo URL, colours, heading style and studio-name visibility for one gallery. The public gallery receives validated values only; Admin cannot inject arbitrary CSS or scripts.

Custom branding logos use the public `MKB_IMAGES` bucket because clients must be able to render them. They are stored separately from canonical wedding assets and never enter the Asset Library. Private originals continue to use `MKB_PRIVATE_ASSETS`. Replacing or resetting a managed custom logo removes the superseded R2 object where possible.

