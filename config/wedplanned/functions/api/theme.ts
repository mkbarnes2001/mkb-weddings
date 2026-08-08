import {
  getPublishedWedPlannedPublicAppearance,
} from "../../../../serverless/platform-public-site-appearance-d1";

type Env = {
  MKB_DB: D1Database;
};

function publicHeaders() {
  return {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-Content-Type-Options": "nosniff",
  };
}

export const onRequestGet: PagesFunction<Env> = async (
  context,
) => {
  const appearance =
    await getPublishedWedPlannedPublicAppearance(
      context.env.MKB_DB,
    );

  return new Response(
    JSON.stringify({
      ok: true,
      siteKey: appearance.siteKey,
      publishedVersion:
        appearance.publishedVersion,
      publishedAt:
        appearance.publishedAt,
      theme:
        appearance.theme,
    }),
    {
      status: 200,
      headers: publicHeaders(),
    },
  );
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(
    null,
    {
      status: 204,
      headers: publicHeaders(),
    },
  );
