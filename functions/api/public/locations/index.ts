import { listPublicLocations } from "../../../../serverless/location-d1";

type Env = { MKB_DB: D1Database };

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const payload = await listPublicLocations(env.MKB_DB);
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
