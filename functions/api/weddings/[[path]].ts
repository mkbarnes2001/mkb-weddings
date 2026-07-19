import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../serverless/venue-d1";
import { getAdminWedding, getWeddingImages, saveWeddingImages } from "../../../serverless/wedding-d1";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };
function segments(context: any) { const v = context.params?.path; return Array.isArray(v) ? v.map(String) : v ? [String(v)] : []; }

export const onRequest: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  const parts = segments(context); const slug = parts[0] || ""; const action = parts[1] || "";
  if (!slug || parts.length > 2) return notFoundResponse();
  try {
    if (context.request.method === "GET" && !action) {
      const wedding = await getAdminWedding(context.env.MKB_DB, slug);
      return wedding ? Response.json({ ok: true, wedding }) : Response.json({ error: "Wedding not found." }, { status: 404 });
    }
    if (action === "images" && context.request.method === "GET") {
      return Response.json({ ok: true, slug, document: await getWeddingImages(context.env.MKB_DB, slug) });
    }
    if (action === "images" && (context.request.method === "POST" || context.request.method === "PUT")) {
      const payload = await context.request.json<any>();
      return Response.json(await saveWeddingImages(context.env.MKB_DB, slug, payload?.document));
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (error) { return errorResponse(error); }
};
