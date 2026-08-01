# MKB Intelligence — Architecture

## Current architecture
- Admin: React / Vite
- Public site: React / Vite
- API: Cloudflare Pages Functions
- Structured data: Cloudflare D1
- Assets: Cloudflare R2

## Admin responsive workspace boundary — v1.7.14
Admin repository and editor pages use one shared presentation pattern:

`Page header → toolbar/status → master content → optional summary/inspector`

The summary/inspector is sticky only on sufficiently wide desktop viewports. At tablet and phone widths it becomes a normal in-flow panel with no viewport-height lock or nested page-level scrolling. This prevents mobile overlays while preserving quick desktop access.

The shared CSS classes are:
- `admin-master-detail` for the responsive two-column shell;
- `admin-master-detail__main` for the primary repository/editor area;
- `admin-summary-panel` for the secondary summary/inspector;
- `admin-card-grid` for responsive repository cards.

Legacy inline sticky inspectors receive the same mobile fallback until their pages are fully migrated. This is a presentation boundary only and does not alter data ownership, routes or APIs.


## WedPlanned business boundary — v1.8.0
WedPlanned uses the existing workspace boundary as its durable tenant key. Product language now describes a workspace as a **business**, but database ownership remains `workspace_id` to preserve compatibility and avoid a high-risk global rename.

The new hierarchy is:

```text
WedPlanned platform
└── Business (`workspaces.id`)
    ├── Business profile
    ├── Professional categories
    ├── Service areas
    ├── Team memberships and roles
    ├── Feature entitlements
    ├── Audit events
    └── Business-owned operational data
```

`platform_users` represents a professional identity across WedPlanned. `business_memberships` links that identity/email to one business and role. v1.8.0 stores intended memberships but does not authenticate them. A later release must resolve every request from a verified user session to an allowed business membership; a browser-supplied workspace ID can never be treated as authority.

The tenant-readiness audit divides the application into:
- already scoped: workspaces, canonical assets, Client Galleries, Location Intelligence and commerce/fulfilment;
- controlled migration required: legacy Weddings, Venues, Suppliers, Moments and public collection definitions;
- planned: professional authentication, Stripe Connect and external-business onboarding.

MKB Weddings remains the default and first operating WedPlanned business. Existing single-account Stripe Checkout and Prodigi flows continue unchanged until connected-account ownership is implemented.


## Legacy tenant ownership boundary — v1.8.2
The authenticated business context introduced in v1.8.1 is now enforced across the remaining legacy content model. `workspace_id` is stored on Weddings, Venues, legacy Images and their relationship rows, Suppliers, Moments, public/custom collection definitions, `content_pages` and canonical compatibility links.

Request authority is asymmetric by surface:

```text
Admin request
→ professional session
→ active business_membership
→ context.data.professionalContext.workspaceId
→ workspace-scoped legacy query

Public request
→ request hostname
→ verified workspace_domains mapping
→ workspace-scoped public query
```

Unknown production public domains resolve no tenant. Localhost/Pages preview hosts may fall back to the default MKB workspace for development compatibility. Browser body/query workspace values never decide legacy access.

Managed image operations first prove the image belongs to the resolved workspace before exposing/deleting R2 source keys. New uploads are stored under `workspaces/<workspace_id>/...`; pre-v1.8.2 MKB keys remain unchanged. Asset Library compatibility sync and Location Gallery venue reads use the same workspace boundary because both depend on migrated legacy tables.

Historic MKB fixed `content_pages` primary keys are retained. Equivalent non-MKB definitions use an internal workspace-prefixed storage key. Legacy public slugs otherwise retain their historic physical uniqueness constraints in schema 25; this is a storage compatibility constraint, not an authorisation mechanism.

## Professional identity and tenant context — v1.8.1
Professional Admin access uses passwordless, one-time links and an HttpOnly session cookie. `platform_auth_links` and `platform_sessions` store SHA-256 token hashes only. The raw token exists only in the email/link and browser cookie.

Request resolution is:

```text
Professional session cookie
→ hashed session lookup
→ active platform user
→ active business membership
→ server-owned workspace/business context
→ role permission check
→ business-scoped service operation
```

