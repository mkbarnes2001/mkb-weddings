import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../serverless/venue-d1";
import { getWorkspace, updateWorkspaceSettings } from "../../serverless/workspace-d1";
import { resolveAdminWorkspaceId } from "../../serverless/tenant-context";

type Env = {
  MKB_DB: D1Database;
  ADMIN_API_ENABLED?: string;
  ADMIN_HOSTNAME?: string;
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    const workspaceId = await resolveAdminWorkspaceId(context as any);

    if (context.request.method === "GET") {
      const workspace = await getWorkspace(context.env.MKB_DB, workspaceId);
      if (!workspace) return new Response("Workspace not found", { status: 404 });
      return Response.json({ ok: true, workspace });
    }

    if (context.request.method === "PUT") {
      const payload = await context.request.json();
      const incoming = payload?.workspace || payload;
      const workspace = await updateWorkspaceSettings(
        context.env.MKB_DB,
        { ...incoming, id: workspaceId },
      );
      return Response.json({ ok: true, workspace });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    return errorResponse(error);
  }
};
