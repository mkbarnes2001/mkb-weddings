type Env = { MKB_DB: D1Database };

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const result = await env.MKB_DB.prepare(`
      SELECT
        cc.id,
        cc.slug,
        cc.name,
        cc.description,
        cc.sort_order,
        cc.hero_asset_key,
        COUNT(ci.asset_key) AS image_count,
        hi.image_id AS hero_image_id,
        hi.thumb_src AS hero_thumb_src,
        hi.full_src AS hero_full_src,
        hi.alt AS hero_alt
      FROM custom_collections cc
      LEFT JOIN collection_images ci
        ON ci.collection_id = cc.id AND ci.hidden = 0
      LEFT JOIN images hi
        ON hi.asset_key = cc.hero_asset_key
      WHERE cc.status = 'active' AND cc.show_on_landing = 1
      GROUP BY cc.id
      ORDER BY cc.sort_order ASC, cc.name COLLATE NOCASE ASC
    `).all();

    const collections = (result.results || []).map((row: any) => ({
      id: String(row.id || ""),
      slug: String(row.slug || ""),
      name: String(row.name || ""),
      description: String(row.description || ""),
      sortOrder: Number(row.sort_order || 0),
      imageCount: Number(row.image_count || 0),
      heroImage: row.hero_asset_key
        ? {
            assetKey: String(row.hero_asset_key || ""),
            imageId: String(row.hero_image_id || ""),
            thumbSrc: String(row.hero_thumb_src || ""),
            fullSrc: String(row.hero_full_src || ""),
            alt: String(row.hero_alt || row.name || "Wedding photography"),
          }
        : null,
    }));

    return Response.json(
      { ok: true, collections },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Unable to load custom collections." },
      { status: 500 },
    );
  }
};
