import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../serverless/venue-d1";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };
const SETTINGS_SLUG = "gallery-master-heroes";

function parse(value: unknown, fallback: any) {
  try { return JSON.parse(String(value || "")); } catch { return fallback; }
}

async function loadSettings(env: Env) {
  const row: any = await env.MKB_DB.prepare(`SELECT document_json FROM content_pages WHERE slug = ? LIMIT 1`).bind(SETTINGS_SLUG).first();
  return { venueHeroImageId: "", momentsHeroImageId: "", ...parse(row?.document_json, {}) };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try { return Response.json({ ok: true, settings: await loadSettings(context.env) }); }
  catch (error) { return errorResponse(error); }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const body: any = await context.request.json();
    const current = await loadSettings(context.env);
    const next = {
      venueHeroImageId: body?.venueHeroImageId !== undefined ? String(body.venueHeroImageId || "").trim() : current.venueHeroImageId,
      momentsHeroImageId: body?.momentsHeroImageId !== undefined ? String(body.momentsHeroImageId || "").trim() : current.momentsHeroImageId,
    };
    await context.env.MKB_DB.prepare(`
      INSERT INTO content_pages (slug, title, status, document_json, updated_at)
      VALUES (?, 'Gallery Master Heroes', 'active', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(slug) DO UPDATE SET document_json = excluded.document_json, updated_at = CURRENT_TIMESTAMP
    `).bind(SETTINGS_SLUG, JSON.stringify(next)).run();
    return Response.json({ ok: true, settings: next });
  } catch (error) { return errorResponse(error); }
};
