import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../serverless/venue-d1";
import { listAdminWeddings } from "../../../serverless/wedding-d1";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try { return Response.json({ ok: true, weddings: await listAdminWeddings(context.env.MKB_DB) }); }
  catch (error) { return errorResponse(error); }
};
