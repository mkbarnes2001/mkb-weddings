# MKB Intelligence — Roadmap

## Current commercial baseline
Completed and in production:
- Workspace / studio ownership foundation
- Weddings, venues, suppliers, moments, locations and galleries
- Unified Asset Library
- Private Client Galleries
- Private full-resolution JPEG upload to private R2
- Generated web / thumbnail derivatives
- Secure individual original downloads
- Download audit records
- Montserrat Admin design system

## v1.3 — Wedding Workspace & Post-Wedding Workflow
- One operational page per wedding
- Link / change venue, including inline quick-create for new venues
- Assign reusable master suppliers, including inline quick-create for new suppliers
- Create or open the linked Client Gallery
- Upload full-resolution preview JPEGs directly
- Maintain a reusable Wedding Day Preview Set
- Add previews to Venue, Moments and photographer Galleries without re-uploading
- Generate editable Instagram preview captions from venue / supplier Instagram data
- Keep private originals protected while publishing only safe web derivatives

## Completed — Gallery Visitor Identity & Permissions
- Optional required email entry before viewing a gallery
- Visitor identity and activity history
- Linked client / couple email identities
- Per-person download entitlements
- Couple may receive full-resolution downloads while guests remain view / favourite / print-order only
- Guest favourites, downloads and future orders tied to visitor identity


## v1.5 — Client Selections, Shortlists & Persistent Identity
- Secure one-time email sign-in with persistent cross-device client sessions
- Cross-device favourite synchronisation through verified client identity
- Named photographer-created selection requests
- Optional minimum / maximum image counts
- Auto-saved draft selections tied to visitor/email identity
- Submit/lock lifecycle with Admin reopen
- Admin response review
- Copy filenames and CSV export for Lightroom/manual workflows
- Canonical asset references only; no duplicate image storage

## Completed — Client Gallery Workspace Refinement
- Persistent workspace navigation, albums, client activity, access and branding
- Compact photo menus and ShootProof-style card treatment
- Custom, capture-time and filename ordering
- Drag-and-drop All Photos and album sequences
- EXIF/file-time metadata for future uploads with deterministic legacy fallback

## Completed — Global Admin UI System
- Shared Admin page-header, panel, toolbar, action, icon-button, tab, status, field and empty-state primitives.
- Compact global design tokens for consistent controls, forms, cards, tables and dialogs.
- Main Admin repositories and control centres now use the same visual structure.
- Legacy detail/editor pages inherit the visual system without route, API or data changes.
- Future Print Store, CRM and Lightroom modules should use these primitives from their first release.

## Next — Print Store Foundation
- Workspace product catalogue and price lists
- Print sizes, products and studio markup
- Cart and crop choices
- Orders and payment-provider boundary
- Photographer approval before lab fulfilment
- Lab connector interface with Loxley as the first target subject to partner/API access

## Print Store & Professional Lab Fulfilment
- Product catalogues and workspace price lists
- Cart, crop selection, checkout and order management
- Photographer approval workflow
- Extensible lab-connector architecture
- Loxley Colour as the initial UK lab integration target, subject to commercial/API access
- Manual fulfilment fallback so the store is not coupled to one lab

## Lightroom Classic Publish Plugin
- Authenticate a studio to MKB Intelligence
- Create / select Client Galleries from Lightroom Classic
- Export JPEG, sRGB, full resolution, configurable high-quality JPEG settings
- Resumable upload through the same ingestion APIs as the browser uploader
- Publish Service sync / republish in later versions
- Future Intelligence assistance for Venue / Moment / Gallery candidate assignments

## CRM + Client Portal
- Enquiries / leads
- Client and contact records
- Wedding / job pipeline
- Quotes, packages, contracts and invoices
- Payment-provider integration and webhooks
- Questionnaires and workflow automation
- Client portal

### Client-entered supplier workflow
The client portal must allow couples to populate their wedding team directly into the same structured Wedding record used by Admin.

Required behaviour:
- Search the reusable Supplier Master Database before creating a new supplier
- Select a known supplier and wedding-specific role
- Allow the same supplier in multiple roles
- Unknown suppliers enter an approval / merge queue rather than immediately creating permanent duplicates
- Clients may suggest supplier details but cannot overwrite global master supplier records directly
- Suggested changes to master data require studio approval
- Supplier Instagram usernames should feed post-wedding social caption generation automatically

## Delivery expansion
- Full-gallery ZIP generation with queued / cached delivery
- Upload session cleanup and storage usage reporting
- Background derivative generation for very large galleries
- Client selections / shortlists in addition to favourites
- Vendor preview links and controlled web-resolution sharing

## Commercial SaaS
- Plans / billing
- Storage quotas
- Multi-user roles and permissions
- Tenant isolation auditing
- Onboarding and import tooling
- Custom domains / subdomains
- Hosted galleries and website embeds
- Public API / plugins / SDKs
- Monitoring, backups and support tooling

## Venue discovery / global geography
- Keep Workspace Venue records as the source of truth.
- Support internal text search first, then optional external venue-directory connectors.
- Google Places is the first connector adapter; provider-specific IDs/content must not become the core Venue identity.
- Country selection must remain global; administrative geography comes from configurable Location Types (county, state, province, region, destination, custom).
- Future SaaS onboarding should allow a studio to choose its default country and enabled Location Types without code changes.

## Gallery identity foundation completed in v1.4.0
- Optional required-email gallery entry
- Linked client email permissions for full-resolution downloads
- Guest view/favourite access with separate download policy
- Visitor activity tracking without raw IP storage

Next delivery/commerce work should build client selections, print-store ordering and lab fulfilment on top of this identified visitor model.

## v1.5.2 — Favourite Review & Full-Resolution Download
- Admin favourite thumbnail review.
- Per-person and combined deduplicated favourites.
- Secure individual original download.
- Streamed Download All ZIP for favourites and formal selections.
- Direct album-design handoff using preserved original filenames.


## Completed before Print Store: v1.5.4 Client Gallery Workspace
The Client Gallery management surface has been consolidated before commerce work begins: Photos is now the operational default, client activity/access/settings are separated, and canonical assets can be organised into reusable gallery albums/sections. This provides the cleaner gallery shell that future Print Store/cart/order controls can plug into without crowding the core editor.

## Completed before Print Store: v1.5.5 Photo Menus & Branding
- Compact per-photo options menu in Client Gallery Admin.
- Safe single-photo actions without exposing permanent controls on every thumbnail.
- Per-gallery client-facing logo and colour scheme with workspace defaults.
- Managed public R2 logo upload, live preview and safe theme tokens.

The Client Gallery workspace is now ready for Print Store navigation and product controls without further crowding the Photos screen.

