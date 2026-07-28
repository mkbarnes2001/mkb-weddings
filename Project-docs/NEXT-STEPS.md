# Next Steps

## Current baseline
v1.8.1 adds professional identity, invitation acceptance, secure sessions, role permissions and server-owned active-business context. Schema version is **24**. MKB Weddings remains the first operating WedPlanned business. Existing MKB website, Client Gallery, Stripe and Prodigi behaviour is preserved.

Professional authentication can now be enabled on the Admin Pages project, but external businesses must not yet be onboarded because legacy Weddings, Venues, Suppliers, Moments and public collection definitions are not fully workspace-owned.

## v1.8.1 deployment and validation
1. Run `npm run build` and `npm run build:admin`.
2. Apply `d1/migrations/024_professional_identity_tenant_context.sql`.
3. Confirm `schema_meta.schema_version` is `24`.
4. Run `PRAGMA foreign_key_check;` and confirm no problem rows.
5. Deploy with `WEDPLANNED_AUTH_ENFORCED=false`.
6. Open Admin → WedPlanned → Team and confirm the intended owner email has an active owner membership. If not, invite it while bootstrap mode is active.
7. Configure professional email delivery on the Admin Pages project and accept one invitation/sign-in link.
8. Confirm Admin shows `Secure session`, the correct business and owner role.
9. Confirm a reused or expired link is rejected.
10. Confirm an owner can invite/manage a member, while a manager cannot manage team membership.
11. If the professional belongs to multiple test businesses, confirm only active memberships appear in the business switcher and an unowned workspace cannot be selected.
12. Set `WEDPLANNED_AUTH_ENFORCED=true`, redeploy Admin, sign out and complete a fresh passwordless sign-in.
13. Confirm unauthenticated Admin API requests return 401 while the public Pages project, Stripe webhook and Prodigi callback routes remain unaffected.
14. Keep `WEDPLANNED_AUTH_DEBUG_LINKS=false` in production.
15. Keep external professional onboarding closed until v1.8.2 is complete.

Detailed rollout and rollback instructions are in `WEDPLANNED-AUTH.md`.

## Next engineering sequence
1. Build **v1.8.2 Legacy Tenant Ownership Migration**. Add `workspace_id` ownership and enforced query scoping to Weddings, Venues, Suppliers, Moments and public collection definitions.
2. Backfill every existing MKB record to `workspace_mkb_weddings` without changing published URLs or R2 objects.
3. Update Admin and public services so the authenticated membership or public domain resolves the business context; never accept a client-supplied workspace ID as authority.
4. Add cross-tenant tests proving Business A cannot read, mutate, publish, download or infer Business B data across D1 and R2.
5. Add support-access controls, explicit support audit events, data export and account-deletion foundations.
6. Build **v1.8.3 Stripe Connect & Commercial Billing** only after the ownership audit passes.
7. Add hosted connected-account onboarding and connected-account webhooks so each professional receives their own client payments.
8. Add Stripe Billing for WedPlanned subscriptions separately from couple-to-professional payments.
9. Build the universal CRM and client/couple portal: enquiries, contacts, weddings/jobs, tasks, messages, questionnaires, quotes, contracts and invoices.
10. Add services, packages, availability and online booking after CRM, contracts and connected-payment ownership are established.
11. Add public supplier profiles, marketplace search, advertising and collaborative content only after private tenant operations are secure.

## Guardrails
- `workspaces.id` remains the durable business ownership key.
- A browser-supplied workspace or business ID is never an access-control decision.
- One photograph equals one canonical asset. Gallery membership changes never duplicate or delete private originals.
- Public marketplace fields remain separate from private CRM, payment, contract and operational data.
- Couple/client payments and professional SaaS subscriptions remain separate Stripe relationships.
- Stripe Connect is not enabled until legacy tenant ownership and cross-tenant tests pass.
- A rollback path must remain available while authentication or ownership migrations are being enabled.
