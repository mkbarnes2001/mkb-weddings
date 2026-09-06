# Admin refinement — v1.10.15a release scope

Release status is tracked in [v1.10.15a](RELEASE-v1.10.15a.md). The following sections retain each local gate’s original accounting.

Baseline: v1.10.14a, commit `77993d037650afd7c4a4ee8a818c2842e7e42122`, schema **53**.

## Scope completed

- Separate searchable Settings hubs: business settings remain in WedNav; Client experience and a single Templates entry stay in WedCRM at `/admin/crm/settings`. Existing editors retain permission checks; configuration destinations are consolidated from the sidebars.
- Hierarchical return arrows sit inline with the title: template editors return to their list, lists return to Templates, and CRM configuration returns to CRM settings. Explicit Job context takes precedence when opening the Questionnaire library from a Job; invalid Job IDs do not become return destinations. Contract preview closes within its Job. Return controls use an arrow.
- Supplier completeness and enrichment: Needs review for pending suggestions attached to a master, Needs details for missing core fields, Complete for populated core details. Quality filters and a missing-details checklist update from existing source data. Complete does not mean independently verified. Unlisted candidates remain in the existing Job review queue until approved.
- Older cards, headings, controls, grids, image inspector and progress indicators use compact shared Admin styling. Responsive shared headers and export/table overflow are corrected. Technical migration prose is removed from Workspace settings and Wedding details.
- AI/SEO load errors and failed gallery-migration previews no longer leave an indefinite loading message.

## CRM settings and templates follow-up

- Templates is a complete hub with Quote, Email, Contract, Questionnaire, Workflow and Packages destinations, filtered by permissions and entitlements.
- Quote and Email templates have separate routes and load their own data. Contract templates have a standalone list/create page; the existing contract editor returns there after archive. Booking settings retain the default contract selector but no longer contain template management. New contract templates ask for a name before creation, avoiding the old repeated default-name conflict.
- CRM Settings remains the active sidebar destination throughout its configuration and template pages. The operational Questionnaire library keeps its existing navigation and Job return context.
- Additional validation: 30 route/viewport checks at 1440, 1024 and 390 pixels, navigation through the hub and lists, and contract creation in the isolated database. No page errors or document overflow. The focused Settings access/return tests, affected navigation/header/typography tests and Admin build pass.

## Historical supplier links

- Read-only production inspection found four approved submissions on the reported Job, four active resolved Supplier Master records, and no canonical/legacy Wedding links or supplier rows in the Wedding document. The approvals predate v1.10.14a. This establishes missing stored membership, not a display-only defect.
- Prepared a scoped request to the existing Wedding supplier-save endpoint using the exact resolved identities and reviewed roles. Request payload, preconditions and private read evidence are under `.wrangler/admin-refinement/faye-repair-plan.json`; no client names are added to this source document.
- Rehearsed that exact four-row request twice against isolated schema-53 SQLite using the actual save function. Both runs result in four canonical links, four legacy rows, four document rows and one linked Wedding per master. No duplicate masters, approval changes or unrelated document changes.
- Added a reusable historical-orphan regression to the supplier-context suite. The full affected supplier suite passes.
- Production repair **completed with explicit user permission** on 5 September 2026. The Admin browser session had expired, so the existing `saveWeddingSuppliers` function ran through the authenticated D1 REST batch API with its unchanged context guard. Fresh preflight passed; four canonical links, four legacy rows and four document suppliers were verified, with master records and approval source unchanged. Evidence: `.wrangler/admin-refinement/faye-live-repair-{before,after,success}.json`. No new masters, schema changes, email or Stripe calls.

## Package images and template-only libraries

