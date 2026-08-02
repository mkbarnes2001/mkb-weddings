# Next Steps
## Current release candidate — v1.9.1b Supplier Questionnaire Integration and Job Workspace
1. Run all five schema-29 regression tests and both Vite builds.
2. Review the Job workspace, contact editor and supplier questionnaire field in WedPlanned Test Business.
3. Take a production D1 export and Time Travel bookmark.
4. Apply only `029_supplier_questionnaire_integration.sql` while production code remains on v1.9.1a.
5. Verify schema 29, `crm_supplier_submissions`, starter-template upgrade and clean foreign keys.
6. Deploy public/Admin code and use a temporary verified public hostname for the test business.
7. Submit one known supplier and one unlisted supplier through the client portal; verify automatic Wedding linking, approval/merge/reject and MKB isolation.
8. Verify contact editing and confirm an invitation cannot be sent without a verified public domain.
9. Remove the temporary hostname and tag only after the live workflow passes.

## Following CRM releases
- v1.9.2: workflow templates, tasks, communication history, lead/job list views and autoresponders.
- v1.9.3: packages, quotes, contracts, invoices, payment schedules and Stripe-connected payments.

## Current baseline
The stable production baseline before this source release is **v1.8.3 Platform Operations Foundation**, commit `0385e9e`, with production D1 on schema **26**. Authentication, tenant ownership, second-business isolation, support access, workspace export and staged deletion have passed production validation.

## Current source release — v1.9.0 CRM Foundation
This release advances D1 to schema **27** and establishes the first complete client workflow:

`Public lead form → Contact + Enquiry → Pipeline → Accepted booking → Job → linked/created Wedding`

Included:
1. Workspace-owned CRM stages, contacts, enquiries, relationships, Jobs and activity history.
2. Public `/enquire` form resolved from the verified request domain; browser-supplied workspace IDs are never accepted.
3. Consent capture, honeypot handling, hashed request-fingerprint rate limiting and optional Resend notification.
4. Admin CRM pipeline, Contacts, Jobs and lead-form settings.
5. Manual enquiry creation and detailed enquiry/client editing.
6. Lost/unavailable workflow with retained history.
7. Idempotent accepted-booking conversion creating one Job and linking or creating the existing workspace Wedding record.
8. CRM role permissions, support-mode integration, export coverage and platform audit/activity records.
9. Database triggers preventing cross-workspace stage/contact/job relationships and unique primary/partner relationship indexes.
10. Migration `027_crm_foundation.sql`.

## v1.9.0 validation and rollout
1. Apply the patch through Terminal/`rsync`; never replace the repository folder.
2. Run:
   - `python3 scripts/test-legacy-tenant-isolation.py`
   - `python3 scripts/test-platform-operations.py`
   - `python3 scripts/test-crm-foundation.py`
   - `npm run build`
   - `npm run build:admin`
   - `git diff --check`
3. Commit locally, but do not push.
4. Export production D1 and capture a Time Travel bookmark.
5. Confirm production schema 26.
6. Apply migration 027 before deploying code.
7. Verify schema 27, CRM tables/triggers/indexes and `PRAGMA foreign_key_check`.
8. Push code and confirm both Pages deployments.
9. Test first on `workspace_wedplanned_test`:
   - CRM opens with seven default stages and no MKB records;
   - manual enquiry/contact creation works;
   - cross-business known IDs remain unavailable;
   - accepting a test enquiry creates exactly one Job and one linked Wedding;
   - accepting it again creates no duplicate;
   - lost workflow and activity history work;
   - public lead form is disabled unless explicitly enabled for that business.
10. Test MKB:
   - `/enquire` and Contact form resolve MKB from `www.mkbweddings.co.uk`;
   - one disposable lead appears in CRM and notification delivery behaves as configured;
   - accepting a disposable test lead creates the Job/Wedding workflow;
   - remove/archive disposable test records only after validation.

## Next release — v1.9.1 Client Portal and Questionnaires
- portal invitations and CRM-contact identity linkage;
- versioned questionnaire templates and immutable sent instances;
- structured responses and completion tracking;
- supplier-team questionnaire;
- Supplier Master search and unknown-supplier approval/merge queue;
- approved responses update Job/Wedding relationships without allowing clients to overwrite reusable master data.

## Later releases
### v1.9.2 Commercial workflow
- services/packages;
- quotes and acceptance;
- contracts/signatures;
- invoices/payment schedules;
- tasks, workflow templates and reminders.

### v1.9.3 Connected payments
- Stripe Connect onboarding and account webhooks;
- invoice/payment webhooks attached to Jobs;
- business-owned client payments;
- WedPlanned subscription billing remains a separate Stripe relationship.

## Guardrails
- `workspaces.id` remains the durable business ownership key.
- Public CRM workspace resolution comes only from a verified request domain.
- Professional CRM access comes only from the authenticated active membership/support context.
- Accepted conversion is idempotent and auditable.
- The neutral Job is the commercial source of truth; Wedding remains the content/delivery/publishing record.
- Client-entered questionnaire/supplier data will enter reviewable workflow records, not mutate Venue/Supplier masters directly.
- Couple payments and WedPlanned SaaS subscriptions remain separate provider relationships.

See `WEDPLANNED-CRM.md` for the detailed model.
