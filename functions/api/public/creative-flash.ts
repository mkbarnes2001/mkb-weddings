type Env = { MKB_DB: D1Database };
function parse(value: unknown, fallback: any) { try { return JSON.parse(String(value || '')); } catch { return fallback; } }
function norm(value: unknown) { return String(value || '').trim().toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const result = await env.MKB_DB.prepare(`SELECT vi.asset_key, vi.sort_order, vi.display_json, vi.included, vi.hidden, i.image_id, i.filename, i.thumb_src, i.full_src, i.alt, i.caption, i.tags_json, i.ai_tags_json FROM venue_images vi JOIN images i ON i.asset_key = vi.asset_key ORDER BY vi.sort_order ASC`).all();
    const seen = new Set<string>();
    const images = (result.results || []).filter((row: any) => {
      if (Number(row.hidden) === 1) return false;
      const display = parse(row.display_json, {});
      const tags = [...parse(row.tags_json, []), ...parse(row.ai_tags_json, [])].map(norm);
      return Boolean(display.creativeFlash) || tags.includes('creative-flash');
    }).filter((row: any) => { const key = String(row.asset_key); if (seen.has(key)) return false; seen.add(key); return true; }).map((row: any) => ({
      assetKey: String(row.asset_key || ''), imageId: String(row.image_id || ''), filename: String(row.filename || ''), thumbSrc: String(row.thumb_src || ''), fullSrc: String(row.full_src || ''), alt: String(row.alt || 'Creative flash wedding photography'), caption: String(row.caption || ''), sortOrder: Number(row.sort_order || 0)
    }));
    return Response.json({ ok: true, images }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (error: any) { return Response.json({ error: error?.message || 'Unable to load Creative Flash gallery.' }, { status: 500 }); }
};
