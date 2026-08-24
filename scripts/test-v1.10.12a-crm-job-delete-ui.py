#!/usr/bin/env python3
"""Gate 2C.3D source regression: guarded Job permanent-delete UI."""

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (
        ROOT / relative
    ).read_text(
        encoding="utf-8",
    )


job = read(
    "src/admin/pages/CRMJob.tsx"
)

lead = read(
    "src/admin/pages/CRMEnquiry.tsx"
)

api = read(
    "src/admin/services/AdminApiService.ts"
)

types = read(
    "src/admin/types/crm.ts"
)

css = read(
    "src/admin/admin-theme.css"
)


# Typed destructive receipt.
for token in (
    "export type CrmJobDeleteReceipt",
    'targetType: "job"',
    "originatingLead: number",
    "privateFiles: number",
    "weddingWorkspace: boolean",
    "weddingStory: boolean",
    "clientGalleries: boolean",
    "canonicalAssets: boolean",
    "websiteAssignments: boolean",
):
    assert token in types, token


# Shared Admin API client.
for token in (
    "getCrmJobDeletePreflight",
    "deleteCrmJobPermanently",
    "/delete-preflight",
    "deletion: CrmJobDeleteReceipt",
    'method: "DELETE"',
    "return result.deletion",
):
    assert token in api, token


# Job workspace owns the destructive UI.
for token in (
    "useNavigate",
    "CrmDeletePreflight",
    "jobDeleteOpen",
    "jobDeletePreflight",
    "jobDeleteConfirmation",
    "openJobDeleteDialog",
    "permanentlyDeleteJob",
    "getCrmJobDeletePreflight",
    "deleteCrmJobPermanently",
    "Record actions",
    "Delete permanently",
    "Will be deleted",
    "Will be preserved",
    "Cannot delete until resolved",
    'jobDeleteConfirmation !== "DELETE"',
    "!jobDeletePreflight?.canDelete",
    '"/admin/crm?view=jobs"',
    "replace: true",
    "canManageCommercial",
):
    assert token in job, token


# Existing permission contract explicitly excludes
# support-mode destructive controls.
assert (
    'const canManageCommercial = '
    'canManage && auth.accessMode !== "support";'
    in job
)


# Exact confirmation and server preflight both gate
# the final destructive button.
assert (
    "jobDeleteConfirmation"
    in job
)

assert (
    '"DELETE"'
    in job
)

assert (
    "jobDeletePreflight"
    in job
)

assert (
    ".canDelete"
    in job
)


# Job dialog contains no cross-module destructive
# options or secondary delete checkboxes.
dialog_start = job.index(
    "{jobDeleteOpen"
)

dialog_end = job.index(
    "{contractPreviewOpen "
    "&& commercialContract ? (",
    dialog_start,
)

dialog = job[
    dialog_start:dialog_end
]

for forbidden in (
    'type="checkbox"',
    "deleteWeddingPermanently",
    "deleteClientGallery",
    "delete assets",
    "also delete",
):
    assert forbidden.lower() not in dialog.lower(), forbidden


# Lead workspace remains isolated from Job deletion.
assert (
    "deleteCrmJobPermanently"
    not in lead
)

assert (
    "getCrmJobDeletePreflight"
    not in lead
)


# Job dialog must use the same markup contract as
# the approved Lead dialog; the shared CSS is structural.
for token in (
    'className="crm-delete-dialog__header"',
    'className="crm-delete-preflight"',
    "JobDeletePreflightGroup",
    "<h3>",
    "<ul>",
    "<li key={item.key}>",
    "<p>",
    'className="crm-delete-dialog__blocked"',
    'className="crm-delete-dialog__actions"',
    'id="crm-job-delete-confirmation"',
):
    assert token in job, token


# The Job-specific Record actions layout uses the
# shared destructive styling without retaining the
# Lead two-column empty-space layout.
assert (
    "crm-job-record-actions"
    in job
)

assert (
    ".crm-job-record-actions"
    in css
)


# Reuse the approved Lead destructive-dialog styling
# rather than introducing a parallel modal system.
for selector in (
    ".crm-lead-close-actions",
    ".crm-lead-close-option--danger",
    ".crm-delete-dialog",
    ".crm-delete-dialog__panel",
    ".crm-delete-preflight-group--delete",
    ".crm-delete-preflight-group--preserve",
    ".crm-delete-preflight-group--blocker",
    ".crm-delete-dialog__confirmation",
):
    assert selector in css, selector


# No schema expansion belongs to this UI gate.
assert not list(
    (
        ROOT
        / "d1"
        / "migrations"
    ).glob("049*")
)


print(
    "PASS v1.10.12a Gate 2C.3D Job permanent-delete UI"
)
print(
    "  server dependency preflight: visible"
)
print(
    "  delete / preserve / blocker groups: visible"
)
print(
    "  exact DELETE confirmation: required"
)
print(
    "  support-mode destructive UI: absent"
)
print(
    "  successful deletion: returns to Jobs"
)
print(
    "  Lead destructive boundary: preserved"
)
print(
    "  cross-module delete controls: absent"
)
print(
    "  existing Lead modal styling: reused"
)
print(
    "  schema change: none"
)
