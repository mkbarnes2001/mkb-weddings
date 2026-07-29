import {
  adminApiRequestAllowed,
  createAdminVenue,
  errorResponse,
  listAdminVenues,
  notFoundResponse,
} from "../../../serverless/venue-d1";

import { resolveAdminWorkspaceId } from "../../../serverless/tenant-context";

type Env = {
  MKB_DB: D1Database;
  ADMIN_API_ENABLED?: string; ADMIN_HOSTNAME?: string;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const workspaceId = await resolveAdminWorkspaceId(context);
    return Response.json({ ok: true, venues: await listAdminVenues(context.env.MKB_DB, workspaceId) });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const workspaceId = await resolveAdminWorkspaceId(context);
    const payload = await context.request.json<any>();
    const venue = await createAdminVenue(context.env.MKB_DB, payload?.venue, workspaceId);
    return Response.json({ ok: true, venue }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
