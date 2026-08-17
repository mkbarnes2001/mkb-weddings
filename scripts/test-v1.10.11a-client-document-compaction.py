#!/usr/bin/env python3
"""v1.10.11a compact client Contract / Invoice summaries."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

component = (
    ROOT
    / "src/components/ClientPortalCommercialDocument.tsx"
).read_text(encoding="utf-8")

css = (
    ROOT
    / "src/index.css"
).read_text(encoding="utf-8")

helper_start = component.index(
    "type SnapshotKind"
)

helper_end = component.index(
    "function contractBlocks(",
    helper_start,
)

helper = component[
    helper_start:
    helper_end
]

# Client documents use a deliberate whitelist rather than dumping
# all primitive frozen-snapshot fields.
assert "CLIENT_SNAPSHOT_FIELDS" in helper
assert "Object.entries(value)" not in helper

for token in (
    '"businessName"',
    '"publicName"',
    '"legalName"',
    '"contactEmail"',
    '"websiteUrl"',
    '"displayName"',
    '"email"',
    '"phone"',
    '"eventDate"',
    '"venue"',
    '"packageName"',
    '"serviceName"',
):
    assert token in helper, token

# Internal identifiers / administrative metadata are intentionally
# excluded from the client-facing summary configuration.
for forbidden in (
    '"workspaceId"',
    '"id"',
    '"jobId"',
    '"quoteId"',
    '"quoteVersionId"',
    '"packageId"',
    '"internalCode"',
    '"businessType"',
    '"timezone"',
    '"currency"',
    '"subtotalAmount"',
    '"totalAmount"',
):
    assert forbidden not in helper, forbidden

# Both document types explicitly choose their summary shape.
assert component.count('kind="business"') == 2
assert component.count('kind="client"') == 2
assert component.count('kind="booking"') == 2

for token in (
    'title="Business"',
    'title="Client"',
    'title="From"',
    'title="Bill to"',
):
    assert token in component, token

# Existing document operations and content remain intact.
for token in (
    "Print / Save PDF",
    "client-portal-contract-content",
    "Invoice items",
    "Payment schedule",
):
    assert token in component, token

# The metadata area is now a compact, unboxed summary strip.
css_start = css.index(
    ".client-portal-document__meta-grid {"
)

css_end = css.index(
    ".client-portal-contract-content {",
    css_start,
)

summary_css = css[
    css_start:
    css_end
]

assert "margin: 14px 0 18px;" in summary_css
assert "padding: 11px 0 14px;" in summary_css
assert "border-bottom:" in summary_css
assert "background: rgba(0,0,0,.025);" not in summary_css
assert "border-radius: 13px;" not in summary_css
assert "padding: 14px;" not in summary_css

print(
    "PASS v1.10.11a compact client commercial documents"
)
print(
    "  client-facing snapshot whitelist: verified"
)
print(
    "  technical identifiers excluded: verified"
)
print(
    "  Business / Client / Booking summaries compacted: verified"
)
print(
    "  Contract and Invoice functionality preserved: verified"
)
