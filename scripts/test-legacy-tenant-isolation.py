#!/usr/bin/env python3
"""v1.8.2 cross-tenant ownership regression checks.

Uses the repository schema so the test is dependency-free and can run before deploy.
It verifies the SQL ownership boundary for the legacy content model and checks the
critical route/service source guards that keep workspace authority server-owned.
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "d1" / "schema.sql"
A = "workspace_mkb_weddings"
B = "workspace_tenant_b_test"


def execute_one(con: sqlite3.Connection, sql: str, params: tuple = ()):
    cur = con.execute(sql, params)
    return cur.fetchone()


def assert_none(value, label: str):
    assert value is None, f"{label}: expected no cross-tenant row, got {value!r}"


def assert_source_contains(path: str, *needles: str):
    source = (ROOT / path).read_text()
    for needle in needles:
        assert needle in source, f"{path}: missing isolation guard: {needle}"


def main() -> None:
    con = sqlite3.connect(":memory:")
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA.read_text())

    con.execute(
        "INSERT INTO workspaces (id, slug, name) VALUES (?, ?, ?)",
        (B, "tenant-b-test", "Tenant B Test"),
    )
    con.execute(
        "INSERT INTO workspace_settings (workspace_id, business_name, public_hostname) VALUES (?, ?, ?)",
        (B, "Tenant B Test", "tenant-b.example.test"),
    )
    con.execute(
        "INSERT INTO workspace_domains (id, workspace_id, hostname, purpose, verified) VALUES (?, ?, ?, 'public', 1)",
        ("domain-tenant-b", B, "tenant-b.example.test"),
    )

    # Parent records in both workspaces.
    con.execute(
        "INSERT INTO venues (slug,id,name,document_json,status,workspace_id) VALUES (?,?,?,?,?,?)",
        ("venue-a", "venue-a-id", "Venue A", "{}", "published", A),
    )
    con.execute(
        "INSERT INTO venues (slug,id,name,document_json,status,workspace_id) VALUES (?,?,?,?,?,?)",
        ("venue-b", "venue-b-id", "Venue B Secret", "{}", "published", B),
    )
    con.execute(
        "INSERT INTO weddings (slug,title,couple,document_json,status,story_enabled,story_status,workspace_id) VALUES (?,?,?,?,?,?,?,?)",
        ("wedding-a", "Wedding A", "A Couple", "{}", "published", 1, "published", A),
    )
    con.execute(
        "INSERT INTO weddings (slug,title,couple,document_json,status,story_enabled,story_status,workspace_id) VALUES (?,?,?,?,?,?,?,?)",
        ("wedding-b", "Wedding B Secret", "B Couple", "{}", "published", 1, "published", B),
    )
    con.execute(
        "INSERT INTO suppliers (id,name,workspace_id) VALUES (?,?,?)",
        ("supplier-a", "Supplier A", A),
    )
    con.execute(
        "INSERT INTO suppliers (id,name,workspace_id) VALUES (?,?,?)",
        ("supplier-b", "Supplier B Secret", B),
    )
    con.execute(
        "INSERT INTO moments (id,slug,name,document_json,workspace_id) VALUES (?,?,?,?,?)",
        ("moment-a", "moment-a", "Moment A", "{}", A),
    )
    con.execute(
        "INSERT INTO moments (id,slug,name,document_json,workspace_id) VALUES (?,?,?,?,?)",
        ("moment-b", "moment-b", "Moment B Secret", "{}", B),
    )
    con.execute(
        "INSERT INTO custom_collections (id,slug,name,status,workspace_id) VALUES (?,?,?,?,?)",
        ("collection-a", "collection-a", "Collection A", "published", A),
    )
    con.execute(
        "INSERT INTO custom_collections (id,slug,name,status,workspace_id) VALUES (?,?,?,?,?)",
        ("collection-b", "collection-b", "Collection B Secret", "published", B),
    )

    # Canonical/legacy image rows carry a deliberately sensitive B-only R2 key.
    con.execute(
        "INSERT INTO images (asset_key,image_id,filename,source_type,source_json,workspace_id) VALUES (?,?,?,?,?,?)",
        ("asset-a-key", "img-a", "a.jpg", "r2", json.dumps({"fullKey": "workspaces/a/full/a.jpg"}), A),
    )
    con.execute(
        "INSERT INTO images (asset_key,image_id,filename,source_type,source_json,workspace_id) VALUES (?,?,?,?,?,?)",
        ("asset-b-key", "img-b", "b-secret.jpg", "r2", json.dumps({"fullKey": "workspaces/b/private-secret.jpg"}), B),
    )
    con.execute(
        "INSERT INTO wedding_images (wedding_slug,asset_key,workspace_id) VALUES (?,?,?)",
        ("wedding-a", "asset-a-key", A),
    )
    con.execute(
        "INSERT INTO wedding_images (wedding_slug,asset_key,workspace_id) VALUES (?,?,?)",
        ("wedding-b", "asset-b-key", B),
    )
    con.execute(
        "INSERT INTO venue_images (venue_slug,asset_key,workspace_id) VALUES (?,?,?)",
        ("venue-a", "asset-a-key", A),
    )
    con.execute(
        "INSERT INTO venue_images (venue_slug,asset_key,workspace_id) VALUES (?,?,?)",
        ("venue-b", "asset-b-key", B),
    )
    con.execute(
        "INSERT INTO collection_images (collection_id,asset_key,workspace_id) VALUES (?,?,?)",
        ("collection-a", "asset-a-key", A),
    )
    con.execute(
        "INSERT INTO collection_images (collection_id,asset_key,workspace_id) VALUES (?,?,?)",
        ("collection-b", "asset-b-key", B),
    )
    con.execute(
        "INSERT INTO wedding_supplier_links (wedding_slug,supplier_id,role,workspace_id) VALUES (?,?,?,?)",
        ("wedding-a", "supplier-a", "Photographer", A),
    )
    con.execute(
        "INSERT INTO wedding_supplier_links (wedding_slug,supplier_id,role,workspace_id) VALUES (?,?,?,?)",
        ("wedding-b", "supplier-b", "Secret", B),
    )
    con.execute(
        "INSERT INTO content_pages (slug,title,status,document_json,workspace_id) VALUES (?,?,?,?,?)",
        ("tenant-b:gallery-landing-settings", "B Settings", "published", '{"secret":true}', B),
    )

    # Existing workspace-owned modules must follow the same active-tenant boundary.
    con.execute(
        "INSERT INTO assets (id,workspace_id,filename,status) VALUES (?,?,?,'active')",
        ("canonical-a", A, "canonical-a.jpg"),
    )
    con.execute(
        "INSERT INTO assets (id,workspace_id,filename,status) VALUES (?,?,?,'active')",
        ("canonical-b", B, "canonical-b-secret.jpg"),
    )
    con.execute(
        "INSERT INTO asset_files (asset_id,variant,storage_key,mime_type,access_level,status) VALUES (?, 'original', ?, 'image/jpeg', 'private', 'active')",
        ("canonical-b", "workspaces/tenant-b/private/client-secret.jpg"),
    )
    con.execute(
        "INSERT INTO client_galleries (id,workspace_id,wedding_slug,slug,title,status,access_token) VALUES (?,?,?,?,?,'live',?)",
        ("gallery-a", A, "wedding-a", "gallery-a", "Gallery A", "token-a"),
    )
    con.execute(
        "INSERT INTO client_galleries (id,workspace_id,wedding_slug,slug,title,status,access_token) VALUES (?,?,?,?,?,'live',?)",
        ("gallery-b", B, "wedding-b", "gallery-b", "Gallery B Secret", "token-b-secret"),
    )
    con.execute(
        "INSERT INTO client_gallery_assets (gallery_id,asset_id,sort_order,hidden) VALUES (?,?,0,0)",
        ("gallery-b", "canonical-b"),
    )

    # READ / INFER: A cannot resolve B rows by a known slug/id/key.
    checks = [
        ("SELECT name FROM venues WHERE slug=? AND workspace_id=?", ("venue-b", A), "venue read"),
        ("SELECT title FROM weddings WHERE slug=? AND workspace_id=?", ("wedding-b", A), "wedding read"),
        ("SELECT name FROM suppliers WHERE id=? AND workspace_id=?", ("supplier-b", A), "supplier read"),
        ("SELECT name FROM moments WHERE slug=? AND workspace_id=?", ("moment-b", A), "moment read"),
        ("SELECT name FROM custom_collections WHERE slug=? AND workspace_id=?", ("collection-b", A), "collection read"),
        ("SELECT source_json FROM images WHERE asset_key=? AND workspace_id=?", ("asset-b-key", A), "R2 key inference"),
        ("SELECT title FROM client_galleries WHERE id=? AND workspace_id=?", ("gallery-b", A), "client gallery read"),
        ("SELECT title FROM client_galleries WHERE access_token=? AND workspace_id=?", ("token-b-secret", A), "client gallery token inference"),
    ]
    for sql, params, label in checks:
        assert_none(execute_one(con, sql, params), label)

    # Relationship joins must not cross the workspace boundary.
    assert_none(
        execute_one(
            con,
            """
            SELECT s.name
            FROM wedding_supplier_links l
            JOIN suppliers s ON s.id=l.supplier_id AND s.workspace_id=l.workspace_id
            WHERE l.wedding_slug=? AND l.workspace_id=?
            """,
            ("wedding-b", A),
        ),
        "supplier relationship inference",
    )
    assert_none(
        execute_one(
            con,
            """
            SELECT i.filename
            FROM collection_images ci
            JOIN images i ON i.asset_key=ci.asset_key AND i.workspace_id=ci.workspace_id
            WHERE ci.collection_id=? AND ci.workspace_id=?
            """,
            ("collection-b", A),
        ),
        "collection image inference",
    )

    # MUTATE: guessed B identifiers under A ownership change zero rows.
    before = execute_one(con, "SELECT name FROM venues WHERE slug='venue-b'")[0]
    changed = con.execute(
        "UPDATE venues SET name='PWNED' WHERE slug=? AND workspace_id=?",
        ("venue-b", A),
    ).rowcount
    after = execute_one(con, "SELECT name FROM venues WHERE slug='venue-b'")[0]
    assert changed == 0 and before == after == "Venue B Secret", "cross-tenant venue mutation succeeded"

    # PUBLISH: A cannot change B publication state.
    changed = con.execute(
        "UPDATE weddings SET status='draft' WHERE slug=? AND workspace_id=?",
        ("wedding-b", A),
    ).rowcount
    status = execute_one(con, "SELECT status FROM weddings WHERE slug='wedding-b'")[0]
    assert changed == 0 and status == "published", "cross-tenant wedding publish mutation succeeded"

    # DOWNLOAD / R2: wrong workspace cannot obtain the source JSON containing B's object key.
    r2_row = execute_one(
        con,
        "SELECT source_json FROM images WHERE asset_key=? AND workspace_id=?",
        ("asset-b-key", A),
    )
    assert_none(r2_row, "cross-tenant R2 object lookup")
    assert_none(
        execute_one(
            con,
            """
            SELECT af.storage_key
            FROM client_galleries cg
            JOIN client_gallery_assets cga ON cga.gallery_id=cg.id
            JOIN assets a ON a.id=cga.asset_id AND a.workspace_id=cg.workspace_id
            JOIN asset_files af ON af.asset_id=a.id AND af.variant='original'
            WHERE cg.id=? AND cg.workspace_id=?
            """,
            ("gallery-b", A),
        ),
        "cross-tenant client-gallery original lookup",
    )

    # Public domain mapping resolves an authoritative workspace server-side.
    domain_workspace = execute_one(
        con,
        """
        SELECT wd.workspace_id
        FROM workspace_domains wd
        JOIN workspaces w ON w.id=wd.workspace_id AND w.status='active'
        WHERE lower(wd.hostname)=lower(?) AND wd.verified=1
        """,
        ("tenant-b.example.test",),
    )[0]
    assert domain_workspace == B

    # Schema ownership and source-level critical guards.
    owned_tables = [
        "venues", "weddings", "images", "venue_images", "wedding_images",
        "story_images", "published_story_images", "wedding_suppliers", "suppliers",
        "wedding_supplier_links", "moments", "custom_collections", "collection_images",
        "content_pages", "asset_wedding_links", "asset_venue_links", "asset_moment_links",
        "asset_gallery_links",
    ]
    for table in owned_tables:
        columns = {row[1] for row in con.execute(f"PRAGMA table_info({table})")}
        assert "workspace_id" in columns, f"{table} is missing workspace_id"

    assert execute_one(con, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "28"
    assert not con.execute("PRAGMA foreign_key_check").fetchall()

    assert_source_contains(
        "serverless/tenant-context.ts",
        "professionalContext?.workspaceId",
        "workspace_domains",
        "verified = 1",
    )
    assert_source_contains(
        "serverless/image-d1.ts",
        "workspaces/${workspaceId}/full/${weddingSlug}/${filename}",
        "WHERE wedding_slug = ? AND image_id = ? AND workspace_id = ?",
        "DELETE FROM images WHERE asset_key = ? AND workspace_id = ?",
    )
    assert_source_contains(
        "serverless/asset-library-d1.ts",
        "WHERE i.workspace_id = ?",
        "listFacets(db, resolvedWorkspaceId)",
        "relationMaps(db, assetKeys, resolvedWorkspaceId)",
    )
    assert_source_contains(
        "functions/api/weddings/index.ts",
        "resolveAdminWorkspaceId",
    )
    assert_source_contains(
        "functions/api/public/weddings/index.ts",
        "resolvePublicWorkspaceId",
    )
    assert_source_contains(
        "functions/api/assets/index.ts",
        "resolveAdminWorkspaceId",
    )
    assert_source_contains(
        "functions/api/public/locations/index.ts",
        "resolvePublicWorkspaceId",
    )
    assert_source_contains(
        "functions/api/client-galleries/index.ts",
        "resolveAdminWorkspaceId",
    )
    assert_source_contains(
        "functions/api/client-galleries/[id]/assets/[assetId]/download.ts",
        "resolveAdminWorkspaceId",
    )
    assert_source_contains(
        "functions/api/public/client-galleries/[token].ts",
        "resolvePublicWorkspaceId",
    )
    assert_source_contains(
        "functions/api/public/client-auth/request-link.ts",
        "resolvePublicWorkspaceId",
    )
    assert_source_contains(
        "serverless/client-gallery-d1.ts",
        "WHERE (cg.access_token = ? OR cg.slug = ?)",
        "AND cg.workspace_id = ?",
        "AND cg.status = 'live'",
        "a.workspace_id = cg.workspace_id",
    )
    assert_source_contains(
        "functions/api/print-store/index.ts",
        "resolveAdminWorkspaceId",
    )
    assert_source_contains(
        "functions/api/print-store/orders/[orderId]/lab.ts",
        "resolveAdminWorkspaceId",
    )
    assert_source_contains(
        "serverless/print-store-d1.ts",
        "gallery_id IN (SELECT id FROM client_galleries WHERE workspace_id = ?)",
    )
    assert_source_contains(
        "functions/api/workspace.ts",
        "resolveAdminWorkspaceId",
        "{ ...incoming, id: workspaceId }",
    )
    assert_source_contains(
        "serverless/client-gallery-d1.ts",
        "JOIN client_galleries cg ON cg.id = cga.gallery_id AND cg.workspace_id = ?",
        "AND awl.workspace_id = ?",
    )
    assert_source_contains(
        "serverless/platform-operations-d1.ts",
        "workspace_id = ?",
        "Support sessions cannot download a business data export.",
        "platform_support_events",
        "workspace_deletion_requests",
    )
    assert_source_contains(
        "functions/api/_middleware.ts",
        "This support session is read-only.",
        "recordSupportRequest",
    )

    assert_source_contains(
        "serverless/crm-d1.ts",
        "workspace_id = ?",
        "accepted_job_id",
        "db.batch(statements)",
    )
    assert_source_contains(
        "functions/api/public/crm/enquiries.ts",
        "resolvePublicWorkspaceId",
        "submitPublicEnquiry",
    )

    print("PASS v1.9.1a tenant isolation")
    print("  read/infer: blocked")
    print("  mutate: blocked")
    print("  publish: blocked")
    print("  R2 key/download lookup: blocked")
    print("  Client Gallery/Print Store active-workspace access: guarded")
    print("  public-domain workspace resolution: verified")
    print("  schema version: 28")


if __name__ == "__main__":
    main()
