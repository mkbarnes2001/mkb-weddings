#!/usr/bin/env python3

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

app = (
    ROOT
    / "src/wedplanned/WedPlannedApp.tsx"
).read_text(
    encoding="utf-8"
)

css = (
    ROOT
    / "src/wedplanned/wedplanned.css"
).read_text(
    encoding="utf-8"
)

service = (
    ROOT
    / "serverless/platform-signup-d1.ts"
).read_text(
    encoding="utf-8"
)

request_route = (
    ROOT
    / "config/wedplanned/functions/api/signup/request.ts"
).read_text(
    encoding="utf-8"
)

assert (
    "function GetStartedPage()"
    in app
)

assert (
    '"/api/signup/request"'
    in app
)

assert (
    'method: "POST"'
    in app
)

assert (
    '"Content-Type":'
    in app
)

assert (
    "businessName,"
    in app
)

assert (
    "ownerDisplayName,"
    in app
)

assert (
    "email,"
    in app
)

assert (
    'type="email"'
    in app
)

assert (
    'autoComplete="organization"'
    in app
)

assert (
    'autoComplete="name"'
    in app
)

assert (
    'autoComplete="email"'
    in app
)

assert (
    'required'
    in app
)

assert (
    "Send verification link"
    in app
)

assert (
    "Sending verification link…"
    in app
)

assert (
    'role="alert"'
    in app
)

assert (
    'aria-live="polite"'
    in app
)

assert (
    'payload?.code'
    in app
)

assert (
    '"existing_account"'
    in app
)

assert (
    "Sign in to your existing workspace"
    in app
)

assert (
    "Check your email."
    in app
)

assert (
    "Your WedPlanned workspace will only be created after"
    in app
)

assert (
    "The link expires after 30 minutes."
    in app
)

assert (
    "No workspace is created until your email has been"
    in app
)

assert (
    "Billing and paid-plan selection are not"
    in app
)

assert (
    "WEDPLANNED_PRODUCTS.map"
    in app
)

required_css = (
    ".wp-signup-form {",
    ".wp-signup-grid {",
    ".wp-signup-field {",
    ".wp-signup-alert--error {",
    ".wp-signup-actions {",
    ".wp-signup-success {",
    ".wp-signup-success__steps {",
    "@media (max-width: 760px)",
)

for token in required_css:
    assert token in css, token

assert (
    "requestExternalBusinessSignup"
    in service
)

assert (
    "existing_account"
    in service
)

assert (
    "status: 202"
    in request_route
)

assert (
    "Account creation, plan selection and billing will be connected here"
    not in app
)

assert (
    "Your route into WedPlanned."
    not in app
)

print("RELEASE=v1.10.7a")
print("GET_STARTED_REAL_SIGNUP_FORM=PASS")
print("SIGNUP_REQUEST_ENDPOINT_CONNECTED=PASS")
print("BUSINESS_NAME_FIELD=PASS")
print("OWNER_NAME_FIELD=PASS")
print("EMAIL_FIELD=PASS")
print("BROWSER_FORM_VALIDATION=PASS")
print("SUBMIT_LOADING_STATE=PASS")
print("ACCESSIBLE_ERROR_STATE=PASS")
print("EXISTING_ACCOUNT_SIGNIN_STATE=PASS")
print("PENDING_EMAIL_CONFIRMATION_STATE=PASS")
print("EMAIL_VERIFICATION_COPY=PASS")
print("NO_PREVERIFICATION_WORKSPACE_COPY=PASS")
print("NO_BILLING_OR_PAID_PLAN_FLOW=PASS")
print("CONNECTED_PRODUCT_SUITE_DISPLAY=PASS")
print("RESPONSIVE_SIGNUP_STYLES=PASS")
print("SIGNUP_UI_TEST=PASS")
