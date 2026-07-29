import { listPublicLocations } from "../../../../serverless/location-d1";
import { resolvePublicWorkspaceId } from "../../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const workspaceId = await resolvePublicWorkspaceId(context.env.MKB_DB, context.request);
    const payload = await listPublicLocations(context.env.MKB_DB, workspaceId);
    return Response.json(payload, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
    });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Unable to load locations." },
      { status: 500 },
    );
  }
};
