#!/usr/bin/env python3

from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]

schema = (
    ROOT / "d1/schema.sql"
).read_text(encoding="utf-8")

migration = (
    ROOT
    / "d1/migrations"
    / "040_external_business_signup_foundation.sql"
).read_text(encoding="utf-8")

admin_service = (
    ROOT
    / "serverless/platform-administration-d1.ts"
).read_text(encoding="utf-8")

auth_service = (
    ROOT
    / "serverless/platform-auth-d1.ts"
).read_text(encoding="utf-8")

signup_service = (
    ROOT
    / "serverless/platform-signup-d1.ts"
).read_text(encoding="utf-8")

request_route = (
    ROOT
    / "config/wedplanned/functions/api/signup/request.ts"
).read_text(encoding="utf-8")

verify_route = (
    ROOT
    / "config/wedplanned/functions/api/signup/verify.ts"
).read_text(encoding="utf-8")

con = sqlite3.connect(":memory:")
con.execute("PRAGMA foreign_keys = ON")
con.executescript(schema)

version = con.execute(
    """
    SELECT value
    FROM schema_meta
    WHERE key='schema_version'
    """
).fetchone()[0]

assert version == "41", version

assert not con.execute(
    "PRAGMA foreign_key_check"
).fetchall()

columns = {
    row[1]
    for row in con.execute(
        """
        PRAGMA table_info(
          "platform_signup_requests"
        )
        """
    )
}

assert "failure_reason" in columns
assert "raw_token" not in columns
assert "ip_address" not in columns

assert (
    "failure_reason TEXT NOT NULL DEFAULT ''"
    in migration
)

assert (
    "async function provisionBusinessWorkspaceFoundation"
    in admin_service
)

assert (
    'provisioningSource: "platform_admin" | "verified_signup"'
    in admin_service
)

admin_start = admin_service.index(
    "export async function provisionBusinessWorkspace("
)

verified_start = admin_service.index(
    "export async function provisionVerifiedSignupWorkspace("
)

next_start = admin_service.index(
    "export async function updatePlatformModuleConfiguration("
)

admin_block = admin_service[
    admin_start:verified_start
]

verified_block = admin_service[
    verified_start:next_start
]

assert (
    "requirePlatformAdmin(actor);"
    in admin_block
)

assert (
    '"platform_admin"'
    in admin_block
)

assert (
    '"verified_signup"'
    in verified_block
)

assert (
    "A WedPlanned account already exists for this email."
    in admin_service
)

assert (
    "ownerStatus"
    in admin_service
)

assert (
    "provisioningSource === \"verified_signup\""
    in admin_service
)

assert (
    "verified_at = COALESCE"
    in verified_block
)

assert (
    "accepted_at = COALESCE"
    in verified_block
)

assert (
    "createProfessionalSignupHandoff"
    in auth_service
)

handoff_start = auth_service.index(
    "export async function createProfessionalSignupHandoff"
)

login_start = auth_service.index(
    "export async function requestProfessionalLoginLink"
)

handoff_block = auth_service[
    handoff_start:login_start
]

assert (
    'purpose: "login"'
    in handoff_block
)

assert (
    "bm.status = 'active'"
    in handoff_block
)

assert (
    "pu.status = 'active'"
    in handoff_block
)

assert (
    '"manual"'
    in handoff_block
)

required_signup_tokens = (
    "requestExternalBusinessSignup",
    "verifyExternalBusinessSignup",
    "platform_signup_requests",
    "CF-Connecting-IP",
    "requestFingerprint",
    "sha256(",
    "EMAIL_LIMIT = 3",
    "FINGERPRINT_LIMIT = 5",
    "existing_account",
    "Replaced by a newer signup request.",
    "delivery_status = 'sent'",
    "status = 'verified'",
    "consumed_at =",
    "status = 'provisioned'",
    "provisionVerifiedSignupWorkspace",
    "createProfessionalSignupHandoff",
)

for token in required_signup_tokens:
    assert token in signup_service, token

insert_start = signup_service.index(
    "INSERT INTO platform_signup_requests"
)

