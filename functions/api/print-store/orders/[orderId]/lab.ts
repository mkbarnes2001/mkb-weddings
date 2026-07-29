import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../../../serverless/venue-d1";
import { cancelProdigiSubmission, quoteProdigiOrder, refreshProdigiSubmission, submitProdigiOrder } from "../../../../../serverless/prodigi-lab";
import { resolveAdminWorkspaceId } from "../../../../../serverless/tenant-context";

type Env = {
  MKB_DB: D1Database;
  ADMIN_API_ENABLED?: string;
  PRODIGI_API_KEY?: string;
  PRODIGI_ENVIRONMENT?: string;
  PRODIGI_API_BASE?: string;
  PRODIGI_CALLBACK_TOKEN?: string;
  PRODIGI_ENABLED?: string;
  PRODIGI_LIVE_SUBMISSION_ENABLED?: string;
  PUBLIC_SITE_ORIGIN?: string;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const input = { ...body, orderId: String(context.params.orderId || "") };
    const action = String(body?.action || "").trim();
    const workspaceId = await resolveAdminWorkspaceId(context);
    if (action === "quote") return Response.json({ ok: true, ...(await quoteProdigiOrder(context.env.MKB_DB, context.env, input, workspaceId)) });
    if (action === "submit") return Response.json({ ok: true, ...(await submitProdigiOrder(context.env.MKB_DB, context.env, input, workspaceId)) });
    if (action === "refresh") return Response.json({ ok: true, ...(await refreshProdigiSubmission(context.env.MKB_DB, context.env, input.orderId, workspaceId)) });
    if (action === "cancel") return Response.json({ ok: true, ...(await cancelProdigiSubmission(context.env.MKB_DB, context.env, input.orderId, workspaceId)) });
    return Response.json({ error: "Unsupported lab action." }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
};
