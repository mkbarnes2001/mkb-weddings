import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../../serverless/venue-d1";
import { getClientGalleryStoreAdmin, updateClientGalleryStoreAdmin } from "../../../../serverless/print-store-d1";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

function galleryId(context: any) {
  return String(context.params.id || "").trim();
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    return Response.json({ ok: true, ...(await getClientGalleryStoreAdmin(context.env.MKB_DB, galleryId(context))) });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const body: any = await context.request.json().catch(() => ({}));
    return Response.json({ ok: true, ...(await updateClientGalleryStoreAdmin(context.env.MKB_DB, galleryId(context), body || {})) });
  } catch (error) {
    return errorResponse(error);
  }
};
