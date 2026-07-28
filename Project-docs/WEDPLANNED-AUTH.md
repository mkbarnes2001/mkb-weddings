# WedPlanned Professional Authentication — v1.8.1

## Purpose
v1.8.1 replaces implied single-admin access with a professional identity and business-membership boundary. It supports passwordless sign-in, invitation acceptance, role permissions and multi-business switching while preserving MKB Weddings as the only operational tenant until legacy ownership migration is complete.

## Security model
- Login links expire after 20 minutes.
- Invitations expire after seven days.
- Links are single-use and replacement links revoke older unused links.
- Professional sessions expire after 14 days.
- D1 stores only SHA-256 hashes of link/session tokens.
- The browser session is HttpOnly, SameSite=Lax and Secure on HTTPS.
- The server derives the active business from an active membership.
- Client-supplied workspace IDs are ignored for WedPlanned platform operations.
- The final active owner cannot be disabled or demoted through the platform API.
- Sign-in responses do not reveal whether an email belongs to an account or whether delivery failed.

## Migration
Run both builds first:

```bash
npm run build
npm run build:admin
```

Apply only:

```bash
npx wrangler d1 execute YOUR_DATABASE_NAME \
  --remote \
  --file=d1/migrations/024_professional_identity_tenant_context.sql
```

Verify:

```bash
npx wrangler d1 execute YOUR_DATABASE_NAME \
  --remote \
  --command="SELECT key, value FROM schema_meta WHERE key = 'schema_version';"
```

Expected value: `24`. Then run `PRAGMA foreign_key_check;` and expect no problem rows.

## Admin Pages variables
Add these to the Cloudflare Pages project serving `admin.mkbweddings.co.uk`:

| Variable | Type | Initial value |
|---|---|---|
| `WEDPLANNED_AUTH_ENFORCED` | Plain text | `false` |
| `RESEND_API_KEY` | Secret | Resend API key |
| `WEDPLANNED_AUTH_FROM_EMAIL` | Secret or plain text | Verified sender address |
| `WEDPLANNED_AUTH_FROM_NAME` | Plain text | `WedPlanned` |
| `WEDPLANNED_AUTH_EMAIL_PROVIDER` | Plain text | `resend` |
| `WEDPLANNED_AUTH_DEBUG_LINKS` | Plain text | `false` |
| `WEDPLANNED_BOOTSTRAP_EMAIL` | Plain text | Optional owner email |
| `WEDPLANNED_ADMIN_ORIGIN` | Plain text | `https://admin.mkbweddings.co.uk` |

`RESEND_API_KEY` already used by the public project for client identity is not automatically shared with the Admin project; add it separately where required.

## Safe rollout
1. Deploy migration 024 and code with `WEDPLANNED_AUTH_ENFORCED=false`.
2. Open Admin → WedPlanned → Team.
3. Confirm the intended email is an active Owner. Migration 024 attempts to seed the existing workspace contact email when no owner exists.
4. If needed, invite the intended owner while bootstrap mode is active.
5. Accept the invitation. Admin should show `Secure session`, the correct business and role.
6. Sign out and request a fresh passwordless link. Confirm email delivery and successful return to Admin.
7. Confirm reusing the same link is rejected.
8. Set `WEDPLANNED_AUTH_ENFORCED=true` on the Admin project and redeploy.
9. Confirm an unauthenticated Admin browser sees the WedPlanned sign-in page and Admin API calls return 401.
10. Sign in again and test Weddings, Venues, Client Galleries, Print Store and WedPlanned settings.

## Rollback
If the owner is locked out:
1. Set `WEDPLANNED_AUTH_ENFORCED=false`.
2. Redeploy the Admin Pages project.
3. Admin returns to bootstrap mode.
4. Repair the owner membership or email delivery, verify a secure session, then re-enable enforcement.

Do not delete auth tables or rerun migration 024 as a lockout response.

## Roles
- **Owner** — full foundation administration, including owners.
- **Administrator** — business, services and team management, except protected owner actions.
- **Manager** — business/services updates and team visibility.
- **Content** — business/services updates and team visibility.
- **Finance**, **Staff**, **Viewer** — read-oriented foundation access in v1.8.1.

Future modules will map their own permissions onto these memberships.

## Current limitation
The authentication gate secures API access on the Admin Pages project, including its custom and preview hostnames, but it does not make all legacy records multi-tenant. Weddings, Venues, Suppliers, Moments and public collection definitions still require `workspace_id` backfills and scoped queries.

Do not onboard external businesses or expose marketplace publication until v1.8.2 ownership migration and cross-tenant tests are complete. Stripe Connect follows after that work.
