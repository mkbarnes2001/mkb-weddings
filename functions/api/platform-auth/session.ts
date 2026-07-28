import { getProfessionalContext } from "../../../serverless/platform-auth-d1";

type Env = {
  MKB_DB: D1Database;
  WEDPLANNED_AUTH_ENFORCED?: string;
  WEDPLANNED_BOOTSTRAP_EMAIL?: string;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const auth = await getProfessionalContext(context.env.MKB_DB, context.request, context.env);
    return Response.json({ ok: true, auth }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unable to resolve professional session." }, {
      status: error?.statusCode || 500,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
};
