"""Rehearse the exact 53 -> 54 release migration without production writes."""
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
schema = (ROOT / "d1/schema.sql").read_text()
base = schema.split("-- v1.10.15a — Online booking and Calendar (schema 54)")[0]
migration = (ROOT / "d1/migrations/054_online_booking_calendar.sql").read_text()

def objects(db):
    return db.execute("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").fetchall()

def apply(db):
    try:
        db.executescript("BEGIN;\n" + migration + "\nCOMMIT;")
    except sqlite3.DatabaseError:
        db.rollback()
        raise

upgraded = sqlite3.connect(":memory:")
upgraded.executescript(base)
assert upgraded.execute("SELECT value FROM schema_meta WHERE key='schema_version'").fetchone()[0] == "53"
tables = [r[0] for r in upgraded.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name<>'schema_meta'")]
before = {name: upgraded.execute('SELECT * FROM "' + name + '"').fetchall() for name in tables}
apply(upgraded)
assert upgraded.execute("SELECT value FROM schema_meta WHERE key='schema_version'").fetchone()[0] == "54"
assert before == {name: upgraded.execute('SELECT * FROM "' + name + '"').fetchall() for name in tables}
fresh = sqlite3.connect(":memory:")
fresh.executescript(schema)
assert objects(upgraded) == objects(fresh), "Fresh schema differs from upgraded database"
assert not upgraded.execute("PRAGMA foreign_key_check").fetchall()
after = objects(upgraded)
try:
    apply(upgraded)
    raise AssertionError("Repeated migration was accepted")
except sqlite3.IntegrityError:
    pass
assert objects(upgraded) == after
assert not upgraded.execute("SELECT name FROM sqlite_master WHERE name='_migration_054_guard'").fetchall()
print("PASS: exact 53 -> 54 migration, unchanged existing rows, canonical-schema parity, foreign keys and repeat-run rollback")
