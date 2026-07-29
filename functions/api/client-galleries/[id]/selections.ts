import {
  getClientGalleryAdmin,
  mutateClientGallerySelections,
} from "../../../../serverless/client-gallery-d1";
import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../../serverless/venue-d1";
import { resolveAdminWorkspaceId } from "../../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const galleryId = String(context.params.id || "").trim();
    const body: any = await context.request.json().catch(() => ({}));
    const workspaceId = await resolveAdminWorkspaceId(context);
    await mutateClientGallerySelections(context.env.MKB_DB, galleryId, body || {}, workspaceId);
    const detail = await getClientGalleryAdmin(context.env.MKB_DB, galleryId, workspaceId);
    return Response.json({ ok: true, ...detail }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
