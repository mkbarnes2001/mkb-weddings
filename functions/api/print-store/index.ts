import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../serverless/venue-d1";
import { getPrintStoreAdmin, mutatePrintStoreAdmin } from "../../../serverless/print-store-d1";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    return Response.json({ ok: true, ...(await getPrintStoreAdmin(context.env.MKB_DB)) });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const body: any = await context.request.json().catch(() => ({}));
    return Response.json({ ok: true, ...(await mutatePrintStoreAdmin(context.env.MKB_DB, body || {})) });
  } catch (error) {
    return errorResponse(error);
  }
};
