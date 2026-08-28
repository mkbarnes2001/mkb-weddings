# WedPlanned Platform Foundation — v1.8.0

## Current status

This document records the original v1.8.0 WedPlanned platform-foundation migration.

The current stable application baseline is **v1.10.12a / schema 51**. Workspace/business ownership, professional authentication, tenant isolation, CRM and Stripe Connect have subsequently been implemented.

Statements below such as “Stripe Connect is not enabled by this migration” remain historically correct for migration 023; they do not describe current platform capability.


## Purpose
v1.8.0 establishes the neutral commercial ownership model required before external wedding professionals can use the platform.

The existing `workspaces` table remains the durable tenant boundary. In product language, a workspace now represents a **WedPlanned business**. This avoids a destructive rename while allowing photographers, venues, planners, florists, entertainers and other wedding professionals to share the same platform architecture.

MKB Weddings remains the first operating business and the default workspace throughout the migration.

## Deployment
1. Run both production builds:
   ```bash
   npm run build
   npm run build:admin
   ```
2. Apply only migration:
   ```text
   d1/migrations/023_wedplanned_platform_foundation.sql
   ```
3. Confirm:
   ```sql
   SELECT key, value FROM schema_meta WHERE key = 'schema_version';
   ```
   Expected value: `23`.
4. Run:
   ```sql
   PRAGMA foreign_key_check;
   ```
   Expected result: no problem rows.
5. Deploy the public and Admin projects.

No new environment variable, Stripe key, domain binding or R2 binding is required for v1.8.0.

## Admin workflow
Open **Admin → WedPlanned**.

The foundation workspace contains:
- Business identity and future marketplace slug;
- wedding-professional categories and one primary category;
- business service areas;
- staged team memberships and roles;
- feature entitlements;
- tenant-isolation readiness report;
- recent platform audit events.

## Important limitation
Team invitations are records only in v1.8.0. They do not send email and do not grant access. Professional authentication, invitation acceptance, session-to-business resolution and membership enforcement are the next security phase.

The following established modules are already workspace-owned:
- workspace identity and settings;
- canonical Asset Library;
- Client Galleries and client identities;
- Location Intelligence;
- Print Store, Stripe payment records and Prodigi fulfilment.

The following legacy MKB domains remain flagged for controlled ownership migration:
- Weddings and wedding stories;
- Venues;
- Suppliers;
- Moments and photographer-defined public galleries.

External professionals must not be invited until those routes and records are tenant-enforced and professional authentication is live.

## Data model
Migration 023 adds:
- `platform_users`
- `business_profiles`
- `business_memberships`
- `platform_categories`
- `business_category_links`
- `business_service_areas`
- `platform_features`
- `workspace_entitlements`
- `platform_audit_events`

MKB Weddings is seeded as:
- first WedPlanned business;
- primary category `photographer`;
- private marketplace profile;
- internal entitlement source with all current foundation features enabled.

## Guardrails
- `workspace_id` remains the database ownership key until a future major migration deliberately changes it.
- UI language may say “business”; storage compatibility may continue to say “workspace”.
- Client-supplied workspace IDs must never become the authority for access.
- External access will be resolved from an authenticated membership and server-side business context.
- Marketplace publication is private by default.
- Stripe Connect is not enabled by this migration.
- Existing MKB Stripe and Prodigi flows remain unchanged.


## v1.8.1 extension
Professional identity is now active at the platform layer. One-time invitations/sign-in links, hashed sessions, role permissions and server-resolved active-business context are documented in `WEDPLANNED-AUTH.md`.

The remaining commercial blocker is legacy tenant ownership. External businesses must not be onboarded until Weddings, Venues, Suppliers, Moments and public collection definitions are workspace-owned and pass cross-tenant tests.
