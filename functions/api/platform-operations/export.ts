import { requireProfessionalContext, type ProfessionalContext } from "../../../serverless/platform-auth-d1";
import { createWorkspaceExport } from "../../../serverless/platform-operations-d1";

type Env = {
  MKB_DB: D1Database;
  WEDPLANNED_AUTH_ENFORCED?: string;
  WEDPLANNED_BOOTSTRAP_EMAIL?: string;
};

function actorForWorkspace(actor: ProfessionalContext, workspaceIdInput: unknown) {
  const workspaceId = String(workspaceIdInput || "").trim();
  if (!workspaceId || workspaceId === actor.workspaceId) return actor;
  if (actor.platformRole !== "platform_admin" || !actor.permissions.includes("platform:admin") || actor.accessMode === "support") {
    const error = new Error("Only a WedPlanned platform administrator can export another business workspace.") as Error & { statusCode?: number };
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
    const result = await createWorkspaceExport(context.env.MKB_DB, actorForWorkspace(actor, requestedWorkspaceId));
    return new Response(JSON.stringify(result.payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.fileName.replace(/\"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unable to create the workspace export.", details: error?.details || [] }, {
      status: error?.statusCode || 500,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
};
