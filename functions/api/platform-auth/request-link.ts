import { requestProfessionalLoginLink } from "../../../serverless/platform-auth-d1";

type Env = {
  MKB_DB: D1Database;
  RESEND_API_KEY?: string;
  WEDPLANNED_AUTH_EMAIL_PROVIDER?: string;
  WEDPLANNED_AUTH_FROM_EMAIL?: string;
  WEDPLANNED_AUTH_FROM_NAME?: string;
  WEDPLANNED_AUTH_DEBUG_LINKS?: string;
  WEDPLANNED_ADMIN_ORIGIN?: string;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const result = await requestProfessionalLoginLink(context.env.MKB_DB, context.env, context.request, {
      email: String(body?.email || "").trim(),
      returnPath: String(body?.returnPath || "/admin").trim(),
    });
    return Response.json({ ok: true, ...result }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unable to request a secure sign-in link." }, {
      status: error?.statusCode || 500,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
};
