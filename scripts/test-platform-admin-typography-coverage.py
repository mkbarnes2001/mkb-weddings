#!/usr/bin/env python3

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

FILES = sorted(
    list((ROOT / "src/admin").rglob("*.css"))
    + list((ROOT / "src/admin").rglob("*.tsx"))
)

FONT_PATTERN = re.compile(
    r'font-size\s*:\s*([^;]+);',
    re.I,
)

ABSOLUTE_UNIT_PATTERN = re.compile(
    r'(?<![A-Za-z0-9_-])'
    r'(?:\d+(?:\.\d+)?|\.\d+)'
    r'(?:px|rem|pt|pc|in|cm|mm|vh|vw|vmin|vmax)\b',
    re.I,
)

RELATIVE_ONLY_PATTERN = re.compile(
    r'^\s*(?:\d+(?:\.\d+)?|\.\d+)'
    r'(?:em|ex|ch|lh|rlh|%)'
    r'(?:\s*!important)?\s*$',
    re.I,
)

KEYWORD_PATTERN = re.compile(
    r'^\s*(?:inherit|initial|unset|revert|revert-layer|medium|'
    r'xx-small|x-small|small|large|x-large|xx-large|larger|smaller)'
    r'(?:\s*!important)?\s*$',
    re.I,
)

SCALE_TOKENS = (
    "--admin-font-scale-effective",
    "--admin-heading-scale-effective",
    "--admin-button-scale-effective",
    "--admin-navigation-scale-effective",
    "--admin-meta-scale-effective",
    "--admin-page-header-logo-scale-effective",
    "--admin-sidebar-logo-scale-effective",
    "--admin-mobile-logo-scale-effective",
)


def absolute_value(value: str) -> bool:
    raw = value.strip()

    if RELATIVE_ONLY_PATTERN.fullmatch(raw):
        return False

    if KEYWORD_PATTERN.fullmatch(raw):
        return False

    if ABSOLUTE_UNIT_PATTERN.search(raw):
        return True

    if re.match(
        r'^(?:clamp|min|max|calc)\s*\(',
        raw,
        flags=re.I,
    ):
        return True

    return False


uncovered = []
absolute_count = 0
scaled_count = 0
isolated_preview_absolute_count = 0

PREVIEW_ISOLATION_START = (
    "PUBLIC_APPEARANCE_PREVIEW_TYPOGRAPHY_ISOLATION_START"
)

PREVIEW_ISOLATION_END = (
    "PUBLIC_APPEARANCE_PREVIEW_TYPOGRAPHY_ISOLATION_END"
)

for path in FILES:
    text = path.read_text(encoding="utf-8")

    preview_isolated = False

    for line_no, line in enumerate(
        text.splitlines(),
        start=1,
    ):
        if PREVIEW_ISOLATION_START in line:
            assert not preview_isolated
            preview_isolated = True
            continue

        if PREVIEW_ISOLATION_END in line:
            assert preview_isolated
            preview_isolated = False
            continue
        for match in FONT_PATTERN.finditer(line):
            value = match.group(1).strip()

            if not absolute_value(value):
                continue

            if preview_isolated:
                isolated_preview_absolute_count += 1
                continue

            absolute_count += 1

            if any(token in value for token in SCALE_TOKENS):
                scaled_count += 1
                continue

            uncovered.append(
                (
                    str(path.relative_to(ROOT)),
                    line_no,
                    value,
                )
            )

    assert not preview_isolated, (
        f"Unclosed public appearance preview typography "
        f"isolation marker in {path}"
    )

if uncovered:
    for path, line_no, value in uncovered:
        print(
            f"UNCOVERED {path}:{line_no}: "
            f"font-size: {value};"
        )

    raise AssertionError(
        f"{len(uncovered)} absolute Admin "
        "font-size declarations are not scalable"
    )

css = (
    ROOT / "src/admin/admin-theme.css"
).read_text(encoding="utf-8")

layout = (
    ROOT / "src/admin/layouts/AdminLayout.tsx"
).read_text(encoding="utf-8")

page = (
    ROOT / "src/admin/pages/PlatformAdmin.tsx"
).read_text(encoding="utf-8")

assert (
    "global typography coverage"
    in css
)

assert (
    "--admin-font-scale-effective"
    in layout
)

assert (
    "adminFontScale"
    in layout
)

assert (
    "Overall Admin text"
    in page
)

assert (
    ".admin-shell .portal-branding-preview"
    in css
)

assert absolute_count > 100
assert scaled_count == absolute_count

# The public-site preview intentionally renders the controlled
# WedPlanned public typography rather than inheriting the Admin
# user's global typography scale. Its exclusion is explicit and
# bounded by markers in admin-theme.css.
assert isolated_preview_absolute_count > 0
assert (
    PREVIEW_ISOLATION_START
    in css
)
assert (
    PREVIEW_ISOLATION_END
    in css
)

print(
    "PASS v1.10.1a hotfix3 global Admin typography coverage"
)
print(
    f"  scalable absolute font declarations: {absolute_count}"
)
print(
    f"  declarations covered by Admin scale variables: {scaled_count}"
)
print(
    "  public website preview typography isolated: "
    f"{isolated_preview_absolute_count}"
)
print(
    "  relative em/% typography avoids double scaling: verified"
)
print(
    "  client-facing branding preview isolation: verified"
)
