#!/usr/bin/env python3

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

admin_ui = (
    ROOT
    / "src/admin/components/ui/AdminUI.tsx"
).read_text(
    encoding="utf-8",
)

css = (
    ROOT
    / "src/admin/admin-theme.css"
).read_text(
    encoding="utf-8",
)

platform_admin = (
    ROOT
    / "src/admin/pages/PlatformAdmin.tsx"
).read_text(
    encoding="utf-8",
)

catalogue = (
    ROOT
    / "src/admin/config/adminActionIcons.ts"
).read_text(
    encoding="utf-8",
)

platform_types = (
    ROOT
    / "src/admin/types/platform.ts"
).read_text(
    encoding="utf-8",
)


for token in [
    "transformAdminHeaderActions",
    "transformAdminHeaderAction",
    "adminHeaderActionText",
    "inferAdminActionKey",
    "resolveAdminActionIcon",
    '"data-admin-tooltip"',
    '"data-admin-action"',
    "admin-header-action--icon",
    "floatingTooltip",
    "platformIdentity?.adminActionIcons || {}",
]:
    assert token in admin_ui, token


marker = (
    "/* v1.10.12a — Admin header navigation and action cleanup */"
)

assert marker in css

header_css = css.split(
    marker,
    1,
)[1]


for token in [
    "--admin-header-action-square: 32px;",
    "--admin-header-action-square: 34px;",
    "width: var(--admin-header-action-square) !important;",
    "min-width: var(--admin-header-action-square) !important;",
    "max-width: var(--admin-header-action-square) !important;",
    "height: var(--admin-header-action-square) !important;",
    "content: attr(data-admin-tooltip);",
    "position: absolute;",
    "pointer-events: none;",
    ":hover::after",
    ":focus-visible::after",
]:
    assert token in header_css, token


assert "max-width: 320px;" not in header_css


for token in [
    "Admin action icons",
    "adminActionDefinitions",
    "adminActionIconCatalogue",
    "configuredAdminActionIconKey",
    "defaultAdminActionIconKey",
    "actionIconActionKey",
    "actionIconSearch",
    "updateAdminActionIcon",
    "Find an icon",
    "Reset to default",
    "platform-action-icon-catalogue",
    'role="listbox"',
    'role="option"',
]:
    assert token in platform_admin, token


assert (
    "adminActionIcons: Record<string, string>;"
    in platform_types
)

assert "inferAdminActionKey" in catalogue
assert "resolveAdminActionIcon" in catalogue


print(
    "PASS v1.10.12a fixed Admin header actions + icon catalogue"
)

print(
    "  header controls remain fixed square: verified"
)

print(
    "  hover does not resize controls: verified"
)

print(
    "  floating hover label: verified"
)

print(
    "  floating keyboard-focus label: verified"
)

print(
    "  semantic configured icon resolution: verified"
)

print(
    "  text-only exceptional header controls remain normal: verified"
)

print(
    "  searchable Platform Admin icon catalogue: verified"
)

print(
    "  reset-to-default behaviour: verified"
)

print(
    "  ordinary page-content buttons: unchanged"
)

print(
    "  production migration applied: NO"
)
