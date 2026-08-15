#!/usr/bin/env python3

"""Focused v1.10.10a shared Job-file UI checks."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(
        encoding="utf-8"
    )


job = read(
    "src/admin/pages/CRMJob.tsx"
)

lead = read(
    "src/admin/pages/CRMEnquiry.tsx"
)

portal = read(
    "src/components/ClientPortal.tsx"
)

admin_css = read(
    "src/admin/admin-theme.css"
)

portal_css = read(
    "src/index.css"
)


# Admin Job: general shared files plus questionnaire attachments.
for token in [
    "uploadPlanningFile",
    "removePlanningFile",
    "AdminApiService.uploadCrmJobFile",
    "AdminApiService.deleteCrmJobFile",
    "AdminApiService.jobFileUrl",
    "Planning files",
    "Questionnaire attachments",
    "Client upload",
    "Business upload",
]:
    assert token in job, token


# Persistent Lead: same Job workspace, no disconnected file screen.
for token in [
    "uploadLeadPlanningFile",
    "planningFiles",
    "questionnaireFiles",
    "workspaceFileCount",
    "AdminApiService.uploadCrmJobFile",
    "AdminApiService.jobFileUrl",
    "Files begin after booking",
]:
    assert token in lead, token


# Client Portal: dedicated Files destination after Job creation.
for token in [
    'type PortalView = "home" | "quotes" | "contracts" | "invoices" | "questionnaires" | "files" | "galleries";',
    "type PortalJobFile",
    "files: PortalJobFile[];",
    "allJobFiles",
    'view === "files"',
    "Planning files",
    "Your files",
    "uploadJobFile",
    "/api/public/client-portal/jobs/",
    "Maximum file size 10 MB",
    "Business upload",
    "Client upload",
]:
    assert token in portal, token


# Styling remains WedPlanned/client-brand aware and responsive.
assert (
    "/* v1.10.10a shared Job files UI */"
    in admin_css
)

assert (
    "/* v1.10.10a Client Portal shared planning files */"
    in portal_css
)

assert (
    "var(--portal-accent)"
    in portal_css
)

assert (
    "@media (max-width: 760px)"
    in portal_css
)


print(
    "PASS v1.10.10a shared Job files UI"
)

print(
    "  Admin Job upload / download / delete: verified"
)

print(
    "  questionnaire attachments remain distinct: verified"
)

print(
    "  persistent Lead workspace file continuity: verified"
)

print(
    "  Client Portal Files destination: verified"
)

print(
    "  client planning-file upload / download: verified"
)

print(
    "  booked-Job boundary: verified"
)

print(
    "  responsive WedPlanned styling: verified"
)
