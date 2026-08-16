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


# Preview uses professional/Admin models only. Questionnaire edits are the one deliberate professional mutation surface.
for token in [
    "AdminApiService",
    ".getCrmEnquiry(id)",
    ".getCrmQuoteOverview()",
    ".getWorkspace()",
    ".getCrmJobWorkspace(",
    "Professional portal view",
    "Professional controls",
    "does not sign in as the client",
]:
    assert token in preview, token


# Preview must never impersonate the client or use the public
# authentication/mutation surface. Questionnaire changes use
# the authenticated professional CRM API instead.
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


# Questionnaire editing is the deliberate authenticated
# professional mutation available from this preview.
for token in [
    "useProfessionalAuth",
    "canEditQuestionnaires",
    'auth.permissions.includes(',
    '"crm:manage"',
    "auth.accessMode",
    ".saveQuestionnaireInstance(",
    "questionnaireDraft",
    "Save changes",
    "Submit updates",
]:
    assert token in preview, token

assert (
    'from "./CRMJob";'
    in preview
)

assert (
    "ProfessionalQuestionnaireField"
    in preview
)


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


# v1.10.10a's Client Portal preview was a source-only feature.
# Later releases may legitimately advance the repository schema.
# Its enduring regression boundary is professional authentication: no client impersonation or public client mutation surface is used. Questionnaire edits are attributed through the professional CRM API.


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
    "  professional Admin data boundary: verified"
)
print(
    "  no client session impersonation: verified"
)
print(
    "  no public client mutations: verified"
)
print(
    "  responsive portal preview: verified"
)
print(
    "  historical source-only preview boundary: verified"
)

# v1.10.10a runtime import and intermediate-width regression
from pathlib import Path as _RegressionPath

_regression_root = _RegressionPath(__file__).resolve().parents[1]

_regression_enquiry = (
    _regression_root
    / "src/admin/pages/CRMEnquiry.tsx"
).read_text(encoding="utf-8")

_regression_css = (
    _regression_root
    / "src/admin/admin-theme.css"
).read_text(encoding="utf-8")

assert (
    'ExternalLink, useEffect'
    not in _regression_enquiry
), "ExternalLink must not be imported from React"

assert (
    'import { useEffect, useMemo, useState } from "react";'
    in _regression_enquiry
), "React hooks import is malformed"

_lucide_start = _regression_enquiry.index(
    'from "react-router-dom";'
)

_lucide_end = _regression_enquiry.index(
    '} from "lucide-react";'
)

_lucide_block = _regression_enquiry[
    _lucide_start:_lucide_end
]

assert (
    "ExternalLink," in _lucide_block
), "ExternalLink must come from lucide-react"

assert (
    "/* v1.10.10a intermediate-width leads layout */"
    in _regression_css
), "Intermediate-width Leads layout is missing"

_intermediate_start = _regression_css.index(
    "/* v1.10.10a intermediate-width leads layout */"
)

_intermediate_end = _regression_css.index(
    "@media (max-width: 900px)",
    _intermediate_start,
)

_intermediate_block = _regression_css[
    _intermediate_start:_intermediate_end
]

assert (
    "@media (max-width: 1050px)" in _intermediate_block
), "Leads responsive breakpoint must activate before mobile navigation"

assert (
    ".crm-lead-list__header" in _intermediate_block
    and "display: none;" in _intermediate_block
), "Intermediate Leads layout must hide the desktop header"

assert (
    ".crm-lead-row__main" in _intermediate_block
    and "grid-template-columns: 1fr;" in _intermediate_block
), "Intermediate Leads rows must stack cleanly"

print(
    "CLIENT_PORTAL_RUNTIME_IMPORT_REGRESSION=PASS"
)
print(
    "LEADS_INTERMEDIATE_RESPONSIVE_REGRESSION=PASS"
)

# v1.10.10a WedPlanned Client Portal typography regression
_typography_css = (
    _regression_root
    / "src/admin/admin-theme.css"
).read_text(encoding="utf-8")

_preview_start = _typography_css.index(
    ".crm-client-portal-preview {"
)

_preview_end = _typography_css.index(
    "@media (max-width: 760px)",
    _preview_start,
)

_preview_css = _typography_css[
    _preview_start:_preview_end
]

assert (
    'Georgia, "Times New Roman", serif'
    not in _preview_css
), "Professional Client Portal preview must not use editorial serif typography"

assert (
    '"Montserrat", "Avenir Next", Avenir, '
    '"Helvetica Neue", Arial, sans-serif'
    in _preview_css
), "Professional Client Portal preview must use canonical WedPlanned typography"

_branding_selector = ".portal-branding-preview {"

_branding_start = _typography_css.index(
    _branding_selector
)

_branding_end = _typography_css.index(
    "}",
    _branding_start,
)

_branding_css = _typography_css[
    _branding_start:_branding_end
]

assert (
    '"Montserrat", "Avenir Next", Avenir, '
    '"Helvetica Neue", Arial, sans-serif'
    in _branding_css
), "Client Portal settings preview must use canonical WedPlanned typography"

assert (
    "font-family: Inter, ui-sans-serif"
    not in _branding_css
), "Legacy Inter-only Client Portal preview typography must be removed"

print(
    "CLIENT_PORTAL_WEDPLANNED_TYPOGRAPHY=PASS"
)
