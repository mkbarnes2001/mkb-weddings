import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../serverless/venue-d1";
import {
  getWeddingWorkspace,
  publishWeddingPreviewAssignments,
  saveWeddingPreviewSet,
} from "../../../serverless/wedding-workspace-d1";

type Env = {
  MKB_DB: D1Database;
  ADMIN_API_ENABLED?: string;
  ADMIN_HOSTNAME?: string;
};

function slug(context: any) {
  return String(context.params.slug || "").trim();
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const workspace = await getWeddingWorkspace(context.env.MKB_DB, slug(context));
    return Response.json({ ok: true, ...workspace }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const body = await context.request.json().catch(() => ({} as any)) as any;
    const action = String(body?.action || "").trim();
    const weddingSlug = slug(context);

    if (action === "savePreviewSet") {
      const workspace = await saveWeddingPreviewSet(
        context.env.MKB_DB,
        weddingSlug,
        Array.isArray(body.assetIds) ? body.assetIds : [],
      );
      return Response.json({ ok: true, ...workspace }, { headers: { "Cache-Control": "no-store" } });
    }

    if (action === "publishAssignments") {
      const result = await publishWeddingPreviewAssignments(context.env.MKB_DB, weddingSlug, body);
      return Response.json(result, { headers: { "Cache-Control": "no-store" } });
    }

    return Response.json({ error: "Unsupported wedding workspace action." }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
};