`WEDPLANNED_AUTH_ENFORCED` is a deployment gate on the Admin Pages project. While false, the existing MKB Admin runs in bootstrap mode so the first owner can be confirmed and email delivery tested. When true, Admin-project `/api/*` requests are rejected before reaching legacy handlers unless a valid professional session exists. Authentication routes and health routes are exempt; public-site APIs and provider webhooks are unaffected because enforcement is configured only on the Admin Pages project.

Role permissions are intentionally conservative:
- owner/admin: business, services and team management;
- manager/content: business/services updates and team visibility;
- finance/staff/viewer: platform/team visibility only in this foundation.

Multi-business users can switch only to a workspace returned by their active memberships. Platform APIs ignore client-supplied workspace identifiers and use the middleware/session context.

This release secures access to the current MKB Admin but does not make legacy content multi-tenant. Weddings, Venues, Suppliers, Moments and public collection definitions remain MKB-only until v1.8.2 adds ownership columns, backfills and scoped queries.

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
Business / Tenant
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



## Client Gallery ordering — v1.5.6
- `client_gallery_display_settings` stores the gallery-level presentation order: `custom`, `capture_time`, or `filename`.
- `client_gallery_assets.sort_order` is the custom order for All Photos.
- `client_gallery_album_assets.sort_order` is the custom order inside each album.
- `asset_capture_metadata` stores capture timestamps separately from canonical `assets`, preserving the one-asset identity rule.
- Future private uploads attempt EXIF DateTimeOriginal first and then use the source file modification timestamp. Existing assets use `assets.created_at` as a deterministic fallback.

## Admin presentation system — v1.5.8
Admin presentation is centralised rather than implemented independently by each feature page.

Shared primitives live in `src/admin/components/ui/AdminUI.tsx` and cover:
- page headers and action groups;
- panels and compact toolbars;
- primary, secondary, ghost, destructive and icon-only actions;
- tabs, statuses, fields and empty states.

Design tokens and legacy compatibility rules live in `src/admin/admin-theme.css`. This allows older detail/editor pages to adopt the same control heights, typography, radii, form treatment and table density without changing their data or API workflows.

New Admin modules must use the shared primitives first. Feature-specific inline styles should be limited to layouts that cannot be expressed by the shared system, such as responsive image grids or drag-and-drop workspaces. Client-facing gallery branding remains separate and must never inherit Admin theme rules.


## Print Store commerce boundary — v1.6.0
The first commerce path is deliberately layered on the existing workspace, identity, Client Gallery and canonical asset boundaries:

`Workspace → Catalogue / Price List → Client Gallery Store Settings → Visitor or Client Identity Cart → Order Snapshot → Payment / Lab Adapters`

Key invariants:
- a cart item references one canonical `assets.id` already visible in that Client Gallery;
- public requests cannot supply authoritative prices, product names or totals;
- the server resolves the active gallery price list and revalidates price/availability immediately before order creation;
- the order header, immutable lines and cart conversion are committed together through one D1 batch;
- crop choices are instructions only and never modify or duplicate the stored original;
- order lines are immutable commercial snapshots of sell price, studio cost, crop and lab mapping, while catalogue records remain editable for future sales;
- a converted cart is retained for audit and a later visit starts a new active cart;
- `commerce_payment_events` is the payment-provider webhook/idempotency boundary;
- lab connector keys and references are fulfilment metadata, not direct coupling to one laboratory.

v1.6.0 stops at recorded order submission. A later payment adapter may move an order through `awaiting_payment`/`paid`, and a later lab adapter may move approved lines through fulfilment. Manual payment and manual fulfilment remain valid fallbacks.

## Stripe payment boundary — v1.6.1
The hosted payment path is:

`Canonical cart → server-authoritative order snapshot → Stripe Checkout Session → signed/idempotent payment event → paid order → photographer review → future lab adapter`

Security and consistency invariants:
- raw card data never enters MKB Intelligence; the browser is redirected to Stripe-hosted Checkout;
- Checkout line items, currency and total are built from the D1 order snapshot, not browser-supplied prices;
- Checkout creation uses an idempotency key scoped to order and attempt;
- webhook verification uses the untouched request body, `Stripe-Signature` header and endpoint signing secret;
- browser success/cancel redirects are presentation only; the server retrieves the Stripe Session or processes a signed webhook before changing payment state;
- provider event IDs are unique and duplicate delivery is safe;
- amount/currency mismatch is recorded as rejected and cannot mark the order paid;
- stale failed/expired events and older Checkout attempts cannot regress a verified paid/refunded order;
- secrets exist only in Cloudflare environment configuration and are never returned in public/Admin payloads;
- stored event payloads are sanitised operational snapshots, not raw Stripe objects or payment-method data.

