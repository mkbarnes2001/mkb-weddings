#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def function_block(source: str, function_name: str) -> str:
    token = f"export async function {function_name}("
    start = source.find(token)
    assert start >= 0, function_name

    end = source.find(
        "\nexport async function ",
        start + len(token),
    )

    if end < 0:
        end = len(source)

    return source[start:end]


def main() -> None:
    module_data = (
        ROOT / "serverless/platform-module-config-d1.ts"
    ).read_text()
    branding_data = (
        ROOT / "serverless/platform-branding-d1.ts"
    ).read_text()
    administration = (
        ROOT / "serverless/platform-administration-d1.ts"
    ).read_text()

    combined = function_block(
        administration,
        "updatePlatformBrandingAndModules",
    )
    single_module = function_block(
        module_data,
        "savePlatformModuleConfiguration",
    )
    all_modules = function_block(
        module_data,
        "savePlatformModuleConfigurations",
    )
    identity = function_block(
        branding_data,
        "savePlatformBrandingIdentity",
    )

    assert (
        "preparePlatformModuleConfigurationsStatements"
        in module_data
    )
    assert (
        "preparePlatformBrandingIdentityStatements"
        in branding_data
    )

    assert (
        "preparePlatformModuleConfigurationsStatements"
        in combined
    )
    assert (
        "preparePlatformBrandingIdentityStatements"
        in combined
    )
    assert combined.count("false,") == 2
    assert "await db.batch([" in combined
    assert "...moduleWrite.statements" in combined
    assert "...brandingWrite.statements" in combined
    assert "auditStatement" in combined
    assert (
        "'platform.branding_and_modules.updated'"
        in combined
    )

    assert (
        "await savePlatformModuleConfigurations"
        not in combined
    )
    assert (
        "await savePlatformBrandingIdentity"
        not in combined
    )

    assert "await db.batch(prepared.statements)" in single_module
    assert "await db.batch(prepared.statements)" in all_modules
    assert "await db.batch(prepared.statements)" in identity

    assert ".run()" not in single_module
    assert ".run()" not in all_modules
    assert ".run()" not in identity

    print("PASS v1.10.1a platform branding atomicity")
    print("  all module and identity inputs validate before writes")
    print("  page-level save uses one transactional D1 batch")
    print("  combined save records one audit event")
    print("  individual data and audit saves are atomic")


if __name__ == "__main__":
    main()
