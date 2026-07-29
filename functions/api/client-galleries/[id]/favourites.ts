import { listAdminClientGalleryFavourites } from "../../../../serverless/client-gallery-d1";
import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../../serverless/venue-d1";
import { resolveAdminWorkspaceId } from "../../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const galleryId = String(context.params.id || "").trim();
    return Response.json({ ok: true, ...(await listAdminClientGalleryFavourites(context.env.MKB_DB, galleryId, await resolveAdminWorkspaceId(context))) });
  } catch (error) {
    return errorResponse(error);
  }
};
