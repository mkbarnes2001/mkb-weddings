# Next Steps

## Current baseline
v1.8.2 tenant ownership is **production-complete** on schema **25**. The production audit passed with a real second business, known MKB slugs/IDs, mutation/publish attempts, private-original access and verified-domain resolution. `workspace_wedplanned_test` remains available as a regression tenant.

v1.8.2e is the next no-migration Admin UI/usability release. It does not change the tenant model, D1 schema, R2 ownership or environment configuration.

## v1.8.2e deployment and validation
1. Run `python3 scripts/test-legacy-tenant-isolation.py` and require a PASS.
2. Run `npm run build` and `npm run build:admin` in the normal Mac development environment.
3. Run `git diff --check`.
4. Confirm the professional login is centred, uses the Admin font, reads **WedPlanned Pro sign in** and shows the MKB logo.
5. Confirm the desktop sidebar uses the MKB logo and business/session/workspace switching remains visible and functional.
6. Confirm Venue Gallery top actions have readable black styling, image cards show compact Hero/Venue/Moments tags without star ratings, and multi-select exposes only Show/Hide, Assign to moment and Clear.
7. Confirm the Venue Gallery inspector is compact and the existing managed-image deletion workflow still behaves correctly.
8. Confirm Admin → WedPlanned → Services & areas can scroll through the full service selector without scrolling/trapping the page.
9. Confirm a Client Gallery can save a custom slug and the generated private URL is `/client-gallery/<slug>/<token>`; confirm the existing `/client-gallery/<token>` URL still opens the same gallery.
10. Confirm the public Client Gallery uses the Admin sans-serif typography and Shop Prints has an independently scrollable panel on desktop and mobile.
11. Confirm Moment cards are visually separated, can be reordered from the explicit drag handle and save normally.
12. Switch to `workspace_wedplanned_test` once after deployment and confirm no MKB data appears.

Detailed ownership, rollback and R2 notes remain in `WEDPLANNED-TENANT-OWNERSHIP.md`.

## Next engineering sequence
1. Deploy and smoke-test the v1.8.2e Admin UI/usability release above.
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
