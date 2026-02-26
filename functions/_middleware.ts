// functions/middleware.ts
export async function onRequest(context: any) {
  const url = new URL(context.request.url);

  const isGet = context.request.method === "GET";
  const accept = context.request.headers.get("accept") || "";
  const wantsHtml = accept.includes("text/html");

  const path = url.pathname;

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

    const metaMap = await getJsonCached("/venue-meta.json", 3600);
    const v = metaMap?.[slug];

    const venueName = (v?.venueName || titleCaseFromSlug(slug)).toString().trim();
    const town = (v?.venueTown || "").toString().trim();
    const region = (v?.venueRegion || "").toString().trim();
    const country = (v?.venueCountry || "").toString().trim();

    const locBits = [town, region, country].filter(Boolean);
    const locText = locBits.length ? ` | ${locBits.join(", ")}` : "";

    title = `${venueName} Wedding Photography${locText} | MKB Weddings`;
    description = `Wedding photography at ${venueName}${
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
  html = setOrInsertOg(html, "og:type", "website");

  const newHeaders = new Headers(res.headers);
  newHeaders.delete("content-length");

  return new Response(html, {
    status: res.status,
    statusText: res.statusText,
    headers: newHeaders,
  });
}