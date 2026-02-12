export async function onRequest(context: any) {
  const url = new URL(context.request.url);

  // Don't touch static assets
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname === "/robots.txt" ||
    url.pathname === "/sitemap.xml" ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/site.webmanifest"
  ) {
    return context.next();
  }

  // Match old WordPress-style URLs: /1234/anything
  const isOldWpPost = /^\/\d{4,}\/.+/.test(url.pathname);

  if (isOldWpPost) {
    url.pathname = "/gallery/venues";
    url.search = "";
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}