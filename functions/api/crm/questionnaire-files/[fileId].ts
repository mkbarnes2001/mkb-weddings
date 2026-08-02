import { requireProfessionalContext } from "../../../../serverless/platform-auth-d1";
import { getQuestionnaireFileForAdmin } from "../../../../serverless/client-portal-d1";

type Env = {
  MKB_DB: D1Database;
  MKB_PRIVATE_ASSETS: R2Bucket;
  WEDPLANNED_AUTH_ENFORCED?: string;
  WEDPLANNED_BOOTSTRAP_EMAIL?: string;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const actor = context.data?.professionalContext
      || await requireProfessionalContext(context.env.MKB_DB, context.request, context.env);
    const url = new URL(context.request.url);
    const instanceId = String(url.searchParams.get("instanceId") || "").trim();
    const fileId = String(context.params.fileId || "").trim();
    const { object, row } = await getQuestionnaireFileForAdmin(context.env.MKB_DB, context.env.MKB_PRIVATE_ASSETS, actor, instanceId, fileId);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", String(row.mime_type || "application/octet-stream"));
    headers.set("Content-Disposition", `attachment; filename="${String(row.original_filename || "attachment").replace(/"/g, "")}"`);
    headers.set("Cache-Control", "private, no-store");
    return new Response(object.body, { headers });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unable to download file." }, { status: error?.statusCode || 500 });
  }
};
