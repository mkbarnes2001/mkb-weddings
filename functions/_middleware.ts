export async function onRequest(context: any) {
  const url = new URL(context.request.url);

  // Match old WordPress-style URLs: /1234/anything
  const isOldWpPost = /^\/\d{4,}\/.+/.test(url.pathname);

  if (isOldWpPost) {
    url.pathname = "/gallery/venues";
    url.search = "";
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}
