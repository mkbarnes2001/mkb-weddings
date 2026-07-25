import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../../serverless/venue-d1";
import { getClientGalleryAdmin, mutateClientGalleryAlbums } from "../../../../serverless/client-gallery-d1";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const id = String(context.params.id || "").trim();
    const body: any = await context.request.json();
    await mutateClientGalleryAlbums(context.env.MKB_DB, id, body || {});
    return Response.json({ ok: true, ...(await getClientGalleryAdmin(context.env.MKB_DB, id)) });
  } catch (error) {
    return errorResponse(error);
  }
};
