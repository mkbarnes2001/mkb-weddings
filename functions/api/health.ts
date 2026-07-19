type Env = { MKB_DB?: D1Database; ADMIN_API_ENABLED?: string };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return Response.json({
    ok: true,
    service: "photography-intelligence-pages-api",
    database: Boolean(context.env.MKB_DB),
    adminApi: ["1", "true", "yes"].includes(String(context.env.ADMIN_API_ENABLED || "").toLowerCase()),
  });
};
