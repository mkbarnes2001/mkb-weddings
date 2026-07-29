import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../../serverless/venue-d1";
import { syncLegacyAssets } from "../../../serverless/asset-library-d1";
import { resolveAdminWorkspaceId } from "../../../serverless/tenant-context";

type Env = {
  MKB_DB: D1Database;
  ADMIN_API_ENABLED?: string;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    const workspaceId = await resolveAdminWorkspaceId(context as any);
    const result = await syncLegacyAssets(context.env.MKB_DB, workspaceId);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
};
