import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../serverless/venue-d1";
import { archiveClientGallery, getClientGalleryAdmin, updateClientGallery } from "../../../serverless/client-gallery-d1";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

function idOf(context: any) {
  return String(context.params.id || "").trim();
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    return Response.json({ ok: true, ...(await getClientGalleryAdmin(context.env.MKB_DB, idOf(context))) });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const body: any = await context.request.json();
    const gallery = await updateClientGallery(context.env.MKB_DB, idOf(context), body?.gallery || body || {});
    return Response.json({ ok: true, gallery });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const gallery = await archiveClientGallery(context.env.MKB_DB, idOf(context));
    return Response.json({ ok: true, gallery });
  } catch (error) {
    return errorResponse(error);
  }
};
