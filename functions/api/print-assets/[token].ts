import { errorResponse } from "../../../serverless/venue-d1";
import { resolvePreparedPrintAsset } from "../../../serverless/prodigi-lab";

type Env = { MKB_DB: D1Database; MKB_PRIVATE_ASSETS: R2Bucket };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const row: any = await resolvePreparedPrintAsset(context.env.MKB_DB, String(context.params.token || ""));
    if (!row) return Response.json({ error: "Print asset is unavailable or has expired." }, { status: 404 });
    const object = await context.env.MKB_PRIVATE_ASSETS.get(String(row.storage_key || ""));
    if (!object) return Response.json({ error: "Print asset is temporarily unavailable." }, { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", "image/jpeg");
    headers.set("Cache-Control", "private, no-store, max-age=0");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Content-Disposition", `inline; filename="print-${String(row.order_item_id || "asset")}.jpg"`);
    if (object.size) headers.set("Content-Length", String(object.size));
    return new Response(object.body, { status: 200, headers });
  } catch (error) {
    return errorResponse(error);
  }
};
