import { requestClientMagicLink } from "../../../../serverless/client-auth-d1";
import { resolvePublicWorkspaceId } from "../../../../serverless/tenant-context";

type Env = {
  MKB_DB: D1Database;
  RESEND_API_KEY?: string;
  CLIENT_AUTH_EMAIL_PROVIDER?: string;
  CLIENT_AUTH_FROM_EMAIL?: string;
  CLIENT_AUTH_FROM_NAME?: string;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const result = await requestClientMagicLink(context.env.MKB_DB, context.env, {
      galleryToken: String(body?.galleryToken || "").trim(),
      email: String(body?.email || "").trim(),
      visitorKey: String(body?.visitorKey || "").trim(),
      origin: context.request.url,
      workspaceId: await resolvePublicWorkspaceId(context.env.MKB_DB, context.request),
    });
    return Response.json(result.body, {
      status: result.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Unable to send secure sign-in link." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
};
