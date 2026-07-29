import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../serverless/venue-d1";
import {
  listLocationConfiguration,
  saveLocationConfiguration,
} from "../../serverless/location-d1";
import { resolveAdminWorkspaceId } from "../../serverless/tenant-context";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const workspaceId = await resolveAdminWorkspaceId(context as any);
    return Response.json({ ok: true, ...(await listLocationConfiguration(context.env.MKB_DB, workspaceId)) });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const body = await context.request.json();
    const workspaceId = await resolveAdminWorkspaceId(context as any);
    return Response.json({ ok: true, ...(await saveLocationConfiguration(context.env.MKB_DB, body, workspaceId)) });
  } catch (error) {
    return errorResponse(error);
  }
};
