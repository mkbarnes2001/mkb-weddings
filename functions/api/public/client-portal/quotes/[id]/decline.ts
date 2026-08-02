import { declineQuoteAsClient } from "../../../../../../serverless/crm-quotes-d1";
import { resolvePublicWorkspaceId } from "../../../../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database };

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const workspaceId = await resolvePublicWorkspaceId(context.env.MKB_DB, context.request);
    const body: any = await context.request.json().catch(() => ({}));
    return Response.json({ ok: true, result: await declineQuoteAsClient(context.env.MKB_DB, context.request, workspaceId, String(context.params.id || ""), body) });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unable to decline quote." }, { status: error?.statusCode || 500 });
  }
};
