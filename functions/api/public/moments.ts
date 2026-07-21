type Env = { MKB_DB: D1Database };
function parse(value: unknown, fallback: any) { try { return JSON.parse(String(value || '')); } catch { return fallback; } }
function slugify(value: string) { return String(value || '').trim().toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const [momentResult, imageResult] = await Promise.all([
      env.MKB_DB.prepare(`SELECT * FROM moments WHERE status = 'active' AND show_on_landing = 1 ORDER BY sort_order ASC, name COLLATE NOCASE ASC`).all(),
      env.MKB_DB.prepare(`SELECT vi.asset_key, vi.moments_json, vi.display_json, vi.included, vi.hidden, vi.sort_order, i.image_id, i.thumb_src, i.full_src, i.alt FROM venue_images vi JOIN images i ON i.asset_key = vi.asset_key ORDER BY vi.sort_order ASC`).all(),
    ]);
    const rows = (imageResult.results || []).filter((row: any) => {
      const display = parse(row.display_json, {});
      return Number(row.included) === 1 && Number(row.hidden) === 0 && Boolean(display.moments);
    });
    const moments = (momentResult.results || []).map((row: any) => {
      const doc = parse(row.document_json, {});
      const slug = String(row.slug || doc.slug || '');
      const name = String(row.name || doc.name || '');
      const matches = rows.filter((image: any) => (parse(image.moments_json, []) as any[]).some((value) => {
        const test = slugify(String(value || ''));
        return test === slug || test === slugify(name) || String(value || '') === String(row.id || '');
      }));
      const wanted = String(row.card_image_id || doc.cardImageId || '');
      const hero = rows.find((image: any) => wanted && (String(image.asset_key) === wanted || String(image.image_id) === wanted)) || matches[0] || null;
      return {
        id: String(row.id || doc.id || ''), slug, name,
        description: String(row.description || doc.description || ''),
        sortOrder: Number(row.sort_order || doc.sortOrder || 0),
        cardImageId: wanted, count: matches.length,
        image: hero ? { thumbSrc: String(hero.thumb_src || ''), fullSrc: String(hero.full_src || ''), alt: String(hero.alt || name) } : null,
      };
    });
    return Response.json({ ok: true, moments }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (error: any) { return Response.json({ error: error?.message || 'Unable to load moments.' }, { status: 500 }); }
};
