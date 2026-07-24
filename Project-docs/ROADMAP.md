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
- Link / change venue
- Assign reusable master suppliers
- Create or open the linked Client Gallery
- Upload full-resolution preview JPEGs directly
- Maintain a reusable Wedding Day Preview Set
- Add previews to Venue, Moments and photographer Galleries without re-uploading
- Generate editable Instagram preview captions from venue / supplier Instagram data
- Keep private originals protected while publishing only safe web derivatives

## Next — Gallery Visitor Identity & Permissions
- Optional required email entry before viewing a gallery
- Visitor identity and activity history
- Linked client / couple email identities
- Per-person download entitlements
- Couple may receive full-resolution downloads while guests remain view / favourite / print-order only
- Guest favourites, downloads and future orders tied to visitor identity

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
