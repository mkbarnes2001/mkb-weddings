import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../../../serverless/venue-d1";
import { resolveAdminWorkspaceId } from "../../../../../serverless/tenant-context";
import { createPrivateOriginalUpload } from "../../../../../serverless/private-original-d1";

type Env = {
  MKB_DB: D1Database;
  MKB_PRIVATE_ASSETS: R2Bucket;
  ADMIN_API_ENABLED?: string;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const body: any = await context.request.json();
    const result = await createPrivateOriginalUpload(
      context.env.MKB_DB,
      context.env.MKB_PRIVATE_ASSETS,
      String(context.params.id || "").trim(),
      body || {},
      await resolveAdminWorkspaceId(context),
    );
    return Response.json({ ok: true, ...result }, { status: result.resumed ? 200 : 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
