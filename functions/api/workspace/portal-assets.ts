import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../../serverless/venue-d1";
import { resolveAdminWorkspaceId } from "../../../serverless/tenant-context";

type Env = {
  MKB_IMAGES: R2Bucket;
  ADMIN_API_ENABLED?: string;
  ADMIN_HOSTNAME?: string;
  IMAGE_PUBLIC_BASE_URL?: string;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function safeName(value: string) {
  return text(value)
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "portal-image";
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    if (!context.env.MKB_IMAGES) throw Object.assign(new Error("R2 image binding is not configured."), { statusCode: 500 });
    const workspaceId = await resolveAdminWorkspaceId(context as any);
    const form = await context.request.formData();
    const file = form.get("file");
    const kind = text(form.get("kind"));

    if (!(file instanceof File)) {
      return Response.json({ error: "Choose an image to upload." }, { status: 400 });
    }
    if (!new Set(["logo", "banner"]).has(kind)) {
      return Response.json({ error: "Portal image type must be logo or banner." }, { status: 400 });
    }
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) {
      return Response.json({ error: "Only JPEG, PNG and WebP images are supported." }, { status: 415 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return Response.json({ error: "Portal images must be 8 MB or smaller." }, { status: 413 });
    }

    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filename = `${safeName(file.name)}-${crypto.randomUUID().slice(-8)}.${extension}`;
    const storageKey = `workspaces/${workspaceId}/client-portal/${kind}/${filename}`;
    const publicBaseUrl = (text(context.env.IMAGE_PUBLIC_BASE_URL) || "https://images.mkbweddings.co.uk").replace(/\/+$/, "");

    await context.env.MKB_IMAGES.put(storageKey, file, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: {
        workspaceId,
        purpose: `client-portal-${kind}`,
        originalFilename: file.name,
      },
    });

    return Response.json({
      ok: true,
      asset: {
        kind,
        storageKey,
        url: `${publicBaseUrl}/${storageKey}`,
        filename: file.name,
      },
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