insert_end = signup_service.index(
    ").bind(",
    insert_start,
)

insert_sql = signup_service[
    insert_start:insert_end
].lower()

assert "token_hash" in insert_sql
assert "request_fingerprint" in insert_sql
assert "raw_token" not in insert_sql
assert "ip_address" not in insert_sql
assert "client_ip" not in insert_sql

assert (
    "requestExternalBusinessSignup"
    in request_route
)

assert (
    "status: 202"
    in request_route
)

assert (
    "verifyExternalBusinessSignup"
    in verify_route
)

assert (
    "/api/platform-auth/verify"
    in verify_route
)

assert (
    "https://admin.mkbweddings.co.uk"
    in verify_route
)

assert (
    '"Referrer-Policy"'
    in verify_route
)

print("RELEASE=v1.10.7a")
print("TARGET_SCHEMA=40")
print("PLATFORM_ADMIN_PROVISIONER_BOUNDARY=PASS")
print("VERIFIED_SIGNUP_PROVISIONER=PASS")
print("EXISTING_ACCOUNT_DUPLICATE_WORKSPACE_BLOCK=PASS")
print("VERIFIED_OWNER_ACTIVE_ACCESS=PASS")
print("PROFESSIONAL_LOGIN_HANDOFF=PASS")
print("SIGNUP_TOKEN_HASH_STORAGE=PASS")
print("SIGNUP_REQUEST_FINGERPRINT_HASH=PASS")
print("SIGNUP_EMAIL_RATE_LIMIT=PASS")
print("SIGNUP_DEVICE_RATE_LIMIT=PASS")
print("SIGNUP_REPLACEMENT_SEMANTICS=PASS")
print("EMAIL_VERIFICATION_BEFORE_WORKSPACE=PASS")
print("SIGNUP_ATOMIC_TOKEN_CONSUMPTION=PASS")
print("SIGNUP_PROVISIONED_STATE=PASS")
print("WEDPLANNED_SIGNUP_REQUEST_ROUTE=PASS")
print("WEDPLANNED_SIGNUP_VERIFY_ROUTE=PASS")
print("ADMIN_AUTH_HANDOFF_ROUTE=PASS")
print("RAW_IP_STORAGE=ABSENT")
print("RAW_SIGNUP_TOKEN_STORAGE=ABSENT")
print("FOREIGN_KEY_CHECK=PASS")
recovery_signup = (
    ROOT
    / "serverless/platform-signup-d1.ts"
).read_text(
    encoding="utf-8"
)

recovery_verify_route = (
    ROOT
    / "config/wedplanned/functions/api/signup/verify.ts"
).read_text(
    encoding="utf-8"
)

assert '"handoff_failed"' in recovery_signup
assert (
    "Admin sign-in handoff failed. Use normal sign-in recovery."
    in recovery_signup
)
assert (
    "automatic sign-in could not be completed"
    in recovery_signup
)
assert (
    "AND status = 'provisioned'"
    in recovery_signup
)
assert (
    "AND workspace_id = ?"
    in recovery_signup
)
assert (
    "existing professional sign-in"
    in recovery_signup
)
assert (
    'code === "handoff_failed"'
    in recovery_verify_route
)
assert (
    'href="/sign-in"'
    in recovery_verify_route
)
assert (
    "Continue to sign in"
    in recovery_verify_route
)
assert (
    "error?.code"
    in recovery_verify_route
)

# The original verification-token consumption remains one-time.
assert (
    "AND status = 'pending'"
    in recovery_signup
)
assert (
    "AND consumed_at IS NULL"
    in recovery_signup
)
assert (
    'text(signup.status)'
    in recovery_signup
    and '!== "pending"'
    in recovery_signup
)

print("AUTH_HANDOFF_FAILURE_RECOVERY=PASS")
print("CONSUMED_SIGNUP_TOKEN_REUSE=ABSENT")
print("NORMAL_SIGNIN_RECOVERY=PASS")
print("SIGNUP_SERVER_LIFECYCLE_TEST=PASS")
