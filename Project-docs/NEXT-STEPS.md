# Next steps

## Release in progress — v1.10.15a

The user authorised release of all updates on 6 September 2026. All CRM/Studio refinements and booking/Calendar setup are included. Migration 054 adds the required storage; public client booking stays closed until real-provider acceptance. See [release record](RELEASE-v1.10.15a.md) for validation, activation flags and final outcome.

The following sections preserve the pre-release candidate history.

## Released baseline

**v1.10.14a** is live at commit `77993d037650afd7c4a4ee8a818c2842e7e42122`.
Production schema is **53**, with no migration 054.

## Current local candidate

Online booking and Calendar, including the approved Studio Ninja screenshot gaps, pass the local implementation gate. Sessions have individual staff, instant/approval choices, images/add-ons, workflows and Stripe deposit/full or reusable payment schedules. Availability includes dated hours/closures, selectable slot intervals and conflict sources/calendars. Client fields, Lead Source, thank-you text, booking confirmation email/signature and protected invoice links are implemented; priced pay-later booking is supported. **Stripe stays; PayPal is explicitly deferred to a separate integration.**

The browser verified a synthetic £95 pay-later booking through personalised confirmation, invoice and Calendar; settings and simulated iCloud multi-calendar choices persist. All five setup steps fit at 390 px with compact accessible controls. Focused booking/iCloud and affected workflow/payment/Admin regressions, Admin build and Functions build pass. Current candidate after the sharing follow-up: **153 paths (96 tracked modified + 57 untracked), no staging**, with all previous paths preserved. Production remains unchanged at schema **53**, with no migration **054**; new storage is still an unnumbered proposal used only in isolated tests.

Online booking now has a visible Share booking page panel: direct link, copy, public preview and optional website button code with editable button text. A professional can share the hosted page or point their own website button or `/book` redirect to the same address. Sharing uses the configured public booking origin, with compact controls verified at desktop and mobile widths. The current localhost address is a local preview; a live public origin is part of deployment setup. This does not configure a website redirect, iframe embedding or a custom domain on the professional's behalf.

**Next gate: staging/provider acceptance and reviewed storage/release preparation.** Real Google/iCloud account acceptance, hosted Stripe payment acceptance, and controlled booking-message delivery remain pending. Automatic booking emails require explicit deployment activation and configured existing CRM delivery. See [Online booking and Calendar](ONLINE-BOOKING-CALENDAR.md#booking-screenshot-parity-implementation--local-pass) for the completed scope, test evidence, capability boundaries and activation requirements.

Settings consolidation, supplier quality/enrichment, return navigation and Admin styling refinement are implemented locally. See [Admin refinement](ADMIN-REFINEMENT.md) for the scope, page audit, validation and limitations.

The reported live Job's four historical supplier links have been restored with explicit permission and verified. Approval history and Supplier Master records are unchanged.

CRM Settings stays within WedCRM. The complete Templates hub has separate Quote, Email, Contract, Questionnaire and Workflow libraries; assigned questionnaires are accessible from their Job, and task tracking remains on operational pages. Package image upload, placement, fitting and positioning are implemented locally and flow into new quote snapshots.

The additional CRM tidy-up is complete: all Questionnaire library routes are template-only, the global quote register is removed, quotes remain attached to Leads/Jobs, section-header helper copy is removed, and package, email, contract, contact and dashboard layouts are tidied. The final browser pass covers 34 CRM routes at desktop, tablet and mobile widths (102 checks, PASS).

The Studio Ninja-inspired dashboard and quote-template cleanup are also complete. The Dashboard now has date and Job-type filters, activity/payment charts, lead sources, upcoming weddings/shoots, recent Leads, outstanding payments and dated Job tasks. Quote templates retain their editing controls with no helper prose and one compact recommendation control. Read-only summary data uses actual payment/refund dates, separates currencies and avoids the overview's 200-Job cap. Dashboard and quote-template browser checks, focused regression, affected regressions, transpilation and Admin build pass.

The Admin square-button sweep is complete: compact action icons have hover/focus labels, including disabled and keyboard-operated controls. Browser checks cover 94 desktop page views and 13 mobile page views; representative questionnaire create/save/reload, file chooser/queue removal and library-menu interactions pass. Code checks and Admin build pass.

Next gate: local review and separately authorised release preparation. Schema remains 53/no 054; no email or Stripe action is required.

The WedStudio refinement is complete locally. Galleries is the single hub for Venues, Moments, Locations and Collections. Gallery organiser & settings is prominent above these categories; Creative Flash sits inside Collections. A square + labelled Add gallery opens custom gallery creation from the hub or organiser, with the same action in Collections. The Website page has one Galleries connection switch and destination, and the Studio overview no longer duplicates its gallery categories. Compact lists, focused editors, typography, fields and actions follow CRM. The latest refinement passes 21 desktop/tablet/mobile page checks, custom gallery creation/save/reload, Website switch persistence, navigation regressions, Admin transpilation and build. Current candidate: 86 tracked modified + 24 untracked = 110 paths, no staging; all 109 paths from the initial Studio sweep are preserved.

## Deferred work

- PayPal platform integration and business onboarding, separately from the Stripe booking release.

- Platform supplier registry and duplicate matching, including optional Google Places enrichment.
- Explicit supplier verification process (the current Complete status measures details only).
- Plans & Pricing activation after the booking and Admin refinements.
- Legacy Gallery Migration endpoint: absent from the current repository; assess whether to retire the old tool or restore it as a separate import task.
- Later roadmap: Wed Connect, Wed Marketplace and authoritative delivery events feeding Job milestones.
