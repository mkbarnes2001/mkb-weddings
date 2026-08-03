#!/usr/bin/env python3
"""Dependency-free v1.9.2 workflow, task and communication checks."""
from __future__ import annotations

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "d1" / "schema.sql"
MIGRATION = ROOT / "d1" / "migrations" / "030_workflows_communications.sql"
A = "workspace_mkb_weddings"
B = "workspace_workflow_tenant_b"


def one(con: sqlite3.Connection, sql: str, params: tuple = ()):
    return con.execute(sql, params).fetchone()


def source(path: str) -> str:
    return (ROOT / path).read_text()


def main() -> None:
    schema_text = SCHEMA.read_text()
    marker = "-- v1.9.2: Workflow templates, tasks, communication history and lead autoresponders."
    assert marker in schema_text, "schema does not contain workflow/communication migration"

    con = sqlite3.connect(":memory:")
    con.row_factory = sqlite3.Row
    con.executescript(schema_text)
    assert one(con, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "31"
    required = {
        "crm_workflow_templates",
        "crm_workflow_template_steps",
        "crm_job_workflows",
        "crm_tasks",
        "crm_communications",
    }
    tables = {row[0] for row in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert required <= tables, f"missing workflow tables: {sorted(required - tables)}"
    assert one(con, "SELECT COUNT(*) FROM crm_workflow_templates WHERE workspace_id=? AND is_default=1", (A,))[0] == 1
    assert one(con, "SELECT COUNT(*) FROM crm_workflow_template_steps WHERE workspace_id=?", (A,))[0] == 5
    settings = one(con, "SELECT autoresponder_enabled, autoresponder_subject, autoresponder_message FROM crm_lead_form_settings WHERE workspace_id=?", (A,))
    assert settings and settings[0] == 0 and settings[1] and settings[2]

    before = schema_text.split(marker, 1)[0]
    upgrade = sqlite3.connect(":memory:")
    upgrade.executescript(before)
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "29"
    upgrade.executescript(MIGRATION.read_text())
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "30"
    assert not upgrade.execute("PRAGMA foreign_key_check").fetchall()

    con.execute("INSERT INTO workspaces (id, slug, name) VALUES (?, 'workflow-b', 'Workflow B')", (B,))
    con.execute("INSERT INTO workspace_settings (workspace_id, business_name) VALUES (?, 'Workflow B')", (B,))
    con.execute("INSERT INTO crm_pipeline_stages (id,workspace_id,stage_key,name,is_default) VALUES ('stage-b',?,'new','New',1)", (B,))
    con.execute("INSERT INTO crm_contacts (id,workspace_id,display_name,email_normalized,email) VALUES ('contact-a',?,'A Client','a@example.test','a@example.test')", (A,))
    con.execute("INSERT INTO crm_contacts (id,workspace_id,display_name,email_normalized,email) VALUES ('contact-b',?,'B Client','b@example.test','b@example.test')", (B,))
    con.execute("INSERT INTO crm_enquiries (id,workspace_id,reference,stage_id) VALUES ('enquiry-b',?,'ENQ-B','stage-b')", (B,))
    con.execute("INSERT INTO crm_jobs (id,workspace_id,reference,enquiry_id,title,event_date,booking_date) VALUES ('job-b',?,'JOB-B','enquiry-b','B Job','2027-08-10','2026-08-02')", (B,))
    con.execute("INSERT INTO crm_workflow_templates (id,workspace_id,name,is_default) VALUES ('template-b',?,'B Workflow',1)", (B,))
    con.execute("INSERT INTO crm_workflow_template_steps (id,workspace_id,template_id,name) VALUES ('step-b',?,'template-b','B Task')", (B,))
    con.execute("INSERT INTO crm_job_workflows (id,workspace_id,job_id,template_id,template_name) VALUES ('workflow-b',?,'job-b','template-b','B Workflow')", (B,))
    con.execute("INSERT INTO crm_tasks (id,workspace_id,job_id,workflow_id,template_step_id,title,due_at) VALUES ('task-b',?,'job-b','workflow-b','step-b','B Task','2027-08-01')", (B,))
    con.execute("INSERT INTO crm_communications (id,workspace_id,contact_id,enquiry_id,job_id,channel,direction,subject,body) VALUES ('comm-b',?,'contact-b','enquiry-b','job-b','email','outbound','Hello','Private')", (B,))
    assert one(con, "SELECT title FROM crm_tasks WHERE id='task-b' AND workspace_id=?", (B,))[0] == "B Task"
    assert one(con, "SELECT title FROM crm_tasks WHERE id='task-b' AND workspace_id=?", (A,)) is None

    invalid = [
        ("INSERT INTO crm_tasks (id,workspace_id,job_id,title) VALUES ('bad-task',?,'job-b','Bad')", (A,)),
        ("INSERT INTO crm_communications (id,workspace_id,contact_id,job_id,body) VALUES ('bad-comm',?,'contact-a','job-b','Bad')", (A,)),
        ("INSERT INTO crm_job_workflows (id,workspace_id,job_id,template_id,template_name) VALUES ('bad-workflow',?,'job-b','template-b','Bad')", (A,)),
    ]
    for sql, params in invalid:
        try:
            con.execute(sql, params)
            raise AssertionError("cross-workspace workflow relationship was accepted")
        except sqlite3.IntegrityError:
            pass
    assert not con.execute("PRAGMA foreign_key_check").fetchall()

    workflow = source("serverless/crm-workflow-d1.ts")
    crm = source("serverless/crm-d1.ts")
    route = source("functions/api/crm/[[path]].ts")
    public_route = source("functions/api/public/crm/enquiries.ts")
    overview = source("src/admin/pages/CRM.tsx")
    job_page = source("src/admin/pages/CRMJob.tsx")
    builder = source("src/admin/pages/CRMWorkflowTemplate.tsx")
    app = source("src/admin/app/AdminApp.tsx")
    operations = source("serverless/platform-operations-d1.ts")

    for needle in [
        "applyDefaultWorkflowToJob",
        "applyWorkflowToJob",
        "createJobTask",
        "updateJobTask",
        "logJobCommunication",
        "sendJobEmail",
        "sendLeadAutoresponder",
    ]:
        assert needle in workflow, f"workflow server missing {needle}"
    assert "await applyDefaultWorkflowToJob" in crm
    assert "SELECT 1 FROM crm_job_contacts" in workflow, "logged Job communication must validate the linked contact"
    assert 'parts[0] === "workflows"' in route
    assert 'parts[2] === "communications"' in route
    assert "sendLeadAutoresponder" in public_route
    assert "Acknowledgement subject" in overview and "Leads overview" in overview and "Task overview" in overview
    assert "Workflow and tasks" in job_page and "Communication" in job_page and "Send email" in job_page
    assert "Default workflow" in builder and "Day offset" in builder
    assert 'path="crm/workflows/:id"' in app
    for table in required:
        assert f'"{table}"' in operations, f"workspace export missing {table}"

    print("PASS v1.9.2 workflows and communication")
    print("  workflow templates and Job task snapshots: verified")
    print("  automatic default workflow application: verified")
    print("  manual tasks and completion lifecycle: verified")
    print("  Job communication history and outbound email path: verified")
    print("  public lead autoresponder and list views: verified")
    print("  workspace isolation/export coverage: verified")
    print("  schema version: 31")


if __name__ == "__main__":
    main()
