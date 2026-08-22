#!/usr/bin/env python3
"""v1.10.12a workspace heading and module-customisation guard."""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]


def read(relative: str) -> str:
    return (
        ROOT / relative
    ).read_text(
        encoding="utf-8",
    )


lead = read(
    "src/admin/pages/CRMEnquiry.tsx"
)

job = read(
    "src/admin/pages/CRMJob.tsx"
)

shared = read(
    "src/admin/components/crm/"
    "CRMWeddingWorkspaceShared.tsx"
)

layout = read(
    "src/admin/layouts/AdminLayout.tsx"
)

navigation = read(
    "src/admin/navigation/adminModules.ts"
)

platform = read(
    "src/admin/pages/PlatformAdmin.tsx"
)

types = read(
    "src/admin/types/platform.ts"
)

css = read(
    "src/admin/admin-theme.css"
)


def panel_openings(
    source: str,
) -> list[str]:
    pattern = re.compile(
        r"<(?:AdminPanel|AdminAccordion)\b"
    )

    openings = []

    for match in pattern.finditer(
        source
    ):
        start = match.start()

        # Description props in these workspace tags are all
        # before nested summary JSX; a short bounded slice is
        # sufficient for regression ownership.
        openings.append(
            source[
                start:
                min(
                    len(source),
                    start + 900,
                )
            ]
        )

    return openings


# Shared workspace top headings are title-only.
assert 'title="Wedding workflow"' in shared
assert 'title="Clients"' in shared

assert (
    "Wedding Photography · key booking "
    "and delivery milestones."
    not in shared
)

assert (
    "Contact details and client portal access."
    not in shared
)


# Lead / Job canonical workspace headings remain.
for title in (
    "Booking and payments",
    "Wedding delivery and content",
    "Quote and package",
    "Communication",
    "Questionnaires",
    "Supplier team",
    "Files",
    "Notes and activity",
):
    assert (
        f'title="{title}"'
        in lead
    ), (
        "Lead",
        title,
    )

    assert (
        f'title="{title}"'
        in job
    ), (
        "Job",
        title,
    )


assert (
    'title="Wedding details"'
    in lead
)

assert (
    'title="Lead details"'
    not in lead
)


# Removed copy is not rendered beneath workspace headings.
for phrase in (
    "Contact details and client portal access.",
    "Accepted quote and package.",
    "Questionnaire details for this Job.",
    "Original enquiry notes and the latest operational changes.",
):
    assert phrase not in shared + lead + job, phrase


# Concise pre-booking language.
assert (
    "After booking"
    in lead
)

assert (
    "Available after booking"
    not in lead
)

assert (
    "Available after booking."
    not in shared
)


# Inactive commercial states are intentionally quieter.
assert (
    "crm-booking-summary-row__state is-inactive"
    in lead
)

assert (
    ".crm-booking-summary-row__state.is-inactive"
    in css
)


# Platform configuration -> route -> runtime CSS variables.
assert 'key: "crm"' in navigation
assert 'pathname.startsWith("/admin/crm")' in navigation

for field in (
    "accentColor",
    "pageBackgroundColor",
    "sectionBackgroundColor",
    "recordBackgroundColor",
):
    assert field in platform, field
    assert field in types, field
    assert field in layout, field


for token in (
    "--admin-module-accent",
    "--admin-module-page-background",
    "--admin-module-section-background",
    "--admin-module-record-background",
):
    assert token in layout, token


# Unified Lead / Job workspace remains inside CRM-token consumers.
assert (
    "crm-job-operations-page"
    in lead
)

assert (
    "crm-job-operations-page"
    in job
)

assert (
    "--admin-module-record-background"
    in css
)

assert (
    "--admin-module-section-background"
    in css
)

assert (
    "--admin-module-accent"
    in css
)


assert not list(
    (
        ROOT
        / "d1/migrations"
    ).glob("048*")
)


print(
    "PASS v1.10.12a workspace heading + module customisation"
)

print(
    "  Lead / Job workspace headings: title-only"
)

print(
    "  Wedding details terminology: unified"
)

print(
    "  pre-booking labels: concise"
)

print(
    "  inactive commercial states: softened"
)

print(
    "  CRM route -> module appearance: mapped"
)

print(
    "  AdminLayout runtime CSS variables: mapped"
)

print(
    "  Lead / Job token consumers: mapped"
)

print(
    "  schema migration required: no"
)
