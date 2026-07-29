import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
  saveVenueListSettings,
} from "../../serverless/venue-d1";

import { resolveAdminWorkspaceId } from "../../serverless/tenant-context";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string; ADMIN_HOSTNAME?: string };

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const workspaceId = await resolveAdminWorkspaceId(context);
    const payload = await context.request.json();
    return Response.json({ ok: true, venues: await saveVenueListSettings(context.env.MKB_DB, payload?.items, workspaceId) });
  } catch (error) {
    return errorResponse(error);
  }
};
