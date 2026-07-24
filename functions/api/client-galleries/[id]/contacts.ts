import {
  getClientGalleryAdmin,
  removeClientGalleryContact,
  upsertClientGalleryContact,
} from "../../../../serverless/client-gallery-d1";
import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../../serverless/venue-d1";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const galleryId = String(context.params.id || "").trim();
    const body: any = await context.request.json().catch(() => ({}));
    const action = String(body?.action || "upsert").trim();
    if (action === "remove") {
      await removeClientGalleryContact(context.env.MKB_DB, galleryId, String(body?.email || ""));
    } else if (action === "upsert") {
      await upsertClientGalleryContact(context.env.MKB_DB, galleryId, body || {});
    } else {
      return Response.json({ error: "Unsupported contact action." }, { status: 400 });
    }
    const detail = await getClientGalleryAdmin(context.env.MKB_DB, galleryId);
    return Response.json({ ok: true, ...detail }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
