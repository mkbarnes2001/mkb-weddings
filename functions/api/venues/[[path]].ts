import {
  adminApiRequestAllowed,
  archiveAdminVenue,
  errorResponse,
  getAdminVenue,
  notFoundResponse,
  publishAdminVenue,
  updateAdminVenue,
} from "../../../serverless/venue-d1";

type Env = {
  MKB_DB: D1Database;
  ADMIN_API_ENABLED?: string; ADMIN_HOSTNAME?: string;
};

function segments(context: any) {
  const value = context.params?.path;
  return Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  const parts = segments(context);
  const slug = parts[0] || "";
  const action = parts[1] || "";
  if (!slug || parts.length > 2) return notFoundResponse();

  try {
    if (context.request.method === "GET" && !action) {
      const venue = await getAdminVenue(context.env.MKB_DB, slug);
      return venue
        ? Response.json({ ok: true, venue })
        : Response.json({ error: "Venue not found." }, { status: 404 });
    }

    if (context.request.method === "PUT" && !action) {
      const payload = await context.request.json<any>();
      const venue = await updateAdminVenue(context.env.MKB_DB, slug, payload?.venue);
      return Response.json({ ok: true, venue, backupPath: null });
    }

    if (context.request.method === "DELETE" && !action) {
      const venue = await archiveAdminVenue(context.env.MKB_DB, slug);
      return Response.json({ ok: true, venue, backupPath: null });
    }

    if (context.request.method === "POST" && action === "publish") {
      const publish = await publishAdminVenue(context.env.MKB_DB, slug);
      return Response.json({ ok: true, publish });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    return errorResponse(error);
  }
};
