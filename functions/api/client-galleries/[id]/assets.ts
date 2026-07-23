import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../../serverless/venue-d1";
import { getClientGalleryAdmin, mutateClientGalleryAssets } from "../../../../serverless/client-gallery-d1";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const id = String(context.params.id || "").trim();
    const body: any = await context.request.json();
    const result = await mutateClientGalleryAssets(context.env.MKB_DB, id, body || {});
    return Response.json({ ok: true, ...result, ...(await getClientGalleryAdmin(context.env.MKB_DB, id)) });
  } catch (error) {
    return errorResponse(error);
  }
};
