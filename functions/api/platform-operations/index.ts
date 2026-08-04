import { requireProfessionalContext, type ProfessionalContext } from "../../../serverless/platform-auth-d1";
import {
  cancelWorkspaceDeletion,
  getPlatformOperations,
  grantSupportAccess,
  requestWorkspaceDeletion,
  revokeSupportAccess,
} from "../../../serverless/platform-operations-d1";

type Env = {
  MKB_DB: D1Database;
  WEDPLANNED_AUTH_ENFORCED?: string;
  WEDPLANNED_BOOTSTRAP_EMAIL?: string;
};

function responseError(error: any) {
  return Response.json({ error: error?.message || "Unable to complete the platform operation.", details: error?.details || [] }, {
    status: error?.statusCode || 500,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function actorForWorkspace(actor: ProfessionalContext, workspaceIdInput: unknown) {
  const workspaceId = String(workspaceIdInput || "").trim();
  if (!workspaceId || workspaceId === actor.workspaceId) return actor;
  if (actor.platformRole !== "platform_admin" || !actor.permissions.includes("platform:admin") || actor.accessMode === "support") {
    const error = new Error("Only a WedPlanned platform administrator can select another business workspace.") as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }
  return { ...actor, workspaceId, businessName: "" };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const actor = context.data?.professionalContext
      || await requireProfessionalContext(context.env.MKB_DB, context.request, context.env);
    const requestedWorkspaceId = new URL(context.request.url).searchParams.get("workspaceId");
    const scopedActor = actorForWorkspace(actor, requestedWorkspaceId);
    return Response.json(await getPlatformOperations(context.env.MKB_DB, scopedActor), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error: any) {
    return responseError(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const actor = context.data?.professionalContext
      || await requireProfessionalContext(context.env.MKB_DB, context.request, context.env);
    const body: any = await context.request.json().catch(() => ({}));
    const scopedActor = actorForWorkspace(actor, body?.workspaceId);
    const action = String(body?.action || "");
    let payload;
    if (action === "grant-support") payload = await grantSupportAccess(context.env.MKB_DB, scopedActor, body);
    else if (action === "revoke-support") payload = await revokeSupportAccess(context.env.MKB_DB, scopedActor, body?.grantId);
    else if (action === "request-deletion") payload = await requestWorkspaceDeletion(context.env.MKB_DB, scopedActor, body);
    else if (action === "cancel-deletion") payload = await cancelWorkspaceDeletion(context.env.MKB_DB, scopedActor, body?.requestId);
    else return Response.json({ error: "Unsupported platform operation." }, { status: 400 });
    return Response.json({ ok: true, operations: payload }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error: any) {
    return responseError(error);
  }
};
