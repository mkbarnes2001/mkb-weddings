import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../../../../../../serverless/venue-d1";
import { savePreparedPrintAsset } from "../../../../../../../serverless/prodigi-lab";

type Env = {
  MKB_DB: D1Database;
  MKB_PRIVATE_ASSETS: R2Bucket;
  ADMIN_API_ENABLED?: string;
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const contentType = String(context.request.headers.get("content-type") || "").toLowerCase();
    if (!contentType.startsWith("image/jpeg")) return Response.json({ error: "Prepared print file must be a JPEG." }, { status: 415 });
    const body = await context.request.arrayBuffer();
    const result = await savePreparedPrintAsset(
      context.env.MKB_DB,
      context.env.MKB_PRIVATE_ASSETS,
      String(context.params.orderId || ""),
      String(context.params.itemId || ""),
      body,
      {
        sourceWidthPx: context.request.headers.get("x-source-width-px"),
        sourceHeightPx: context.request.headers.get("x-source-height-px"),
      },
    );
    return Response.json({ ok: true, printAsset: result });
  } catch (error) {
    return errorResponse(error);
  }
};
