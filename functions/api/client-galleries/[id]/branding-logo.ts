import { setClientGalleryBrandingLogo } from "../../../../serverless/client-gallery-d1";
import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../../serverless/venue-d1";

type Env = {
  MKB_DB: D1Database;
  MKB_IMAGES: R2Bucket;
  ADMIN_API_ENABLED?: string;
  IMAGE_PUBLIC_BASE_URL?: string;
};

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/jpeg") return "jpg";
  return "";
}

function publicBaseUrl(value: unknown) {
  return (String(value || "").trim() || "https://images.mkbweddings.co.uk").replace(/\/+$/, "");
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    if (!context.env.MKB_IMAGES) {
      return Response.json({ error: "Public image storage is not configured." }, { status: 503 });
    }
    const galleryId = String(context.params.id || "").trim();
    const form = await context.request.formData();
    const file = form.get("logo");
    if (!(file instanceof File)) {
      return Response.json({ error: "Choose a logo image to upload." }, { status: 400 });
    }
    const extension = extensionFor(file.type);
    if (!extension) {
      return Response.json({ error: "Logo must be PNG, JPEG or WebP." }, { status: 415 });
    }
    if (file.size <= 0 || file.size > MAX_LOGO_BYTES) {
      return Response.json({ error: "Logo must be smaller than 2 MB." }, { status: 413 });
    }

    const storageKey = `branding/client-galleries/${galleryId}/${crypto.randomUUID()}.${extension}`;
    await context.env.MKB_IMAGES.put(storageKey, file, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: { galleryId, kind: "client-gallery-logo" },
    });

    try {
      const result = await setClientGalleryBrandingLogo(context.env.MKB_DB, galleryId, {
        storageKey,
        url: `${publicBaseUrl(context.env.IMAGE_PUBLIC_BASE_URL)}/${storageKey}`,
      });
      if (result.previousStorageKey && result.previousStorageKey !== storageKey) {
        context.waitUntil(context.env.MKB_IMAGES.delete(result.previousStorageKey).catch(() => {}));
      }
      return Response.json({ ok: true, branding: result.branding }, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      await context.env.MKB_IMAGES.delete(storageKey).catch(() => {});
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
};
