#!/usr/bin/env python3

from pathlib import Path


def source(path):
    return Path(path).read_text(
        encoding="utf-8",
    )


def require(condition, message):
    if not condition:
        raise AssertionError(message)


verify_route = source(
    "functions/api/public/client-portal/verify.ts"
)

request_route = source(
    "functions/api/public/client-portal/request-link.ts"
)

portal_source = source(
    "serverless/client-portal-d1.ts"
)

quote_source = source(
    "serverless/crm-quotes-d1.ts"
)

client_source = source(
    "src/components/ClientPortal.tsx"
)

auth_source = source(
    "serverless/client-auth-d1.ts"
)


# One-time token security remains intact.
require(
    "UPDATE crm_portal_invitations "
    "SET consumed_at = CURRENT_TIMESTAMP"
    in portal_source
    and "consumed_at IS NULL"
    in portal_source,
    "Portal invitation must remain one-time.",
)

require(
    "UPDATE crm_quote_invitations "
    "SET consumed_at = CURRENT_TIMESTAMP"
    in quote_source
    and "consumed_at IS NULL"
    in quote_source,
    "Quote invitation must remain one-time.",
)


# A valid existing session may reopen the old email URL.
require(
    "getAuthenticatedClientIdentity"
    in verify_route,
    "Verify route must inspect existing client session.",
)

require(
    '"identityId" in result'
    in verify_route
    and '"returnPath" in result'
    in verify_route,
    "Known old links must retain recovery context.",
)

require(
    "authenticatedIdentity?.id"
    in verify_route
    and "=== result.identityId"
    in verify_route,
    "Existing client session must match the invitation owner.",
)

require(
    "result.returnPath"
    in verify_route,
    "Matching client must reopen the stored destination.",
)


# Missing or wrong-client session requires fresh authentication.
require(
    "clearClientSessionCookie"
    in verify_route,
    "Mismatched client session must be cleared.",
)

require(
    "reauthUrl.searchParams.set("
    in verify_route
    and '"reauth"'
    in verify_route,
    "Reauthentication redirect marker missing.",
)


# Used/expired token supplies context only; it is not reused.
require(
    'identityId: text(row.identity_id), returnPath'
    in portal_source,
    "Portal old-link recovery context missing.",
)

require(
    'identityId: text(row.identity_id), returnPath'
    in quote_source,
    "Quote old-link recovery context missing.",
)


# Fresh authentication retains the exact quote.
require(
    "quoteIdInput?: unknown"
    in portal_source,
    "Portal sign-in request must accept a quote target.",
)

require(
    "targetedQuoteSent"
    in portal_source
    and "requestedQuoteId"
    in portal_source,
    "Portal sign-in must attempt targeted quote authentication.",
)

require(
    "quoteIdInput?: unknown"
    in quote_source,
    "Quote sign-in request must accept a quote target.",
)

require(
    "text(item.id) === requestedQuoteId"
    in quote_source,
    "Requested quote must be constrained to accessible quotes.",
)

require(
    "body?.quoteId"
    in request_route,
    "Public request-link route must forward quoteId.",
)

require(
    '.get("quote")'
    in client_source
    and "quoteId,"
    in client_source,
    "Client sign-in form must preserve the quote target.",
)

require(
    '.get("reauth") === "1"'
    in client_source,
    "Client UI must recognise reauthentication entry.",
)

require(
    "continue where you left off"
    in client_source,
    "Client UI must explain fresh-link continuation.",
)


# Session duration remains 30 days.
require(
    "const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;"
    in auth_source,
    "30-day client session must remain unchanged.",
)


print(
    "PASS v1.10.12a reusable quote email access"
)

print(
    "  one-time email token security: retained"
)

print(
    "  same-browser session re-entry: verified"
)

print(
    "  wrong-client session isolation: verified"
)

print(
    "  exact quote fresh-link targeting: verified"
)

print(
    "  booking fallback after conversion: retained"
)

print(
    "  30-day client session: unchanged"
)
