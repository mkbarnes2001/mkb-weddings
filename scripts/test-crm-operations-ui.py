#!/usr/bin/env python3
"""Source regression checks for v1.9.3a.1 desktop/mobile CRM operations UI."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    crm = (ROOT / "src/admin/pages/CRM.tsx").read_text()
    job = (ROOT / "src/admin/pages/CRMJob.tsx").read_text()
    layout = (ROOT / "src/admin/layouts/AdminLayout.tsx").read_text()
    ui = (ROOT / "src/admin/components/ui/AdminUI.tsx").read_text()
    css = (ROOT / "src/admin/admin-theme.css").read_text()
    schema = (ROOT / "d1/schema.sql").read_text()

    # CRM overview: list-first leads/jobs, visible filtering and real schedule data.
    assert 'useState<"board" | "list">("list")' in crm
    assert 'type View = "pipeline" | "contacts" | "jobs" | "schedule"' in crm
    assert 'placeholder="Search lead name, venue or reference"' in crm
    assert '<option value="open">Open leads</option>' in crm
    assert 'className="crm-operation-record"' in crm
    assert 'className="crm-operation-record crm-operation-record--job"' in crm
    assert 'nextLeadAction(enquiry)' in crm
    assert 'job.nextTaskTitle || "No pending task"' in crm
    assert 'crm-schedule-list' in crm and 'nextTaskDueAt' in crm and 'eventDate' in crm

    # Job workspace: clear functional accordions only; no future empty financial modules.
    assert "export function AdminAccordion" in ui
    for section in [
        'title="Quote and package"',
        'title="Workflow and tasks"',
        'title="Communication"',
        'title="Clients"',
        'title="Questionnaires"',
        'title="Supplier team"',
        'title="Files"',
        'title="Notes and activity"',
    ]:
        assert section in job, section
    assert 'crm-job-overview__facts' in job
    assert 'job.nextTaskTitle' in job
    assert 'title="Invoices"' not in job
    assert 'title="Contracts"' not in job
    assert 'title="Payments"' not in job

    # Mobile shell preserves full platform access while exposing CRM-first navigation.
    assert 'className="admin-mobile-bottom-nav"' in layout
    assert 'label: "Clients"' in layout
    assert 'label: "Leads"' in layout
    assert 'label: "Jobs"' in layout
    assert 'label: "Schedule"' in layout
    assert 'className="admin-mobile-more"' in layout
    assert 'navItems.map' in layout

    # Responsive CSS supports both desktop operational rows and mobile fixed navigation.
    for selector in [
        ".crm-operation-record__main",
        ".crm-job-operations-grid",
        ".admin-accordion__summary",
        ".admin-mobile-bottom-nav",
        ".admin-mobile-more",
        "@media (max-width: 760px)",
    ]:
        assert selector in css, selector

    # UI-only release: database remains at schema 31 and no migration 032 exists.
    assert "('schema_version', '31'" in schema or 'schema_version\', \'31' in schema
    assert not (ROOT / "d1/migrations/032_crm_operations_ui.sql").exists()

    print("PASS v1.9.3a.1 CRM operations UI")
    print("  desktop/mobile lead and Job lists: verified")
    print("  operational Schedule view: verified")
    print("  functional Job accordions: verified")
    print("  mobile CRM navigation and full Admin access: verified")
    print("  schema transition: none (remains 31)")


if __name__ == "__main__":
    main()
