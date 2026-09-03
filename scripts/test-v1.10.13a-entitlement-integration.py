#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def main() -> None:
    foundation = read("serverless/platform-foundation-d1.ts")
    resolver = read("serverless/platform-entitlements-d1.ts")
    modules = read("src/admin/navigation/adminModules.ts")
    layout = read("src/admin/layouts/AdminLayout.tsx")
    platform_api = read("functions/api/platform.ts")
    middleware = read("functions/_middleware.ts")
    schema = read("d1/schema.sql")
    architecture = read("Project-docs/ARCHITECTURE.md")

    assert 'import { resolveWorkspaceEntitlements } from "./platform-entitlements-d1";' in foundation
    assert "resolveWorkspaceEntitlements(db, workspaceId)" in foundation
    assert "resolvedAccess.entitlements.map" in foundation
    assert "LEFT JOIN workspace_entitlements" not in foundation
    assert "function hydrateEntitlement" not in foundation

    assert "FROM workspace_subscriptions subscription" in resolver
    assert "LEFT JOIN platform_plan_entitlements plan_entitlement" in resolver
    assert "FROM workspace_entitlements" in resolver
    assert "datetime(starts_at) <= datetime(?)" in resolver
    assert "datetime(ends_at) > datetime(?)" in resolver

    expected = {
        "business": "business-profile",
        "crm": "crm",
        "website": "content-tools",
        "client-galleries": "client-galleries",
    }
    for module_key, feature_key in expected.items():
        pattern = rf'key: "{re.escape(module_key)}".*?entitlementKey: "{re.escape(feature_key)}"'
        assert re.search(pattern, modules), f"missing canonical key {module_key} -> {feature_key}"
        assert f"('{feature_key}'," in schema, f"feature {feature_key} missing from platform_features seed"

    for stale in ["business_settings", "website_content", "client_galleries"]:
        assert f'entitlementKey: "{stale}"' not in modules

    assert "visibleModules.map" in layout
    assert "visibleAdminModules(enabledEntitlementKeys)" in layout
    assert "visibleModuleItems(currentModule, auth.permissions, enabledEntitlementKeys)" in layout
    assert "requireWorkspaceEntitlement" not in layout
    assert "requireWorkspaceEntitlement" not in platform_api
    assert "hasWorkspaceEntitlement" not in platform_api
    assert "professionalApiEntitlementForPath" in middleware
    assert "requireWorkspaceEntitlement" in middleware
    assert not (ROOT / "d1/migrations/053_wedplanned_entitlement_integration.sql").exists()

    assert "primary/readiness references only" in architecture
    assert "WedNav must retain recovery/billing access" in architecture

    print("PASS v1.10.13a Gate 2B entitlement resolver integration")
    print("  /api/platform entitlement read uses canonical resolver: verified")
    print("  duplicate foundation entitlement SQL removed: verified")
    print("  module readiness keys match platform feature catalogue: verified")
    print("  entitlement-aware desktop/mobile navigation shell: verified")
    print("  professional API enforcement active; navigation reflects canonical entitlements: verified")
    print("  schema remains compatible at 52+: verified")


if __name__ == "__main__":
    main()
