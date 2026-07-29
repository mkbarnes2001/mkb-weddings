import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../../serverless/venue-d1";
import { resolveAdminWorkspaceId, workspaceContentKey } from "../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

function parse(value: unknown, fallback: any) {
  try { return JSON.parse(String(value || "")); } catch { return fallback; }
}
function norm(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
const SETTINGS_SLUG = "creative-flash-gallery-settings";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const workspaceId = await resolveAdminWorkspaceId(context);
    const settingsKey = workspaceContentKey(workspaceId, SETTINGS_SLUG);
    const settingsRow: any = await context.env.MKB_DB.prepare(
      `SELECT document_json FROM content_pages WHERE slug = ? AND workspace_id = ? LIMIT 1`,
    ).bind(settingsKey, workspaceId).first();
    const settings = {
      heroImageId: "",
      imageOrderIds: [],
      hiddenImageIds: [],
      ...parse(settingsRow?.document_json, {}),
    };

    const result = await context.env.MKB_DB.prepare(`
      SELECT vi.venue_slug, vi.asset_key, vi.moments_json, vi.display_json, vi.included,
             vi.hidden AS venue_hidden, i.image_id, i.wedding_slug, i.filename,
             i.thumb_src, i.full_src, i.alt, i.caption, i.tags_json, i.ai_tags_json,
             v.name AS venue_name
      FROM venue_images vi
      JOIN images i ON i.asset_key = vi.asset_key AND i.workspace_id = vi.workspace_id
      LEFT JOIN venues v ON v.slug = vi.venue_slug AND v.workspace_id = vi.workspace_id
      WHERE vi.workspace_id = ?
      ORDER BY v.name COLLATE NOCASE ASC, vi.sort_order ASC, i.filename COLLATE NOCASE ASC
    `).bind(workspaceId).all();

    const seen = new Set<string>();
    const images = (result.results || []).filter((row: any) => {
      const display = parse(row.display_json, {});
      const tags = [...parse(row.tags_json, []), ...parse(row.ai_tags_json, [])].map(norm);
      if (!Boolean(display.creativeFlash) && !tags.includes("creative-flash")) return false;
      const key = String(row.asset_key || "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((row: any) => {
      const display = parse(row.display_json, {});
      const moments = parse(row.moments_json, []);
      return {
        assetKey: String(row.asset_key || ""), imageId: String(row.image_id || ""),
        weddingSlug: String(row.wedding_slug || ""), venueSlug: String(row.venue_slug || ""),
        venueName: String(row.venue_name || row.venue_slug || ""), filename: String(row.filename || ""),
        thumbSrc: String(row.thumb_src || ""), fullSrc: String(row.full_src || ""),
        alt: String(row.alt || ""), caption: String(row.caption || ""),
        globallyEnabled: Number(row.venue_hidden || 0) === 0,
        included: Boolean(Number(row.included || 0)),
        moments: Array.isArray(moments) ? moments.map((v: unknown) => String(v || "")).filter(Boolean) : [],
        display: {
          venue: Boolean(display.venue ?? row.included), moments: Boolean(display.moments),
          blog: Boolean(display.blog), homepage: Boolean(display.homepage), portfolio: Boolean(display.portfolio),
          creativeFlash: Boolean(display.creativeFlash) || [...parse(row.tags_json, []), ...parse(row.ai_tags_json, [])].map(norm).includes("creative-flash"),
        },
      };
    });
    return Response.json({ ok: true, settings, images });
  } catch (error) { return errorResponse(error); }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) return notFoundResponse();
  try {
    const workspaceId = await resolveAdminWorkspaceId(context);
    const settingsKey = workspaceContentKey(workspaceId, SETTINGS_SLUG);
    const body: any = await context.request.json();
    const rawSettings = body?.settings || {};
    const settings = {
      heroImageId: String(rawSettings.heroImageId || "").trim(),
      imageOrderIds: [...new Set((Array.isArray(rawSettings.imageOrderIds) ? rawSettings.imageOrderIds : []).map((v: any) => String(v || "").trim()).filter(Boolean))],
      hiddenImageIds: [...new Set((Array.isArray(rawSettings.hiddenImageIds) ? rawSettings.hiddenImageIds : []).map((v: any) => String(v || "").trim()).filter(Boolean))],
    };
    const updates = Array.isArray(body?.updates) ? body.updates : [];
    const statements: any[] = [context.env.MKB_DB.prepare(`
      INSERT INTO content_pages (slug, title, status, document_json, updated_at, workspace_id)
      VALUES (?, 'Creative Flash Gallery Settings', 'active', ?, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(slug) DO UPDATE SET document_json = excluded.document_json, updated_at = CURRENT_TIMESTAMP
      WHERE content_pages.workspace_id = excluded.workspace_id
    `).bind(settingsKey, JSON.stringify(settings), workspaceId)];

    for (const item of updates) {
      const key = String(item?.assetKey || "").trim();
      if (!key) continue;
      const rows = await context.env.MKB_DB.prepare(`SELECT venue_slug, included, moments_json, display_json FROM venue_images WHERE asset_key = ? AND workspace_id = ?`).bind(key, workspaceId).all();
      for (const row of rows.results || []) {
        const currentDisplay = parse((row as any).display_json, {});
        const nextMoments = Array.isArray(item?.moments) ? [...new Set(item.moments.map((v: any) => String(v || "").trim()).filter(Boolean))] : parse((row as any).moments_json, []);
        const nextIncluded = typeof item?.included === "boolean" ? item.included : Boolean(Number((row as any).included || 0));
        const nextDisplay = { ...currentDisplay, ...(item?.display || {}), venue: nextIncluded, moments: nextMoments.length > 0 };
        statements.push(context.env.MKB_DB.prepare(`UPDATE venue_images SET included = ?, moments_json = ?, display_json = ? WHERE venue_slug = ? AND asset_key = ? AND workspace_id = ?`).bind(
          nextIncluded ? 1 : 0, JSON.stringify(nextMoments), JSON.stringify(nextDisplay), String((row as any).venue_slug || ""), key, workspaceId,
        ));
      }
    }
    const CHUNK = 75;
    for (let i = 0; i < statements.length; i += CHUNK) await context.env.MKB_DB.batch(statements.slice(i, i + CHUNK));
    return Response.json({ ok: true, settings, updated: updates.length });
  } catch (error) { return errorResponse(error); }
};
