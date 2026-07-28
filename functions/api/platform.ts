import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../serverless/venue-d1";
import {
  archiveBusinessServiceArea,
  getPlatformFoundation,
  inviteBusinessMember,
  saveBusinessCategories,
  saveBusinessServiceArea,
  updateBusinessMember,
  updateBusinessProfile,
} from "../../serverless/platform-foundation-d1";
import { getDefaultWorkspaceId } from "../../serverless/workspace-d1";

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
    const workspaceId = await getDefaultWorkspaceId(context.env.MKB_DB);

    if (context.request.method === "GET") {
      const platform = await getPlatformFoundation(context.env.MKB_DB, workspaceId);
      return Response.json({ ok: true, platform }, { headers: { "Cache-Control": "no-store" } });
    }

    if (context.request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await context.request.json().catch(() => ({} as any)) as any;
    const action = String(body?.action || "").trim();
    let platform;

    if (action === "saveBusiness") platform = await updateBusinessProfile(context.env.MKB_DB, { ...(body.business || body), workspaceId });
    else if (action === "saveCategories") platform = await saveBusinessCategories(context.env.MKB_DB, { ...body, workspaceId });
    else if (action === "saveServiceArea") platform = await saveBusinessServiceArea(context.env.MKB_DB, { ...(body.serviceArea || body), workspaceId });
    else if (action === "archiveServiceArea") platform = await archiveBusinessServiceArea(context.env.MKB_DB, { ...body, workspaceId });
    else if (action === "inviteMember") platform = await inviteBusinessMember(context.env.MKB_DB, { ...(body.member || body), workspaceId });
    else if (action === "updateMember") platform = await updateBusinessMember(context.env.MKB_DB, { ...(body.member || body), workspaceId });
    else return Response.json({ error: "Unsupported platform action." }, { status: 400 });

    return Response.json({ ok: true, platform }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};
