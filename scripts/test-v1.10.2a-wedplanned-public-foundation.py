#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

def read(path: str) -> str:
    return (ROOT / path).read_text()

def main() -> None:
    package = json.loads(read("package.json"))
    vite = read("vite.wedplanned.config.ts")
    app = read("src/wedplanned/WedPlannedApp.tsx")
    products = read("src/wedplanned/products.ts")
    main_entry = read("src/wedplanned/main.tsx")
    css = read("src/wedplanned/wedplanned.css")
    redirects = read("config/wedplanned/public/_redirects")
    robots = read("config/wedplanned/public/robots.txt")
    sitemap = read("config/wedplanned/public/sitemap.xml")
    mkb_app = read("src/App.tsx")
    mkb_vite = read("vite.public.config.ts")
    middleware = read("functions/_middleware.ts")
    schema = read("d1/schema.sql")

    # Third application/build target is explicit and isolated.
    assert package["scripts"]["build:wedplanned"] == "vite build --config vite.wedplanned.config.ts"
    assert package["scripts"]["dev:wedplanned"] == "vite --config vite.wedplanned.config.ts"
    assert 'outDir: "build-wedplanned"' in vite
    assert 'publicDir: "config/wedplanned/public"' in vite
    assert 'src="/src/wedplanned/main.tsx"' in vite
    assert "WedPlannedApp" in main_entry
    assert 'import "./wedplanned.css"' in main_entry

    # MKB website keeps its existing independent build/router.
    assert 'outDir: "build"' in mkb_vite
    assert "WedPlannedApp" not in mkb_app
    assert 'path="/gallery"' in mkb_app
    assert 'path="/blog"' in mkb_app

    # Product IA is the new agreed four-product suite.
    for name, compact, slug in [
        ("WedNav", "W.NAV", "wednav"),
        ("WedCRM", "W.CRM", "wedcrm"),
        ("WedStudio", "W.STU", "wedstudio"),
        ("WedStore", "W.STO", "wedstore"),
    ]:
        assert f'name: "{name}"' in products
        assert f'compactName: "{compact}"' in products
        assert f'slug: "{slug}"' in products

    assert "Your business command centre" in products
    assert "Supplier master database" in products

    # Required public IA exists.
    for route in [
        'path="/"',
        'path="/products"',
        'path="/products/:slug"',
        'path="/pricing"',
        'path="/about"',
        'path="/sign-in"',
        'path="/get-started"',
    ]:
        assert route in app, route

    # Marketing SEO/canonical foundation is WedPlanned-owned.
    assert 'const SITE_ORIGIN = "https://wedplanned.com";' in app
    assert "<PageMeta" in app
    assert 'rel="canonical"' in app
    assert "https://wedplanned.com/sitemap.xml" in robots
    for path in [
        "https://wedplanned.com/",
        "https://wedplanned.com/products",
        "https://wedplanned.com/products/wednav",
        "https://wedplanned.com/products/wedcrm",
        "https://wedplanned.com/products/wedstudio",
        "https://wedplanned.com/products/wedstore",
        "https://wedplanned.com/pricing",
        "https://wedplanned.com/about",
        "https://wedplanned.com/get-started",
    ]:
        assert path in sitemap

    # SPA fallback exists without importing/copying MKB public assets.
    assert "/*  /index.html  200" in redirects
    assert "index.css" not in main_entry
    assert "Navigation" not in main_entry
    assert "Footer" not in main_entry

    # No MKB tracking, MKB canonical middleware or image estate leaks into
    # the WedPlanned marketing source/config.
    wedplanned_surface = "\n".join([
        vite,
        app,
        products,
        main_entry,
        css,
        redirects,
        robots,
        sitemap,
    ])
    for forbidden in [
        "G-RQB9V9DTZP",
        "997831192497050",
        "images.mkbweddings.co.uk",
        "www.mkbweddings.co.uk",
        "generate-sitemap.mjs",
        "functions/_middleware.ts",
    ]:
        assert forbidden not in wedplanned_surface, forbidden

    # Existing middleware remains MKB-specific and therefore must not be
    # deployed with the static WedPlanned build.
    assert 'const origin = "https://www.mkbweddings.co.uk";' in middleware
    assert not (ROOT / "config/wedplanned/public/functions").exists()

    # Responsive site shell and product differentiation are explicit.
    assert ".wp-mobile-menu-button" in css
    assert "@media (max-width: 760px)" in css
    for selector in [
        ".wp-product-wordmark--wednav",
        ".wp-product-wordmark--wedcrm",
        ".wp-product-wordmark--wedstudio",
        ".wp-product-wordmark--wedstore",
    ]:
        assert selector in css

    # Commercial placeholders do not invent pricing or signup behaviour.
    assert "placeholder prices" in app
    normalized_app = " ".join(app.split())
    assert "Account creation, plan selection and billing" in normalized_app

    # Source-only foundation: schema remains unchanged.
    assert "'schema_version', '37'" in schema or "VALUES ('schema_version', '37')" in schema
    assert not (ROOT / "d1/migrations/038_wedplanned_public_foundation.sql").exists()

    print("PASS v1.10.2a WedPlanned public website foundation")
    print("  isolated third Vite application/build: verified")
    print("  MKB public router/build remains independent: verified")
    print("  WedNav / WedCRM / WedStudio / WedStore public IA: verified")
    print("  responsive marketing shell and product differentiation: verified")
    print("  WedPlanned canonical, robots and sitemap foundation: verified")
    print("  MKB analytics/assets/middleware excluded from marketing build: verified")
    print("  future pricing/signup boundaries do not invent commercial behaviour: verified")
    print("  static-only deployment boundary: verified")
    print("  schema remains 37: verified")

if __name__ == "__main__":
    main()
