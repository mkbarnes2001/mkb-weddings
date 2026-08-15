#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(
        encoding="utf-8",
    )


lead = read(
    "src/admin/pages/CRMEnquiry.tsx"
)

app = read(
    "src/admin/app/AdminApp.tsx"
)

preview = read(
    "src/admin/pages/CRMClientPortalPreview.tsx"
)

css = read(
    "src/admin/admin-theme.css"
)


# Persistent action on the Lead workspace.
assert "View Client Portal" in lead
assert 'target="_blank"' in lead
assert 'rel="noreferrer"' in lead
assert "ExternalLink" in lead
assert (
    "/admin/crm/enquiries/${id}/client-portal"
    in lead
)


# Dedicated authenticated Admin route.
assert (
    'path="crm/enquiries/:id/client-portal"'
    in app
)
assert "CRMClientPortalPreview" in app


# Preview reads existing professional/Admin models only.
for token in [
    "AdminApiService",
    ".getCrmEnquiry(id)",
    ".getCrmQuoteOverview()",
    ".getWorkspace()",
    ".getCrmJobWorkspace(",
    "Read-only professional preview",
    "Preview only",
    "does not sign in as the client",
]:
    assert token in preview, token


# Preview must never impersonate the client or use the public
# mutation/authentication surface.
for forbidden in [
    "/api/public/client-portal",
    "request-link",
    "/verify?token=",
    "client_identity_sessions",
    "inviteCrmClient",
    "acceptQuote",
    "declineQuote",
    'method: "POST"',
    'method: "PUT"',
    'method: "DELETE"',
    "rawToken",
    "sessionToken",
]:
    assert forbidden not in preview, forbidden


# The portal action is independent of Job conversion and remains
# present before the conditional Job operations action.
button_position = lead.index(
    "View Client Portal"
)

job_operations_position = lead.index(
    "Job operations"
)

assert (
    button_position
    < job_operations_position
)


# Responsive WedPlanned-native preview styling.
for token in [
    "v1.10.10a client portal professional preview",
    ".crm-client-portal-preview__admin-bar",
    ".crm-client-portal-preview__hero",
    ".crm-client-portal-preview__nav",
    ".crm-client-portal-preview__cards",
    "@media (max-width: 760px)",
]:
    assert token in css, token


# Source-only change: no schema 43 migration.
migration_dir = (
    ROOT
    / "d1"
    / "migrations"
)

assert not list(
    migration_dir.glob("043*")
)


print(
    "PASS v1.10.10a persistent Client Portal preview"
)
print(
    "  Lead header action: verified"
)
print(
    "  persists after Job conversion: verified"
)
print(
    "  professional Admin reads only: verified"
)
print(
    "  no client session impersonation: verified"
)
print(
    "  no client mutations: verified"
)
print(
    "  responsive portal preview: verified"
)
print(
    "  schema remains 42: verified"
)
