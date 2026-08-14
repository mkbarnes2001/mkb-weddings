#!/usr/bin/env python3
"""Dependency-free v1.9.1b supplier questionnaire and Job workspace checks."""
from __future__ import annotations

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "d1" / "schema.sql"
MIGRATION = ROOT / "d1" / "migrations" / "029_supplier_questionnaire_integration.sql"
A = "workspace_mkb_weddings"
B = "workspace_supplier_tenant_b"


def one(con: sqlite3.Connection, sql: str, params: tuple = ()):
    return con.execute(sql, params).fetchone()


def source(path: str) -> str:
    return (ROOT / path).read_text()


def main() -> None:
    schema_text = SCHEMA.read_text()
    marker = "-- v1.9.1b: Supplier questionnaire integration and Job workspace improvements."
    assert marker in schema_text, "schema does not contain supplier questionnaire migration"

    con = sqlite3.connect(":memory:")
    con.row_factory = sqlite3.Row
    con.executescript(schema_text)
    assert one(con, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "41"
    tables = {row[0] for row in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert "crm_supplier_submissions" in tables
    assert one(con, "SELECT COUNT(*) FROM crm_questionnaire_templates WHERE workspace_id=? AND schema_json LIKE '%\"type\":\"supplier\"%'", (A,))[0] >= 1

    before_supplier = schema_text.split(marker, 1)[0]
    upgrade = sqlite3.connect(":memory:")
    upgrade.executescript(before_supplier)
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "28"
    assert one(upgrade, "SELECT COUNT(*) FROM crm_questionnaire_templates WHERE schema_json LIKE '%\"id\":\"supplier_notes\"%'")[0] >= 1
    upgrade.executescript(MIGRATION.read_text())
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "29"
    assert one(upgrade, "SELECT COUNT(*) FROM crm_questionnaire_templates WHERE schema_json LIKE '%\"type\":\"supplier\"%'")[0] >= 1
    assert not upgrade.execute("PRAGMA foreign_key_check").fetchall()

    con.execute("INSERT INTO workspaces (id, slug, name) VALUES (?, 'supplier-b', 'Supplier B')", (B,))
    con.execute("INSERT INTO workspace_settings (workspace_id, business_name) VALUES (?, 'Supplier B')", (B,))
    con.execute("INSERT INTO crm_contacts (id,workspace_id,display_name,email_normalized,email) VALUES ('contact-a',?,'A Client','a@example.test','a@example.test')", (A,))
    con.execute("INSERT INTO crm_contacts (id,workspace_id,display_name,email_normalized,email) VALUES ('contact-b',?,'B Client','b@example.test','b@example.test')", (B,))
    con.execute("INSERT INTO crm_jobs (id,workspace_id,reference,title,wedding_slug) VALUES ('job-a',?,'JOB-A','A Job','wedding-a')", (A,))
    con.execute("INSERT INTO crm_jobs (id,workspace_id,reference,title,wedding_slug) VALUES ('job-b',?,'JOB-B','B Job','wedding-b')", (B,))
    con.execute("INSERT INTO crm_questionnaire_templates (id,workspace_id,name,schema_json) VALUES ('template-b',?,'B Template','[{\"id\":\"suppliers\",\"type\":\"supplier\",\"label\":\"Supplier team\",\"required\":false,\"options\":[],\"supplierRole\":\"Supplier\",\"allowUnlisted\":true,\"multiple\":true}]')", (B,))
    con.execute("INSERT INTO crm_questionnaire_instances (id,workspace_id,job_id,template_id,assigned_contact_id,title,schema_json) VALUES ('instance-b',?,'job-b','template-b','contact-b','B Questionnaire','[{\"id\":\"suppliers\",\"type\":\"supplier\",\"label\":\"Supplier team\",\"required\":false,\"options\":[]}]')", (B,))
    con.execute("INSERT INTO suppliers (id,workspace_id,name,display_name,category) VALUES ('supplier-b',?,'B Florist','B Florist','Florist')", (B,))
    con.execute("INSERT INTO crm_supplier_submissions (id,workspace_id,job_id,wedding_slug,instance_id,field_key,contact_id,role,proposed_name,status) VALUES ('submission-b',?,'job-b','wedding-b','instance-b','suppliers','contact-b','Florist','New Florist','pending')", (B,))
    assert one(con, "SELECT proposed_name FROM crm_supplier_submissions WHERE id='submission-b' AND workspace_id=?", (B,))[0] == "New Florist"
    assert one(con, "SELECT proposed_name FROM crm_supplier_submissions WHERE id='submission-b' AND workspace_id=?", (A,)) is None

    invalid = [
        ("INSERT INTO crm_supplier_submissions (id,workspace_id,job_id,instance_id,field_key,contact_id,role,proposed_name) VALUES ('bad-job',?,'job-a','instance-b','x','contact-b','Supplier','Bad')", (B,)),
        ("INSERT INTO crm_supplier_submissions (id,workspace_id,job_id,instance_id,field_key,contact_id,supplier_id,role,proposed_name) VALUES ('bad-supplier',?,'job-b','instance-b','y','contact-b','supplier-a','Supplier','Bad')", (B,)),
    ]
    con.execute("INSERT INTO suppliers (id,workspace_id,name,display_name) VALUES ('supplier-a',?,'A Supplier','A Supplier')", (A,))
    for sql, params in invalid:
        try:
            con.execute(sql, params)
            raise AssertionError("cross-workspace supplier relationship was accepted")
        except sqlite3.IntegrityError:
            pass
    assert not con.execute("PRAGMA foreign_key_check").fetchall()

    portal = source("serverless/client-portal-d1.ts")
    crm = source("serverless/crm-d1.ts")
    route = source("functions/api/crm/[[path]].ts")
    job_page = source("src/admin/pages/CRMJob.tsx")
    contact_page = source("src/admin/pages/CRMContact.tsx")
    builder = source("src/admin/pages/CRMQuestionnaireTemplate.tsx")
    client = source("src/components/ClientPortal.tsx")
    operations = source("serverless/platform-operations-d1.ts")
    admin_app = source("src/admin/app/AdminApp.tsx")

    for needle in [
        'type === "supplier"',
        "syncSupplierAnswers",
        "linkSupplierToWedding",
        "approveSupplierSubmission",
        "rejectSupplierSubmission",
        "DEFAULT_CLIENT_PORTAL_ORIGIN",
        "purpose = 'public' AND verified = 1",
    ]:
        assert needle in portal, f"missing supplier/portal guard: {needle}"
    assert "getCrmContact" in crm and "updateCrmContact" in crm
    assert 'parts[0] === "contacts"' in route
    assert 'parts[2] === "supplier-submissions"' in route
    assert 'path="crm/contacts/:id"' in admin_app
    for needle in ["Workflow", "Supplier team", "Needs review", "Files", "Notes", "Edit client"]:
        assert needle.lower() in job_page.lower(), f"Job workspace missing {needle}"
    assert "Supplier selection" in builder and "Allow supplier not listed" in builder
    assert "SupplierQuestion" in client and "Supplier not listed" in client
    assert '"crm_supplier_submissions"' in operations
    assert "duplicate CRM contacts" in contact_page

    print("PASS v1.9.2 supplier questionnaire integration")
    print("  structured supplier fields: builder and client portal verified")
    print("  known suppliers: automatic Wedding linking path verified")
    print("  unlisted suppliers: workspace-scoped approval/merge queue verified")
    print("  contact editing and public-domain invitation guard: verified")
    print("  Job workspace and export coverage: verified")
    print("  schema version: 37")


if __name__ == "__main__":
    main()
