import { getAuthenticatedClientIdentity } from "../../../../../../../serverless/client-auth-d1";
import {
  authoriseClientGalleryOriginalDownload,
  recordClientGalleryDownload,
} from "../../../../../../../serverless/client-gallery-d1";
import { resolvePublicWorkspaceId } from "../../../../../../../serverless/tenant-context";

type Env = {
  MKB_DB: D1Database;
  MKB_PRIVATE_ASSETS: R2Bucket;
};

function contentDisposition(filename: string) {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_") || "photograph.jpg";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    if (!context.env.MKB_PRIVATE_ASSETS) {
      return Response.json({ error: "Private delivery storage is not configured." }, { status: 503 });
    }
    const body: any = await context.request.json().catch(() => ({}));
    const authenticatedIdentity = await getAuthenticatedClientIdentity(context.env.MKB_DB, context.request);
    const result = await authoriseClientGalleryOriginalDownload(
      context.env.MKB_DB,
      String(context.params.token || "").trim(),
      {
        ...(body || {}),
        assetId: String(context.params.assetId || "").trim(),
      },
      authenticatedIdentity,
      await resolvePublicWorkspaceId(context.env.MKB_DB, context.request),
    );
    if (result.status !== 200) {
      return Response.json({ error: result.error }, { status: result.status, headers: { "Cache-Control": "private, no-store" } });
    }

    const object = await context.env.MKB_PRIVATE_ASSETS.get(result.storageKey);
    if (!object) {
      return Response.json({ error: "Original file is temporarily unavailable." }, { status: 404 });
    }

    context.waitUntil(recordClientGalleryDownload(context.env.MKB_DB, {
      workspaceId: result.workspaceId,
      galleryId: result.galleryId,
      assetId: result.assetId,
      visitorKey: result.visitorKey,
      bytesSent: object.size || result.fileSize,
      userAgent: context.request.headers.get("user-agent") || "",
    }).catch(() => {}));

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", result.mimeType || headers.get("Content-Type") || "image/jpeg");
    headers.set("Content-Disposition", contentDisposition(result.filename));
    headers.set("Cache-Control", "private, no-store, max-age=0");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "no-referrer");
    if (object.size) headers.set("Content-Length", String(object.size));
    if (object.httpEtag) headers.set("ETag", object.httpEtag);
    return new Response(object.body, { status: 200, headers });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Unable to download original." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
};
