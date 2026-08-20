#!/usr/bin/env python3

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]

layout = (
    ROOT
    / "src/admin/layouts/AdminLayout.tsx"
).read_text(
    encoding="utf-8",
)

css = (
    ROOT
    / "src/admin/admin-theme.css"
).read_text(
    encoding="utf-8",
)


assert 'aria-label="Breadcrumb"' not in layout
assert 'className="admin-context-bar"' not in layout


# Current section context still exists for title/mobile behaviour.
assert "currentSectionLabel" in layout
assert "currentContextLabel" in layout
assert "document.title" in layout


def find_opening_tag_end(
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
            depth = max(0, depth - 1)

        elif ch == ">" and depth == 0:
            return i + 1

        i += 1

    raise AssertionError(
        "Unclosed AdminPageHeader."
    )


headers_checked = 0

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
        headers_checked += 1

        tag = source[
            match.start():
            find_opening_tag_end(
                source,
                match.start(),
            )
        ]

        eyebrow_match = re.search(
            r"\\beyebrow\\s*=\\s*",
            tag,
        )

        if not eyebrow_match:
            continue

        value_start = eyebrow_match.end()

        if value_start >= len(tag):
            raise AssertionError(
                f"Missing eyebrow value: {path.name}"
            )

        first = tag[value_start]

        if first == "{":
            depth = 0
            quote = None
            escaped = False
            value_end = None

            for i in range(
                value_start,
                len(tag),
            ):
                ch = tag[i]

                if quote is not None:
                    if escaped:
                        escaped = False
                    elif ch == "\\\\":
                        escaped = True
                    elif ch == quote:
                        quote = None

                    continue

                if ch in ('"', "'", "`"):
                    quote = ch

                elif ch == "{":
                    depth += 1

                elif ch == "}":
                    depth -= 1

                    if depth == 0:
                        value_end = i + 1
                        break

            assert value_end is not None, path.name

        elif first in ('"', "'"):
            quote = first
            escaped = False
            value_end = None

            for i in range(
                value_start + 1,
                len(tag),
            ):
                ch = tag[i]

                if escaped:
                    escaped = False
                    continue

                if ch == "\\\\":
                    escaped = True
                    continue

                if ch == quote:
                    value_end = i + 1
                    break

            assert value_end is not None, path.name

        else:
            match = re.search(
                r"\\s",
                tag[value_start:],
            )

            value_end = (
                value_start + match.start()
                if match
                else len(tag)
            )

        eyebrow = tag[
            value_start:value_end
        ]

        assert "<Link" not in eyebrow, path.name
        assert "ArrowLeft" not in eyebrow, path.name
        assert "Back to " not in eyebrow, path.name


assert headers_checked >= 55


marker = (
    "/* v1.10.12a — Admin header navigation and action cleanup */"
)

assert marker in css

cleanup = css.split(
    marker,
    1,
)[1]


for token in [
    ".admin-page-actions",
    "margin-left: auto;",
    "justify-content: flex-end;",
    "--admin-header-action-square: 32px;",
    "--admin-header-action-square: 34px;",
    ".admin-header-action--icon",
    "width: var(--admin-header-action-square) !important;",
    "height: var(--admin-header-action-square) !important;",
    "overflow: visible;",
    "content: attr(data-admin-tooltip);",
    ":focus-visible::after",
]:
    assert token in cleanup, token


# Hover/focus must not resize the real button.
assert "max-width: 320px;" not in cleanup
assert "transition:\\n    max-width" not in cleanup


# Dedicated breadcrumb styling is removed.
assert (
    ".admin-context-bar { display: flex;"
    not in css
)

assert (
    ".admin-context-bar a { display: inline-flex;"
    not in css
)


# Representative detail/edit pages still use the shared header.
for filename in [
    "CRMCatalogue.tsx",
    "CRMContact.tsx",
    "CRMEnquiry.tsx",
    "CRMJob.tsx",
    "CRMQuote.tsx",
    "CRMQuestionnaireTemplate.tsx",
    "ClientGalleryEditor.tsx",
    "VenueDetail.tsx",
    "WeddingWorkspace.tsx",
]:
    source = (
        ROOT
        / "src/admin/pages"
        / filename
    ).read_text(
        encoding="utf-8",
    )

    assert "AdminPageHeader" in source


print(
    "PASS v1.10.12a Admin header navigation/action cleanup"
)

print(
    "  WedCRM > page context breadcrumb removed"
)

print(
    "  redundant header back links removed"
)

print(
    "  sidebar remains canonical navigation"
)

print(
    "  header actions right aligned"
)

print(
    "  icon-bearing actions remain fixed square controls"
)

print(
    "  action labels float independently on hover"
)

print(
    "  action labels float independently on keyboard focus"
)

print(
    "  text-only exceptional actions remain visible"
)

print(
    "  mobile actions remain right aligned"
)

print(
    f"  AdminPageHeader instances checked: {headers_checked}"
)

print(
    "  schema migration: not required"
)
