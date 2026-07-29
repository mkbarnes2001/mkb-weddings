import { getPublicLocation } from "../../../../serverless/location-d1";
import { resolvePublicWorkspaceId } from "../../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const slug = String(context.params.slug || "").trim();
    const workspaceId = await resolvePublicWorkspaceId(context.env.MKB_DB, context.request);
    const payload = await getPublicLocation(context.env.MKB_DB, slug, workspaceId);
    if (!payload) return Response.json({ error: "Location not found." }, { status: 404 });
    return Response.json(payload, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
    });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Unable to load location." },
      { status: 500 },
    );
  }
};
