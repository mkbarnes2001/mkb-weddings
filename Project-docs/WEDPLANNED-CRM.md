# WedPlanned CRM Architecture

## Product role
The CRM is the operational spine of WedPlanned. Galleries, supplier capture, questionnaires, quotes, contracts, invoices, payments and public wedding content should attach to a single client/job lifecycle rather than behaving as separate tools.

The first MKB workflow is:

`Lead form → Enquiry pipeline → Accepted job → Wedding created → Client portal → Questionnaires → Supplier team → Delivery / Client Gallery`

The data model must remain useful to venues, planners, florists, bands and other wedding professionals. Therefore the commercial record is a neutral **Job**, while a wedding-specific extension and the existing Wedding record provide wedding content/delivery behaviour.

## v1.9.0 implementation status
Implemented in the current source release:
- seven default workspace pipeline stages;
- reusable CRM contacts and enquiry/contact roles;
- manual and verified-domain public enquiry capture with workspace currency/default-service settings;
- consent, honeypot and hashed request-fingerprint rate limiting;
- Admin pipeline, Contacts, Jobs, form settings and enquiry workspace;
- accepted/lost actions and activity history;
- idempotent Job conversion and Wedding create/link;
- professional permissions, support controls, export coverage and database relationship triggers.

The public route is `/enquire` in v1.9.0. Custom hosted-site paths are deliberately deferred. Existing weddings are not bulk-converted automatically; they can remain content/delivery records until a Job is created or linked through a deliberate import/onboarding workflow.

## Core hierarchy

`Workspace → Enquiry → Contacts → Job → Wedding details / Deliverables`

### Enquiry
A prospective booking before acceptance.

Minimum fields:
- source and campaign;
- status / pipeline stage;
- primary contact and partner/contact relationships;
- event date or date flexibility;
- venue text and optional matched venue;
- service/package interest;
- budget and notes;
- assigned team member;
- created, contacted, qualified, won/lost timestamps.

### Contacts
People belong to the workspace and may participate in multiple enquiries/jobs.

Contact roles are relationship data, not fixed properties:
- primary client;
- partner;
- planner;
- venue contact;
- billing contact;
- other participant.

Existing `client_identities` and gallery contacts remain delivery/authentication boundaries. They may later link to a CRM contact, but are not the CRM master contact record.

### Job
The accepted commercial engagement.

A Job stores:
- job type, status and pipeline;
- booking date and event date;
- owner/assignee;
- service/package and value;
- linked contacts;
- linked venue/location;
- client-portal state;
- quote/contract/invoice/task/questionnaire relationships.

For MKB, accepting a wedding enquiry creates:
1. a CRM Job;
2. wedding-specific CRM details;
3. an existing workspace-owned `weddings` record when one does not already exist;
4. links between the Job and that Wedding record.

The conversion must be transactional and idempotent: clicking Accept twice must not create two Jobs or Weddings.

## Lead form
The first public CRM surface will be a workspace/domain-resolved enquiry form.

Required safeguards:
- verified public-domain workspace resolution;
- server-owned workspace assignment;
- rate limiting / bot protection;
- consent and privacy notice fields;
- duplicate-contact detection without exposing whether an email already exists;
- configurable notification to the business;
- no browser-supplied workspace authority.

## Initial pipeline
Default stages:
1. New enquiry
2. Contacted
3. Qualified
4. Proposal / quote sent
5. Awaiting decision
6. Accepted
7. Lost / unavailable

Stages should become workspace-configurable after the foundation is stable.

## Accepted-job conversion
The Accept action should request any missing essentials, then perform one server transaction:
- mark enquiry won;
- create Job;
- link contacts;
- create or link the Wedding record;
- copy date, venue and client names;
- create the onboarding workflow;
- create/send the first questionnaire or portal invitation;
- record an audit event.

No enquiry data should be retyped after acceptance.

## Questionnaires and client portal
Questionnaires use templates and versioned instances. A sent questionnaire retains its questions even if the template changes later.

First questionnaire set for MKB:
- couple/contact details;
- wedding date/timeline;
- ceremony and reception locations;
- wedding party/family details;
- supplier team;
- photography priorities and restrictions;
- final schedule and emergency contacts.

Responses are structured data with optional free text. Approved responses update the Job/Wedding; they are not stored only as a PDF or email.

## Client-entered supplier workflow
Supplier answers write into a review queue before changing the Supplier Master.

1. Client selects a role.
2. Search workspace Supplier Master.
3. Select a known supplier or suggest an unknown supplier.
4. Known supplier creates/updates the wedding-specific relationship.
5. Unknown supplier creates a review suggestion.
6. Studio approves, merges or rejects the suggestion.
7. Clients never overwrite reusable supplier master data directly.

The same supplier may hold more than one wedding role. Wedding-specific role/order remain in the relationship. Instagram usernames can later feed social-caption tools.

## Release sequence

### v1.9.0 — CRM Foundation
- CRM contacts;
- enquiries and lead form;
- default pipeline;
- enquiry detail/activity;
- accept/lost actions;
- accepted enquiry creates Job and Wedding relationship.

### v1.9.1a — Client Portal and Questionnaires
- Job/contact-scoped portal invitation and magic-link authentication;
- questionnaire template builder and immutable assigned instances;
- save-and-return structured responses, required validation and private files;
- Admin review, completion tracking and access revocation.

### v1.9.1b — Supplier Questionnaire Integration
- supplier-search field backed by Supplier Master;
- unknown-supplier suggestion and approval/merge queue;
- wedding-specific role selection;
- approved responses create Wedding Supplier links and explicit Job/Wedding updates.

### v1.9.2 — Commercial Workflow
- services/packages;
- quotes;
- contracts/signatures;
- invoices/payment schedules;
- tasks, workflow templates and reminders.

### v1.9.3 — Connected Payments
- Stripe Connect account onboarding;
- invoice/payment ownership;
- payment webhooks and balances;
- WedPlanned subscription billing kept separate.

## Guardrails
- Every CRM row is workspace-owned.
- A Job is the commercial source of truth; public Wedding stories remain editorial/publishing records.
- Conversion is idempotent and auditable.
- Client responses cannot directly mutate reusable master Venue or Supplier records.
- Private CRM data never becomes marketplace/public-profile data implicitly.
- Payment-provider identifiers attach to invoices/payments, not directly to a public lead.

## v1.9.1a implementation decisions
- The portal is a standalone `/client-portal` route rather than a modal inside a gallery.
- A client may access only Jobs explicitly linked through `crm_job_client_access`.
- Every questionnaire assignment requires one explicit linked contact.
- Template edits increment the reusable template version; assigned instances keep their original schema snapshot.
- Supported field types are heading, description, short text, long text, dropdown, radio, checkbox and private file upload.
- Invitations use the verified workspace public domain and one-time hashed tokens.
- Portal sessions reuse the established client identity/session cookie, while active Job access is checked on every request.
- Supplier answers remain ordinary structured fields until v1.9.1b adds controlled Supplier Master resolution.
