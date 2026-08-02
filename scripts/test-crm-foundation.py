#!/usr/bin/env python3
"""Dependency-free v1.9.0 CRM foundation regression checks."""
from __future__ import annotations

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "d1" / "schema.sql"
MIGRATION = ROOT / "d1" / "migrations" / "027_crm_foundation.sql"
A = "workspace_mkb_weddings"
B = "workspace_crm_tenant_b"


def one(con: sqlite3.Connection, sql: str, params: tuple = ()):
    return con.execute(sql, params).fetchone()


def source(path: str) -> str:
    return (ROOT / path).read_text()


def main() -> None:
    schema_text = SCHEMA.read_text()
    marker = "-- v1.9.0: WedPlanned CRM foundation."
    assert marker in schema_text, "schema does not contain CRM migration"

    # Fresh-schema validation.
    con = sqlite3.connect(":memory:")
    con.row_factory = sqlite3.Row
    con.executescript(schema_text)
    assert one(con, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "30"

    required = {
        "crm_pipeline_stages",
        "crm_contacts",
        "crm_enquiries",
        "crm_enquiry_contacts",
        "crm_jobs",
        "crm_job_contacts",
        "crm_activities",
        "crm_lead_form_settings",
    }
    tables = {row[0] for row in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert required <= tables, f"missing CRM tables: {sorted(required - tables)}"
    assert one(con, "SELECT COUNT(*) FROM crm_pipeline_stages WHERE workspace_id=?", (A,))[0] == 7
    assert one(con, "SELECT enabled FROM crm_lead_form_settings WHERE workspace_id=?", (A,))[0] == 1
    assert one(con, "SELECT default_service FROM crm_lead_form_settings WHERE workspace_id=?", (A,))[0] == "Wedding photography"

    # Upgrade validation from the v1.8.3/schema-26 prefix.
    pre_crm = schema_text.split(marker, 1)[0]
    upgrade = sqlite3.connect(":memory:")
    upgrade.executescript(pre_crm)
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "26"
    upgrade.executescript(MIGRATION.read_text())
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "27"
    assert not upgrade.execute("PRAGMA foreign_key_check").fetchall()

    # Workspace-scoped lifecycle and idempotency constraints.
    con.execute("INSERT INTO workspaces (id, slug, name) VALUES (?, 'crm-b', 'CRM B')", (B,))
    con.execute("INSERT INTO workspace_settings (workspace_id, business_name) VALUES (?, 'CRM B')", (B,))
    for key, name, stage_type, order in [
        ("new", "New enquiry", "open", 10),
        ("accepted", "Accepted", "won", 60),
        ("lost", "Lost", "lost", 70),
    ]:
        con.execute(
            "INSERT INTO crm_pipeline_stages (id,workspace_id,stage_key,name,stage_type,sort_order,is_default) VALUES (?,?,?,?,?,?,?)",
            (f"b-{key}", B, key, name, stage_type, order, 1 if key == "new" else 0),
        )
    con.execute("INSERT INTO crm_contacts (id,workspace_id,display_name,email_normalized,email) VALUES ('contact-a',?,?,?,?)", (A, "A Client", "a@example.test", "a@example.test"))
    con.execute("INSERT INTO crm_contacts (id,workspace_id,display_name,email_normalized,email) VALUES ('contact-b',?,?,?,?)", (B, "B Secret", "b@example.test", "b@example.test"))
    con.execute("INSERT INTO crm_enquiries (id,workspace_id,reference,stage_id,event_date) VALUES ('enquiry-a',?,'ENQ-A',?, '2027-06-01')", (A, f"crm_stage_{A}_new"))
    con.execute("INSERT INTO crm_enquiries (id,workspace_id,reference,stage_id,event_date) VALUES ('enquiry-b',?,'ENQ-B','b-new','2027-07-01')", (B,))
    con.execute("INSERT INTO crm_enquiry_contacts (enquiry_id,workspace_id,contact_id,role) VALUES ('enquiry-b',?,'contact-b','primary')", (B,))
    for sql, params in [
        ("INSERT INTO crm_enquiry_contacts (enquiry_id,workspace_id,contact_id,role) VALUES ('enquiry-b',?,'contact-a','partner')", (B,)),
        ("INSERT INTO crm_enquiry_contacts (enquiry_id,workspace_id,contact_id,role) VALUES ('enquiry-a',?,'contact-b','partner')", (A,)),
    ]:
        try:
            con.execute(sql, params)
            raise AssertionError("cross-workspace enquiry/contact relationship was accepted")
        except sqlite3.IntegrityError:
            pass
    con.execute("INSERT INTO crm_contacts (id,workspace_id,display_name,email_normalized,email) VALUES ('contact-b2',?,'B Second','b2@example.test','b2@example.test')", (B,))
    try:
        con.execute("INSERT INTO crm_enquiry_contacts (enquiry_id,workspace_id,contact_id,role) VALUES ('enquiry-b',?,'contact-b2','primary')", (B,))
        raise AssertionError("more than one primary enquiry contact was accepted")
    except sqlite3.IntegrityError:
        pass
    assert one(con, "SELECT reference FROM crm_enquiries WHERE id='enquiry-b' AND workspace_id=?", (A,)) is None
    assert one(con, "SELECT display_name FROM crm_contacts WHERE id='contact-b' AND workspace_id=?", (A,)) is None

    con.execute("INSERT INTO crm_jobs (id,workspace_id,reference,enquiry_id,title,event_date) VALUES ('job-b',?,'JOB-B','enquiry-b','B Job','2027-07-01')", (B,))
    con.execute("INSERT INTO crm_job_contacts (job_id,workspace_id,contact_id,role) VALUES ('job-b',?,'contact-b','primary')", (B,))
    try:
        con.execute("INSERT INTO crm_job_contacts (job_id,workspace_id,contact_id,role) VALUES ('job-b',?,'contact-a','partner')", (B,))
        raise AssertionError("cross-workspace job/contact relationship was accepted")
    except sqlite3.IntegrityError:
        pass
    try:
        con.execute("INSERT INTO crm_jobs (id,workspace_id,reference,enquiry_id,title) VALUES ('job-b2',?,'JOB-B2','enquiry-b','Duplicate')", (B,))
        raise AssertionError("duplicate Job conversion was accepted")
    except sqlite3.IntegrityError:
        pass

    changed = con.execute("UPDATE crm_enquiries SET notes='PWNED' WHERE id='enquiry-b' AND workspace_id=?", (A,)).rowcount
    assert changed == 0
    assert one(con, "SELECT notes FROM crm_enquiries WHERE id='enquiry-b'")[0] == ""
    assert not con.execute("PRAGMA foreign_key_check").fetchall()

    crm_source = source("serverless/crm-d1.ts")
    admin_route = source("functions/api/crm/[[path]].ts")
    public_route = source("functions/api/public/crm/enquiries.ts")
    auth_source = source("serverless/platform-auth-d1.ts")
    app_source = source("src/admin/app/AdminApp.tsx")
    public_app = source("src/App.tsx")
    operations_source = source("serverless/platform-operations-d1.ts")

    for needle in [
        "requirePermission(actor, \"crm:read\")",
        "requirePermission(actor, \"crm:manage\")",
        "accepted_job_id",
        "db.batch(statements)",
        "workspace_id = ?",
        "ensureCrmWorkspaceSetup",
        "Use Accept booking to move an enquiry into the Accepted stage.",
        "That email address already belongs to another CRM contact.",
        'const publicPath = "/enquire"',
        "const contactId = text(input?.id)",
        "const privacyConsent = Boolean(input?.privacyConsent)",
        "privacyConsentAt: consentAt || null",
        'text(settings.currency || "GBP")',
    ]:
        assert needle in crm_source, f"missing CRM guard: {needle}"
    migration_source = MIGRATION.read_text()
    assert "UNIQUE (workspace_id, enquiry_id)" in migration_source
    assert "trg_crm_enquiry_contact_workspace_insert" in migration_source
    assert "trg_crm_job_contact_workspace_insert" in migration_source
    assert "idx_crm_enquiry_contacts_single_role" in migration_source
    assert "requireProfessionalContext" in admin_route
    assert "resolvePublicWorkspaceId" in public_route
    assert "request_fingerprint" in crm_source and "-1 hour" in crm_source
    assert "privacyConsent" in crm_source and "website" in crm_source
    assert '"crm:read"' in auth_source and '"crm:manage"' in auth_source
    assert 'path="crm"' in app_source and "CRMEnquiry" in app_source
    assert 'path="/enquire"' in public_app
    assert 'id?: string' in source("src/admin/types/crm.ts")
    assert 'value="/enquire" disabled' in source("src/admin/pages/CRM.tsx")
    assert "defaultService" in source("src/components/LeadEnquiryForm.tsx")
    assert "currencySymbol" in source("src/components/LeadEnquiryForm.tsx")
    for table in required:
        assert f'"{table}"' in operations_source, f"CRM export missing {table}"

    print("PASS v1.9.2 CRM foundation")
    print("  contacts/enquiries/jobs: workspace-scoped")
    print("  public lead form: domain-resolved, consent and rate guarded")
    print("  accepted conversion: Job uniqueness and Wedding linkage guarded")
    print("  activity/export/auth integration: verified")
    print("  schema version: 30")


if __name__ == "__main__":
    main()
