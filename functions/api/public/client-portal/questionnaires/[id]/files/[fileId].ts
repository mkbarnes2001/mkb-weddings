import { deleteQuestionnaireFile, getQuestionnaireFileForClient } from "../../../../../../../serverless/client-portal-d1";
import { resolvePublicWorkspaceId } from "../../../../../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database; MKB_PRIVATE_ASSETS: R2Bucket };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const workspaceId = await resolvePublicWorkspaceId(context.env.MKB_DB, context.request);
    const { object, row } = await getQuestionnaireFileForClient(context.env.MKB_DB, context.env.MKB_PRIVATE_ASSETS, context.request, workspaceId, String(context.params.id || ""), String(context.params.fileId || ""));
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

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const workspaceId = await resolvePublicWorkspaceId(context.env.MKB_DB, context.request);
    const result = await deleteQuestionnaireFile(context.env.MKB_DB, context.env.MKB_PRIVATE_ASSETS, context.request, workspaceId, String(context.params.id || ""), String(context.params.fileId || ""));
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unable to remove file." }, { status: error?.statusCode || 500 });
  }
};
