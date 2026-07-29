import { errorResponse } from "../../../../serverless/venue-d1";
import { getPublicWedding } from "../../../../serverless/wedding-d1";

import { resolvePublicWorkspaceId } from "../../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const workspaceId = await resolvePublicWorkspaceId(context.env.MKB_DB, context.request);
    const slug = String(context.params.slug || "");
    const wedding = await getPublicWedding(context.env.MKB_DB, slug, workspaceId);
    return wedding
      ? Response.json(wedding, {
          headers: { "Cache-Control": "no-store" },
        })
      : Response.json({ error: "Wedding story not found." }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
};
