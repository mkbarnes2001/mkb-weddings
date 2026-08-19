#!/usr/bin/env python3
"""v1.10.12a Client Portal email sender isolation regression."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

source = (
    ROOT
    / "serverless/client-portal-d1.ts"
).read_text(
    encoding="utf-8",
)

quote_source = (
    ROOT
    / "serverless/crm-quotes-d1.ts"
).read_text(
    encoding="utf-8",
)

send_start = source.index(
    "async function sendPortalEmail("
)

send_end = source.index(
    "async function portalOrigin(",
    send_start,
)

send = source[
    send_start:
    send_end
]

request_start = source.index(
    "export async function requestPortalMagicLink("
)

request_end = source.index(
    "export async function verifyPortalMagicLink(",
    request_start,
)

request = source[
    request_start:
    request_end
]

# Booking / Client Portal email must use the WedPlanned
# transactional sender before the legacy/gallery sender.
assert '''env.WEDPLANNED_AUTH_FROM_EMAIL
    || env.CLIENT_AUTH_FROM_EMAIL''' in send

assert '''env.WEDPLANNED_AUTH_FROM_NAME
    || env.CLIENT_AUTH_FROM_NAME''' in send

assert (
    "env.CLIENT_AUTH_FROM_EMAIL || "
    "env.WEDPLANNED_AUTH_FROM_EMAIL"
    not in send
)

# Keep Client Portal aligned with the already-working Quote
# email sender precedence.
assert (
    "env.WEDPLANNED_AUTH_FROM_EMAIL "
    "|| env.CLIENT_AUTH_FROM_EMAIL"
    in quote_source
)

# Failed provider sends must not leave unusable magic-link
# invitations that can contribute to rate limiting/confusion.
for token in (
    "try {",
    "await sendPortalEmail(env, {",
    "DELETE FROM crm_portal_invitations",
    "invitation.invitationId",
    "throw error;",
):
    assert token in request, token

# Resend transport remains unchanged.
for token in (
    '"https://api.resend.com/emails"',
    "Authorization:",
    '"Content-Type": "application/json"',
    "to: [input.to]",
):
    assert token in send, token

print(
    "PASS v1.10.12a Client Portal email sender isolation"
)
print(
    "  WedPlanned transactional sender precedence: verified"
)
print(
    "  gallery/legacy sender retained as fallback: verified"
)
print(
    "  Quote sender alignment: verified"
)
print(
    "  failed invitation cleanup: verified"
)
print(
    "  Resend transport unchanged: verified"
)