- The Templates hub now opens dedicated Questionnaire and Workflow template libraries. Assigned questionnaires and pending tasks remain on their operational pages and are absent from the template libraries.
- Package editing supports Add/Change/Remove image, a live preview, above/below description placement, Fill frame/Show whole image, and horizontal/vertical positioning. Existing image links remain available. Save is disabled while uploading; failed uploads retain the previous image.
- Uploads use the workspace-scoped R2 image store and existing `image_url` field. JPG, PNG and WebP up to 2 MB are decoded and optimised in the browser; the endpoint checks permission, support mode, booking entitlement, size and file signatures.
- Package presentation uses a namespaced entry in the existing workspace settings JSON. Atomic JSON updates retain unrelated settings. Quote generation copies presentation into the existing package snapshot JSON; editing packages leaves existing quote snapshots unchanged. Schema stays 53, no 054.
- Admin quote cards and client quote cards render the snapshotted image and presentation consistently.
- Validation: `scripts/test-package-images.mjs` passes for saved presentation, unrelated metadata preservation, tenant/role boundaries, quote snapshot immutability, upload and invalid/oversize file rejection. Existing supplier, booking, navigation, questionnaire, header and typography tests pass. Admin and public builds pass.
- Browser verified an actual local upload, saving and reloading placement/fit, and a loaded image at 390px without horizontal overflow. Verified template libraries have no assigned-questionnaire or task-overview panels. Local image storage is isolated/in-memory; no production package images were uploaded.

## Validation

- Local synthetic browser sweep: **181 desktop/mobile checks and 90 tablet checks**, with no uncaught page errors or document-width overflow. Covers registered Admin routes, Settings destinations and main CRM/Platform tabs; screenshots and results under `.wrangler/admin-refinement/`.
- Interaction checks: Settings search, Settings return arrow, supplier quality filters, valid/invalid Questionnaire Job return context, Contract preview close.
- Focused actual-source supplier quality regression and existing supplier context regression pass against isolated schema-53 SQLite.
- Affected booking, navigation, supplier, questionnaire, header and scalable typography regressions pass. Historical schema assertions were updated to 53/no 054.
- Admin, public-site Vite and WedPlanned builds pass. Changed TypeScript is transpiled; this is not a full project type check.

## Limits and next gate

- No commit, push or deployment in this phase. The only production write is the explicitly authorised four-link historical supplier repair described above. No Stripe calls or email.
- Browser data is synthetic; external network requests are blocked. Empty image libraries and local storage limitations do not prove upload, publishing or payment operations.
- The legacy Gallery Migration route has no `/api/migrations/venue-gallery/preview` implementation in this repository. Its unavailable/error state was reviewed; migration functionality is not restored by this styling pass.
- Existing large-bundle build advisory remains.
- Next gate: review the completed local Admin candidate for a separately authorised release; historical supplier repair is complete.
- Deferred product work: canonical platform supplier registry, optional Google Places matching, explicit business verification, Plans & Pricing activation.

## Page source inventory

