import {
  resetClientGalleryBranding,
  updateClientGalleryBranding,
} from "../../../../serverless/client-gallery-d1";
import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../../serverless/venue-d1";
import { resolveAdminWorkspaceId } from "../../../../serverless/tenant-context";

type Env = {
  MKB_DB: D1Database;
  MKB_IMAGES?: R2Bucket;
  ADMIN_API_ENABLED?: string;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const galleryId = String(context.params.id || "").trim();
    const body: any = await context.request.json().catch(() => ({}));
    const workspaceId = await resolveAdminWorkspaceId(context);
    if (String(body?.action || "save") === "reset") {
      const result = await resetClientGalleryBranding(context.env.MKB_DB, galleryId, workspaceId);
      if (result.previousStorageKey && context.env.MKB_IMAGES) {
        context.waitUntil(context.env.MKB_IMAGES.delete(result.previousStorageKey).catch(() => {}));
      }
      return Response.json({ ok: true, branding: result.branding }, { headers: { "Cache-Control": "no-store" } });
    }
    const branding = await updateClientGalleryBranding(context.env.MKB_DB, galleryId, body || {}, workspaceId);
    return Response.json({ ok: true, branding }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
