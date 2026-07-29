import { errorResponse, listPublicVenues } from "../../../../serverless/venue-d1";

import { resolvePublicWorkspaceId } from "../../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const workspaceId = await resolvePublicWorkspaceId(context.env.MKB_DB, context.request);
    const index = await listPublicVenues(context.env.MKB_DB, workspaceId);
    return Response.json(index, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
    });
  } catch (error) {
    return errorResponse(error);
  }
};