Payment and fulfilment remain separate adapters. A paid order is not automatically submitted to Prodigi. Photographer approval, print-ready rendering and lab submission remain explicit future stages.

## Prodigi fulfilment boundary — v1.7.0
The first professional-lab path is:

`Paid immutable order → photographer approval → verified product mapping → prepared private JPEG → explicit Prodigi order → callback/API reconciliation → shipment/tracking`

Architecture rules:
- Stripe payment and lab fulfilment remain independent state machines; a payment event cannot call Prodigi.
- Catalogue mappings are editable for future orders, while every order line stores an immutable lab SKU, attributes, print area, sizing and recommended-pixel snapshot.
- Existing unsubmitted order lines can explicitly refresh from the current verified mapping; prepared or submitted lines are not silently rewritten.
- Crop/rotation instructions remain normalised metadata on the order line. Admin renders a separate exact-size JPEG from the authorised private original; the canonical asset and public derivatives are unchanged.
- Prepared JPEGs live under managed `MKB_PRIVATE_ASSETS` keys. Prodigi receives only a random expiring URL; the endpoint discloses neither storage keys nor credentials and returns `private, no-store`.
- Every lab submission has its own provider-neutral record, immutable request snapshot, response snapshot, selected order-line links and provider event ledger.
- Create-order idempotency is retained across retry of an ambiguous failed request.
- Prodigi callback documentation does not define a signature header. The callback URL therefore includes a high-entropy secret token; MKB also validates CloudEvent identity/source and retrieves the current order from Prodigi before applying state.
- Manual status refresh uses the same reconciliation function as callbacks.
- Shipment/tracking data is derived from the provider response snapshot rather than becoming canonical client or asset data.
- Cancellation is best-effort and must never be represented as guaranteed once production has started.
- `PRODIGI_ENABLED` is a kill switch for provider API activity. Sandbox is the default environment and live use requires a physical sample gate.

The provider-neutral tables and route/service boundary allow another lab adapter later without replacing cart, payment, order or canonical asset models.

## Platform operations boundary — v1.8.3

Support access is not a permanent business membership.

`Business owner grant → active/expiring support authority → synthetic support workspace access → audited API requests`

Rules:
- only `support` and `platform_admin` platform users can see support grants as workspace options;
- grants are workspace-owned, scoped (`read` or `manage`) and expire automatically by query-time validation;
- read-only support is blocked from all non-safe API methods by `/functions/api/_middleware.ts`;
- support sessions cannot export business data or request/cancel deletion;
- every support API request is logged without copying request bodies;
- ordinary membership access takes precedence if a platform user also belongs to the business.

Workspace export is generated from a fixed server allowlist plus workspace-scoped relationship joins and batched D1 reads. Browser table names or workspace IDs are never accepted as export authority. Authentication/session tables are excluded and capability-style gallery, print and upload secrets are redacted.

Business deletion is a staged request, not a direct cascade. The request captures cooling-off and retention metadata. A later platform-admin execution release must explicitly classify payment, fulfilment, audit, legal-retention and private-asset records before deletion.

## CRM source-of-truth boundary — v1.9.0

The CRM commercial entity is a neutral `Job`, not the existing editorial Wedding record.

`Verified-domain lead form → Contact + Enquiry → Pipeline → accepted Job → linked/created Wedding`

Authority rules:
- public submissions resolve workspace only from a verified request domain;
- Admin requests resolve workspace only from professional membership/support context;
- all CRM rows carry `workspace_id` and relationship triggers reject cross-workspace links;
- public rate limiting stores a SHA-256 request fingerprint, not raw IP;
- acceptance uses an ordered D1 batch and a unique `(workspace_id, enquiry_id)` Job constraint;
- Accepted/Lost terminal stages are reached only through their dedicated service actions;
- the Job owns commercial status/value; Wedding owns photography content, galleries, suppliers and publishing.

The first public route is fixed at `/enquire`; arbitrary hosted-site paths are deferred until routing can resolve them without colliding with existing website routes. The existing Contact page embeds the same CRM form. See `WEDPLANNED-CRM.md`.
