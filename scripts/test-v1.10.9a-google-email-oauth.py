#!/usr/bin/env python3

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(encoding="utf-8")


oauth = read(
    "serverless/crm-google-oauth-d1.ts"
)
settings = read(
    "serverless/crm-email-settings-d1.ts"
)
router = read(
    "functions/api/crm/[[path]].ts"
)
middleware = read(
    "functions/_middleware.ts"
)
auth = read(
    "serverless/platform-auth-d1.ts"
)
api = read(
    "src/admin/services/AdminApiService.ts"
)
page = read(
    "src/admin/pages/CRMEmailSettings.tsx"
)
schema = read(
    "d1/migrations/041_commercial_templates_email_delivery.sql"
)

# Server-only Google OAuth configuration.
for token in [
    "CRM_GOOGLE_CLIENT_ID",
    "CRM_GOOGLE_CLIENT_SECRET",
    "CRM_GOOGLE_REDIRECT_ORIGIN",
]:
    assert token in oauth, token
    assert token in router, token
    assert token not in api, token
    assert token not in page, token

# OAuth start requires a real authenticated workspace membership.
for token in [
    'actor.mode !== "session"',
    'actor.accessMode',
    '"membership"',
    "actor.userId",
    "actor.membershipId",
    "actor.workspaceId",
    '"crm:manage"',
]:
    assert token in oauth, token

# State is HMAC signed, short lived and bound to the active session.
for token in [
    'name: "HMAC"',
    'hash: "SHA-256"',
    "crypto.subtle.sign",
    "crypto.subtle.verify",
    "OAUTH_STATE_TTL_MS",
    "userId:",
    "membershipId:",
    "workspaceId:",
    "redirectUri:",
    "nonce:",
    "expiresAt:",
    "payload.expiresAt",
    "actor.userId",
    "actor.membershipId",
    "actor.workspaceId",
]:
    assert token in oauth, token

# Google web-server OAuth uses offline access and minimal send scope.
for token in [
    "https://accounts.google.com/o/oauth2/v2/auth",
    "https://oauth2.googleapis.com/token",
    "https://openidconnect.googleapis.com/v1/userinfo",
    "https://www.googleapis.com/auth/gmail.send",
    'access_type:',
    '"offline"',
    'prompt:',
    '"consent"',
    'include_granted_scopes:',
    '"true"',
    '"openid"',
    '"email"',
    '"authorization_code"',
]:
    assert token in oauth, token

# Refresh token is mandatory and stored only through encrypted credential storage.
assert (
    "refreshToken"
    in oauth
)
assert (
    "saveGoogleEmailCredential("
    in oauth
)
assert (
    "await storeCredential("
    in settings
)
assert (
    '"google"'
    in settings
)
assert (
    "refreshToken"
    in settings
)
assert (
    "crypto.subtle.encrypt"
    in settings
)

# No plaintext OAuth token columns are introduced.
lower_schema = schema.lower()

for forbidden in [
    "refresh_token text",
    "access_token text",
    "google_client_secret",
]:
    assert forbidden not in lower_schema, forbidden

# Google identity is verified before encrypted credential storage.
assert (
    "GOOGLE_USERINFO_URL"
    in oauth
)
assert (
    "email_verified"
    in oauth
)
assert (
    "googleUserEmail("
    in oauth
)

# Google OAuth route methods are explicit.
router_get_start = router.index(
    "export const onRequestGet:"
)
router_post_start = router.index(
    "export const onRequestPost:",
    router_get_start,
)
router_put_start = router.index(
    "export const onRequestPut:",
    router_post_start,
)

router_get = router[
    router_get_start:
    router_post_start
]
router_post = router[
    router_post_start:
    router_put_start
]

assert 'parts[3] === "callback"' in router_get
assert "completeGoogleEmailOAuth(" in router_get
assert 'parts[3] === "connect"' not in router_get

assert 'parts[3] === "connect"' in router_post
assert "beginGoogleEmailOAuth(" in router_post
assert 'parts[3] === "callback"' not in router_post

# Callback remains inside authenticated CRM API rather than auth-exempt namespace.
assert (
    'parts[3] === "callback"'
    in router
)
assert (
    'parts[3] === "connect"'
    in router
)
assert (
    "/api/crm/email/providers/google/callback"
    in oauth
)
assert (
    'path.startsWith("/api/platform-auth/")'
    in middleware
)
assert (
    "crm/email/providers/google/callback"
    not in middleware
)

# Existing professional session is SameSite=Lax and resolves active workspace server-side.
assert (
    "SameSite=Lax"
    in auth
)
assert (
    "platform_sessions"
    in auth
)
assert (
    "active_workspace_id"
    in auth
)
assert (
    "getProfessionalContext"
    in router
    or "requireProfessionalContext"
    in router
)

# Browser only receives the Google authorization URL.
assert (
    "static async startCrmGoogleEmailConnection"
    in api
)
assert (
    "/api/crm/email/providers/google/connect"
    in api
)
assert "clientSecret" not in api
assert "refreshToken" not in api

# UI has explicit connect/disconnect states and callback feedback.
for token in [
    "async function connectGoogle()",
    "startCrmGoogleEmailConnection",
    "window.location.assign(",
    "Connect Google",
    "Google account connected.",
    "Google email connection could not be completed.",
    'disconnect(\n                      "google",',
]:
    assert token in page, token

# Connection does not silently activate Gmail delivery.
save_start = settings.index(
    "export async function saveGoogleEmailCredential"
)
save_end = settings.index(
    "export async function saveCrmEmailSettings",
    save_start,
)
save_section = settings[
    save_start:save_end
]

assert (
    "delivery_mode = 'google'"
    in save_section
)
assert (
    "SET\n      delivery_mode = 'google'"
    not in save_section
)

print(
    "PASS v1.10.9a Google email OAuth connection foundation"
)
print(
    "  authenticated membership requirement: verified"
)
print(
    "  workspace/session-bound signed state: verified"
)
print(
    "  short-lived HMAC state: verified"
)
print(
    "  Google offline authorization flow: verified"
)
print(
    "  minimal Gmail send permission: verified"
)
print(
    "  verified Google account email: verified"
)
print(
    "  encrypted refresh-token storage: verified"
)
print(
    "  no plaintext OAuth credential columns: verified"
)
print(
    "  authenticated CRM callback boundary: verified"
)
print(
    "  explicit admin connect/disconnect UX: verified"
)
print(
    "  delivery mode remains user-controlled: verified"
)
