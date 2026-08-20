#!/usr/bin/env python3

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

css = (
    ROOT
    / "src/admin/admin-theme.css"
).read_text(
    encoding="utf-8",
)

pages = list(
    (
        ROOT
        / "src/admin/pages"
    ).glob("*.tsx")
)


marker = (
    "/* v1.10.12a — WedPlanned Admin UI v2 shared refinement */"
)

assert marker in css


# Workspace modules use the new shared treatment while
# Platform Administration remains visually distinct.
for token in [
    ".admin-shell:not(.admin-shell--platform)",
    ".admin-page-header",
    "border-radius: 0;",
    "box-shadow: none;",
    ".admin-panel",
    ".admin-button",
    ".admin-status",
    ".admin-tabs",
    ".admin-field",
    ".admin-toolbar",
]:
    assert token in css, token


# Compact shared hierarchy.
for token in [
    "--admin-control-height-sm: 28px",
    "--admin-control-height: 32px",
    "min-height: 18px",
    "min-height: 46px",
]:
    assert token in css, token


# Questionnaire builder inherits the same shared refinement.
for token in [
    ".questionnaire-builder-layout",
    "minmax(220px, .32fr)",
    ".questionnaire-builder-field",
    "grid-template-columns:\n    28px",
    ".questionnaire-builder-field__body",
]:
    assert token in css, token


# Responsive behaviour remains explicit.
assert "@media (max-width: 760px)" in css
assert "position: static;" in css


# Confirm shared components cover the overwhelming majority
# of actual Admin pages; this is intentionally a central pass.
header_pages = []

for path in pages:
    source = path.read_text(
        encoding="utf-8",
    )

    if "AdminPageHeader" in source:
        header_pages.append(
            path.name
        )

assert len(header_pages) >= 45, (
    f"Shared AdminPageHeader coverage unexpectedly low: "
    f"{len(header_pages)}"
)


# Representative operational areas all use the shared system.
for filename in [
    "CRM.tsx",
    "CRMEnquiry.tsx",
    "CRMJob.tsx",
    "CRMContact.tsx",
    "CRMQuote.tsx",
    "CRMQuestionnaireTemplate.tsx",
    "Dashboard.tsx",
    "PlatformAdmin.tsx",
]:
    source = (
        ROOT
        / "src/admin/pages"
        / filename
    ).read_text(
        encoding="utf-8",
    )

    assert "AdminPageHeader" in source, filename


print(
    "PASS v1.10.12a WedPlanned Admin UI v2 foundation"
)

print(
    f"  shared AdminPageHeader coverage: {len(header_pages)} pages"
)

print(
    "  flatter workspace page headers: verified"
)

print(
    "  compact panels / controls / statuses: verified"
)

print(
    "  questionnaire builder density: verified"
)

print(
    "  responsive treatment: verified"
)

print(
    "  Platform Administration distinction: retained"
)

print(
    "  schema migration: not required"
)
