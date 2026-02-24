export async function onRequest(context: any) {
  const url = new URL(context.request.url);

  // Only touch HTML document requests (avoid assets)
  const isGet = context.request.method === "GET";
  const accept = context.request.headers.get("accept") || "";
  const wantsHtml = accept.includes("text/html");

  // Don’t touch static files / known assets
  const path = url.pathname;
  const isStatic =
    path.startsWith("/assets/") ||
    path === "/robots.txt" ||
    path === "/sitemap.xml" ||
    path === "/favicon.ico" ||
    path.startsWith("/favicon-") ||
    path.startsWith("/apple-touch-icon") ||
    path.startsWith("/android-chrome") ||
    path.startsWith("/site.webmanifest") ||
    path.endsWith(".png") ||
    path.endsWith(".jpg") ||
    path.endsWith(".jpeg") ||
    path.endsWith(".webp") ||
    path.endsWith(".svg") ||
    path.endsWith(".css") ||
    path.endsWith(".js") ||
    path.endsWith(".map") ||
    path.endsWith(".woff") ||
    path.endsWith(".woff2");

  if (!isGet || !wantsHtml || isStatic) {
    return context.next();
  }

  // Let the normal Pages asset pipeline respond first (serves index.html for SPA routes)
  const res = await context.next();

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return res;

  let html = await res.text();

  const origin = "https://www.mkbweddings.co.uk";

  // --- Helpers ---
  const titleCaseFromSlug = (slug: string) =>
    slug
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const setOrInsertMeta = (
    htmlIn: string,
    name: string,
    content: string
  ): string => {
    const metaRe = new RegExp(
      `<meta\\s+name=["']${name}["'][^>]*>`,
      "i"
    );
    const tag = `<meta name="${name}" content="${escapeHtmlAttr(content)}">`;

    if (metaRe.test(htmlIn)) {
      return htmlIn.replace(metaRe, tag);
    }
    return htmlIn.replace("</head>", `  ${tag}\n</head>`);
  };

  const setOrInsertLinkRel = (
    htmlIn: string,
    rel: string,
    href: string
  ): string => {
    const linkRe = new RegExp(
      `<link\\s+rel=["']${rel}["'][^>]*>`,
      "i"
    );
    const tag = `<link rel="${rel}" href="${escapeHtmlAttr(href)}">`;

    if (linkRe.test(htmlIn)) {
      return htmlIn.replace(linkRe, tag);
    }
    return htmlIn.replace("</head>", `  ${tag}\n</head>`);
  };

  const setOrInsertOg = (htmlIn: string, prop: string, content: string) => {
    const ogRe = new RegExp(
      `<meta\\s+property=["']${prop}["'][^>]*>`,
      "i"
    );
    const tag = `<meta property="${prop}" content="${escapeHtmlAttr(content)}">`;

    if (ogRe.test(htmlIn)) {
      return htmlIn.replace(ogRe, tag);
    }
    return htmlIn.replace("</head>", `  ${tag}\n</head>`);
  };

  const escapeHtmlAttr = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

  // --- Route-specific title/description ---
  let title = "Wedding Photographer Northern Ireland & Ireland | MKB Weddings";
  let description =
  "Natural, cinematic, documentary wedding photography across Northern Ireland and Ireland. View real weddings, venues and galleries by MKB Weddings.";
  let canonical = `${origin}${path.replace(/\/+$/, "") || "/"}`;

  // Home page
  if (path === "/" ) {
    title = "Wedding Photographer Northern Ireland & Ireland | MKB Weddings";
    description =
    "Natural, cinematic, documentary wedding photography across Northern Ireland and Ireland. View real weddings, venues and galleries by MKB Weddings.";
  canonical = `${origin}/`;
  }

  // Gallery page
  if (path === "/gallery" || path === "/gallery/") {
    title = "Wedding Photography Gallery | Northern Ireland & Ireland | MKB Weddings";
    description =
      "Browse real wedding photography across Northern Ireland and Ireland — highlights, stories, and venue galleries by MKB Weddings.";
    canonical = `${origin}/gallery`;
  }

  // Venues index page
  if (path === "/gallery/venues" || path === "/gallery/venues/") {
    title = "Wedding Venues Gallery | Northern Ireland & Ireland | MKB Weddings";
    description =
      "Explore wedding venue galleries across Northern Ireland and Ireland — see real weddings photographed by MKB Weddings.";
    canonical = `${origin}/gallery/venues`;
  }

  // Venue detail page: /gallery/venue/:slug
  const venueMatch = path.match(/^\/gallery\/venue\/([^/]+)\/?$/i);
  if (venueMatch) {
    const slug = decodeURIComponent(venueMatch[1]);
    const venueName = titleCaseFromSlug(slug);

    title = `${venueName} Wedding Photography | MKB Weddings`;
    description = `Wedding photography at ${venueName} — natural, documentary coverage with real venue gallery images by MKB Weddings.`;
    canonical = `${origin}/gallery/venue/${encodeURIComponent(slug)}`;
  }

  // --- Apply into HTML ---
  // Replace <title>…</title>
  if (/<title>.*<\/title>/i.test(html)) {
    html = html.replace(/<title>.*<\/title>/i, `<title>${escapeHtmlAttr(title)}</title>`);
  } else {
    html = html.replace("</head>", `  <title>${escapeHtmlAttr(title)}</title>\n</head>`);
  }

  // Ensure meta description + canonical exist in initial HTML
  html = setOrInsertMeta(html, "description", description);
  html = setOrInsertLinkRel(html, "canonical", canonical);

  // Optional but helpful: OG tags (so previews match too)
  html = setOrInsertOg(html, "og:title", title);
  html = setOrInsertOg(html, "og:description", description);
  html = setOrInsertOg(html, "og:url", canonical);
  html = setOrInsertOg(html, "og:type", "website");

  // Return updated response (remove content-length because body changed)
  const newHeaders = new Headers(res.headers);
  newHeaders.delete("content-length");

  return new Response(html, {
    status: res.status,
    statusText: res.statusText,
    headers: newHeaders,
  });
}