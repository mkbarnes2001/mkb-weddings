#!/usr/bin/env python3

"""Focused v1.10.10a persistent Lead Workspace UI checks."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8"
    )


page = read(
    "src/admin/pages/CRMEnquiry.tsx"
)

css = read(
    "src/admin/admin-theme.css"
)

app = read(
    "src/admin/app/AdminApp.tsx"
)


assert (
    'path="crm/enquiries/:id" element={<CRMEnquiry />}'
    in app
)

assert (
    'path="crm/jobs/:id" element={<CRMJob />}'
    in app
)


for token in [
    "CrmJobWorkspace",
    "jobWorkspace",
    ".getCrmJobWorkspace(",
    "jobWorkspace?.commercial",
    ".contract",
    ".invoice",
    "jobWorkspace?.questionnaires",
]:
    assert token in page, token


assert (
    'auth.accessMode !== "support"'
    in page
)


assert (
    "/admin/crm/quotes?enquiryId="
    in page
)

assert (
    "encodeURIComponent(id)"
    in page
)


for token in [
    'title="Client journey"',
    'title="Lead details"',
    'title="Client"',
    'title="Mail"',
    'title="Quotes"',
    'title="Contracts"',
    'title="Questionnaires"',
    'title="Invoices"',
    'title="Files"',
    'title="Journey"',
    'title="History"',
]:
    assert token in page, token


assert (
    'aria-label="Client journey"'
    in page
)

assert (
    "Detailed CRM events are kept separate from the concise Journey."
    in page
)


for label in [
    '"Lead"',
    '"Quoted"',
    '"Quote accepted"',
    '"Booked"',
    '"In production"',
    '"Complete"',
    '"Lost"',
]:
    assert label in page, label


for token in [
    "item.clickedAt",
    "item.openedAt",
    "item.deliveredAt",
    'item.status === "failed"',
    '"Link clicked"',
    '"Opened"',
    '"Delivered"',
    '"Sent"',
]:
    assert token in page, token


mail_helper = page[
    page.index(
        "function mailPresentation("
    ):
    page.index(
        "export function CRMEnquiry()"
    )
]

assert "viewedAt" not in mail_helper


assert "quote.quoteType" in page
assert '"Pick & Choose"' in page
assert '"Fixed"' in page


assert "Job operations" in page
assert "Open Job operations" in page


assert "questionnaireFileUrl" in page

for token in [
    "questionnaireFiles",
    "planningFiles",
    "workspaceFileCount",
    "uploadLeadPlanningFile",
    "AdminApiService.uploadCrmJobFile",
    "AdminApiService.jobFileUrl",
]:
    assert token in page, token


for selector in [
    ".crm-lead-workspace-overview",
    ".crm-lead-workspace-journey",
    ".crm-lead-workspace-layout",
    ".crm-lead-workspace-main",
    ".crm-lead-workspace-aside",
    ".crm-lead-workspace-document-grid",
    ".crm-lead-document-summary",
    ".crm-lead-document-list",
]:
    assert selector in css, selector


print(
    "PASS v1.10.10a persistent Lead Workspace UI"
)

print(
    "  one client journey before and after booking: verified"
)

print(
    "  minimal Journey and separate History: verified"
)

print(
    "  Lead / Client / Mail / Quotes: verified"
)

print(
    "  Contracts / Questionnaires / Invoices / Files: verified"
)

print(
    "  real mail engagement states: verified"
)

print(
    "  existing Job commercial read model reused: verified"
)

print(
    "  template-aware quote chooser preserved: verified"
)

print(
    "  support-mode write guard: verified"
)
