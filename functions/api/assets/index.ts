import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../../serverless/venue-d1";
import { listAssetLibrary } from "../../../serverless/asset-library-d1";
import { resolveAdminWorkspaceId } from "../../../serverless/tenant-context";

type Env = {
  MKB_DB: D1Database;
  ADMIN_API_ENABLED?: string;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    const workspaceId = await resolveAdminWorkspaceId(context as any);
    const payload = await listAssetLibrary(context.env.MKB_DB, context.request.url, workspaceId);
    return Response.json({ ok: true, ...payload });
  } catch (error) {
    return errorResponse(error);
  }
};
