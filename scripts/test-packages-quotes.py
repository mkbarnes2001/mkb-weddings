#!/usr/bin/env python3
"""Regression checks for v1.9.3a package catalogues, versioned quotes and acceptance."""
from __future__ import annotations

import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "d1/schema.sql"
MIGRATION = ROOT / "d1/migrations/031_packages_quotes.sql"
A = "workspace_mkb_weddings"
B = "workspace_quote_test"


def one(con: sqlite3.Connection, sql: str, params=()):
    return con.execute(sql, params).fetchone()


def must_fail(con: sqlite3.Connection, sql: str, params=(), contains: str = "") -> None:
    try:
        con.execute(sql, params)
    except sqlite3.DatabaseError as error:
        if contains:
            assert contains.lower() in str(error).lower(), (contains, error)
        return
    raise AssertionError(f"expected statement to fail: {sql}")


def main() -> None:
    schema_text = SCHEMA.read_text()
    migration_text = MIGRATION.read_text()
    marker = "-- v1.9.3a: Configurable packages, quotes and client portal acceptance."
    assert marker in schema_text and migration_text.startswith(marker)

    con = sqlite3.connect(":memory:")
    con.row_factory = sqlite3.Row
    con.executescript(schema_text)
    assert one(con, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "32"
    assert not con.execute("PRAGMA foreign_key_check").fetchall()

    required = {
        "crm_packages", "crm_addons", "crm_package_addons", "crm_quotes",
        "crm_quote_versions", "crm_quote_options", "crm_quote_option_items",
        "crm_quote_option_addons", "crm_quote_client_access", "crm_quote_invitations",
        "crm_quote_acceptances", "crm_quote_acceptance_addons",
    }
    tables = {row[0] for row in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert required <= tables, sorted(required - tables)
    job_columns = {row[1] for row in con.execute("PRAGMA table_info(crm_jobs)")}
    assert {"quote_id", "quote_version_id", "quote_reference", "accepted_quote_at", "booking_subtotal", "booking_discount", "booking_tax", "package_snapshot_json", "addons_snapshot_json", "quote_snapshot_json"} <= job_columns

    # Additive upgrade from the exact schema-30 prefix.
    prefix = schema_text.split(marker, 1)[0]
    upgrade = sqlite3.connect(":memory:")
    upgrade.executescript(prefix)
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "30"
    upgrade.executescript(migration_text)
    assert one(upgrade, "SELECT value FROM schema_meta WHERE key='schema_version'")[0] == "31"
    assert not upgrade.execute("PRAGMA foreign_key_check").fetchall()

    # No catalogue records are seeded into MKB production.
    assert one(con, "SELECT COUNT(*) FROM crm_packages WHERE workspace_id=?", (A,))[0] == 0
    assert one(con, "SELECT COUNT(*) FROM crm_addons WHERE workspace_id=?", (A,))[0] == 0

    # Create a second workspace and minimum CRM records for isolation tests.
    con.execute("INSERT INTO workspaces (id, slug, name) VALUES (?, 'quote-test', 'Quote Test')", (B,))
    con.execute("INSERT INTO workspace_settings (workspace_id, business_name) VALUES (?, 'Quote Test')", (B,))
    con.execute("INSERT INTO crm_pipeline_stages (id, workspace_id, stage_key, name, stage_type, is_default) VALUES ('stage-b', ?, 'new', 'New', 'open', 1)", (B,))
    con.execute("INSERT INTO crm_contacts (id, workspace_id, display_name, email_normalized, email) VALUES ('contact-a-quote', ?, 'A Client', 'a-quote@example.test', 'a-quote@example.test')", (A,))
    con.execute("INSERT INTO crm_contacts (id, workspace_id, display_name, email_normalized, email) VALUES ('contact-b-quote', ?, 'B Client', 'b-quote@example.test', 'b-quote@example.test')", (B,))
    stage_a = one(con, "SELECT id FROM crm_pipeline_stages WHERE workspace_id=? AND stage_type='open' ORDER BY is_default DESC LIMIT 1", (A,))[0]
    con.execute("INSERT INTO crm_enquiries (id, workspace_id, reference, stage_id, event_date, venue_text, currency) VALUES ('enquiry-a-quote', ?, 'ENQ-A-Q', ?, '2027-06-12', 'A Venue', 'GBP')", (A, stage_a))
    con.execute("INSERT INTO crm_enquiries (id, workspace_id, reference, stage_id, event_date, venue_text, currency) VALUES ('enquiry-b-quote', ?, 'ENQ-B-Q', 'stage-b', '2027-07-12', 'B Venue', 'GBP')", (B,))

    con.execute("INSERT INTO crm_packages (id, workspace_id, name, internal_code, price_amount) VALUES ('package-a', ?, 'A Package', 'A-PKG', 119500)", (A,))
    con.execute("INSERT INTO crm_packages (id, workspace_id, name, internal_code, price_amount) VALUES ('package-b', ?, 'B Package', 'B-PKG', 99500)", (B,))
    con.execute("INSERT INTO crm_addons (id, workspace_id, name, price_amount) VALUES ('addon-a', ?, 'A Album', 30000)", (A,))
    con.execute("INSERT INTO crm_addons (id, workspace_id, name, price_amount) VALUES ('addon-b', ?, 'B Album', 25000)", (B,))
    con.execute("INSERT INTO crm_package_addons (workspace_id, package_id, addon_id) VALUES (?, 'package-a', 'addon-a')", (A,))
    must_fail(con, "INSERT INTO crm_package_addons (workspace_id, package_id, addon_id) VALUES (?, 'package-a', 'addon-b')", (A,), "workspace mismatch")

    con.execute("INSERT INTO crm_quotes (id, workspace_id, enquiry_id, primary_contact_id, reference) VALUES ('quote-a', ?, 'enquiry-a-quote', 'contact-a-quote', 'QUO-A')", (A,))
    must_fail(con, "INSERT INTO crm_quotes (id, workspace_id, enquiry_id, primary_contact_id, reference) VALUES ('quote-a-duplicate', ?, 'enquiry-a-quote', 'contact-a-quote', 'QUO-A2')", (A,), "unique")
    must_fail(con, "INSERT INTO crm_quotes (id, workspace_id, enquiry_id, primary_contact_id, reference) VALUES ('quote-cross', ?, 'enquiry-b-quote', 'contact-b-quote', 'QUO-X')", (A,), "workspace mismatch")
    con.execute("INSERT INTO crm_quote_versions (id, workspace_id, quote_id, version_number, expires_at) VALUES ('version-a1', ?, 'quote-a', 1, '2099-01-01')", (A,))
    con.execute("UPDATE crm_quotes SET current_version_id='version-a1' WHERE id='quote-a'")
    con.execute("INSERT INTO crm_quote_options (id, workspace_id, version_id, package_id, name, base_price_amount, package_snapshot_json) VALUES ('option-a1', ?, 'version-a1', 'package-a', 'A Package', 119500, '{\"name\":\"A Package\",\"priceAmount\":119500}')", (A,))
    con.execute("INSERT INTO crm_quote_option_addons (id, workspace_id, version_id, option_id, addon_id, name, unit_price_amount, minimum_quantity, maximum_quantity, default_quantity, addon_snapshot_json) VALUES ('option-addon-a1', ?, 'version-a1', 'option-a1', 'addon-a', 'A Album', 30000, 1, 2, 0, '{\"name\":\"A Album\",\"priceAmount\":30000}')", (A,))
    assert one(con, "SELECT default_quantity FROM crm_quote_option_addons WHERE id='option-addon-a1'")[0] == 0
    must_fail(con, "INSERT INTO crm_quote_options (id, workspace_id, version_id, package_id, name) VALUES ('option-cross', ?, 'version-a1', 'package-b', 'Cross')", (A,), "workspace mismatch")

    # Catalogue changes do not alter stored quote snapshots.
    con.execute("UPDATE crm_packages SET name='A Package Changed', price_amount=999999 WHERE id='package-a'")
    snapshot = one(con, "SELECT package_snapshot_json, base_price_amount FROM crm_quote_options WHERE id='option-a1'")
    assert 'A Package' in snapshot[0] and snapshot[1] == 119500

    # Sent versions and all child snapshots are immutable.
    con.execute("UPDATE crm_quote_versions SET status='sent', sent_at=CURRENT_TIMESTAMP WHERE id='version-a1'")
    con.execute("UPDATE crm_quotes SET status='sent' WHERE id='quote-a'")
    must_fail(con, "UPDATE crm_quote_versions SET client_notes='changed' WHERE id='version-a1'", contains="immutable")
    must_fail(con, "UPDATE crm_quote_options SET name='changed' WHERE id='option-a1'", contains="immutable")
    must_fail(con, "DELETE FROM crm_quote_option_addons WHERE id='option-addon-a1'", contains="immutable")

    # A revision remains distinct and versioned; obsolete versions can be superseded but not deleted.
    con.execute("INSERT INTO crm_quote_versions (id, workspace_id, quote_id, version_number, previous_version_id) VALUES ('version-a2', ?, 'quote-a', 2, 'version-a1')", (A,))
    con.execute("UPDATE crm_quote_versions SET status='superseded' WHERE id='version-a1'")
    con.execute("UPDATE crm_quotes SET current_version_id='version-a2', status='draft' WHERE id='quote-a'")
    must_fail(con, "DELETE FROM crm_quote_versions WHERE id='version-a1'", contains="cannot be deleted")

    # Invitation/access and acceptance records are workspace-guarded and single-use by quote/version.
    con.execute("INSERT INTO client_identities (id, workspace_id, email_normalized, email, display_name) VALUES ('identity-a-quote', ?, 'a-quote@example.test', 'a-quote@example.test', 'A Client')", (A,))
    con.execute("INSERT INTO crm_quote_client_access (quote_id, workspace_id, contact_id, identity_id) VALUES ('quote-a', ?, 'contact-a-quote', 'identity-a-quote')", (A,))
    con.execute("INSERT INTO crm_quote_options (id, workspace_id, version_id, name, base_price_amount) VALUES ('option-a2', ?, 'version-a2', 'Revised A Package', 129500)", (A,))
    con.execute("UPDATE crm_quote_versions SET status='sent' WHERE id='version-a2'")
    must_fail(con, "INSERT INTO crm_quote_options (id, workspace_id, version_id, name) VALUES ('late-option', ?, 'version-a2', 'Late')", (A,), "immutable")
    con.execute("UPDATE crm_quotes SET current_version_id='version-a2', status='sent' WHERE id='quote-a'")
    con.execute("INSERT INTO crm_quote_acceptances (id, workspace_id, quote_id, version_id, option_id, contact_id, identity_id, actor_type, actor_email, total_amount) VALUES ('accept-a', ?, 'quote-a', 'version-a2', 'option-a2', 'contact-a-quote', 'identity-a-quote', 'client', 'a-quote@example.test', 129500)", (A,))
    must_fail(con, "INSERT INTO crm_quote_acceptances (id, workspace_id, quote_id, version_id, option_id, contact_id, actor_type) VALUES ('accept-a-duplicate', ?, 'quote-a', 'version-a2', 'option-a2', 'contact-a-quote', 'admin')", (A,), "unique")
    must_fail(con, "UPDATE crm_quote_acceptances SET total_amount=1 WHERE id='accept-a'", contains="immutable")

    # Acceptance may lock the chosen total once while transitioning sent/viewed -> accepted, then remains immutable.
    con.execute("UPDATE crm_quote_versions SET status='accepted', subtotal_amount=129500, total_amount=129500 WHERE id='version-a2'")
    must_fail(con, "UPDATE crm_quote_versions SET total_amount=1 WHERE id='version-a2'", contains="immutable")

    # Source-level requirements: shared acceptance, disabled direct conversion, verified public domain, export redaction.
    quotes_source = (ROOT / "serverless/crm-quotes-d1.ts").read_text()
    crm_route = (ROOT / "functions/api/crm/[[path]].ts").read_text()
    portal_source = (ROOT / "src/components/ClientPortal.tsx").read_text()
    export_source = (ROOT / "serverless/platform-operations-d1.ts").read_text()
    assert "acceptQuoteCore" in quotes_source and "acceptQuoteAsAdmin" in quotes_source and "acceptQuoteAsClient" in quotes_source
    assert '"crm:manage", "crm:read"' in quotes_source
    assert "The enquiry is already linked to a Job created from another quote." in quotes_source
    assert "UPDATE crm_jobs SET status = 'booked', service_name = ?, package_name = ?, value_amount = ?" in quotes_source
    assert "addons_snapshot_json = ?, quote_snapshot_json = ?" in quotes_source
    assert "purpose = 'public' AND verified = 1" in quotes_source
    assert "status = 'verified'" not in quotes_source and "is_primary DESC" not in quotes_source
    assert "UPDATE crm_quote_invitations SET consumed_at = COALESCE(consumed_at, CURRENT_TIMESTAMP)" in quotes_source
    assert "identity_id <> ? AND status = 'active'" in quotes_source
    assert "invitation.invitationId" in quotes_source
    assert "hostname.includes(\"admin\")" in quotes_source
    assert "Create and accept a quote to convert this enquiry" in crm_route
    assert "portal-package-grid" in portal_source and "confirmed: true" in portal_source
    assert "selected_addons_snapshot_json FROM crm_quote_acceptances" in quotes_source
    assert "acceptance }, identity" in quotes_source
    assert 'acceptedQuote ? "Selected extras" : "Optional extras"' in portal_source
    assert "acceptedQuote.totalAmount" in portal_source and "portal-quote-addon-accepted" in portal_source
    assert "else if (quantity > 0) quantity = Math.max(quantity, addon.minimumQuantity)" in quotes_source
    assert "idx_crm_quotes_enquiry_unique" in migration_text
    for table in required:
        assert f'"{table}"' in export_source, f"export missing {table}"
    assert 'crm_quote_invitations: ["token_hash"]' in export_source

    assert not con.execute("PRAGMA foreign_key_check").fetchall()
    print("PASS v1.9.3a packages, quotes and portal acceptance")
    print("  schema transition: 30 -> 31")
    print("  catalogue and immutable quote snapshots: verified")
    print("  cross-workspace relationship guards: verified")
    print("  shared Admin/client acceptance path: verified")
    print("  verified public-domain and export redaction rules: verified")


if __name__ == "__main__":
    main()
