#!/usr/bin/env python3
"""v1.10.12a Client Portal Contract blank-page regression."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

component = (
    ROOT
    / "src/components/ClientPortalCommercialDocument.tsx"
).read_text(
    encoding="utf-8",
)

service = (
    ROOT
    / "serverless/client-portal-commercial-d1.ts"
).read_text(
    encoding="utf-8",
)

portal = (
    ROOT
    / "src/components/ClientPortal.tsx"
).read_text(
    encoding="utf-8",
)

# ---------------------------------------------------------
# Actual production defect.
# ---------------------------------------------------------

assert (
    "snapshotEntries(contract.terms)"
    not in component
)

assert "function ContractTermsPanel(" in component

assert '''<ContractTermsPanel
        value={contract.terms}
      />''' in component

# ---------------------------------------------------------
# Contract terms remain an explicit client-safe whitelist.
# ---------------------------------------------------------

terms_start = component.index(
    "const CLIENT_CONTRACT_TERM_FIELDS"
)

terms_end = component.index(
    "function ContractTermsPanel(",
    terms_start,
)

terms = component[
    terms_start:
    terms_end
]

for token in (
    '"invoiceTerms"',
    '"finalBalanceDueDaysBeforeEvent"',
    'label: "Payment terms"',
    'label: "Final balance due"',
):
    assert token in terms, token

for forbidden in (
    '"workspaceId"',
    '"jobId"',
    '"quoteId"',
    '"quoteVersionId"',
    '"contractId"',
    '"packageId"',
    '"internalCode"',
):
    assert forbidden not in terms, forbidden

# Existing compact Business / Client / Booking contract stays intact.
assert '''type SnapshotKind =
  | "business"
  | "client"
  | "booking";''' in component

assert component.count(
    'kind="business"'
) == 2

assert component.count(
    'kind="client"'
) == 2

assert component.count(
    'kind="booking"'
) == 2

# The dedicated panel degrades safely for absent/invalid terms.
panel_start = component.index(
    "function ContractTermsPanel("
)

panel_end = component.index(
    "function contractBlocks(",
    panel_start,
)

panel = component[
    panel_start:
    panel_end
]

for token in (
    "value && typeof value === \"object\"",
    "if (!entries.length) return null;",
    'className="client-portal-document__snapshot"',
):
    assert token in panel, token

# Server continues normalising frozen contract data.
for token in (
    "business_snapshot_json",
    "client_snapshot_json",
    "booking_snapshot_json",
    "terms_snapshot_json",
    "signatures.results || []",
):
    assert token in service, token

# Guided continuation is still Questionnaire -> Contract.
journey = portal[
    portal.index(
        "function openNextBookingStep("
    ):
    portal.index(
        "async function refreshQuestionnaire("
    )
]

assert (
    journey.index("pendingQuestionnaire")
    < journey.index("pendingContract")
)

assert 'setView("contracts")' in journey

print(
    "PASS v1.10.12a Client Portal Contract rendering"
)

print(
    "  blank-page crash call removed: verified"
)

print(
    "  dedicated client-safe Contract terms: verified"
)

print(
    "  Business / Client / Booking snapshot contract unchanged: verified"
)

print(
    "  missing Contract terms degrade safely: verified"
)

print(
    "  Questionnaire -> Contract continuation retained: verified"
)
