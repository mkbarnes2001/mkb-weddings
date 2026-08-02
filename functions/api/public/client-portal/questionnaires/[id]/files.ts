import { uploadQuestionnaireFile } from "../../../../../../serverless/client-portal-d1";
import { resolvePublicWorkspaceId } from "../../../../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database; MKB_PRIVATE_ASSETS: R2Bucket };

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const workspaceId = await resolvePublicWorkspaceId(context.env.MKB_DB, context.request);
    const form = await context.request.formData();
    const file = form.get("file");
    const fieldKey = String(form.get("fieldKey") || "").trim();
    if (!(file instanceof File)) return Response.json({ error: "Choose a file to upload." }, { status: 400 });
    const uploaded = await uploadQuestionnaireFile(context.env.MKB_DB, context.env.MKB_PRIVATE_ASSETS, context.request, workspaceId, String(context.params.id || ""), fieldKey, file);
    return Response.json({ ok: true, file: uploaded }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unable to upload file." }, { status: error?.statusCode || 500 });
  }
};
