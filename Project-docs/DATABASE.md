# MKB Intelligence — Database Notes

Always inspect the actual migration files before assuming a table/column exists.

## Schema version
Current target schema version: **27**. Read migrations in sequence; migration 025 adds legacy tenant ownership, migration 026 adds platform operations and migration 027 adds the CRM foundation.

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

## Schema version 11
Migration: `011_private_client_galleries_foundation.sql`

Adds:
- `client_galleries`
- `client_gallery_assets`
- `client_gallery_favourites`

Rules:
- every client gallery is workspace-owned;
- public access uses a high-entropy `access_token` rather than exposing internal IDs;
- optional PINs are stored only as salted PBKDF2 hashes;
- gallery membership references canonical `assets.id` and never filenames;
- existing `web`/`thumb` derivatives may be used as previews, but private originals are not implied or fabricated;
- secure original download authorization is deferred until `asset_files.variant = 'original'` is populated by the high-volume upload pipeline.

## Schema version 12
Migration: `012_private_original_upload_and_secure_delivery.sql`

Adds:
- `asset_upload_sessions`
- `asset_download_events`

`asset_upload_sessions` stores workspace/gallery/asset ownership, client file fingerprint, private object key, R2 multipart upload ID, part size, accepted part ETags, processing state and completion timestamps.

`asset_download_events` records authorised original deliveries by workspace, gallery, canonical asset and browser visitor key. It records delivery bytes and user agent, but does not store raw client IP addresses.

No existing asset, image, gallery or R2 object is rewritten by migration 012.


## Wedding preview sets — schema 13
`wedding_preview_sets` provides a reusable named selection boundary for post-wedding preview workflows. The initial built-in set is `wedding-day-previews`, but the model permits additional sets later.

`wedding_preview_assets` links canonical `assets.id` values to a preview set with exact ordering.

Preview-set membership does not copy image files and does not imply public visibility. Publishing destinations are applied separately and use only safe `web` / `thumb` derivatives.

## Schema version 14
Migration: `014_gallery_visitor_identity_permissions.sql`

Adds:
- `client_gallery_access_settings`
- `client_gallery_contacts`
- `client_gallery_visitors`

`client_gallery_access_settings` stores email-gating and guest-download policy without altering legacy `client_galleries` columns.

`client_gallery_contacts` stores gallery-specific authorised email identities and per-contact original-download entitlement. It does not replace the future CRM contact model; it is a delivery permission boundary that can later link to CRM contacts.

`client_gallery_visitors` stores gallery/browser visitor keys, email identity, first/last seen timestamps and visit counts. Raw IP addresses are not stored.

## Schema version 15
Migration: `015_client_selections_and_shortlists.sql`

Adds:
- `client_gallery_selection_requests`
- `client_gallery_selections`
- `client_gallery_selection_assets`

A selection request belongs to one Client Gallery and defines a named task plus optional minimum/maximum image counts. A visitor selection belongs to a request and visitor/email identity and moves from `draft` to `submitted`. Selected images reference canonical `assets.id` only. Submitted selections are immutable to the client until Admin reopens them.

No R2 objects are copied or deleted by this migration.


## Schema version 16
Migration: `016_persistent_client_identity_magic_links.sql`

Adds:
- `client_identities`
- `client_identity_gallery_visitors`
- `client_identity_magic_links`
- `client_identity_sessions`

`client_identities` is a workspace-level verified email identity boundary for future Client Portal/commerce work. `client_identity_gallery_visitors` maps historical/browser visitor keys to a verified identity on a per-gallery basis so existing favourites can be reused without copying asset records.

Magic-link and session credentials are stored as SHA-256 hashes only. Magic links are one-time and expire after 15 minutes. Sessions expire after 30 days and may be explicitly revoked by sign-out. The browser session token is delivered only through an HttpOnly, SameSite=Lax cookie.

No R2 object is copied, renamed or deleted by migration 016. Existing favourites and selections remain in their original tables.


## v1.5.4 Client Gallery Albums — schema 17
`client_gallery_albums` stores workspace-gallery presentation sections such as Getting Ready, Ceremony, Portraits, Reception and Evening.

`client_gallery_album_assets` is a relationship table only. It references existing canonical `assets.id` records and never creates duplicate image files or asset identities. An asset may belong to multiple albums. `All Photos` is not stored as an album; it remains the virtual complete gallery membership from `client_gallery_assets`.

