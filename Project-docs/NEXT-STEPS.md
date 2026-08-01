# Next Steps

## Current baseline
The production baseline is commit `e0e3ab6` with v1.8.2 tenant ownership, clean Client Gallery slugs, the standalone Print Store and the latest Admin UI polish. Production D1 is schema **25** and the live second-business isolation audit has passed.

## v1.8.3 — Platform Operations Foundation
This release advances D1 to schema **26** and closes the final operational safeguards before the CRM begins.

Included:
1. Time-bounded support grants owned by the active business.
2. Read-only or managed support scope.
3. Read-only support enforcement at the API boundary.
4. Support request/session audit events.
5. Workspace-scoped structured JSON data export, excluding authentication/session secrets and image binaries and redacting gallery/print/upload capability secrets.
6. Export history.
7. Staged business deletion requests with a 14-day cooling-off period.
8. Cancellation and protected-record/asset safeguards; no automatic destructive deletion.
9. Admin → WedPlanned → Operations UI.
10. Migration `026_platform_operations_foundation.sql`.

## v1.8.3 validation and rollout
1. Run `python3 scripts/test-legacy-tenant-isolation.py` and require PASS/schema 26.
2. Run `python3 scripts/test-platform-operations.py` and require PASS.
3. Run `npm run build` and `npm run build:admin`.
4. Run `git diff --check`.
5. Commit locally, but do not push.
6. Export/backup production D1 and capture a Time Travel bookmark.
7. Apply migration 026 before deploying code.
8. Verify schema 26 and `PRAGMA foreign_key_check`.
9. Push code and confirm both Pages deployments.
10. Test Operations on MKB and `workspace_wedplanned_test`:
   - support grant/revoke remains workspace-scoped;
   - data export contains only the active business;
   - staged deletion request can be created and cancelled;
   - read-only support POST/PUT/DELETE requests are blocked.

## Next major product phase — v1.9 CRM
The CRM now comes **before full Stripe Connect**, because quotes, invoices and client payments need a durable Enquiry → Job/Wedding workflow to attach to.

### v1.9.0 CRM Foundation
- contacts;
- public lead/enquiry form;
- enquiry pipeline;
- accepted/lost workflow;
- accepted enquiry creates a neutral Job and links/creates the workspace Wedding record;
- activity history and audit.

### v1.9.1 Client Portal and Questionnaires
- portal invitations;
- versioned questionnaires and structured responses;
- client-entered supplier team;
- Supplier Master search plus review/merge queue for unknown suppliers;
- approved responses update the Job/Wedding relationships.

### v1.9.2 Commercial workflow
- services and packages;
- quotes;
- contracts;
- invoices/payment schedules;
- tasks, workflow templates and reminders.

### v1.9.3 Connected payments
- Stripe Connect onboarding and account webhooks;
- invoice/payment webhooks;
- business-owned client payments;
- Stripe Billing for WedPlanned subscriptions remains a separate relationship.

See `WEDPLANNED-CRM.md` for the detailed model and conversion workflow.

## Guardrails
- `workspaces.id` remains the durable business ownership key.
- Browser-supplied workspace IDs are never an access-control decision.
- Unknown public domains never inherit another tenant.
- Support access is explicit, time-bounded and auditable.
- Support sessions cannot download business exports or request deletion.
- Deletion requests are staged; payment/audit/fulfilment records and private assets require deliberate execution rules.
- A CRM Job is the commercial source of truth; the existing Wedding remains the content/delivery/publishing record.
- Client-entered suppliers cannot overwrite the reusable Supplier Master directly.
- Couple/client payments and WedPlanned SaaS subscriptions remain separate Stripe relationships.
