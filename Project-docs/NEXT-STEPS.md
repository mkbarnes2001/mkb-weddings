# Next Steps

## Current baseline
v1.8.2 implements the **Legacy Tenant Ownership Migration** in source. Schema version is **25**. MKB Weddings remains the first operating WedPlanned business.

The v1.8.1 production sign-out test has been completed successfully. Professional identity/session context is therefore the active Admin ownership source. Migration 025 now adds `workspace_id` to the remaining legacy Weddings, Venues, Suppliers, Moments, image relationship and public collection-definition tables and backfills existing records to `workspace_mkb_weddings`.

External professional onboarding must remain closed until v1.8.2 has been deployed and the production tenant-isolation checks below have passed.

## v1.8.2 deployment and validation
1. Run `python scripts/test-legacy-tenant-isolation.py` and require a PASS.
2. Run `npm run build` and `npm run build:admin` in a clean environment with dependencies installed for the deployment OS.
3. Take the normal D1 backup/export before migration.
4. Apply `d1/migrations/025_legacy_tenant_ownership.sql` while v1.8.1 is still serving traffic. The migration is additive and backward-compatible with v1.8.1.
5. Confirm `schema_meta.schema_version` is `25` and the MKB backfill is present.
6. Deploy the v1.8.2 tenant-aware code.
7. Run `PRAGMA foreign_key_check;` and confirm no problem rows after the code deploy.
8. Confirm existing MKB Admin Weddings, Venues, Suppliers, Moments, Locations, Asset Library, Client Galleries, Print Store and Gallery Management still show the expected data.
9. Confirm existing MKB venue/wedding/moment/location/photographer public gallery URLs still render correctly.
10. Confirm upload, publish and managed-image deletion still work for MKB without renaming existing R2 objects.
11. Create/use a second test business membership and switch to it. Confirm known MKB slugs/IDs do not appear through Admin lists, detail endpoints, Workspace Settings, Asset Library facets, Client Galleries, Print Store/Prodigi actions or mutation/publish calls.
12. Confirm a verified test public domain resolves only its own business content; an unknown/unverified production domain must not fall through to MKB or another tenant.
13. Confirm the D1 health endpoint reports connectivity/schema only and does not expose global tenant record counts.
14. Keep external onboarding closed until steps 8–13 pass in production.

Detailed ownership, rollback and R2 notes are in `WEDPLANNED-TENANT-OWNERSHIP.md`.

## Next engineering sequence
1. Complete the v1.8.2 production ownership audit above and record the result in `PROJECT-STATE.md`.
2. Add support-access controls with explicit, time-bounded support authority and auditable support events.
3. Add business data-export foundations covering workspace-owned operational records and asset references without leaking another business's data.
4. Add account/business deletion foundations with explicit retention rules, staged deletion and protected payment/audit records.
5. Build **v1.8.3 Stripe Connect & Commercial Billing** only after the v1.8.2 production ownership audit passes.
6. Add hosted connected-account onboarding and connected-account webhooks so each professional receives their own client payments.
7. Add Stripe Billing for WedPlanned subscriptions separately from couple-to-professional payments.
8. Build the universal CRM and client/couple portal: enquiries, contacts, weddings/jobs, tasks, messages, questionnaires, quotes, contracts and invoices.
9. Add services, packages, availability and online booking after CRM, contracts and connected-payment ownership are established.
10. Add public supplier profiles, marketplace search, advertising and collaborative content only after private tenant operations are secure.

## Guardrails
- `workspaces.id` remains the durable business ownership key.
- A browser-supplied workspace or business ID is never an access-control decision.
- Public legacy content is selected from a verified domain mapping; unknown production domains do not inherit the default tenant.
- One photograph equals one canonical asset. Gallery membership changes never duplicate or delete private originals.
- Existing MKB published URLs and R2 objects remain stable through migration 025.
- Public marketplace fields remain separate from private CRM, payment, contract and operational data.
- Couple/client payments and professional SaaS subscriptions remain separate Stripe relationships.
- Stripe Connect is not enabled until the v1.8.2 production ownership audit passes.
- A rollback path must remain available while authentication or ownership migrations are being enabled.