Migration: `d1/migrations/017_client_gallery_workspace_albums.sql`.

## Schema version 18
Migration: `018_client_gallery_branding.sql`

Adds `client_gallery_branding`, one optional row per Client Gallery. Fields store:
- logo mode (`workspace`, `custom`, `hidden`);
- managed custom logo URL/storage key;
- validated accent, page background, surface and text colours;
- limited heading-font choice;
- studio-name visibility.

No data backfill is required. Existing galleries automatically resolve workspace branding defaults until an override is saved. Canonical assets and private originals are unchanged.



## Schema version 19
Migration: `019_client_gallery_photo_ordering.sql`

Adds:
- `client_gallery_display_settings`
- `asset_capture_metadata`

`client_gallery_display_settings.sort_mode` controls Custom / Capture time / Filename presentation. Custom order continues to use existing relationship `sort_order` fields. `asset_capture_metadata` stores EXIF or file-time data independently from filenames and asset identity.


## Schema version 20
Migration: `020_print_store_foundation.sql`

Adds:
- `commerce_products`
- `commerce_product_variants`
- `commerce_price_lists`
- `commerce_price_list_items`
- `client_gallery_store_settings`
- `commerce_carts`
- `commerce_cart_items`
- `commerce_orders`
- `commerce_order_items`
- `commerce_payment_events`

Ownership and identity rules:
- products, price lists, carts and orders are workspace-owned;
- gallery store settings belong to one existing `client_galleries.id`;
- cart/order image choices reference canonical `assets.id`, never filenames or duplicate files;
- crop state is stored as normalised non-destructive JSON coordinates;
- order items snapshot product name, variant, SKU, quantity, unit price, studio cost, crop and lab mapping so later catalogue, pricing or connector edits do not rewrite historical orders;
- payment events are provider-neutral and support idempotent provider event IDs;
- lab connector/product/reference fields are integration boundaries only and do not imply a live lab submission.

Migration 020 does not copy, rename or delete any R2 object. Existing Client Galleries receive disabled default store settings.

## Schema version 21
Migration: `021_stripe_checkout.sql`

Adds to `commerce_orders`:
- immutable photographer-approval requirement snapshot;
- `payment_status` (`unpaid`, `processing`, `paid`, `failed`, `expired`, `refunded`);
- Stripe Checkout Session and Payment Intent identifiers;
- Checkout-attempt count;
- paid, payment-failed and refunded timestamps;
- delivery name, phone and normalised address JSON.

Adds indexes for Checkout Session uniqueness, payment-state review and Payment Intent lookup. Existing v1.6.0 orders are backfilled from their order status without changing order lines or R2 assets.

Payment rules:
- `commerce_orders.total_minor` and currency are compared with the trusted Stripe object before a paid/refunded transition;
- `commerce_payment_events(provider, provider_event_id)` is the idempotency key;
- sanitised provider metadata is retained for audit, not raw card/payment-method details;
- signed Stripe webhooks and server-to-Stripe Session reconciliation are the only automatic payment-state writers;
- stale failed/expired events cannot regress a paid/refunded order;
- delivery details are fulfilment snapshots and do not create a new client identity or asset.

## Schema version 22
Migration: `022_prodigi_fulfilment.sql`

Adds verified mapping fields to `commerce_product_variants`:
- Prodigi/lab SKU;
- attributes JSON;
- print-area and sizing strategy;
- recommended width/height in pixels;
- mapping verification status and timestamp.

Adds the same immutable mapping snapshot fields to `commerce_order_items`. New orders copy these values at order creation. Existing unsubmitted lines may be refreshed explicitly from their current variant; prepared/submitted lines are not automatically changed.

New tables:

### `commerce_print_assets`
- one managed prepared JPEG per order line;
- workspace, canonical asset and order-item ownership;
- private R2 storage key;
- random access token and expiry;
- exact prepared dimensions, original source dimensions, file size and crop snapshot;
- prepared/submitted/revoked/error lifecycle.

### `commerce_lab_submissions`
- provider-neutral order submission record;
- workspace and commerce-order ownership;
- provider order ID/outcome/status;
- shipping method, optional quote fields, request/response snapshots and failure detail;
- submitted/completed timestamps;
- unique non-empty provider order ID.

### `commerce_lab_submission_items`
- selected order lines for each lab submission;
- provider item ID and current provider status;
- composite submission/order-item identity.

