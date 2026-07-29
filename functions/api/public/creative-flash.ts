import { resolvePublicWorkspaceId, workspaceContentKey } from "../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database };
function parse(value: unknown, fallback: any) { try { return JSON.parse(String(value || '')); } catch { return fallback; } }
function norm(value: unknown) { return String(value || '').trim().toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
const SETTINGS_SLUG = 'creative-flash-gallery-settings';
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const workspaceId = await resolvePublicWorkspaceId(env.MKB_DB, request);
    const settingsKey = workspaceContentKey(workspaceId, SETTINGS_SLUG);
    const settingsRow: any = await env.MKB_DB.prepare(`SELECT document_json FROM content_pages WHERE slug = ? AND workspace_id = ? LIMIT 1`).bind(settingsKey, workspaceId).first();
    const settings = { heroImageId: '', imageOrderIds: [], hiddenImageIds: [], ...parse(settingsRow?.document_json, {}) };
    const hidden = new Set((Array.isArray(settings.hiddenImageIds) ? settings.hiddenImageIds : []).map(String));
    const order = Array.isArray(settings.imageOrderIds) ? settings.imageOrderIds.map(String) : [];
    const result = await env.MKB_DB.prepare(`SELECT vi.asset_key, vi.sort_order, vi.display_json, vi.included, vi.hidden, i.image_id, i.filename, i.thumb_src, i.full_src, i.alt, i.caption, i.tags_json, i.ai_tags_json FROM venue_images vi JOIN images i ON i.asset_key = vi.asset_key AND i.workspace_id = vi.workspace_id WHERE vi.workspace_id = ? ORDER BY vi.sort_order ASC`).bind(workspaceId).all();
    const seen = new Set<string>();
    const raw = (result.results || []).filter((row: any) => {
      if (Number(row.hidden) === 1) return false;
      const display = parse(row.display_json, {});
      const tags = [...parse(row.tags_json, []), ...parse(row.ai_tags_json, [])].map(norm);
      if (!Boolean(display.creativeFlash) && !tags.includes('creative-flash')) return false;
      const key = String(row.asset_key || '');
      if (!key || seen.has(key) || hidden.has(key)) return false;
      seen.add(key); return true;
    }).map((row: any) => ({
      assetKey: String(row.asset_key || ''), imageId: String(row.image_id || ''), filename: String(row.filename || ''), thumbSrc: String(row.thumb_src || ''), fullSrc: String(row.full_src || ''), alt: String(row.alt || 'Creative flash wedding photography'), caption: String(row.caption || ''), sortOrder: Number(row.sort_order || 0)
    }));
    const map = new Map(raw.map((i: any) => [i.assetKey, i]));
    const ordered: any[] = [];
    for (const id of order) { const item = map.get(id); if (item) { ordered.push(item); map.delete(id); } }
    ordered.push(...raw.filter((i: any) => map.has(i.assetKey)));
    const hero = ordered.find((i: any) => i.assetKey === settings.heroImageId || i.imageId === settings.heroImageId) || ordered[0] || null;
    return Response.json({ ok: true, heroImage: hero, images: ordered }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (error: any) { return Response.json({ error: error?.message || 'Unable to load Creative Flash gallery.' }, { status: 500 }); }
};