| Page component | Review outcome |
| --- | --- |
| `AICentre.tsx` | Updated; routed page/error/empty state reviewed |
| `AssetLibrary.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `BusinessOnboarding.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `CRM.tsx` | Updated; routed page/error/empty state reviewed |
| `CRMCatalogue.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `CRMClientPortalPreview.tsx` | Client-facing preview styling retained; route reviewed |
| `CRMCommercialTemplates.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `CRMContact.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `CRMContractTemplate.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `CRMEmailSettings.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `CRMEnquiry.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `CRMInvoice.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `CRMJob.tsx` | Updated; routed page/error/empty state reviewed |
| `CRMPaymentSetup.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `CRMPayments.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `CRMQuestionnaireTemplate.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `CRMQuote.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `CRMQuotes.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `CRMWorkflowTemplate.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `ClientGalleries.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `ClientGalleryEditor.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `ClientGalleryReview.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `ClientPortalSettings.tsx` | Updated; routed page/error/empty state reviewed |
| `Collections.tsx` | Updated; routed page/error/empty state reviewed |
| `CreativeFlashGallery.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `CustomCollectionGallery.tsx` | Updated; routed page/error/empty state reviewed |
| `CustomCollections.tsx` | Updated; routed page/error/empty state reviewed |
| `Dashboard.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `LocationGallerySettings.tsx` | Updated; routed page/error/empty state reviewed |
| `Locations.tsx` | Updated; routed page/error/empty state reviewed |
| `ModuleOverviews.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `MomentGallery.tsx` | Updated; routed page/error/empty state reviewed |
| `Moments.tsx` | Updated; routed page/error/empty state reviewed |
| `NewVenue.tsx` | Updated; routed page/error/empty state reviewed |
| `NewWeddingWizard.tsx` | Updated; routed page/error/empty state reviewed |
| `PlaceholderPage.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `PlatformAdmin.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `PrintStore 2.tsx` | Historical/unrouted component; current routed replacement reviewed |
| `PrintStore.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `SEOCentre.tsx` | Updated; routed page/error/empty state reviewed |
| `Settings.tsx` | Updated; routed page/error/empty state reviewed |
| `Suppliers.tsx` | Updated; routed page/error/empty state reviewed |
| `VenueContentEditor.tsx` | Updated; routed page/error/empty state reviewed |
| `VenueDetail.tsx` | Updated; routed page/error/empty state reviewed |
| `VenueGallery.tsx` | Updated; routed page/error/empty state reviewed |
| `VenueGalleryMigration.tsx` | Updated; routed page/error/empty state reviewed |
| `VenueMigration.tsx` | Updated; routed page/error/empty state reviewed |
| `VenueUpload.tsx` | Updated; routed page/error/empty state reviewed |
| `Venues.tsx` | Updated; routed page/error/empty state reviewed |
| `WedPlannedPlatform.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `WeddingCollections.tsx` | Updated; routed page/error/empty state reviewed |
| `WeddingContentEditor.tsx` | Updated; routed page/error/empty state reviewed |
| `WeddingDetail.tsx` | Updated; routed page/error/empty state reviewed |
| `WeddingImages.tsx` | Updated; routed page/error/empty state reviewed |
| `WeddingPublish.tsx` | Updated; routed page/error/empty state reviewed |
| `WeddingStory.tsx` | Updated; routed page/error/empty state reviewed |
| `WeddingStoryEditor.tsx` | Historical/unrouted component; current routed replacement reviewed |
| `WeddingSupplierEditor.tsx` | Updated; routed page/error/empty state reviewed |
| `WeddingSuppliers.tsx` | Updated; routed page/error/empty state reviewed |
| `WeddingWorkspace.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `Weddings.tsx` | Existing shared Admin styling retained; routed page reviewed where applicable |
| `WorkspaceSettings.tsx` | Existing workspace editor moved behind Settings and restyled |

| `CRMTemplates.tsx` | New complete Templates hub within WedCRM |
| `CRMContractTemplates.tsx` | New standalone contract list/create page |


## Additional CRM tidy-up — PASS (5 September 2026)

- Both Questionnaire library routes now show templates only. The template editor also drops its redundant introductory copy. Assigned responses remain within their Job and Client Portal.
- Removed the workspace quote register, sidebar item and global Open quotes links. Old register bookmarks redirect to Leads. New quote creation loads only its owning Lead and quote templates; the Lead is fixed by context. Quote type, template selection and server-side permissions remain intact. Quote Back returns to its Lead, with validated Job context taking priority.
- Shared panel and accordion headers render titles and actions without helper descriptions. Removed 34 explanatory paragraphs beneath older Admin section headings; record details, form instructions, client-authored text and action warnings are preserved.
- Package Recommended is a single compact, labelled checkbox. Add-on groups use a fieldset instead of nested labels. Package rows align price and status with appropriately sized descriptions. Image controls retain file format/size guidance next to the upload action.
- Draft quotes no longer reserve an empty side column; the Back button sits with the title. Quote/email template forms have consistent gaps. SMTP fields wrap into two columns and align at the top; the password control no longer clips. The contact page has explicit column spacing. Dashboard destinations use an even grid, and the Templates hub has one concise link per type. Removed technical schema prose from the contract editor.

Validation: CUA checked 34 CRM routes at 1440, 1024 and 390 pixels (102 checks, no failures). Visual review covered the operational pages, template libraries/editors and CRM settings. The synthetic Lead → fixed Quote → Back to Lead flow passed; the quote remains linked on the Lead. The local package's Recommended setting survived save/reload and its image still loaded. Old quote-register bookmarks return to Leads. Existing package-image, supplier-context, booking-integrity, entitlement, professional questionnaire, Admin header, typography and return-navigation regressions passed. Admin build, 64 TS/TSX transpiles and diff hygiene passed. Transpilation is not a full TypeScript typecheck.

Evidence: `.wrangler/admin-refinement/crm-sweep-verification.json`, `crm-sweep-before.json`, `crm-sweep-final-manifest.json`, `crm-sweep-transpile.json`, `crm-sweep-removed-header-copy.json` and `crm-sweep-build.txt`. Browser observations are recorded in this task's CUA transcript. The earlier live Faye repair is not rerun by this pass.

