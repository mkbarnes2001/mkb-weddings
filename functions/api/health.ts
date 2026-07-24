type Env = {
  MKB_DB?: D1Database;
  MKB_IMAGES?: R2Bucket;
  MKB_PRIVATE_ASSETS?: R2Bucket;
  ADMIN_API_ENABLED?: string;
  ADMIN_HOSTNAME?: string;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const enabled = ["1", "true", "yes"].includes(
    String(context.env.ADMIN_API_ENABLED || "").trim().toLowerCase(),
  );

  return Response.json({
    ok: true,
    service: "photography-intelligence-pages-api",
    database: Boolean(context.env.MKB_DB),
    imageStorage: Boolean(context.env.MKB_IMAGES),
    privateAssetStorage: Boolean(context.env.MKB_PRIVATE_ASSETS),
    adminApi: enabled,
    adminHostname: String(context.env.ADMIN_HOSTNAME || ""),
    requestHostname: url.hostname,
    hostHeader: context.request.headers.get("host") || "",
    forwardedHost: context.request.headers.get("x-forwarded-host") || "",
  });
};
