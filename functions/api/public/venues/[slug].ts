import { errorResponse, getPublicVenue } from "../../../../serverless/venue-d1";

import { resolvePublicWorkspaceId } from "../../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const workspaceId = await resolvePublicWorkspaceId(context.env.MKB_DB, context.request);
    const slug = String(context.params.slug || "");
    const venue = await getPublicVenue(context.env.MKB_DB, slug, workspaceId);
    if (!venue) return Response.json({ error: "Venue not found." }, { status: 404 });
    return Response.json(venue, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
    });
  } catch (error) {
    return errorResponse(error);
  }
};
