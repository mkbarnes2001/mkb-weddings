import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../../../serverless/venue-d1";
import { getPrivateOriginalUpload } from "../../../../../serverless/private-original-d1";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const session = await getPrivateOriginalUpload(
      context.env.MKB_DB,
      String(context.params.id || "").trim(),
      String(context.params.sessionId || "").trim(),
    );
    return Response.json({ ok: true, session }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