### `commerce_lab_events`
- provider callback/reconciliation event ledger;
- unique non-empty provider event ID for idempotency;
- event type, processing state and payload snapshot.

Storage and integrity rules:
- the private R2 object is not the canonical photograph; it is a disposable fulfilment derivative linked back to `assets.id`;
- deleting gallery membership never deletes the canonical original or its prepared fulfilment audit record;
- a paid and approved order is required before submission;
- product mapping changes do not rewrite historical submitted lines;
- provider callbacks are reconciled against the provider API before order/line status changes;
- migration 022 does not copy, rename or delete existing R2 originals.

## Schema version 23
Migration: `023_wedplanned_platform_foundation.sql`

Adds the neutral commercial platform layer:
- `platform_users` — global professional identities; authentication is not yet enabled.
- `business_profiles` — public/legal identity and future marketplace state for one workspace/business.
- `business_memberships` — workspace-owned team membership, role and invitation state.
- `platform_categories` — shared wedding-professional taxonomy.
- `business_category_links` — selected and primary categories per business.
- `business_service_areas` — where a professional works; separate from venue-location gallery intelligence.
- `platform_features` — stable feature keys for commercial access control.
- `workspace_entitlements` — feature access and limits by workspace.
- `platform_audit_events` — business/platform mutation ledger.

Compatibility rules:
- `workspaces.id` remains the ownership key and is presented as a business in WedPlanned product language.
- `workspace_memberships` remains untouched for compatibility; new commercial team records use `business_memberships`.
- MKB Weddings is seeded as the first business and `photographer` is its primary category.
- Marketplace state defaults to private.
- Team invitation records do not grant access until professional authentication and membership enforcement are implemented.
- Existing MKB content and R2 objects are not copied, renamed or deleted.


## Schema version 24
Migration: `024_professional_identity_tenant_context.sql`

Adds professional authentication and server-owned business context:
- `platform_users.verified_at`, `last_authenticated_at` and `last_login_method`;
- `business_memberships.invited_by_user_id` and `invitation_last_sent_at`;
- `platform_auth_links` for one-time login/invitation links;
- `platform_sessions` for professional Admin sessions and active business selection.

Security rules:
- raw link and session tokens are never stored; D1 stores SHA-256 hashes only;
- login links expire after 20 minutes and invitations after seven days;
- links are single-use and may be revoked when replaced;
- sessions expire after 14 days and use an HttpOnly, SameSite=Lax cookie;
- active business context is resolved from an active `business_memberships` row;
- switching business requires an active membership for the same user;
- role permissions are enforced server-side for WedPlanned platform mutations;
- the final active owner cannot be disabled or demoted through the platform API.

Migration compatibility:
- existing `workspace_memberships` are copied additively into `platform_users`/`business_memberships` where possible;
- a valid existing workspace contact email is seeded as the first owner only when no active owner exists;
- no existing MKB rows or R2 objects are deleted, renamed or moved;
- legacy Weddings, Venues, Suppliers, Moments and public collection records remain pending workspace-ownership migration.

## Schema version 25
Migration: `025_legacy_tenant_ownership.sql`

Adds `workspace_id` ownership to the legacy content and compatibility tables that pre-date the workspace foundation: `venues`, `weddings`, `images`, venue/wedding/story image links, supplier compatibility/link tables, `suppliers`, `moments`, custom/public collection definitions, `content_pages` and canonical asset compatibility links.

All existing rows are backfilled to `workspace_mkb_weddings`. The migration is additive: it does not rename legacy slugs, alter published URLs, copy/delete R2 objects or rewrite existing image source metadata. Workspace-prefixed indexes are added for the new query boundary.

Runtime authority is not taken from a browser-supplied workspace ID. Admin services use the authenticated professional membership context; public legacy services use a verified request-domain mapping. Existing MKB fixed content-page keys remain unchanged, while non-MKB fixed definitions use an internal workspace-prefixed key.

Legacy physical primary keys remain globally unique for compatibility in this release. Authorisation does not depend on those keys being secret or tenant-unique; service queries require the resolved workspace. See `WEDPLANNED-TENANT-OWNERSHIP.md` for deployment and isolation validation.

## Schema 26 — Platform Operations Foundation

Migration: `026_platform_operations_foundation.sql`

