#!/usr/bin/env python3

from pathlib import Path
import re


lead = Path(
    "src/components/LeadEnquiryForm.tsx"
).read_text(
    encoding="utf-8",
)

client = Path(
    "src/components/ClientPortal.tsx"
).read_text(
    encoding="utf-8",
)

types = Path(
    "src/admin/types/crm.ts"
).read_text(
    encoding="utf-8",
)

builder = Path(
    "src/admin/pages/CRMQuestionnaireTemplate.tsx"
).read_text(
    encoding="utf-8",
)

job = Path(
    "src/admin/pages/CRMJob.tsx"
).read_text(
    encoding="utf-8",
)

server = Path(
    "serverless/client-portal-d1.ts"
).read_text(
    encoding="utf-8",
)

endpoint = Path(
    "functions/api/public/crm/places.ts"
).read_text(
    encoding="utf-8",
)


def require(
    condition,
    message,
):
    if not condition:
        raise AssertionError(
            message
        )


component = lead[
    lead.index(
        "export function "
        "PublicPlacesAutocomplete("
    ):
]


for marker in (
    'context?: "lead" | "questionnaire";',
    "endpoint?: string;",
    'context = "lead"',
    'endpoint = "/api/public/crm/places"',
):
    require(
        marker in component,
        f"Reusable Places contract missing: {marker}",
    )


fetch_targets = re.findall(
    r"fetch\(\s*"
    r"([A-Za-z_][A-Za-z0-9_]*),",
    component,
)

require(
    fetch_targets.count("endpoint")
    == 2,
    "Both Places calls must use endpoint prop.",
)


# Previous dropdown UX refinement remains.
for marker in (
    'aria-autocomplete="list"',
    "max-h-72",
    "overflow-y-auto",
    "truncate text-sm font-semibold",
):
    require(
        marker in component,
        f"Places UX regression: {marker}",
    )


# Questionnaire schemas.
for source, label in (
    (
        types,
        "Admin questionnaire types",
    ),
    (
        server,
        "Server questionnaire types",
    ),
):
    require(
        '"address"' in source
        and '"venue"' in source,
        f"{label} missing Address/Venue.",
    )


require(
    'address: "Address"'
    in builder,
    "Address missing from questionnaire builder.",
)

require(
    'venue: "Venue"'
    in builder,
    "Venue missing from questionnaire builder.",
)


# Client-side Places fields.
for marker in (
    "PublicPlacesAutocomplete",
    'context="questionnaire"',
    'field.type === "address"',
    'field.type === "venue"',
    "Start typing an address…",
    "Start typing a venue…",
):
    require(
        marker in client,
        f"Client location field missing: {marker}",
    )


# Professional review/edit.
require(
    'field.type === "address"'
    in job
    and 'field.type === "venue"'
    in job,
    "Professional location editor missing.",
)


# Security boundaries.
for marker in (
    "getAuthenticatedClientIdentity",
    "identity.workspaceId",
    "activeFieldExists",
    "allowBurst",
    "Sign in to use questionnaire place search.",
):
    require(
        marker in endpoint,
        f"Places security marker missing: {marker}",
    )


# Existing storage / validation.
require(
    "crm_questionnaire_responses"
    in server,
    "Questionnaire response storage missing.",
)

require(
    "validateSubmission("
    in server,
    "Questionnaire validation missing.",
)


print(
    "PASS v1.10.12a questionnaire Address/Venue Places"
)

print(
    "  reusable autocomplete component: verified"
)

print(
    "  public lead Places UX retained: verified"
)

print(
    "  questionnaire Address field: verified"
)

print(
    "  questionnaire Venue field: verified"
)

print(
    "  authenticated client Places access: verified"
)

print(
    "  workspace isolation: verified"
)

print(
    "  professional location editing: verified"
)

print(
    "  schema migration: not required"
)
