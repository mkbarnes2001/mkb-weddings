import { recordSupportRequest } from "../../serverless/platform-operations-d1";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function onRequest(context: any) {
  const auth = context.data?.professionalContext;
  if (!auth || auth.accessMode !== "support") return context.next();

  const request = context.request as Request;
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  if (!SAFE_METHODS.has(method) && auth.supportScope !== "manage") {
    const response = Response.json({ error: "This support session is read-only." }, {
      status: 403,
      headers: { "Cache-Control": "private, no-store" },
    });
    context.waitUntil?.(recordSupportRequest(context.env.MKB_DB, {
      grantId: auth.supportGrantId,
      workspaceId: auth.workspaceId,
      supportUserId: auth.userId,
      supportEmail: auth.email,
      eventType: "support.request.blocked",
      method,
      path: url.pathname,
      statusCode: 403,
      metadata: { scope: auth.supportScope },
    }));
    return response;
  }

  const response = await context.next();
  context.waitUntil?.(recordSupportRequest(context.env.MKB_DB, {
    grantId: auth.supportGrantId,
    workspaceId: auth.workspaceId,
    supportUserId: auth.userId,
    supportEmail: auth.email,
    eventType: SAFE_METHODS.has(method) ? "support.request.read" : "support.request.write",
    method,
    path: url.pathname,
    statusCode: response.status,
    metadata: { scope: auth.supportScope },
  }));
  return response;
}