### `platform_support_grants`
Workspace-owned support authority. A grant is explicit, time-bounded and either `read` or `manage`. Revocation is recorded rather than deleting the grant. Only platform users with `platform_role` of `support` or `platform_admin` may use an active grant.

### `platform_support_events`
Append-only support activity records containing the grant, workspace, support identity, request method/path, status and event type. Request bodies and tenant content are not copied into this table.

### `workspace_export_events`
Records structured JSON export history, file name, table count and record count. Export payloads are generated for the authenticated active workspace and are not persisted in D1 by this release. Authentication/session tables are excluded; gallery PIN/token, print-asset access-token and multipart-upload identifiers are redacted.

Exports deliberately exclude:
- professional authentication links and sessions;
- client magic links and client session tokens;
- binary image files.

They include workspace-owned structured records plus asset/storage references.

### `workspace_deletion_requests`
Stores staged business deletion requests. A partial unique index permits only one open request per workspace. v1.8.3 creates/cancels requests but does not execute destructive deletion. Payment, fulfilment, audit and private-asset retention remain protected execution concerns.

Schema version advances from 25 to **26**.

## Schema 27 — CRM Foundation

Migration: `027_crm_foundation.sql`

### `crm_pipeline_stages`
Workspace-owned enquiry stages. v1.9.0 seeds New, Contacted, Qualified, Proposal/quote sent, Awaiting decision, Accepted and Lost/unavailable for every existing workspace. Stage type (`open`, `won`, `lost`) is distinct from its display name/order.

### `crm_contacts`
Reusable workspace contacts with normalised email, phone, source, consent timestamps and notes. Email uniqueness is workspace-scoped and empty emails are permitted for secondary contacts.

### `crm_enquiries` and `crm_enquiry_contacts`
The pre-booking record and its relationship to primary, partner and other participants. Enquiries store source/campaign, event/date/venue/service/package/budget, consent snapshot, assignment, won/lost state and conversion link. The request fingerprint is a SHA-256 hash used for public form rate limiting; raw IP addresses are not stored.

### `crm_jobs` and `crm_job_contacts`
The accepted commercial engagement. A unique `(workspace_id, enquiry_id)` constraint makes conversion idempotent. A Job links to the existing Wedding by `wedding_slug`; the Wedding remains editorial/delivery state. Wedding rename and permanent-delete services maintain/clear this link.

### `crm_activities`
Workspace-scoped activity history for contact, enquiry and Job events. Platform-significant actions also write to `platform_audit_events`.

### `crm_lead_form_settings`
Per-workspace public lead-form availability, default service, copy, consent and notification email. The form uses the workspace currency for budget capture. v1.9.0 exposes the fixed `/enquire` route; custom paths are deferred to hosted-site routing.

### Relationship enforcement
Migration 027 adds:
- triggers requiring enquiry stages, enquiry contacts, Job enquiries and Job contacts to belong to the same workspace;
- a trigger requiring `accepted_job_id` to reference a Job from the same workspace;
- partial unique indexes allowing only one primary and one partner relationship per enquiry/Job.

The public endpoint resolves `workspace_id` from `workspace_domains`; Admin operations resolve it from professional auth/support context. The browser cannot nominate a workspace.

Schema version advances from 26 to **27**.

## Schema version 28
Migration: `028_client_portal_questionnaires.sql`

Adds:
- `crm_questionnaire_templates`
- `crm_questionnaire_instances`
- `crm_questionnaire_responses`
- `crm_questionnaire_files`
- `crm_job_client_access`
- `crm_portal_invitations`

Questionnaire templates are reusable workspace records. Each assignment copies the template schema/version into `crm_questionnaire_instances`, so a later template edit cannot alter an already-sent questionnaire. Responses are stored by field ID as structured JSON values.

`crm_job_client_access` grants a CRM contact access to one Job. `crm_portal_invitations` stores only one-time token hashes and delivery/use timestamps. Portal authentication reuses the existing client identity/session system, while every portal query also requires active Job access.

Questionnaire attachments are private R2 objects referenced by `crm_questionnaire_files`. The 10 MB upload route validates active workspace/Job/contact access. Business exports include file metadata but redact `storage_key`; portal invitation token hashes are also redacted.

Migration triggers reject cross-workspace template, Job, contact, response and file relationships. A starter Pre-wedding Questionnaire template is seeded per existing workspace. Schema version advances from 27 to **28**.
