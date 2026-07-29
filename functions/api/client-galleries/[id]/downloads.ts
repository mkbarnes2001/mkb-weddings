import {
  recordClientGalleryDownload,
  resolveAdminClientGalleryBulkDownload,
} from "../../../../serverless/client-gallery-d1";
import { createStoredZipStream } from "../../../../serverless/streaming-zip";
import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../../serverless/venue-d1";
import { resolveAdminWorkspaceId } from "../../../../serverless/tenant-context";

type Env = {
  MKB_DB: D1Database;
  MKB_PRIVATE_ASSETS: R2Bucket;
  ADMIN_API_ENABLED?: string;
};

const ZIP32_SAFE_LIMIT = 3_900_000_000;

function safeZipName(value: string) {
  const name = String(value || "client-gallery-download")
    .replace(/[^a-zA-Z0-9 _-]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
  return `${name || "client-gallery-download"}.zip`;
}

function contentDisposition(filename: string) {
  const safe = filename.replace(/["\\]/g, "_");
  return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    if (!context.env.MKB_PRIVATE_ASSETS) {
      return Response.json({ error: "Private delivery storage is not configured." }, { status: 503 });
    }
    const url = new URL(context.request.url);
    const galleryId = String(context.params.id || "").trim();
    const source = url.searchParams.get("source") || "favourites";
    const group = url.searchParams.get("group") || "combined";
    const selectionId = url.searchParams.get("selectionId") || "";
    const workspaceId = await resolveAdminWorkspaceId(context);
    const result = await resolveAdminClientGalleryBulkDownload(context.env.MKB_DB, galleryId, { source, group, selectionId }, workspaceId);
    if (!result.assets.length) {
      return Response.json({ error: "No full-resolution originals are available for this download." }, { status: 404 });
    }
    const knownBytes = result.assets.reduce((sum, asset) => sum + Math.max(0, Number(asset.fileSize) || 0), 0);
    if (knownBytes > ZIP32_SAFE_LIMIT) {
      return Response.json({
        error: "This download is too large for one ZIP. Download the favourites by person or use individual downloads.",
      }, { status: 413 });
    }

    const stream = createStoredZipStream(
      context.env.MKB_PRIVATE_ASSETS,
      result.assets.map((asset) => ({ filename: asset.filename, storageKey: asset.storageKey })),
    );

    const userAgent = context.request.headers.get("user-agent") || "";
    context.waitUntil(Promise.all(result.assets.map((asset) => recordClientGalleryDownload(context.env.MKB_DB, {
      workspaceId: result.workspaceId,
      galleryId: result.galleryId,
      assetId: asset.assetId,
      visitorKey: "admin",
      bytesSent: asset.fileSize,
      userAgent,
      delivery: "zip",
    }).catch(() => {}))).then(() => undefined));

    const filename = safeZipName(result.label);
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": contentDisposition(filename),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};
