import { switchProfessionalWorkspace } from "../../../serverless/platform-auth-d1";

type Env = {
  MKB_DB: D1Database;
  WEDPLANNED_AUTH_ENFORCED?: string;
  WEDPLANNED_BOOTSTRAP_EMAIL?: string;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const auth = await switchProfessionalWorkspace(context.env.MKB_DB, context.request, context.env, String(body?.workspaceId || ""));
    return Response.json({ ok: true, auth }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unable to switch business." }, {
      status: error?.statusCode || 500,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
};
