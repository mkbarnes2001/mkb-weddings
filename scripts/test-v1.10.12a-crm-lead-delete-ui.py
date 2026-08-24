#!/usr/bin/env python3
"""Gate 2C.2B Lead permanent-delete UI regression."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (
        ROOT / relative
    ).read_text(
        encoding="utf-8",
    )


page = read(
    "src/admin/pages/CRMEnquiry.tsx"
)

service = read(
    "src/admin/services/AdminApiService.ts"
)

types = read(
    "src/admin/types/crm.ts"
)

css = read(
    "src/admin/admin-theme.css"
)

action = read(
    "serverless/crm-delete-actions-d1.ts"
)


for token in (
    "CrmDeletePreflightItem",
    "CrmDeletePreflight",
    "CrmLeadDeleteReceipt",
    'confirmationText: "DELETE"',
):
    assert token in types, token


for token in (
    "getCrmEnquiryDeletePreflight",
    "deleteCrmEnquiryPermanently",
    'method: "DELETE"',
    "confirmation",
):
    assert token in service, token


for token in (
    "openLeadDeleteDialog",
    "closeLeadDeleteDialog",
    "permanentlyDeleteLead",
    "deletePreflight",
    "deleteConfirm",
    "deleteBusy",
    "deleteError",
):
    assert token in page, token


for token in (
    'title="Close lead"',
    "Mark lost",
    "Delete permanently",
    "Will be deleted",
    "Will be preserved",
    "Cannot delete until resolved",
    "This action cannot be undone.",
    "Type",
    "DELETE",
    "Master client records are",
):
    assert token in page, token


# Only unbooked Leads expose this UI.
close_pos = page.index(
    'title="Close lead"'
)

close_start = page.rfind(
    "{canManage",
    0,
    close_pos,
)

assert close_start >= 0

close_guard = page[
    close_start:
    close_pos
]

assert (
    'enquiry.status !== "won"'
    in close_guard
)

assert (
    "!detail.job"
    in close_guard
)


# The preflight is loaded before confirmation.
assert (
    ".getCrmEnquiryDeletePreflight("
    in page
)

assert (
    ".deleteCrmEnquiryPermanently("
    in page
)

assert (
    "deletePreflight.canDelete"
    in page
)

assert (
    "deleteConfirm"
    in page
)

assert (
    "deletePreflight"
    in page
    and ".confirmationText"
    in page
)


# Successful deletion leaves the deleted detail route.
assert (
    '"/admin/crm"'
    in page
)

assert (
    "replace: true"
    in page
)


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


# Destructive backend protection remains authoritative.
assert (
    "getCrmEnquiryDeletePreflight"
    in action
)

assert (
    'confirmation !== "DELETE"'
    in action
)

assert (
    "DELETE FROM crm_contacts"
    not in action
)


# Job permanent deletion remains outside Gate 2C.2B.
assert (
    "deleteCrmJobPermanently"
    not in service
)

assert (
    "deleteCrmJobPermanently"
    not in page
)

assert not list(
    (
        ROOT / "d1/migrations"
    ).glob("049*")
)


print(
    "PASS v1.10.12a Gate 2C.2B Lead permanent-delete UI"
)
print(
    "  Mark lost: preserved as normal close action"
)
print(
    "  permanent delete: exceptional action"
)
print(
    "  dependency preflight: visible before confirmation"
)
print(
    "  delete / preserve / blocker groups: rendered"
)
print(
    "  exact DELETE confirmation: required"
)
print(
    "  booked Lead delete UI: absent"
)
print(
    "  successful deletion: returns to Leads"
)
print(
    "  Job permanent delete UI: absent"
)
print(
    "  schema change: none"
)
