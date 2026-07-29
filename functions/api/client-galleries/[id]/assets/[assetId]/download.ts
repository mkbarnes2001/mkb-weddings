import {
  recordClientGalleryDownload,
  resolveAdminClientGalleryOriginalDownload,
} from "../../../../../../serverless/client-gallery-d1";
import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../../../../serverless/venue-d1";
import { resolveAdminWorkspaceId } from "../../../../../../serverless/tenant-context";

type Env = {
  MKB_DB: D1Database;
  MKB_PRIVATE_ASSETS: R2Bucket;
  ADMIN_API_ENABLED?: string;
};

function contentDisposition(filename: string) {
  const safe = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_") || "photograph.jpg";
  return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    if (!context.env.MKB_PRIVATE_ASSETS) {
      return Response.json({ error: "Private delivery storage is not configured." }, { status: 503 });
    }
    const galleryId = String(context.params.id || "").trim();
    const assetId = String(context.params.assetId || "").trim();
    const result = await resolveAdminClientGalleryOriginalDownload(
      context.env.MKB_DB, galleryId, assetId, await resolveAdminWorkspaceId(context),
    );
    if (!result) return Response.json({ error: "Full-resolution original is not available for this image." }, { status: 404 });

    const object = await context.env.MKB_PRIVATE_ASSETS.get(result.storageKey);
    if (!object) return Response.json({ error: "Original file is temporarily unavailable." }, { status: 404 });

    context.waitUntil(recordClientGalleryDownload(context.env.MKB_DB, {
      workspaceId: result.workspaceId,
      galleryId: result.galleryId,
      assetId: result.assetId,
      visitorKey: "admin",
      bytesSent: object.size || result.fileSize,
      userAgent: context.request.headers.get("user-agent") || "",
      delivery: "original",
    }).catch(() => {}));

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", result.mimeType || headers.get("Content-Type") || "image/jpeg");
    headers.set("Content-Disposition", contentDisposition(result.filename));
    headers.set("Cache-Control", "private, no-store, max-age=0");
    headers.set("X-Content-Type-Options", "nosniff");
    if (object.size) headers.set("Content-Length", String(object.size));
    return new Response(object.body, { status: 200, headers });
  } catch (error) {
    return errorResponse(error);
  }
};
