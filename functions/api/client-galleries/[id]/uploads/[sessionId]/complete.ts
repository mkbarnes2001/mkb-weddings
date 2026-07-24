import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../../../../serverless/venue-d1";
import { completePrivateOriginalUpload } from "../../../../../../serverless/private-original-d1";

type Env = {
  MKB_DB: D1Database;
  MKB_PRIVATE_ASSETS: R2Bucket;
  ADMIN_API_ENABLED?: string;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const body: any = await context.request.json();
    const session = await completePrivateOriginalUpload(
      context.env.MKB_DB,
      context.env.MKB_PRIVATE_ASSETS,
      String(context.params.id || "").trim(),
      String(context.params.sessionId || "").trim(),
      body || {},
    );
    return Response.json({ ok: true, session }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
