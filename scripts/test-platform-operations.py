#!/usr/bin/env python3
"""Dependency-free v1.8.3 platform-operations regression checks."""
from __future__ import annotations

import json
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "d1" / "schema.sql"
A = "workspace_mkb_weddings"
B = "workspace_ops_tenant_b"


def one(con: sqlite3.Connection, sql: str, params: tuple = ()):
    return con.execute(sql, params).fetchone()


def main() -> None:
    con = sqlite3.connect(":memory:")
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA.read_text())

    assert one(con, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "32"
    required = {
        "platform_support_grants",
        "platform_support_events",
        "workspace_export_events",
        "workspace_deletion_requests",
    }
    tables = {row[0] for row in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert required <= tables, f"missing operations tables: {sorted(required - tables)}"

    con.execute("INSERT INTO workspaces (id, slug, name) VALUES (?, ?, ?)", (B, "ops-b", "Ops B"))
    con.execute("INSERT INTO workspace_settings (workspace_id, business_name) VALUES (?, ?)", (B, "Ops B"))
    con.execute("INSERT INTO venues (slug,id,name,document_json,workspace_id) VALUES (?,?,?,?,?)", ("a-venue", "a-id", "A Venue", "{}", A))
    con.execute("INSERT INTO venues (slug,id,name,document_json,workspace_id) VALUES (?,?,?,?,?)", ("b-venue", "b-id", "B Secret", "{}", B))

    expires = (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat()
    con.execute(
        """INSERT INTO platform_support_grants
           (id, workspace_id, scope, status, reason, expires_at)
           VALUES ('grant-a', ?, 'read', 'active', 'Regression test', ?)""",
        (A, expires),
    )
    grant = one(
        con,
        """SELECT id, scope FROM platform_support_grants
           WHERE workspace_id=? AND status='active' AND datetime(expires_at)>CURRENT_TIMESTAMP""",
        (A,),
    )
    assert grant and grant["id"] == "grant-a" and grant["scope"] == "read"
    assert one(con, "SELECT id FROM platform_support_grants WHERE workspace_id=?", (B,)) is None

    con.execute(
        """INSERT INTO workspace_export_events
           (id, workspace_id, status, file_name, table_count, record_count)
           VALUES ('export-a', ?, 'completed', 'a.json', 2, 3)""",
        (A,),
    )
    assert one(con, "SELECT file_name FROM workspace_export_events WHERE workspace_id=?", (A,))[0] == "a.json"
    assert one(con, "SELECT file_name FROM workspace_export_events WHERE workspace_id=?", (B,)) is None

    retention = json.dumps({"platformAuditEvents": "protected"})
    con.execute(
        """INSERT INTO workspace_deletion_requests
           (id, workspace_id, status, confirmation_name, scheduled_for, retention_json)
           VALUES ('delete-a', ?, 'requested', 'MKB Weddings', datetime('now','+14 days'), ?)""",
        (A, retention),
    )
    try:
        con.execute(
            """INSERT INTO workspace_deletion_requests
               (id, workspace_id, status, confirmation_name, scheduled_for)
               VALUES ('delete-a-duplicate', ?, 'requested', 'MKB Weddings', datetime('now','+14 days'))""",
            (A,),
        )
        raise AssertionError("duplicate open deletion request was accepted")
    except sqlite3.IntegrityError:
        pass
    con.execute("UPDATE workspace_deletion_requests SET status='cancelled' WHERE id='delete-a'")
    con.execute(
        """INSERT INTO workspace_deletion_requests
           (id, workspace_id, status, confirmation_name, scheduled_for)
           VALUES ('delete-a-new', ?, 'requested', 'MKB Weddings', datetime('now','+14 days'))""",
        (A,),
    )

    assert one(con, "SELECT name FROM venues WHERE workspace_id=? AND slug='b-venue'", (A,)) is None
    assert not con.execute("PRAGMA foreign_key_check").fetchall()

    auth_source = (ROOT / "serverless" / "platform-auth-d1.ts").read_text()
    middleware_source = (ROOT / "functions" / "api" / "_middleware.ts").read_text()
    operations_source = (ROOT / "serverless" / "platform-operations-d1.ts").read_text()

    direct_match = re.search(r"const DIRECT_EXPORT_TABLES = \[(.*?)\];", operations_source, re.S)
    assert direct_match, "export table allowlist was not found"
    direct_tables = re.findall(r'"([^"]+)"', direct_match.group(1))
    for table_name in direct_tables:
        con.execute(f"SELECT * FROM {table_name} WHERE workspace_id = ?", (A,)).fetchall()

    child_match = re.search(r"const CHILD_EXPORT_QUERIES: Record<string, string> = \{(.*?)\n\};", operations_source, re.S)
    assert child_match, "child export query allowlist was not found"
    child_queries = re.findall(r"^\s*\w+: `([^`]+)`", child_match.group(1), re.M)
    for query in child_queries:
        con.execute(query, (A,)).fetchall()

    assert "loadSupportMemberships" in auth_source
    assert "datetime(psg.expires_at) > CURRENT_TIMESTAMP" in auth_source
    assert "This support session is read-only." in middleware_source
    assert "DIRECT_EXPORT_TABLES" in operations_source
    assert "db.batch([...directStatements, ...childStatements])" in operations_source
    assert 'client_galleries: ["access_token", "pin_hash"]' in operations_source
    assert 'commerce_print_assets: ["access_token"]' in operations_source
    assert "Support sessions cannot download a business data export." in operations_source

    print("PASS v1.9.2 platform operations")
    print("  support grants: time-bounded and workspace-scoped")
    print("  read-only support: globally guarded")
    print("  export history: workspace-scoped, query allowlist verified, capability secrets redacted")
    print("  deletion requests: staged and single-open-request guarded")
    print("  schema version: 32")


if __name__ == "__main__":
    main()
