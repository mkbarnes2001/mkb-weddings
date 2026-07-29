import { resolvePublicWorkspaceId } from "../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database };

function parse(value: unknown, fallback: any) {
  try {
    return JSON.parse(String(value || ""));
  } catch {
    return fallback;
  }
}

function slugify(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function matchesMoment(values: unknown, row: any, doc: any) {
  const list = Array.isArray(values) ? values : [];
  const slug = String(row.slug || doc.slug || "");
  const nameSlug = slugify(row.name || doc.name || "");
  const id = String(row.id || doc.id || "");
  return list.some((value) => {
    const raw = String(value || "");
    const normalized = slugify(raw);
    return raw === id || raw === slug || normalized === slug || normalized === nameSlug;
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const workspaceId = await resolvePublicWorkspaceId(env.MKB_DB, request);
    const [momentResult, imageResult] = await Promise.all([
      env.MKB_DB.prepare(`
        SELECT * FROM moments
        WHERE workspace_id = ? AND status = 'active' AND show_on_landing = 1
        ORDER BY sort_order ASC, name COLLATE NOCASE ASC
      `).bind(workspaceId).all(),
      env.MKB_DB.prepare(`
        SELECT
          vi.asset_key,
          vi.moments_json,
          vi.display_json,
          vi.hidden,
          vi.sort_order,
          i.image_id,
          i.thumb_src,
          i.full_src,
          i.alt
        FROM venue_images vi
        JOIN images i ON i.asset_key = vi.asset_key AND i.workspace_id = vi.workspace_id
        WHERE vi.workspace_id = ?
        ORDER BY vi.sort_order ASC
      `).bind(workspaceId).all(),
    ]);

    const rows = (imageResult.results || []).filter((row: any) => {
      const display = parse(row.display_json, {});
      return Number(row.hidden) === 0 && Boolean(display.moments);
    });

    const moments = (momentResult.results || []).map((row: any) => {
      const doc = parse(row.document_json, {});
      const hidden = new Set(
        (Array.isArray(doc.hiddenImageIds) ? doc.hiddenImageIds : []).map(String),
      );
      const seen = new Set<string>();
      const matches = rows.filter((image: any) => {
        if (!matchesMoment(parse(image.moments_json, []), row, doc)) return false;
        const key = String(image.asset_key || "");
        if (!key || hidden.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const wanted = String(row.card_image_id || doc.cardImageId || "");
      const hero =
        matches.find(
          (image: any) =>
            wanted &&
            (String(image.asset_key) === wanted || String(image.image_id) === wanted),
        ) || matches[0] || null;

      return {
        id: String(row.id || doc.id || ""),
        slug: String(row.slug || doc.slug || ""),
        name: String(row.name || doc.name || ""),
        description: String(row.description || doc.description || ""),
        sortOrder: Number(row.sort_order || doc.sortOrder || 0),
        cardImageId: wanted,
        count: matches.length,
        image: hero
          ? {
              thumbSrc: String(hero.thumb_src || ""),
              fullSrc: String(hero.full_src || ""),
              alt: String(hero.alt || row.name || "Wedding photography"),
            }
          : null,
      };
    });

    return Response.json(
      { ok: true, moments },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Unable to load moments." },
      { status: 500 },
    );
  }
};
