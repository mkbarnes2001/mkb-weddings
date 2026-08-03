import { acceptQuoteAsClient } from "../../../../../../serverless/crm-quotes-d1";
import { resolveClientPortalWorkspaceId } from "../../../../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database };

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const workspaceId = await resolveClientPortalWorkspaceId(context.env.MKB_DB, context.request);
    const body: any = await context.request.json().catch(() => ({}));
    return Response.json({ ok: true, conversion: await acceptQuoteAsClient(context.env.MKB_DB, context.request, workspaceId, String(context.params.id || ""), body) });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unable to accept quote.", details: error?.details || [] }, { status: error?.statusCode || 500 });
  }
};
