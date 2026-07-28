import { clearProfessionalSessionCookie, revokeProfessionalSession } from "../../../serverless/platform-auth-d1";

type Env = { MKB_DB: D1Database };

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    await revokeProfessionalSession(context.env.MKB_DB, context.request);
    return Response.json({ ok: true }, {
      headers: {
        "Set-Cookie": clearProfessionalSessionCookie(context.request.url),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unable to sign out." }, { status: 500 });
  }
};
