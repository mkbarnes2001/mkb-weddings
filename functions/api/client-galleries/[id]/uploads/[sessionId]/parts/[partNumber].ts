import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../../../../../serverless/venue-d1";
import { resolveAdminWorkspaceId } from "../../../../../../../serverless/tenant-context";
import { uploadPrivateOriginalPart } from "../../../../../../../serverless/private-original-d1";

type Env = {
  MKB_DB: D1Database;
  MKB_PRIVATE_ASSETS: R2Bucket;
  ADMIN_API_ENABLED?: string;
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const body = await context.request.arrayBuffer();
    const result = await uploadPrivateOriginalPart(
      context.env.MKB_DB,
      context.env.MKB_PRIVATE_ASSETS,
      String(context.params.id || "").trim(),
      String(context.params.sessionId || "").trim(),
      Number(context.params.partNumber || 0),
      body,
      await resolveAdminWorkspaceId(context),
    );
    return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
