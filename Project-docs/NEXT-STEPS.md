# Next steps

## Released baseline

**v1.10.15a — CRM and Studio Refinement, Calendar & Booking Setup** is live on Admin and the MKB public website, released 6 September 2026. Application commit: `d26b89f737e95a6bbffec4a38a2ec4f08b6c8bd1`. Canonical and production database schema: **54**. Migration 054 is applied. The previous no-054 requirement belonged to the completed supplier/source gates; booking storage now requires this migration.

All accumulated CRM/Studio refinements are released: Settings and Templates organisation, separate Quote/Email/Contract/Questionnaire libraries, package images, CRM dashboard, compact accessible actions, supplier detail quality, and the unified Gallery hub/organiser with custom collections. The previously authorised historical supplier-link repair remains intact.

Online booking and Calendar are available for professional setup. Sessions, add-ons, individual staff, availability, workflows, client fields, payment schedules, messages and sharing controls are included. **Public client booking remains closed** until provider acceptance; Admin permits draft setup and shows Setup only. No production services or synthetic bookings were seeded.

43 focused/affected regressions, Admin/public/Functions builds, migration rehearsal and production smoke checks pass. Read the [release record](RELEASE-v1.10.15a.md) for deployments, backup, accounting and verification limits.

## Next gate — booking activation

1. Configure a staging Google OAuth client and verify consent, selected calendars, recurring events, changes and revoked access.
2. Verify real iCloud discovery, app-specific passwords, calendar permissions, timezone/recurrence handling and event updates.
3. Exercise Stripe test Connect hosted deposit/full/preset payments, signed webhooks, late/duplicate settlement, approval and expiry/retry. Existing invoice payments remain unchanged.
4. Verify controlled booking confirmation delivery and secure invoice links, using the existing CRM email setup.
5. Configure each business's services/prices/team, verify its public link outside Admin, then activate public booking and booking email explicitly after acceptance.

Current production flags: professional setup enabled; public booking disabled; booking email disabled. The configured public booking origin is `https://admin.mkbweddings.co.uk`. Professionals can use the hosted link or route their own website's Book now button/redirect to it once booking is activated. Google/iCloud credentials are not configured by the release. No real Stripe request or email was sent during release verification.

## Deferred work

- PayPal integration and business onboarding, separately from Stripe.
- Platform supplier registry and duplicate matching, including optional Google Places enrichment.
- Explicit supplier verification process; Complete currently measures details only.
- Plans & Pricing activation after the booking acceptance work.
- Legacy Gallery Migration endpoint: assess retirement or a separate import task.
- Background calendar push sync, Outlook/Microsoft 365 and generic calendar feeds.
- Wed Connect, Wed Marketplace and authoritative delivery events feeding Job milestones.

Detailed gate history remains in [Admin refinement](ADMIN-REFINEMENT.md) and [Online booking and Calendar](ONLINE-BOOKING-CALENDAR.md).
