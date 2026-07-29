import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../serverless/venue-d1";
import { createClientGallery, listClientGalleries } from "../../../serverless/client-gallery-d1";
import { resolveAdminWorkspaceId } from "../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    return Response.json({ ok: true, ...(await listClientGalleries(context.env.MKB_DB, await resolveAdminWorkspaceId(context))) });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const body: any = await context.request.json();
    const workspaceId = await resolveAdminWorkspaceId(context);
    const gallery = await createClientGallery(context.env.MKB_DB, body?.gallery || body || {}, workspaceId);
    return Response.json({ ok: true, gallery }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
