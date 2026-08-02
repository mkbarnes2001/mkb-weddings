import { getPublicPortal } from "../../../../serverless/client-portal-d1";
import { resolvePublicWorkspaceId } from "../../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const workspaceId = await resolvePublicWorkspaceId(context.env.MKB_DB, context.request);
    return Response.json({ ok: true, portal: await getPublicPortal(context.env.MKB_DB, context.request, workspaceId) }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unable to load client portal." }, { status: error?.statusCode || 500 });
  }
};
