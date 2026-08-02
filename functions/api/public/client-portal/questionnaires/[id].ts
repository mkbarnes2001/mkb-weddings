import { getPublicQuestionnaire, savePublicQuestionnaire } from "../../../../../serverless/client-portal-d1";
import { resolvePublicWorkspaceId } from "../../../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database };

function errorResponse(error: any) {
  return Response.json({ error: error?.message || "Unable to load questionnaire.", details: error?.details || [] }, {
    status: error?.statusCode || 500,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const workspaceId = await resolvePublicWorkspaceId(context.env.MKB_DB, context.request);
    const result = await getPublicQuestionnaire(context.env.MKB_DB, context.request, workspaceId, String(context.params.id || ""));
    return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: any) {
    return errorResponse(error);
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const workspaceId = await resolvePublicWorkspaceId(context.env.MKB_DB, context.request);
    const body: any = await context.request.json().catch(() => ({}));
    const questionnaire = await savePublicQuestionnaire(context.env.MKB_DB, context.request, workspaceId, String(context.params.id || ""), body);
    return Response.json({ ok: true, questionnaire }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: any) {
    return errorResponse(error);
  }
};
