import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../../serverless/venue-d1";
import {
  createR2Upload,
  registerUploadedImage,
} from "../../../serverless/image-d1";
import { resolveAdminWorkspaceId } from "../../../serverless/tenant-context";

type Env = {
  MKB_DB: D1Database;
  MKB_IMAGES: R2Bucket;
  ADMIN_API_ENABLED?: string;
  ADMIN_HOSTNAME?: string;
  IMAGE_PUBLIC_BASE_URL?: string;
};

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    const workspaceId = await resolveAdminWorkspaceId(context);
    const url = new URL(context.request.url);
    const venueSlug = url.searchParams.get("venueSlug")?.trim() || "";
    const weddingSlug = url.searchParams.get("weddingSlug")?.trim() || "";

    const form = await context.request.formData();
    const fullFile = form.get("full");
    const thumbFile = form.get("thumb");

    if (!(fullFile instanceof File) || !(thumbFile instanceof File)) {
      return Response.json(
        { error: "Processed full image and thumbnail are required." },
        { status: 400 },
      );
    }

    const originalFilename = text(form.get("originalFilename")) || fullFile.name;
    const originalMimeType = text(form.get("originalMimeType")) || "application/octet-stream";
    const width = Number(text(form.get("width")) || 0);
    const height = Number(text(form.get("height")) || 0);

    const uploaded = await createR2Upload(
      context.env.MKB_IMAGES,
      context.env,
      {
        venueSlug,
        weddingSlug,
        originalFilename,
        originalMimeType,
        fullFile,
        thumbFile,
        width,
        height,
      },
      workspaceId,
    );

    try {
      const registered = await registerUploadedImage(context.env.MKB_DB, {
        ...uploaded,
        originalFilename,
        originalMimeType,
      }, workspaceId);

      return Response.json({ ok: true, ...registered }, { status: 201 });
    } catch (error) {
      await Promise.allSettled([
        context.env.MKB_IMAGES.delete(uploaded.fullKey),
        context.env.MKB_IMAGES.delete(uploaded.thumbKey),
      ]);
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
};
