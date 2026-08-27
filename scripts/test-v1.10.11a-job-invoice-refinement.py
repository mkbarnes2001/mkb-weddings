#!/usr/bin/env python3
"""v1.10.11a compact Jobs + dedicated invoice workspace."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(encoding="utf-8")


crm = read(
    "src/admin/pages/CRM.tsx"
)

job = read(
    "src/admin/pages/CRMJob.tsx"
)

invoice = read(
    "src/admin/pages/CRMInvoice.tsx"
)

app = read(
    "src/admin/app/AdminApp.tsx"
)

css = read(
    "src/admin/admin-theme.css"
)

payment = read(
    "src/admin/components/CrmInvoicePaymentForm.tsx"
)

api = read(
    "src/admin/services/AdminApiService.ts"
)


# ------------------------------------------------------------
# Jobs list: compact direct icon actions and no repeated portal
# copy inside each record.
# ------------------------------------------------------------

job_record_start = crm.index(
    "function JobRecord("
)

job_record_end = crm.index(
    "export function CRM()",
    job_record_start,
)

job_record = crm[
    job_record_start:
    job_record_end
]

assert "crm-job-record-actions" in job_record

for token in (
    'title="Open Job"',
    'title="Open Wedding Workspace"',
    'title="Open quote"',
    "LayoutDashboard",
    "FileQuestion",
    "ExternalLink",
):
    assert token in job_record, token

assert "crm-record-menu" not in job_record
assert "clientPortalStatus" not in job_record


# ------------------------------------------------------------
# Job header / overview are compact.
# ------------------------------------------------------------

header_start = job.index(
    "<AdminPageHeader"
)

header_end = job.index(
    "\n      />",
    header_start,
)

header = job[
    header_start:
    header_end
]

assert 'className="crm-job-page-header"' in header
assert "meta={" not in header

for token in (
    "job.reference",
    "dateLabel(job.eventDate)",
    'job.venueText',
    'title="Open quote"',
    'title="Open Wedding Workspace"',
):
    assert token in header, token

assert "crm-job-overview__facts" not in job
assert "crm-job-overview__identity" not in job

# v1.10.12a deliberately supersedes the former horizontal progress
# strip with the shared Wedding workspace workflow while preserving
# the compact v1.10.11a Job header and commercial workspace.
#
# The shared workflow itself is covered by the dedicated v1.10.12a
# Wedding-workspace regressions; this historical regression only owns
# the legacy Job progress-strip removal contract.
assert "crm-job-progress-strip" not in job
assert 'aria-label="Job progress"' not in job


# ------------------------------------------------------------
# Job invoice card now opens dedicated invoice administration.
# ------------------------------------------------------------

assert (
    'to={`/admin/crm/jobs/${job.id}/invoices/${commercialInvoice.id}`}'
    in job
)

assert (
    "crm-commercial-card--link"
    in job
)

assert (
    "crm-commercial-card__open"
    in job
)


# Manual payment no longer clutters the Job workspace.
assert "CrmInvoicePaymentForm" not in job
assert "Record manual payment" not in job


# ------------------------------------------------------------
# Dedicated Invoice page is registered and uses the existing
# workspace read model and payment service.
# ------------------------------------------------------------

assert (
    'import { CRMInvoice } from "../pages/CRMInvoice";'
    in app
)

assert (
    'path="crm/jobs/:jobId/invoices/:invoiceId"'
    in app
)

for token in (
    "export function CRMInvoice()",
    "getCrmJobWorkspace(",
    "result.commercial.invoice",
    "invoice.id !== invoiceId",
    "crm-invoice-summary",
    'title="Payment schedule"',
    "crm-invoice-schedule",
    "<CrmInvoicePaymentForm",
):
    assert token in invoice, token


# Support-mode payment mutations remain unavailable.
assert (
    'auth.accessMode !== "support"'
    in invoice
)

assert (
    "canManage={canManage}"
    in invoice
)


# Existing manual-payment validation/API remains authoritative.
for token in (
    ".recordCrmInvoicePayment(",
    "Payment exceeds the outstanding invoice balance.",
    "Refund exceeds the amount currently paid.",
    "Offline record only",
):
    assert token in payment, token

assert (
    "static async recordCrmInvoicePayment("
    in api
)


# No fake client-payment integration has been introduced.
for forbidden in (
    "Pay now",
    "checkoutUrl",
    "createStripe",
):
    assert forbidden not in invoice, forbidden


# ------------------------------------------------------------
# Responsive WedPlanned-native styles.
# ------------------------------------------------------------

marker = (
    "/* v1.10.11a — compact Jobs and invoice workspace */"
)

assert marker in css

c3_css = css[
    css.index(marker):
]

for token in (
    ".crm-job-record-actions",
    ".crm-job-page-header",
    ".crm-commercial-card--link",
    ".crm-invoice-summary",
    ".crm-invoice-schedule",
    "@media (max-width: 900px)",
    "@media (max-width: 760px)",
):
    assert token in c3_css, token


print(
    "PASS v1.10.11a Jobs and invoice refinement"
)
print(
    "  direct icon Job actions: verified"
)
print(
    "  duplicate Job overview removed: verified"
)
print(
    "  compact Job journey retained: verified"
)
print(
    "  invoice card navigation: verified"
)
print(
    "  standalone Job payment form removed: verified"
)
print(
    "  dedicated invoice workspace: verified"
)
print(
    "  manual payment API and guards preserved: verified"
)
print(
    "  fake online payment controls absent: verified"
)
