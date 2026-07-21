type Env = { MKB_DB: D1Database };
const SETTINGS_SLUG = "gallery-master-heroes";
function parse(value: unknown, fallback: any) { try { return JSON.parse(String(value || "")); } catch { return fallback; } }

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const row: any = await env.MKB_DB.prepare(`SELECT document_json FROM content_pages WHERE slug = ? LIMIT 1`).bind(SETTINGS_SLUG).first();
    const settings = { venueHeroImageId: "", momentsHeroImageId: "", landingHeroImageId: "", ...parse(row?.document_json, {}) };
    async function resolve(id: string) {
      if (!id) return null;
      const image: any = await env.MKB_DB.prepare(`SELECT asset_key, image_id, thumb_src, full_src, alt FROM images WHERE asset_key = ? OR image_id = ? LIMIT 1`).bind(id, id).first();
      return image ? { assetKey: String(image.asset_key || ""), imageId: String(image.image_id || ""), thumbSrc: String(image.thumb_src || ""), fullSrc: String(image.full_src || ""), alt: String(image.alt || "") } : null;
    }
    const [venue, moments, landing] = await Promise.all([
      resolve(settings.venueHeroImageId),
      resolve(settings.momentsHeroImageId),
      resolve(settings.landingHeroImageId),
    ]);
    return Response.json({ ok: true, venue, moments, landing }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (error: any) { return Response.json({ error: error?.message || "Unable to load gallery heroes." }, { status: 500 }); }
};
