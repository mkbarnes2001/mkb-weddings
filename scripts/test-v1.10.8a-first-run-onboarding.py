from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]

foundation = (
    ROOT / "serverless/platform-foundation-d1.ts"
).read_text(encoding="utf-8")

administration = (
    ROOT / "serverless/platform-administration-d1.ts"
).read_text(encoding="utf-8")

signup = (
    ROOT / "serverless/platform-signup-d1.ts"
).read_text(encoding="utf-8")

api = (
    ROOT / "functions/api/platform.ts"
).read_text(encoding="utf-8")

admin_api = (
    ROOT / "src/admin/services/AdminApiService.ts"
).read_text(encoding="utf-8")

types = (
    ROOT / "src/admin/types/platform.ts"
).read_text(encoding="utf-8")

app = (
    ROOT / "src/admin/app/AdminApp.tsx"
).read_text(encoding="utf-8")

overview = (
    ROOT / "src/admin/pages/ModuleOverviews.tsx"
).read_text(encoding="utf-8")

onboarding_page = (
    ROOT / "src/admin/pages/BusinessOnboarding.tsx"
).read_text(encoding="utf-8")

schema = (
    ROOT / "d1/schema.sql"
).read_text(encoding="utf-8")


def require(label: str, condition: bool):
    if not condition:
        raise AssertionError(label)
    print(f"{label}=PASS")


print("RELEASE=v1.10.8a")
print("TARGET_SCHEMA=40")


# --------------------------------------------------
# Schema remains unchanged.
# --------------------------------------------------

con = sqlite3.connect(":memory:")
con.execute("PRAGMA foreign_keys = ON")
con.executescript(schema)

schema_version = con.execute(
    "SELECT value FROM schema_meta "
    "WHERE key='schema_version'"
).fetchone()[0]

require(
    "CURRENT_SCHEMA_41",
    schema_version == "41",
)

require(
    "FOREIGN_KEY_CHECK",
    not con.execute(
        "PRAGMA foreign_key_check"
    ).fetchall(),
)


# --------------------------------------------------
# First-run state is only provisioned for verified
# external signup.
# --------------------------------------------------

require(
    "VERIFIED_SIGNUP_ONBOARDING_MARKER",
    'provisioningSource === "verified_signup"'
    in administration
    and 'source: "verified_signup"'
    in administration
    and 'state: "active"'
    in administration,
)

require(
    "PLATFORM_ADMIN_LEGACY_COMPATIBILITY",
    ': "{}";'
    in administration,
)

require(
    "VERIFIED_SIGNUP_PROVISIONER_REUSED",
    "provisionVerifiedSignupWorkspace"
    in signup
    and 'returnPath:\n            "/admin"'
    in signup,
)


# --------------------------------------------------
# Onboarding lives in workspace_settings.document_json
# rather than a new table.
# --------------------------------------------------

require(
    "WORKSPACE_DOCUMENT_ONBOARDING_STORAGE",
    "workspaceDocument"
    in administration
    and "document_json"
    in administration
    and "onboarding:"
    in administration,
)

require(
    "ONBOARDING_DOCUMENT_READ",
    "SELECT document_json FROM workspace_settings"
    in foundation,
)

require(
    "ONBOARDING_DOCUMENT_WRITE",
    "UPDATE workspace_settings"
    in foundation
    and "document_json = ?"
    in foundation
    and "nextDocument"
    in foundation,
)

require(
    "ONBOARDING_NO_NEW_TABLE",
    "CREATE TABLE"
    not in foundation,
)


# --------------------------------------------------
# Applicability / legacy compatibility.
# --------------------------------------------------

require(
    "ONBOARDING_APPLICABILITY_GUARD",
    'text(stored?.source) === "verified_signup"'
    in foundation,
)

require(
    "LEGACY_WORKSPACE_UI_GUARD",
    "if (!onboarding.applicable)"
    in onboarding_page,
)

require(
    "LEGACY_WORKSPACE_NOT_FORCED",
    'state: "none"'
    in types
    and 'applicable: boolean'
    in types,
)


# --------------------------------------------------
# State machine.
# --------------------------------------------------

for operation in (
    "confirm",
    "defer-step",
    "pause",
    "resume",
    "complete",
):
    require(
        f"ONBOARDING_OPERATION_{operation.upper().replace('-', '_')}",
        f'operation === "{operation}"'
        in foundation,
    )

require(
    "OPTIONAL_STEPS_ONLY",
    'new Set(["contact", "brand"])'
    in foundation,
)

require(
    "REQUIRED_IDENTITY",
    'confirmedSteps.includes("identity")'
    in foundation,
)

require(
    "REQUIRED_SERVICE_CATEGORY",
    "business_category_links"
    in foundation
    and "Complete the required setup steps"
    in foundation,
)

