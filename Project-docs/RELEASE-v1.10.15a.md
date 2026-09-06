# v1.10.15a — CRM, Studio and booking setup

Released 6 September 2026. The user authorised releasing all accumulated updates. Production migration, application deployments and smoke verification are complete; the public-booking activation boundary below remains in effect.

## Included

- CRM Settings and separate template libraries, cleaner Quote/Questionnaire pages, package image upload and placement, the activity/payment dashboard, and compact accessible actions throughout Admin.
- WedStudio Gallery hub, custom galleries, Collections/Creative Flash, prominent gallery organiser, simplified Website connections and consistent layouts.
- Supplier completeness/review handling and the previously verified repair of the reported Job's supplier links.
- Online booking setup with sessions, images, add-ons, staff availability, workflows, richer client fields, payment schedules, confirmation templates and sharing controls. Calendar supports bookings, existing Jobs, blocked time and appointment management.

## Activation boundary

This release makes booking setup and Calendar available to entitled professionals. **Public client booking stays closed**, including free/pay-later reservations, hosted Stripe checkout and public invoice/status routes, until provider acceptance is complete. `CRM_ONLINE_BOOKING_ENABLED=true` enables professional setup; `CRM_ONLINE_BOOKING_PUBLIC_ENABLED=false` blocks public access and prevents publication server-side. Admin shows Setup only, permits draft saving and disables sharing/publication. The public flag defaults to closed if missing.

The canonical booking origin is `https://admin.mkbweddings.co.uk`, which serves the public `/book/{business-slug}` route outside professional authentication. This is the existing application host; the separate WedPlanned marketing site does not serve the booking app. Professionals' websites can link or redirect to it after activation.

Google/iCloud connection credentials are not configured by this release. Booking confirmation email remains off. Existing client invoice payments, receipt delivery, platform billing, public galleries and Print Store settings are preserved. PayPal remains deferred. No real provider acceptance is claimed and no real email or Stripe request is part of release verification.

## Storage and rollback

Migration `054_online_booking_calendar.sql` promotes the tested proposal to canonical schema **54**. It creates 11 new tables, indexes and integrity triggers, plus updates schema metadata; it does not backfill or change existing business rows. A version guard rejects a wrong-version or repeated application. All booking pages start absent/draft; no synthetic services, bookings or credentials are inserted into production.

A production SQL export is held under the ignored release evidence directory with restricted file permissions. The exact migration passed against that export: all existing rows in 148 tables were unchanged, with zero foreign-key findings before/after. Fresh schema and upgraded schema match, and a repeated migration rolls back. For an application rollback, disable booking flags and deploy the previous application commit; keep additive storage and do not drop booking history. Restore a database backup only if separately required after inspecting intervening writes.

## Validation

43 focused/affected regressions pass, including actual-source booking concurrency, provider mocks, payments, receipts, supplier linking, entitlement boundaries, Admin/Studio navigation and migration guards. Admin and complete public website builds pass. Cloudflare Functions compile with the existing production compatibility date and no added compatibility flags. Existing bundle-size advisories remain; a full-repository TypeScript typecheck is not claimed.

Older checks were updated for schema 54 and the deliberately replaced dashboard/template layouts. The receipt test's source slicing/export assumptions were corrected after receipt helpers became shared exports. These failures were diagnosed in place; no source reset was used.

Release evidence: `.wrangler/v1.10.15a-release/` contains the reviewed path manifest, test/build logs, sanitized deployment configuration, production preflight, backup and migration rehearsal. Existing local changes remain preserved in the release snapshot.

## Next gate

Staging acceptance using real Google and Apple accounts, Stripe test Connect hosted payments/webhooks and controlled confirmation delivery. Verify selected calendars, recurring exceptions, approval/deposit/full/preset flows and shared public links. Only then activate public booking and email in production. Business-specific services and prices must be configured by the professional before publication.

## Outcome

**PASS — production release with public booking closed.**

Application commit: `d26b89f737e95a6bbffec4a38a2ec4f08b6c8bd1`. All 182 reviewed release paths were committed; all 153 paths from the initial checkpoint were preserved. A documentation-only seal records the final outcome without changing application assets.

- Admin: `19a2a3a7-ea37-403e-9f55-675732cdadb4` — https://admin.mkbweddings.co.uk
- Public website: `047fdbbe-344e-4587-afc4-b1ca13081f8c` — https://www.mkbweddings.co.uk
- Both are successful production deployments of the application commit above.
- Production schema is 54. Wedding (20), Supplier (53), Wedding link (65), Job (12) and Invoice (9) counts are unchanged from preflight. New booking tables contain no synthetic data.
- Live pages, application assets, booking-shell routes and API binding health pass. Anonymous professional APIs remain protected; public booking returns the intended unavailable response on both hosts. The deployed Admin asset includes the new setup, sharing, dashboard and gallery interfaces.
- The existing live browser session was signed out, so no authenticated production edit was performed and no sign-in email was sent. The setup response was additionally exercised read-only against the migrated production backup; the local browser verifies the Setup only and disabled publication controls.
- Existing environment variables, secrets, resource bindings, preview configuration and compatibility settings were preserved. The separate WedPlanned marketing site has no changes in this release and was not redeployed.

Stable tag: `v1.10.15a-admin-studio-booking-setup-stable`, pointing to the application commit. A verified source archive and restricted production backup are retained in the ignored release evidence directory. Next gate remains provider acceptance and public-booking activation.