Final worktree: **61 tracked modified + 13 untracked = 74 paths**, no staged changes. All pre-existing paths preserved. HEAD remains `77993d037650afd7c4a4ee8a818c2842e7e42122`. Schema 53, no migration 054. This pass makes no production write, sends no email and performs no Stripe, commit, push or deployment action. Next gate: local review and separately authorised release preparation.


## Dashboard and quote-template refinement — PASS (5 September 2026)

The WedCRM Dashboard now follows the supplied Studio Ninja reference within the existing WedPlanned appearance: Job-type filter; 7-day, 30-day, month-to-date, year-to-date and custom date ranges; activity/payment chart tabs; lead-source donut; and paginated tables for upcoming weddings/shoots, recent Leads, overdue/upcoming payments and dated Job tasks. Lead and invoice links open their owning records. Layout adapts at desktop, tablet and mobile widths.

Data comes from a new workspace-scoped, read-only dashboard endpoint. It avoids the main overview's 200-Job limit. Leads are counted by creation date, Jobs booked by booking date (creation date fallback), and weddings/shoots by event date; archived records are excluded from those counts and cancelled Jobs are excluded from event counts. Payment charts use the authoritative invoice ledger's receipt dates with refunds deducted, grouped by currency. The comparison uses the immediately preceding period of the same length; no exchange-rate conversion is performed. Outstanding amounts reuse the existing invoice schedule allocation. Date filters apply to the analytics panel; operational tables retain current/upcoming records and follow the Job-type filter. Source labels differing only by case are combined. Server entitlements gate booking and invoice sections independently; requests cannot choose another workspace.

Quote-template library and editor no longer show introductory/helper prose. Package content and client-authored text remain visible. Default/invoice controls use compact checkboxes, package choices have distinct accessible names, and recommendation status uses one compact control. The local template saved and reloaded with both packages, an add-on, its recommendation, default setting, invoice setting and client introduction retained.

Validation: focused `scripts/test-crm-dashboard.mjs` covers inclusive/leap/custom ranges, more than 200 Jobs, date-specific receipts and refunds, currency separation, source merging, outstanding allocation, tasks, tenant isolation, read-only execution and server entitlement enforcement. Nine affected regressions pass (Admin refinement, package images, payments overview, commercial template UI/service, booking integrity, Job navigation, entitlement navigation and shared Admin header). The older commercial-template UI assertions were updated for the already approved Settings navigation, Lead-scoped creation and removed helper copy. Seven changed/new TS/TSX files transpile and the Admin build passes; transpilation is not a full TypeScript typecheck. The build retains its existing bundle-size advisory.

CUA browser checks verified Dashboard at 1440, 1024 and 390 pixels without page overflow, preset/custom date filtering, rejected invalid dates, empty-period charts, currency and Job-type filtering, all four table paginators and Lead/Job-invoice destinations. Quote editor/library checks confirmed no helper prose, no nested labels or page overflow at mobile width, desktop visual review and save/reload of a populated synthetic template. All fixture records live in the isolated local in-memory server; outbound requests and sockets remain disabled.

Evidence: `.wrangler/admin-refinement/dashboard-before-status.txt`, `dashboard-regression.txt`, `dashboard-verification.json`, `dashboard-browser-verification.json`, `dashboard-build.txt` and `dashboard-final-manifest.json`; browser observations are in this task's CUA transcript. The initial regression fixture attempted to add a schedule after invoice issue; the schema guard correctly rejected it, and the fixture was corrected to create the schedule before issue. No application rollback was used.

Final worktree: **62 tracked modified + 18 untracked = 80 paths**, no staged changes. All 74 pre-existing paths are preserved, with unrelated file hashes unchanged. HEAD remains `77993d037650afd7c4a4ee8a818c2842e7e42122`, schema 53, no migration 054. No production write, email, Stripe, commit, push or deployment occurred in this pass. Next gate: local review, then separately authorised release preparation.


## Admin square-action sweep — PASS (5 September 2026)