require(
    "REQUIRED_SERVICE_AREA",
    "business_service_areas"
    in foundation
    and "Add at least one service area."
    in foundation,
)

require(
    "ONBOARDING_COMPLETION_STATUS",
    'state === "complete"'
    in foundation
    and '"ready"'
    in foundation
    and '"profile"'
    in foundation,
)


# --------------------------------------------------
# Tenant isolation and permission boundary.
# --------------------------------------------------

require(
    "AUTH_WORKSPACE_ENFORCED",
    "workspaceId: auth.workspaceId"
    in api,
)

require(
    "ONBOARDING_BUSINESS_UPDATE_PERMISSION",
    '["saveBusiness", "saveOnboarding"]'
    in api
    and 'return "business:update"'
    in api,
)

require(
    "SERVICE_AREA_WORKSPACE_SCOPE",
    "WHERE workspace_id = ?"
    in foundation,
)

require(
    "ONBOARDING_WORKSPACE_SCOPE",
    "WHERE workspace_id = ?"
    in foundation
    and "saveBusinessOnboarding"
    in foundation,
)


# --------------------------------------------------
# Supplier taxonomy must remain platform-owned.
# --------------------------------------------------

category_start = foundation.index(
    "export async function saveBusinessCategories"
)

category_end = foundation.index(
    "export async function saveBusinessServiceArea",
    category_start,
)

category_block = foundation[
    category_start:category_end
]

require(
    "SUPPLIER_TAXONOMY_WRITE_BLOCKED",
    "group_name NOT IN "
    "('Supplier taxonomy', 'Supplier role')"
    in category_block,
)

require(
    "SUPPLIER_TAXONOMY_READ_EXCLUDED",
    "group_name NOT IN ('Supplier taxonomy', 'Supplier role')"
    in foundation,
)

require(
    "ONBOARDING_DOES_NOT_CONFIGURE_SUPPLIER_TAXONOMY",
    "savePlatformSupplierTaxonomy"
    not in onboarding_page,
)


# --------------------------------------------------
# Admin API / types / route.
# --------------------------------------------------

require(
    "ONBOARDING_API_ACTION",
    'action === "saveOnboarding"'
    in api
    and "saveBusinessOnboarding"
    in api,
)

require(
    "ONBOARDING_ADMIN_API_CLIENT",
    "saveWedPlannedOnboarding"
    in admin_api,
)

require(
    "ONBOARDING_PAYLOAD_TYPE",
    "onboarding: WedPlannedOnboarding;"
    in types,
)

require(
    "SINGLE_ONBOARDING_ROUTE",
    app.count(
        '<Route path="onboarding" '
        'element={<BusinessOnboarding />} />'
    ) == 1,
)

require(
    "SINGLE_ONBOARDING_IMPORT",
    app.count(
        'import { BusinessOnboarding } '
        'from "../pages/BusinessOnboarding";'
    ) == 1,
)


# --------------------------------------------------
# WedNav first-run experience.
# --------------------------------------------------

require(
    "WEDNAV_SETUP_CARD",
    overview.count(
        'title="Set up your business"'
    ) == 1,
)

require(
    "WEDNAV_SETUP_ONLY_WHEN_APPLICABLE",
    'onboarding?.applicable '
    '&& onboarding.state !== "complete"'
    in overview,
)

require(
    "WEDNAV_ONBOARDING_ROUTE_LINK",
    'to="/admin/onboarding"'
    in overview,
)

require(
    "WEDNAV_PROGRESS",
    "onboarding.completedCount"
    in overview
    and "onboarding.totalCount"
    in overview,
)


# --------------------------------------------------
# Dedicated onboarding flow.
# --------------------------------------------------

require(
    "ONBOARDING_IDENTITY_STEP",
    'title="1. Business identity"'
    in onboarding_page,
)

require(
    "ONBOARDING_SERVICES_STEP",
    'title="2. Services"'
    in onboarding_page,
)

require(
    "ONBOARDING_SERVICE_AREA_STEP",
    'title="3. Where you work"'
    in onboarding_page,
)

require(
    "ONBOARDING_CONTACT_STEP",
    'title="4. Contact & online presence"'
    in onboarding_page,
)

require(
    "ONBOARDING_BRAND_STEP",
    'title="5. Brand identity"'
    in onboarding_page,
)

require(
    "ONBOARDING_RESUMABLE",
    '"pause"'
    in onboarding_page
    and '"resume"'
    in onboarding_page,
)

require(
    "ONBOARDING_OPTIONAL_DEFER",
    '"defer-step"'
    in onboarding_page
    and '"contact"'
    in onboarding_page
    and '"brand"'
    in onboarding_page,
)

require(
    "ONBOARDING_FINISH",
    '"complete"'
    in onboarding_page
    and "Finish setup"
    in onboarding_page,
)

print("FIRST_RUN_ONBOARDING_FOCUSED_TEST=PASS")
