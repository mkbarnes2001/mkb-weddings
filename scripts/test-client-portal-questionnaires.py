#!/usr/bin/env python3
"""Dependency-free v1.9.1a client portal and questionnaire regression checks."""
from __future__ import annotations

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "d1" / "schema.sql"
MIGRATION = ROOT / "d1" / "migrations" / "028_client_portal_questionnaires.sql"
A = "workspace_mkb_weddings"
B = "workspace_portal_tenant_b"


def one(con: sqlite3.Connection, sql: str, params: tuple = ()):
    return con.execute(sql, params).fetchone()


def source(path: str) -> str:
    return (ROOT / path).read_text()


def main() -> None:
    schema_text = SCHEMA.read_text()
    marker = "-- v1.9.1a: Client portal and questionnaires."
    assert marker in schema_text, "schema does not contain portal/questionnaire migration"

    con = sqlite3.connect(":memory:")
    con.row_factory = sqlite3.Row
    con.executescript(schema_text)
    assert one(con, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "31"

    required = {
        "crm_questionnaire_templates",
        "crm_questionnaire_instances",
        "crm_questionnaire_responses",
        "crm_questionnaire_files",
        "crm_job_client_access",
        "crm_portal_invitations",
    }
    tables = {row[0] for row in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert required <= tables, f"missing portal tables: {sorted(required - tables)}"
    assert one(con, "SELECT COUNT(*) FROM crm_questionnaire_templates WHERE workspace_id=?", (A,))[0] >= 1

    pre_portal = schema_text.split(marker, 1)[0]
    upgrade = sqlite3.connect(":memory:")
    upgrade.executescript(pre_portal)
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "27"
    upgrade.executescript(MIGRATION.read_text())
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "28"
    assert not upgrade.execute("PRAGMA foreign_key_check").fetchall()

    con.execute("INSERT INTO workspaces (id, slug, name) VALUES (?, 'portal-b', 'Portal B')", (B,))
    con.execute("INSERT INTO workspace_settings (workspace_id, business_name) VALUES (?, 'Portal B')", (B,))
    con.execute("INSERT INTO crm_contacts (id,workspace_id,display_name,email_normalized,email) VALUES ('contact-a',?,'A Client','a@example.test','a@example.test')", (A,))
    con.execute("INSERT INTO crm_contacts (id,workspace_id,display_name,email_normalized,email) VALUES ('contact-b',?,'B Client','b@example.test','b@example.test')", (B,))
    con.execute("INSERT INTO client_identities (id,workspace_id,email_normalized,email) VALUES ('identity-a',?,'a@example.test','a@example.test')", (A,))
    con.execute("INSERT INTO client_identities (id,workspace_id,email_normalized,email) VALUES ('identity-b',?,'b@example.test','b@example.test')", (B,))
    con.execute("INSERT INTO crm_jobs (id,workspace_id,reference,title) VALUES ('job-a',?,'JOB-A','A Job')", (A,))
    con.execute("INSERT INTO crm_jobs (id,workspace_id,reference,title) VALUES ('job-b',?,'JOB-B','B Job')", (B,))
    con.execute("INSERT INTO crm_questionnaire_templates (id,workspace_id,name,schema_json) VALUES ('template-b',?,'B Template','[{\"id\":\"name\",\"type\":\"short_text\",\"label\":\"Name\",\"required\":true,\"help\":\"\",\"options\":[]}]')", (B,))
    con.execute("INSERT INTO crm_questionnaire_instances (id,workspace_id,job_id,template_id,assigned_contact_id,title,schema_json) VALUES ('instance-b',?,'job-b','template-b','contact-b','B Questionnaire','[{\"id\":\"name\",\"type\":\"short_text\",\"label\":\"Name\",\"required\":true,\"help\":\"\",\"options\":[]}]')", (B,))
    con.execute("INSERT INTO crm_job_client_access (job_id,workspace_id,contact_id,identity_id,role) VALUES ('job-b',?,'contact-b','identity-b','primary')", (B,))
    con.execute("INSERT INTO crm_questionnaire_responses (instance_id,workspace_id,field_key,value_json,updated_by_identity_id) VALUES ('instance-b',?,'name','\"B Secret\"','identity-b')", (B,))

    for sql, params in [
        ("INSERT INTO crm_questionnaire_instances (id,workspace_id,job_id,template_id,assigned_contact_id,title) VALUES ('bad-instance',?,'job-a','template-b','contact-b','Bad')", (B,)),
        ("INSERT INTO crm_questionnaire_responses (instance_id,workspace_id,field_key,value_json,updated_by_identity_id) VALUES ('instance-b',?,'x','1','identity-a')", (B,)),
        ("INSERT INTO crm_job_client_access (job_id,workspace_id,contact_id,identity_id) VALUES ('job-b',?,'contact-a','identity-b')", (B,)),
        ("INSERT INTO crm_portal_invitations (id,workspace_id,job_id,contact_id,identity_id,email,token_hash,expires_at) VALUES ('bad-invite',?,'job-a','contact-b','identity-b','b@example.test','hash',datetime('now','+1 hour'))", (B,)),
    ]:
        try:
            con.execute(sql, params)
            raise AssertionError("cross-workspace portal relationship was accepted")
        except sqlite3.IntegrityError:
            pass

    before = one(con, "SELECT schema_json FROM crm_questionnaire_instances WHERE id='instance-b'")[0]
    con.execute("UPDATE crm_questionnaire_templates SET schema_json='[]', version=2 WHERE id='template-b'")
    after = one(con, "SELECT schema_json FROM crm_questionnaire_instances WHERE id='instance-b'")[0]
    assert before == after, "assigned questionnaire snapshot changed with template"
    assert one(con, "SELECT value_json FROM crm_questionnaire_responses WHERE instance_id='instance-b' AND workspace_id=?", (A,)) is None
    assert not con.execute("PRAGMA foreign_key_check").fetchall()

    portal_source = source("serverless/client-portal-d1.ts")
    admin_route = source("functions/api/crm/[[path]].ts")
    public_index = source("functions/api/public/client-portal/index.ts")
    public_request = source("functions/api/public/client-portal/request-link.ts")
    public_questionnaire = source("functions/api/public/client-portal/questionnaires/[id].ts")
    public_files = source("functions/api/public/client-portal/questionnaires/[id]/files.ts")
    admin_app = source("src/admin/app/AdminApp.tsx")
    public_app = source("src/App.tsx")
    operations = source("serverless/platform-operations-d1.ts")
    builder = source("src/admin/pages/CRMQuestionnaireTemplate.tsx")

    for needle in [
        'requirePermission(actor, "crm:read")',
        'requirePermission(actor, "crm:manage")',
        "getAuthenticatedClientIdentity",
        "token_hash",
        "client_identity_sessions",
        "workspace_id = ?",
        "sanitiseSchema",
        "validateSubmission",
        "Complete the required questions before submitting.",
        "MKB_PRIVATE_ASSETS",
        "10 MB",
        "THEN 'completed'",
        "portalOrigin",
        "purpose = 'public' AND verified = 1",
        "Choose the client who should complete this questionnaire.",
        "AND contact_id = ?",
    ]:
        assert needle in portal_source or needle in public_files, f"missing portal guard: {needle}"
    assert "resolvePublicWorkspaceId" in public_index
    assert "resolvePublicWorkspaceId" in public_request
    assert "resolvePublicWorkspaceId" in public_questionnaire
    assert "requireProfessionalContext" in admin_route
    assert 'path="crm/jobs/:id"' in admin_app
    assert 'path="crm/questionnaires/:id"' in admin_app
    assert 'path="/client-portal"' in public_app
    assert "File upload" in builder and "Drag to reorder" in builder
    for table in required:
        assert f'"{table}"' in operations, f"workspace export missing {table}"
    assert 'crm_portal_invitations: ["token_hash"]' in operations
    assert 'crm_questionnaire_files: ["storage_key"]' in operations

    print("PASS v1.9.2 client portal and questionnaires")
    print("  portal access: workspace-scoped and magic-link authenticated")
    print("  questionnaire snapshots/responses: versioned and guarded")
    print("  private attachments: authorised and R2-backed")
    print("  Admin/public routes and export coverage: verified")
    print("  schema version: 31")


if __name__ == "__main__":
    main()
