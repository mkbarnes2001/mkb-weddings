import { requestPortalMagicLink } from "../../../../serverless/client-portal-d1";
import { resolveClientPortalWorkspaceId } from "../../../../serverless/tenant-context";

type Env = {
  MKB_DB: D1Database;
  RESEND_API_KEY?: string;
  CLIENT_AUTH_EMAIL_PROVIDER?: string;
  CLIENT_AUTH_FROM_EMAIL?: string;
  CLIENT_AUTH_FROM_NAME?: string;
  WEDPLANNED_AUTH_FROM_EMAIL?: string;
  WEDPLANNED_AUTH_FROM_NAME?: string;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const workspaceId = await resolveClientPortalWorkspaceId(context.env.MKB_DB, context.request);
    const result = await requestPortalMagicLink(context.env.MKB_DB, context.env, workspaceId, context.request.url, body?.email);
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unable to send secure sign-in link." }, { status: error?.statusCode || 500 });
  }
};