All shared AdminButton, AdminLinkButton and AdminIconButton actions now render as compact square icons. Migrated 315 additional legacy action sites, including native buttons, Router/native action links, upload labels and search-field clearing, across the Admin page/component source. Covers questionnaire/workflow creation, template editors, CRM records, gallery/image tools, suppliers, publishing and Settings. Labels are retained for assistive technology and a common floating tooltip on pointer hover or keyboard focus. The tooltip can be dismissed with Escape and is rendered outside scrolling panels to avoid clipping. Existing configured icons, action handlers, form/link attributes, disabled states and pressed states are preserved.

Navigation, record/option selectors, dashboard metrics, accordion toggles, modal backdrops and embedded public/client previews retain their own labelled presentation. These represent destinations, choices or content rather than compact action commands.

Code verification: focused shared-control rendering regression passes, covering mixed icon/text labels, form semantics, disabled states, Router/native links, file labels and pressed state. Affected header/icon, navigation, entitlement, questionnaire, quote-template, dashboard, package-image and Admin-refinement regressions pass. Updated two older header test assertions that still expected the previously removed global Catalogue/Quotes destinations. All Admin TS/TSX files transpile; Admin build and diff hygiene pass. Transpilation is not a full TypeScript typecheck. Source audit confirmed 643 original action attributes/handlers remained intact after the main conversion.

CUA verification passed after the Mac was unlocked: 94 desktop page views and 13 mobile page views had no action-size, missing-label/icon or page-overflow failures in the available fixture states. Checked actions measured 32 × 32 pixels. Questionnaire New template hover, keyboard focus, Escape dismissal and mobile tooltip placement passed; disabled Saved also displayed its pointer helper. A synthetic questionnaire was created, renamed, saved and reloaded through the compact controls. Keyboard activation of the gallery upload label opened the file chooser and queued a synthetic JPEG; its named Remove control cleared the queue. The Asset Library menu opened with Enter. Six conditional close/selection/upload controls received explicit labels. Gallery Upload and Library were also converted, and the toolbar now keeps icons together while search/order fields wrap. Desktop/mobile visual review confirmed the menu stays within the viewport. These checks cover layout and representative interactions, not every business workflow; some fixture pages show empty or error states. All browser writes were confined to the isolated local fixture server.

Current worktree: 83 tracked modified + 21 untracked = 104 paths; all 80 pre-existing paths preserved, no staging. HEAD remains `77993d037650afd7c4a4ee8a818c2842e7e42122`, schema 53/no 054. No production write, email, Stripe, commit, push or deployment occurred. Evidence is under `.wrangler/admin-refinement/button-sweep/`. Next gate: local review, then separately authorised release preparation.

## WedStudio Gallery hub and layout sweep — PASS (5 September 2026)

Galleries is the single Studio navigation destination for Venues, Moments, Locations and Collections, with cards also opening Creative Flash and Gallery landing settings. Existing child URLs remain available, the former `/admin/collections` alias redirects to the hub, and nested gallery pages keep Galleries highlighted. Contextual Back controls return to the correct list or venue. CRM Wedding Workspace and private WedStore galleries retain their existing module boundaries and entitlements.

Replaced oversized venue/moment/collection cards and repeated full forms with compact lists beside one selected editor. Locations opens its area list first, with Location types in a separate tab and gallery appearance in a disclosure. Gallery landing settings uses compact order/visibility rows; legacy wedding collection controls remain available in a disclosure. The location gallery enable setting is a visible native checkbox again. Studio typography, fields, spacing, panels and compact action controls use the existing CRM text roles and shared controls. Website, wedding story, image, asset, AI, SEO and publishing pages inherit the same scoped typography. No public website presentation or backend schema changed.

Save checks found an existing moment ordering defect: applying an ordinary edit renumbered the raw response order instead of the displayed order. `applyMomentChanges` now sorts by the saved order before applying edits; deliberate reordering remains supported. The focused regression covers both operations and input preservation. A collection's image link uses its saved slug while an unsaved slug is being edited, then follows the new slug after save.

Validation: 31 desktop, 12 mobile and 7 tablet browser page checks passed with no page overflow, action size/label failures or displayed errors in the available fixture states. Actions measured 32 × 32 pixels; text roles were consistent. Visual review included the hub, compact editors, location types, gallery landing settings and mobile layouts. Local save/reload checks passed for moment description/visibility/order, new collection creation and description/slug, collection image navigation, a new location and venue assignment, venue visibility, gallery landing visibility and location gallery enablement. Hub → Moments → Back returned correctly. These checks cover representative interactions and layout; image galleries with no fixture images do not constitute a full populated publishing/upload workflow test.

