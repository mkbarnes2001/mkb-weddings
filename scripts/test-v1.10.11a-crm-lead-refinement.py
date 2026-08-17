#!/usr/bin/env python3
"""v1.10.11a CRM Lead / journey refinement regression."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (
        ROOT / path
    ).read_text(encoding="utf-8")


crm = read(
    "src/admin/pages/CRM.tsx"
)

lead = read(
    "src/admin/pages/CRMEnquiry.tsx"
)

css = read(
    "src/admin/admin-theme.css"
)

legacy_preview = read(
    "scripts/test-v1.10.10a-client-portal-preview.py"
)


# CRM header no longer repeats global counts as status chips.
crm_header_start = crm.index(
    "<AdminPageHeader"
)

crm_header_end = crm.index(
    "\n      />",
    crm_header_start,
)

crm_header = crm[
    crm_header_start:
    crm_header_end
]

assert "meta={" not in crm_header
assert "crm.stats.open" not in crm_header
assert "crm.stats.jobs" not in crm_header
assert "crm.contacts.length" not in crm_header

# Real overview content remains available rather than deleting the
# WedCRM dashboard itself.
assert 'view === "overview"' in crm
assert 'className="admin-module-metrics"' in crm
assert "Upcoming schedule" in crm
assert "Client operations" in crm


# Lead header keeps useful actions but drops duplicate state badges.
lead_header_start = lead.index(
    "<AdminPageHeader"
)

lead_header_end = lead.index(
    "\n      />",
    lead_header_start,
)

lead_header = lead[
    lead_header_start:
    lead_header_end
]

assert "meta={" not in lead_header

for token in (
    "Open quote",
    "Create quote",
    "Client Portal",
    "Job operations",
):
    assert token in lead_header, token

assert "View Client Portal" not in lead

assert (
    'to={`/admin/crm/enquiries/${id}/client-portal`}'
    in lead_header
)

assert 'target="_blank"' in lead_header
assert 'rel="noreferrer"' in lead_header
assert "ExternalLink" in lead_header


# The lifecycle remains one real workflow; only its presentation is
# compacted. The secondary operational Journey/History model remains.
assert (
    'className="crm-lead-workspace-overview-panel '
    'crm-lead-workspace-overview-panel--compact"'
    in lead
)

assert (
    'description="Lead → quote → questionnaire → contract → invoice"'
    in lead
)

journey_panel_start = lead.index(
    'title="Client journey"'
)

journey_panel_end = lead.index(
    'className="crm-lead-workspace-layout"',
    journey_panel_start,
)

journey_panel = lead[
    journey_panel_start:
    journey_panel_end
]

assert "compact" in journey_panel
assert 'aria-label="Client journey"' in journey_panel
assert "crm-lead-workspace-journey" in journey_panel

for token in (
    'label: "Lead created"',
    'title="Journey"',
    'description="Current client state"',
):
    assert token in lead, token


# Compact styling hides only the duplicate identity/facts area,
# not the workflow milestones.
marker = (
    "/* v1.10.11a — compact CRM Lead journey */"
)

assert marker in css

compact_css = css[
    css.index(marker):
]

for token in (
    ".crm-lead-workspace-overview-panel--compact "
    ".crm-lead-workspace-overview__identity",
    ".crm-lead-workspace-overview__facts",
    "display: none !important;",
    ".crm-lead-workspace-journey",
    "repeat(7,minmax(78px,1fr))",
    "overflow-x: auto;",
):
    assert token in compact_css, token


# Historical professional-preview safety regression now follows the
# shorter label without weakening its route/order assertion.
assert (
    'assert "View Client Portal" not in lead'
    in legacy_preview
)

assert (
    """button_position = lead.index(
    'to={`/admin/crm/enquiries/${id}/client-portal`}'
)"""
    in legacy_preview
)

print(
    "PASS v1.10.11a compact CRM Lead journey"
)
print(
    "  CRM header count chips removed: verified"
)
print(
    "  duplicate Lead header state removed: verified"
)
print(
    "  Client Portal action compacted: verified"
)
print(
    "  persistent professional preview route preserved: verified"
)
print(
    "  workflow-only Client journey strip: verified"
)
print(
    "  existing operational journey data preserved: verified"
)
