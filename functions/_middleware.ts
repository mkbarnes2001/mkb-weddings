// functions/middleware.ts
export async function onRequest(context: any) {
  const url = new URL(context.request.url);

  const isGet = context.request.method === "GET";
  const accept = context.request.headers.get("accept") || "";
  const wantsHtml = accept.includes("text/html");
  const path = url.pathname;

  // Do NOT touch assets or JSON
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

  // ---------------- HELPERS ----------------

  const escapeHtmlAttr = (s: string) =>
    (s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

  const titleCaseFromSlug = (slug: string) =>
    (slug || "")
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const setOrInsertMeta = (htmlIn: string, name: string, content: string): string => {
    const re = new RegExp(`<meta\\s+name=["']${name}["'][^>]*>`, "i");
    const tag = `<meta name="${name}" content="${escapeHtmlAttr(content)}">`;
    return re.test(htmlIn)
      ? htmlIn.replace(re, tag)
      : htmlIn.replace("</head>", `  ${tag}\n</head>`);
  };

  const setOrInsertLinkRel = (htmlIn: string, rel: string, href: string): string => {
    const re = new RegExp(`<link\\s+rel=["']${rel}["'][^>]*>`, "i");
    const tag = `<link rel="${rel}" href="${escapeHtmlAttr(href)}">`;
    return re.test(htmlIn)
      ? htmlIn.replace(re, tag)
      : htmlIn.replace("</head>", `  ${tag}\n</head>`);
  };

  const setOrInsertOg = (htmlIn: string, prop: string, content: string) => {
    const re = new RegExp(`<meta\\s+property=["']${prop}["'][^>]*>`, "i");
    const tag = `<meta property="${prop}" content="${escapeHtmlAttr(content)}">`;
    return re.test(htmlIn)
      ? htmlIn.replace(re, tag)
      : htmlIn.replace("</head>", `  ${tag}\n</head>`);
  };

  const canonicalFromPath = (p: string) =>
    `${origin}${p.replace(/\/+$/, "") || "/"}`;

  // -------- JSON Fetch Helper (cached) --------

  async function getJson(file: string): Promise<any> {
    const cache = (globalThis as any).caches?.default;
    const cacheKey = new Request(`${origin}/${file}`, { method: "GET" });

    if (cache) {
      const cached = await cache.match(cacheKey);
      if (cached) {
        try {
          return await cached.json();
        } catch {}
      }
    }

    const upstream = await fetch(cacheKey, { cf: { cacheTtl: 3600 } } as any);
    if (!upstream.ok) return {};

    if (cache) context.waitUntil(cache.put(cacheKey, upstream.clone()));

    return await upstream.json();
  }

  // --------------- DEFAULTS ----------------

  let title = "Wedding Photographer Northern Ireland & Ireland | MKB Weddings";
  let description =
    "Natural, cinematic, documentary wedding photography across Northern Ireland and Ireland.";
  let canonical = canonicalFromPath(path);

  // ---------------- VENUE PAGE ----------------

  const venueMatch = path.match(/^\/gallery\/venue\/([^/]+)\/?$/i);
  if (venueMatch) {
    const slug = decodeURIComponent(venueMatch[1]).toLowerCase();
    const metaMap = await getJson("venue-meta.json");
    const v = metaMap?.[slug];

    const venueName = (v?.venueName || titleCaseFromSlug(slug)).trim();
    const town = (v?.venueTown || "").trim();
    const region = (v?.venueRegion || "").trim();
    const country = (v?.venueCountry || "").trim();

    const locBits = [town, region, country].filter(Boolean);
    const locText = locBits.length ? ` | ${locBits.join(", ")}` : "";

    title = `${venueName} Wedding Photography${locText} | MKB Weddings`;
    description = `Wedding photography at ${venueName}${
      locBits.length ? ` in ${locBits.join(", ")}` : ""
    } — natural, documentary coverage with real venue gallery images by MKB Weddings.`;

    canonical = `${origin}/gallery/venue/${slug}`;
  }

  // ---------------- COUNTY PAGE ----------------

  const countyMatch = path.match(/^\/counties\/([^/]+)\/?$/i);
  if (countyMatch) {
    const countySlug = decodeURIComponent(countyMatch[1]).toLowerCase();

    const countyMeta = await getJson("county-meta.json");
    const countyCopy = await getJson("county-copy.json");

    const meta = countyMeta?.[countySlug];
    const copy = countyCopy?.[countySlug];

    const countyName =
      meta?.countyName || titleCaseFromSlug(countySlug);

    const country = meta?.country || "";

    title =
      copy?.seoTitle ||
      `${countyName} Wedding Photographer${country ? ` | ${country}` : ""} | MKB Weddings`;

    description =
      copy?.metaDescription ||
      `Natural documentary wedding photography in ${countyName}${
        country ? `, ${country}` : ""
      }. Explore real venues and weddings photographed by MKB Weddings.`;

    canonical = `${origin}/counties/${countySlug}`;
  }

  // --------------- APPLY INTO HTML ---------------

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