The new Studio navigation/moment regression, Studio foundation, Job context, entitlement navigation, platform module navigation, legacy/shared header and square action regressions pass. Two older source assertions were updated for the new Studio titles/Back controls and the previously approved removal of CRM helper copy. The first run of the new test needed an `import.meta.env` definition in its Node bundle; only the test harness was corrected. All 135 Admin TS/TSX files transpile, the Admin build passes with its existing bundle-size advisory, and diff hygiene passes. Transpilation is not a full TypeScript typecheck. Failures were diagnosed in place without restoring files.

Evidence: `.wrangler/admin-refinement/studio-sweep/` contains the baseline hashes, browser verification summary, regression logs, final transpilation results, build log and final manifest. Browser observations and screenshots are in this task's CUA transcript. The isolated in-memory fixture server was restarted with complete synthetic venue/moment documents for the save checks; outbound requests remain disabled.

Final worktree: **85 tracked modified + 24 untracked = 109 paths**, no staged changes. All 104 pre-existing paths are preserved; unrelated baseline hashes are unchanged. This pass adds three new files and modifies two previously clean regression files. HEAD remains `77993d037650afd7c4a4ee8a818c2842e7e42122`, schema 53/no 054. No production write, email, Stripe, commit, push or deployment occurred. Next gate: review the local Gallery hub, then separately authorised release preparation.

## Gallery hierarchy and custom gallery creation — PASS (5 September 2026)

The Website connection has one Galleries choice alongside Wedding stories. Existing gallery, venue and moment flags are read together, preserving whether an older workspace already exposed its gallery link. Changing the combined choice updates all three persisted flags together; stories and other settings remain independent. Generated installation code exposes one galleries category/link. Removed duplicate Venue and Moment/Collection destinations from the Website and Studio overview.

The Galleries hub contains four category cards: Venues, Moments, Locations and Collections. A prominent Gallery organiser & settings link sits above them, opening the renamed Gallery organiser page with the existing order/visibility controls. Creative Flash is now accessed within the Collections list and returns there; its existing image settings, URL and storage remain intact.

Add gallery (+) is available on the hub, organiser and Collections. The first two open the gallery creation form directly; successful creation closes it and selects the new draft. The existing workspace-scoped custom collection create API is reused, with no data migration. Gallery editing actions use gallery wording, and the saved gallery slug remains authoritative for its image link. Creation waits for initial list loading to avoid a load/create race.

Validation: 21 page checks across seven routes at desktop, tablet and mobile widths passed with no overflow, displayed errors or action size/label failures. Checked plus controls use the Plus glyph and hover label, with 32 × 32 actions. A synthetic Evening portraits gallery was created from the hub, reloaded, edited and saved; the organiser shows its pending activation state. Creative Flash → Back returns to Collections. The organiser's Add gallery shortcut opens the form. The Website Galleries choice survived save/reload both disabled and enabled, with its generated link matching the choice and Wedding stories retained. This is local fixture validation; no live site publishing or full populated image workflow was performed.

The focused regression covers all eight combinations of legacy Website gallery flags, combined enable/disable, single-link output, independent stories and settings preservation, alongside existing navigation, entitlement boundaries and moment ordering checks. Studio foundation, module experience, platform navigation, legacy headers and square-action regressions pass. The older foundation assertion was updated to reflect removal of duplicate overview cards. All 135 Admin files transpile and the Admin build/diff checks pass. Transpilation is not a full typecheck; the build retains its existing size advisory. Visual review caught an unsupported action key displaying the generic icon; it was corrected to the existing create action and the Plus glyph rechecked.

Evidence: `.wrangler/admin-refinement/studio-hierarchy/` and this task's CUA transcript. Final worktree: **86 tracked modified + 24 untracked = 110 paths**, no staging; all 109 baseline paths preserved, unrelated hashes unchanged. The only additional dirty path is the existing Studio foundation regression. HEAD remains `77993d037650afd7c4a4ee8a818c2842e7e42122`; schema 53/no 054. No production write, email, Stripe, commit, push or deployment. Next gate: local review, then separately authorised release preparation.
