import {
  adminApiRequestAllowed,
  createAdminVenue,
  errorResponse,
  listAdminVenues,
  notFoundResponse,
} from "../../../serverless/venue-d1";

type Env = {
  MKB_DB: D1Database;
  ADMIN_API_ENABLED?: string; ADMIN_HOSTNAME?: string;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    return Response.json({ ok: true, venues: await listAdminVenues(context.env.MKB_DB) });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const payload = await context.request.json<any>();
    const venue = await createAdminVenue(context.env.MKB_DB, payload?.venue);
    return Response.json({ ok: true, venue }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
