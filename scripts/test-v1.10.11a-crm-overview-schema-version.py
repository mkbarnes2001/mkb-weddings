from pathlib import Path

path = Path(
    "serverless/crm-d1.ts"
)

source = path.read_text(
    encoding="utf-8",
)

start = source.index(
    "export async function getCrmOverview"
)

end = source.index(
    "export async function getCrmEnquiry",
    start,
)

overview = source[start:end]

assert "schemaVersion: 30" not in overview
assert "schemaVersion: 45" not in overview

assert (
    "schemaVersion: Number(schema?.value || 0)"
    in overview
)

assert (
    "SELECT value\n"
    "      FROM schema_meta\n"
    "      WHERE key = 'schema_version'"
    in overview
)

assert (
    "settings, schema] = await Promise.all(["
    in overview
)

print(
    "CRM_OVERVIEW_SCHEMA_VERSION_REGRESSION=PASS"
)
print(
    "CRM_OVERVIEW_SCHEMA_VERSION_SOURCE=DYNAMIC_SCHEMA_META"
)
