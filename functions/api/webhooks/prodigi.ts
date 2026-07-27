import { errorResponse } from "../../../serverless/venue-d1";
import { processProdigiCallback } from "../../../serverless/prodigi-lab";

type Env = {
  MKB_DB: D1Database;
  PRODIGI_API_KEY?: string;
  PRODIGI_ENVIRONMENT?: string;
  PRODIGI_API_BASE?: string;
  PRODIGI_CALLBACK_TOKEN?: string;
  PRODIGI_ENABLED?: string;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const event = await context.request.json().catch(() => ({}));
    const result = await processProdigiCallback(context.env.MKB_DB, context.env, url.searchParams.get("token") || "", event);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
};
