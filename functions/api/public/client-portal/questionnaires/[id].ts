import { getPublicQuestionnaire, savePublicQuestionnaire } from "../../../../../serverless/client-portal-d1";
import { resolveClientPortalWorkspaceId } from "../../../../../serverless/tenant-context";

type Env = {
  MKB_DB: D1Database;
  RESEND_API_KEY?: string;
  CLIENT_AUTH_FROM_EMAIL?: string;
  CLIENT_AUTH_FROM_NAME?: string;
  WEDPLANNED_AUTH_FROM_EMAIL?: string;
  WEDPLANNED_AUTH_FROM_NAME?: string;
};

function errorResponse(error: any) {
  return Response.json({ error: error?.message || "Unable to load questionnaire.", details: error?.details || [] }, {
    status: error?.statusCode || 500,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const workspaceId = await resolveClientPortalWorkspaceId(context.env.MKB_DB, context.request);
    const result = await getPublicQuestionnaire(context.env.MKB_DB, context.request, workspaceId, String(context.params.id || ""));
    return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: any) {
    return errorResponse(error);
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const workspaceId = await resolveClientPortalWorkspaceId(context.env.MKB_DB, context.request);
    const body: any = await context.request.json().catch(() => ({}));
    const questionnaire =
      await savePublicQuestionnaire(
        context.env.MKB_DB,
        context.request,
        workspaceId,
        String(
          context.params.id || "",
        ),
        body,
        context.env,
      );
    return Response.json({ ok: true, questionnaire }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: any) {
    return errorResponse(error);
  }
};
