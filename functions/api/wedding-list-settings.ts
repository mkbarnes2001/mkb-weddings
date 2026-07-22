import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../serverless/venue-d1";
import { saveWeddingListSettings } from "../../serverless/wedding-d1";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string; ADMIN_HOSTNAME?: string };

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const payload = await context.request.json();
    return Response.json({ ok: true, weddings: await saveWeddingListSettings(context.env.MKB_DB, payload?.items) });
  } catch (error) {
    return errorResponse(error);
  }
};
