import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../serverless/venue-d1";
import {
  getWeddingWorkspace,
  publishWeddingPreviewAssignments,
  saveWeddingPreviewSet,
} from "../../../serverless/wedding-workspace-d1";
import {
  requireWorkspaceEntitlement,
  resolveWorkspaceEntitlements,
} from "../../../serverless/platform-entitlements-d1";
import { resolveAdminWorkspaceId } from "../../../serverless/tenant-context";

type Env = {
  MKB_DB: D1Database;
  ADMIN_API_ENABLED?: string;
  ADMIN_HOSTNAME?: string;
};

function slug(context: any) {
  return String(context.params.slug || "").trim();
}

async function scopeWeddingWorkspacePayload(
  db: D1Database,
  workspaceId: string,
  workspace: any,
) {
  const resolved = await resolveWorkspaceEntitlements(
    db,
    workspaceId,
  );

  const contentToolsEnabled =
    resolved.byKey["content-tools"]?.enabled === true;

  const clientGalleriesEnabled =
    resolved.byKey["client-galleries"]?.enabled === true;

  return {
    ...workspace,
    venue: contentToolsEnabled
      ? workspace.venue
      : null,
    moments: contentToolsEnabled
      ? workspace.moments
      : [],
    galleries: contentToolsEnabled
      ? workspace.galleries
      : [],
    clientGalleries: clientGalleriesEnabled
      ? workspace.clientGalleries
      : [],
  };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const workspaceId = await resolveAdminWorkspaceId(context);
    const workspace = await getWeddingWorkspace(
      context.env.MKB_DB,
      slug(context),
      workspaceId,
    );
    const scopedWorkspace =
      await scopeWeddingWorkspacePayload(
        context.env.MKB_DB,
        workspaceId,
        workspace,
      );
    return Response.json(
      { ok: true, ...scopedWorkspace },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const workspaceId = await resolveAdminWorkspaceId(context);
    const body = await context.request.json().catch(() => ({} as any)) as any;
    const action = String(body?.action || "").trim();
    const weddingSlug = slug(context);

    if (action === "savePreviewSet") {
      const workspace = await saveWeddingPreviewSet(
        context.env.MKB_DB,
        weddingSlug,
        Array.isArray(body.assetIds) ? body.assetIds : [],
        workspaceId,
      );
      const scopedWorkspace =
        await scopeWeddingWorkspacePayload(
          context.env.MKB_DB,
          workspaceId,
          workspace,
        );
      return Response.json(
        { ok: true, ...scopedWorkspace },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (action === "publishAssignments") {
      await requireWorkspaceEntitlement(
        context.env.MKB_DB,
        workspaceId,
        "content-tools",
      );
      const result = await publishWeddingPreviewAssignments(context.env.MKB_DB, weddingSlug, body, workspaceId);
      return Response.json(result, { headers: { "Cache-Control": "no-store" } });
    }

    return Response.json({ error: "Unsupported wedding workspace action." }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
};
