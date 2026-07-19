import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../serverless/venue-d1";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const result = await context.env.MKB_DB.prepare(`
      SELECT document_json, updated_at FROM moments ORDER BY sort_order ASC, name COLLATE NOCASE ASC
    `).all();
    const rows = result.results || [];
    const moments = rows.map((row: any) => {
      try { return JSON.parse(String(row.document_json || "{}")); }
      catch { return {}; }
    });
    const updatedAt = String(rows[0]?.updated_at || new Date().toISOString());
    return Response.json({ ok: true, document: { schemaVersion: 1, updatedAt, moments } });
  } catch (error) { return errorResponse(error); }
};
