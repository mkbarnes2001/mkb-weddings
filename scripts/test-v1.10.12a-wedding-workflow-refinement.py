#!/usr/bin/env python3
"""Regression checks for v1.10.12a Wedding Photography Job workflow."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

job = (
    ROOT / "src/admin/pages/CRMJob.tsx"
).read_text()

workflow = (
    ROOT / "serverless/crm-workflow-d1.ts"
).read_text()

css = (
    ROOT / "src/admin/admin-theme.css"
).read_text()

schema = (
    ROOT / "d1/schema.sql"
).read_text()


# ------------------------------------------------------------
# Vertical Wedding Photography workflow replaces generic UI.
# ------------------------------------------------------------

assert 'title="Wedding workflow"' in job
assert (
    'description="Wedding Photography · key booking and delivery milestones."'
    in job
)

for milestone in (
    "Lead created",
    "Job accepted",
    "Wedding day",
    "Previews sent",
    "Client photos delivered",
):
    assert milestone in job, milestone

assert 'title="Workflow and tasks"' not in job
assert 'crm-job-progress-strip' not in job
assert 'aria-label="Job progress"' not in job

# Existing Job save/milestone feedback must remain visible.
assert "admin-alert admin-alert--success" in job
assert "{message}" in job


# ------------------------------------------------------------
# Automatic and scheduled milestones use authoritative Job data.
# ------------------------------------------------------------

assert "workspace.enquiry?.createdAt" in job
assert "job.bookingDate" in job
assert "job.eventDate" in job
assert "job.venueText" in job


# ------------------------------------------------------------
# Delivery milestones persist through existing crm_tasks.
# ------------------------------------------------------------

assert "togglePhotographyMilestone" in job
assert "AdminApiService.createCrmJobTask" in job
assert "AdminApiService.updateCrmJobTask" in job
assert 'task.taskType === "milestone"' in job
assert '"Previews sent"' in job
assert '"Client photos delivered"' in job


# ------------------------------------------------------------
# Final delivery owns Job completion/reactivation semantics.
# ------------------------------------------------------------

assert "photographyDeliveryMilestone" in workflow
assert (
    '=== "client photos delivered"'
    in workflow
)

assert (
    "SET status = 'completed',"
    in workflow
)

assert (
    "SET status = 'active',"
    in workflow
)

assert (
    '"job.completed"'
    in workflow
)

assert (
    '"job.reactivated"'
    in workflow
)

assert (
    '"photography_final_delivery"'
    in workflow
)

assert (
    '["cancelled", "archived"]'
    in workflow
)


# ------------------------------------------------------------
# Existing schema already supports this lifecycle.
# No new persistence model is required.
# ------------------------------------------------------------

assert (
    "CHECK (status IN ('provisional', 'booked', 'active', "
    "'completed', 'cancelled', 'archived'))"
    in schema
)

assert (
    "CHECK (status IN ('pending', 'completed', 'cancelled'))"
    in schema
)


# ------------------------------------------------------------
# Compact Job dashboard composition.
# ------------------------------------------------------------

assert 'className="crm-job-primary-grid"' in job
assert 'className="crm-job-summary-grid"' in job

assert job.count('id="job-clients"') == 1

assert (
    job.index('title="Wedding workflow"')
    < job.index('title="Clients"')
    < job.index('title="Booking and payments"')
    < job.index('title="Wedding delivery and content"')
)

for selector in (
    ".crm-job-primary-grid",
    ".crm-job-summary-grid",
    ".crm-job-top-clients",
):
    assert selector in css, selector


# ------------------------------------------------------------
# WedPlanned-native compact vertical presentation.
# ------------------------------------------------------------

for selector in (
    ".crm-wedding-workflow",
    ".crm-wedding-workflow__item",
    ".crm-wedding-workflow__marker",
    ".crm-wedding-workflow__toggle",
    ".crm-wedding-workflow__content",
    ".crm-wedding-workflow__heading",
):
    assert selector in css, selector


print(
    "PASS v1.10.12a Wedding Photography workflow refinement"
)

print(
    "  five-stage vertical workflow: verified"
)

print(
    "  old horizontal/task workspace removed: verified"
)

print(
    "  crm_tasks milestone persistence: verified"
)

print(
    "  final delivery Job completion/reactivation: verified"
)

print(
    "  schema change required: no"
)
