import { adminApiRequestAllowed, errorResponse, notFoundResponse } from "../../serverless/venue-d1";
import { resolveAdminWorkspaceId, workspaceContentKey } from "../../serverless/tenant-context";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };
const SETTINGS_SLUG = "gallery-master-heroes";

function parse(value: unknown, fallback: any) {
  try { return JSON.parse(String(value || "")); } catch { return fallback; }
}

async function loadSettings(env: Env, workspaceId: string) {
  const settingsKey = workspaceContentKey(workspaceId, SETTINGS_SLUG);
  const row: any = await env.MKB_DB.prepare(`SELECT document_json FROM content_pages WHERE slug = ? AND workspace_id = ? LIMIT 1`).bind(settingsKey, workspaceId).first();
  return { venueHeroImageId: "", momentsHeroImageId: "", landingHeroImageId: "", ...parse(row?.document_json, {}) };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const workspaceId = await resolveAdminWorkspaceId(context);
    const settings = await loadSettings(context.env, workspaceId);
    async function resolve(id: string) {
      if (!id) return null;
      const image: any = await context.env.MKB_DB.prepare(
        `SELECT asset_key, image_id, thumb_src, full_src, alt FROM images WHERE workspace_id = ? AND (asset_key = ? OR image_id = ?) LIMIT 1`,
      ).bind(workspaceId, id, id).first();
      return image
        ? {
            assetKey: String(image.asset_key || ""),
            imageId: String(image.image_id || ""),
            thumbSrc: String(image.thumb_src || ""),
            fullSrc: String(image.full_src || ""),
            alt: String(image.alt || ""),
          }
        : null;
    }
    const [venue, moments, landing] = await Promise.all([
      resolve(settings.venueHeroImageId),
      resolve(settings.momentsHeroImageId),
      resolve(settings.landingHeroImageId),
    ]);
    return Response.json({ ok: true, settings, venue, moments, landing });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const workspaceId = await resolveAdminWorkspaceId(context);
    const settingsKey = workspaceContentKey(workspaceId, SETTINGS_SLUG);
    const body: any = await context.request.json();
    const current = await loadSettings(context.env, workspaceId);
    const next = {
      venueHeroImageId: body?.venueHeroImageId !== undefined ? String(body.venueHeroImageId || "").trim() : current.venueHeroImageId,
      momentsHeroImageId: body?.momentsHeroImageId !== undefined ? String(body.momentsHeroImageId || "").trim() : current.momentsHeroImageId,
      landingHeroImageId: body?.landingHeroImageId !== undefined ? String(body.landingHeroImageId || "").trim() : current.landingHeroImageId,
    };
    await context.env.MKB_DB.prepare(`
      INSERT INTO content_pages (slug, title, status, document_json, updated_at, workspace_id)
      VALUES (?, 'Gallery Master Heroes', 'active', ?, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(slug) DO UPDATE SET document_json = excluded.document_json, updated_at = CURRENT_TIMESTAMP
      WHERE content_pages.workspace_id = excluded.workspace_id
    `).bind(settingsKey, JSON.stringify(next), workspaceId).run();
    return Response.json({ ok: true, settings: next });
  } catch (error) { return errorResponse(error); }
};
