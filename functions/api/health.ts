type Env = {
  MKB_DB?: D1Database;
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
    adminApi: enabled,
    adminHostname: String(context.env.ADMIN_HOSTNAME || ""),
    requestHostname: url.hostname,
    hostHeader: context.request.headers.get("host") || "",
    forwardedHost: context.request.headers.get("x-forwarded-host") || "",
  });
};
