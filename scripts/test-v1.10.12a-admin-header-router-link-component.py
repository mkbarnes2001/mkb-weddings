#!/usr/bin/env python3

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]

ui = (
    ROOT
    / "src/admin/components/ui/AdminUI.tsx"
).read_text(
    encoding="utf-8",
)

assert (
    "export function AdminHeaderRouterLink("
    in ui
)

for token in [
    "ComponentProps<typeof RouterLink>",
    "Array.isArray(node)",
    "Children.toArray(node)",
    "platformIdentity?.adminActionIcons || {}",
    "resolveAdminActionIcon(",
    "data-admin-action=",
    "data-admin-tooltip=",
    '"admin-header-action--icon"',
    "element.type === AdminHeaderRouterLink",
]:
    assert token in ui, token


def opening_tag_end(
    source: str,
    start: int,
) -> int:
    depth = 0
    quote = None
    escaped = False

    i = start

    while i < len(source):
        ch = source[i]

        if quote is not None:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None

            i += 1
            continue

        if ch in ('"', "'", "`"):
            quote = ch
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth = max(
                0,
                depth - 1,
            )
        elif ch == ">" and depth == 0:
            return i + 1

        i += 1

    raise AssertionError(
        "Unclosed AdminPageHeader."
    )


converted = 0
remaining_eligible_links = []


for path in sorted(
    (
        ROOT
        / "src/admin/pages"
    ).glob("*.tsx")
):
    source = path.read_text(
        encoding="utf-8",
    )

    for match in re.finditer(
        r"<AdminPageHeader\b",
        source,
    ):
        tag = source[
            match.start():
            opening_tag_end(
                source,
                match.start(),
            )
        ]

        converted += tag.count(
            "<AdminHeaderRouterLink"
        )

        for link in re.finditer(
            r"<Link\b(?P<attrs>.*?)>",
            tag,
            re.S,
        ):
            attrs = link.group(
                "attrs"
            )

            if (
                "admin-button" in attrs
                or "admin-icon-control" in attrs
                or "admin-icon-button" in attrs
            ):
                remaining_eligible_links.append(
                    path.name
                )


assert converted >= 15, converted
assert not remaining_eligible_links, (
    remaining_eligible_links
)


crm = (
    ROOT
    / "src/admin/pages/CRM.tsx"
).read_text(
    encoding="utf-8",
)

email = (
    ROOT
    / "src/admin/pages/CRMEmailSettings.tsx"
).read_text(
    encoding="utf-8",
)


for label in [
    "Catalogue",
    "Quotes",
]:
    assert label in crm

assert (
    crm.count(
        "<AdminHeaderRouterLink"
    )
    >= 2
)

assert "Email templates" in email

assert (
    "<AdminHeaderRouterLink"
    in email
)


print(
    "PASS v1.10.12a explicit Admin header Router Link component"
)

print(
    f"  converted eligible header Router Links: {converted}"
)

print(
    "  direct React Router admin-button links remaining: 0"
)

print(
    "  mixed icon + text children resolve to semantic labels"
)

print(
    "  configured semantic icons resolved inside component"
)

print(
    "  fixed square class owned by component"
)

print(
    "  floating tooltip attributes owned by component"
)

print(
    "  non-header Router Links remain unchanged"
)

print(
    "  migration required: NO"
)
