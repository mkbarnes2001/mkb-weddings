# Next Steps

## Current baseline
v1.8.2 tenant ownership is **production-complete** on schema **25**. The production audit passed with a real second business, known MKB slugs/IDs, mutation/publish attempts, private-original access and verified-domain resolution. `workspace_wedplanned_test` remains available as a regression tenant.

v1.8.2e is deployed. v1.8.2f is the small no-migration Gallery UI follow-up for the remaining Venue/Moments/Client Gallery issues found in live testing. It does not change the tenant model, D1 schema, R2 ownership or environment configuration.

## v1.8.2f deployment and validation
1. Run `python3 scripts/test-legacy-tenant-isolation.py` and require a PASS.
2. Run `npm run build` and `npm run build:admin` in the normal Mac development environment.
3. Run `git diff --check`.
4. Confirm Venue Gallery thumbnails no longer carry large Venue/Moments overlay text and instead show compact H/V/M indicators below the image.
5. Confirm Moment-page Add moment / Save actions are slim single-row Admin buttons at desktop and mobile widths.
6. Confirm the public/private Client Gallery uses Montserrat consistently for headings, body copy and Shop Prints.
7. Open Shop Prints at 100% browser zoom and confirm the drawer scrolls from Step 1 through crop controls, cart and checkout without scrolling the gallery behind it. Repeat on mobile.
8. Switch once to `workspace_wedplanned_test` and confirm no MKB data appears.

Detailed ownership, rollback and R2 notes remain in `WEDPLANNED-TENANT-OWNERSHIP.md`.

## Next engineering sequence
1. Deploy and smoke-test the v1.8.2f Gallery UI follow-up above.
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
- The v1.8.2 production ownership audit has passed; Stripe Connect may proceed only after the planned support/export/deletion foundations are deliberately sequenced.
- A rollback path must remain available while authentication or ownership migrations are being enabled.
