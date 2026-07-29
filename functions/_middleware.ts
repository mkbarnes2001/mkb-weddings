import { getProfessionalContext, professionalAuthEnforced } from "../serverless/platform-auth-d1";
import { resolvePublicWorkspaceId } from "../serverless/tenant-context";

// functions/middleware.ts
export async function onRequest(context: any) {
  const request = context.request as Request;
  const url = new URL(request.url);

  const isGet = context.request.method === "GET";
  const accept = context.request.headers.get("accept") || "";
  const wantsHtml = accept.includes("text/html");

  const path = url.pathname;

  // When professional authentication is enabled on the Admin Pages project,
  // every API request in that deployment is session-gated before it reaches a
  // legacy handler. Using the environment gate rather than one hostname also
  // protects the project's pages.dev/preview hostnames. Do not set this flag on
  // the public Pages project. Tenant-aware handlers resolve the active business
  // from the authenticated professional context rather than browser input.
  const authExempt = path.startsWith("/api/platform-auth/") || path === "/api/health" || path === "/api/db-health";
  if (path.startsWith("/api/") && !authExempt && professionalAuthEnforced(context.env as any)) {
    const auth = await getProfessionalContext((context.env as any).MKB_DB, request, context.env as any);
    if (!auth.accessGranted) {
      return Response.json({ error: "Professional sign-in required." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
    }
    context.data = { ...(context.data || {}), professionalContext: auth };
  }

  // Don’t touch static files / assets (IMPORTANT: don’t rewrite JSON requests)
  const isStatic =
    path.startsWith("/assets/") ||
    path === "/robots.txt" ||
    path === "/sitemap.xml" ||
    path === "/favicon.ico" ||
    path.startsWith("/favicon-") ||
    path.startsWith("/apple-touch-icon") ||
    path.startsWith("/android-chrome") ||
    path.endsWith("/site.webmanifest") ||
    path.endsWith(".png") ||
    path.endsWith(".jpg") ||
    path.endsWith(".jpeg") ||
    path.endsWith(".webp") ||
    path.endsWith(".svg") ||
    path.endsWith(".css") ||
    path.endsWith(".js") ||
    path.endsWith(".map") ||
    path.endsWith(".woff") ||
    path.endsWith(".woff2") ||
    path.endsWith(".json");

  if (!isGet || !wantsHtml || isStatic) return context.next();

  const res = await context.next();
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return res;

  let html = await res.text();
  const origin = "https://www.mkbweddings.co.uk";
  const db = (context.env as any)?.MKB_DB;
  const publicWorkspaceId = db ? await resolvePublicWorkspaceId(db, request) : "workspace_mkb_weddings";

  // --- Helpers ---
  const escapeHtmlAttr = (s: string) =>
    (s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

  const titleCaseFromSlug = (slug: string) =>
    (slug || "")
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const setOrInsertMeta = (htmlIn: string, name: string, content: string): string => {
    const metaRe = new RegExp(`<meta\\s+name=["']${name}["'][^>]*>`, "i");
    const tag = `<meta name="${name}" content="${escapeHtmlAttr(content)}">`;
    return metaRe.test(htmlIn)
      ? htmlIn.replace(metaRe, tag)
      : htmlIn.replace("</head>", `  ${tag}\n</head>`);
  };

  const setOrInsertLinkRel = (htmlIn: string, rel: string, href: string): string => {
    const linkRe = new RegExp(`<link\\s+rel=["']${rel}["'][^>]*>`, "i");
    const tag = `<link rel="${rel}" href="${escapeHtmlAttr(href)}">`;
    return linkRe.test(htmlIn)
      ? htmlIn.replace(linkRe, tag)
      : htmlIn.replace("</head>", `  ${tag}\n</head>`);
  };

  const setOrInsertOg = (htmlIn: string, prop: string, content: string) => {
    const ogRe = new RegExp(`<meta\\s+property=["']${prop}["'][^>]*>`, "i");
    const tag = `<meta property="${prop}" content="${escapeHtmlAttr(content)}">`;
    return ogRe.test(htmlIn)
      ? htmlIn.replace(ogRe, tag)
      : htmlIn.replace("</head>", `  ${tag}\n</head>`);
  };

  const canonicalFromPath = (p: string) => `${origin}${p.replace(/\/+$/, "") || "/"}`;

  async function getPublishedVenueFromD1(slug: string): Promise<any | null> {
    try {
      if (!db) return null;
      const row = await db.prepare(
        "SELECT published_json FROM venues WHERE slug = ? AND workspace_id = ? AND status = 'published' AND published_json <> ''",
      ).bind(slug, publicWorkspaceId).first();
      if (!row?.published_json) return null;
      return JSON.parse(String(row.published_json));
    } catch {
      return null;
    }
  }

  async function getPublishedWeddingFromD1(slug: string): Promise<any | null> {
    try {
      if (!db) return null;
      const row = await db.prepare(
        "SELECT published_json FROM weddings WHERE slug = ? AND workspace_id = ? AND story_enabled = 1 AND story_status = 'published' AND published_json <> ''",
      ).bind(slug, publicWorkspaceId).first();
      if (!row?.published_json) return null;
      return JSON.parse(String(row.published_json));
    } catch {
      return null;
    }
  }

  async function getJsonCached(pathname: string, cacheTtlSeconds = 3600): Promise<any> {
    const cache = (globalThis as any).caches?.default;
    const cacheKey = new Request(`${origin}${pathname}`, { method: "GET" });

    if (cache) {
      const cached = await cache.match(cacheKey);
      if (cached) {
        try {
          return await cached.json();
        } catch {
          // fallthrough to refetch
        }
      }
    }

    const upstream = await fetch(cacheKey, { cf: { cacheTtl: cacheTtlSeconds } } as any);
    if (!upstream.ok) return {};

    if (cache) context.waitUntil(cache.put(cacheKey, upstream.clone()));
    return await upstream.json();
  }

  // --- defaults ---
  let title = "Wedding Photographer Northern Ireland & Ireland | MKB Weddings";
  let description =
    "Natural, cinematic, documentary wedding photography across Northern Ireland and Ireland. View real weddings, venues and galleries by MKB Weddings.";
  let canonical = canonicalFromPath(path);
  let ogType = "website";

  // Home
  if (path === "/") {
    title = "Wedding Photographer Northern Ireland & Ireland | MKB Weddings";
    description =
      "Natural, cinematic, documentary wedding photography across Northern Ireland and Ireland. View real weddings, venues and galleries by MKB Weddings. Based in Northern Ireland and also serving weddings throughout Ireland — including Donegal, Cavan, Monaghan, Louth, and surrounding counties.";
    canonical = `${origin}/`;
  }

  // Gallery
  if (path === "/gallery" || path === "/gallery/") {
    title = "Wedding Photography Gallery | Northern Ireland & Ireland | MKB Weddings";
    description =
      "Browse real wedding photography across Northern Ireland and Ireland — highlights, stories, and venue galleries by MKB Weddings.";
    canonical = `${origin}/gallery`;
  }

  // Venues index
  if (path === "/gallery/venues" || path === "/gallery/venues/") {
    title = "Wedding Venues Gallery | Northern Ireland & Ireland | MKB Weddings";
    description =
      "Explore wedding venue galleries across Northern Ireland and Ireland — see real weddings photographed by MKB Weddings.";
    canonical = `${origin}/gallery/venues`;
  }

  // Venue detail: /gallery/venue/:slug
  const venueMatch = path.match(/^\/gallery\/venue\/([^/]+)\/?$/i);
  if (venueMatch) {
    let slug = "";
    try {
      slug = decodeURIComponent(venueMatch[1]).toLowerCase();
    } catch {
      slug = (venueMatch[1] || "").toLowerCase();
    }

    const d1Venue = await getPublishedVenueFromD1(slug);
    const metaMap = d1Venue ? null : await getJsonCached("/venue-meta.json", 3600);
    const v = metaMap?.[slug];

    const venueName = (d1Venue?.name || v?.venueName || titleCaseFromSlug(slug)).toString().trim();
    const town = (d1Venue?.town || v?.venueTown || "").toString().trim();
    const region = (d1Venue?.county || v?.venueRegion || "").toString().trim();
    const country = (d1Venue?.country || v?.venueCountry || "").toString().trim();

    const locBits = [town, region, country].filter(Boolean);
    const locText = locBits.length ? ` | ${locBits.join(", ")}` : "";

    title = (d1Venue?.seo?.title || "").toString().trim() ||
      `${venueName} Wedding Photography${locText} | MKB Weddings`;
    description = (d1Venue?.seo?.description || "").toString().trim() ||
      `Wedding photography at ${venueName}${
        locBits.length ? ` in ${locBits.join(", ")}` : ""
      } — natural, documentary coverage with real venue gallery images by MKB Weddings.`;
    canonical = `${origin}/gallery/venue/${encodeURIComponent(slug)}`;
  }

  // County page:
  // New: /wedding-photographer/:countySlug
  // (Optional legacy support): /county/:countySlug
  const countyMatch = path.match(/^\/(?:wedding-photographer|county)\/([^/]+)\/?$/i);
  if (countyMatch) {
    let countySlug = "";
    try {
      countySlug = decodeURIComponent(countyMatch[1]).toLowerCase();
    } catch {
      countySlug = (countyMatch[1] || "").toLowerCase();
    }

    const countyMap = await getJsonCached("/county-meta.json", 300); // consider 300s while iterating
    const c = countyMap?.[countySlug];

    const countyName = (c?.county || titleCaseFromSlug(countySlug)).toString().trim();
    const country = (c?.country || "").toString().trim();

    title =
      (c?.seoTitle || "").toString().trim() ||
      `${countyName} Wedding Photographer | MKB Weddings`;

    description =
      (c?.seoDescription || "").toString().trim() ||
      `Natural, documentary wedding photography in ${countyName}${country ? `, ${country}` : ""}. Explore venues and real wedding galleries by MKB Weddings.`;

    // Canonical should match your chosen URL structure:
    canonical = `${origin}/wedding-photographer/${encodeURIComponent(countySlug)}`;
  }
  // Blog index
  if (path === "/blog" || path === "/blog/") {
  title = "Wedding Stories | Real Weddings Northern Ireland & Ireland | MKB Weddings";
  description =
    "Read real wedding stories photographed by MKB Weddings across Northern Ireland and Ireland, with galleries, venues, wedding details and photography inspiration.";
  canonical = `${origin}/blog`;
  }

  // Blog detail: /blog/:slug
  const blogMatch = path.match(/^\/blog\/([^/]+)\/?$/i);
  if (blogMatch) {
  let slug = "";
  try {
    slug = decodeURIComponent(blogMatch[1]).toLowerCase();
  } catch {
    slug = (blogMatch[1] || "").toLowerCase();
  }

  const wedding = await getPublishedWeddingFromD1(slug);
  const readableTitle = titleCaseFromSlug(slug);

  title = (wedding?.seo?.title || "").toString().trim() ||
    (wedding?.title ? `${wedding.title} | MKB Weddings` : `${readableTitle} Wedding Story | MKB Weddings`);
  description = (wedding?.seo?.description || wedding?.excerpt || "").toString().trim() ||
    `Real wedding photography story for ${readableTitle} by MKB Weddings — natural, candid and documentary wedding photography across Northern Ireland and Ireland.`;
  canonical = `${origin}/blog/${encodeURIComponent(slug)}`;
  ogType = "article";
  }


  // --- Apply into HTML ---
  if (/<title>.*<\/title>/i.test(html)) {
    html = html.replace(/<title>.*<\/title>/i, `<title>${escapeHtmlAttr(title)}</title>`);
  } else {
    html = html.replace("</head>", `  <title>${escapeHtmlAttr(title)}</title>\n</head>`);
  }

  html = setOrInsertMeta(html, "description", description);
  html = setOrInsertLinkRel(html, "canonical", canonical);

  html = setOrInsertOg(html, "og:title", title);
  html = setOrInsertOg(html, "og:description", description);
  html = setOrInsertOg(html, "og:url", canonical);
  html = setOrInsertOg(html, "og:type", ogType);

  const newHeaders = new Headers(res.headers);
  newHeaders.delete("content-length");

  return new Response(html, {
    status: res.status,
    statusText: res.statusText,
    headers: newHeaders,
  });
}