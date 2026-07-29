import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../../../../serverless/venue-d1";
import { resolveAdminWorkspaceId } from "../../../../../../serverless/tenant-context";
import { uploadPrivateOriginalDerivatives } from "../../../../../../serverless/private-original-d1";

type Env = {
  MKB_DB: D1Database;
  MKB_IMAGES: R2Bucket;
  IMAGE_PUBLIC_BASE_URL?: string;
  ADMIN_API_ENABLED?: string;
};

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const form = await context.request.formData();
    const webFile = form.get("web");
    const thumbFile = form.get("thumb");
    if (!(webFile instanceof File) || !(thumbFile instanceof File)) {
      return Response.json({ error: "Web and thumbnail derivatives are required." }, { status: 400 });
    }
    const session = await uploadPrivateOriginalDerivatives(
      context.env.MKB_DB,
      context.env.MKB_IMAGES,
      context.env,
      String(context.params.id || "").trim(),
      String(context.params.sessionId || "").trim(),
      {
        webFile,
        thumbFile,
        width: Number(text(form.get("width")) || 0),
        height: Number(text(form.get("height")) || 0),
      },
      await resolveAdminWorkspaceId(context),
    );
    return Response.json({ ok: true, session }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
