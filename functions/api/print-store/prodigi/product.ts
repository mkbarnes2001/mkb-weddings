import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../../serverless/venue-d1";
import { getProdigiProduct, prodigiConfigured, prodigiMode, verifyProdigiVariantMapping } from "../../../../serverless/prodigi-lab";

type Env = {
  MKB_DB: D1Database;
  ADMIN_API_ENABLED?: string;
  PRODIGI_API_KEY?: string;
  PRODIGI_ENVIRONMENT?: string;
  PRODIGI_API_BASE?: string;
  PRODIGI_ENABLED?: string;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const url = new URL(context.request.url);
    const sku = url.searchParams.get("sku") || "";
    return Response.json({ ok: true, configured: prodigiConfigured(context.env), mode: prodigiMode(context.env), product: await getProdigiProduct(context.env, sku) });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const mapping = await verifyProdigiVariantMapping(context.env.MKB_DB, context.env, body || {});
    return Response.json({ ok: true, mapping });
  } catch (error) {
    return errorResponse(error);
  }
};
