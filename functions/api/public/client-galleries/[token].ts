import { getPublicClientGallery } from "../../../../serverless/client-gallery-d1";

type Env = { MKB_DB: D1Database };

function tokenOf(context: any) {
  return String(context.params.token || "").trim();
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const visitorKey = String(url.searchParams.get("visitor") || "").trim();
    const result = await getPublicClientGallery(context.env.MKB_DB, tokenOf(context), "", visitorKey);
    return Response.json(result.body, {
      status: result.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unable to load client gallery." }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const result = await getPublicClientGallery(
      context.env.MKB_DB,
      tokenOf(context),
      String(body?.pin || ""),
      String(body?.visitorKey || ""),
    );
    return Response.json(result.body, {
      status: result.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || "Unable to unlock client gallery." }, { status: 500 });
  }
};
