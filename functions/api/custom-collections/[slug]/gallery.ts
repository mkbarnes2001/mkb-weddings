import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../../../serverless/venue-d1";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

function cleanSlug(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function mapCollection(row: any) {
  return {
    id: String(row.id || ""),
    slug: String(row.slug || ""),
    name: String(row.name || ""),
    description: String(row.description || ""),
    status: row.status === "active" || row.status === "archived" ? row.status : "draft",
    showOnLanding: Number(row.show_on_landing || 0) === 1,
    sortOrder: Number(row.sort_order || 0),
    heroAssetKey: String(row.hero_asset_key || ""),
    seoTitle: String(row.seo_title || ""),
    seoDescription: String(row.seo_description || ""),
    imageCount: Number(row.image_count || 0),
    visibleImageCount: Number(row.visible_image_count || 0),
    heroImage: null,
  };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    const slug = cleanSlug(context.params.slug);
    const collectionRow: any = await context.env.MKB_DB.prepare(`
      SELECT
        cc.*,
        COUNT(ci.asset_key) AS image_count,
        SUM(CASE WHEN ci.hidden = 0 THEN 1 ELSE 0 END) AS visible_image_count
      FROM custom_collections cc
      LEFT JOIN collection_images ci ON ci.collection_id = cc.id
      WHERE cc.slug = ?
      GROUP BY cc.id
      LIMIT 1
    `)
      .bind(slug)
      .first();

    if (!collectionRow) {
      return Response.json({ error: "Collection not found." }, { status: 404 });
    }

    const [imageResult, memberResult] = await Promise.all([
      context.env.MKB_DB.prepare(`
        SELECT
          i.asset_key,
          i.image_id,
          i.wedding_slug,
          i.filename,
          i.thumb_src,
          i.full_src,
          i.alt,
          i.caption,
          i.updated_at,
          vi.venue_slug,
          vi.hidden AS venue_hidden,
          vi.sort_order AS venue_sort_order,
          v.name AS venue_name
        FROM images i
        LEFT JOIN venue_images vi ON vi.asset_key = i.asset_key
        LEFT JOIN venues v ON v.slug = vi.venue_slug
        ORDER BY i.updated_at DESC, vi.sort_order ASC, i.filename COLLATE NOCASE ASC
      `).all(),
      context.env.MKB_DB.prepare(`
        SELECT asset_key, sort_order, hidden
        FROM collection_images
        WHERE collection_id = ?
        ORDER BY sort_order ASC
      `)
        .bind(String(collectionRow.id || ""))
        .all(),
    ]);

    const memberships = new Map<string, { sortOrder: number; hidden: boolean }>();
    for (const row of memberResult.results || []) {
      memberships.set(String((row as any).asset_key || ""), {
        sortOrder: Number((row as any).sort_order || 0),
        hidden: Number((row as any).hidden || 0) === 1,
      });
    }

    const uniqueImages = new Map<string, any>();
    for (const row of imageResult.results || []) {
      const key = String((row as any).asset_key || "");
      if (!key) continue;
      const existing = uniqueImages.get(key);
      const venueHidden = Number((row as any).venue_hidden || 0) === 1;
      if (!existing || (existing.venueHidden && !venueHidden)) {
        uniqueImages.set(key, { ...row, venueHidden });
      }
    }

    const images = [...uniqueImages.values()]
      .filter((row: any) => !row.venueHidden)
      .map((row: any) => {
        const membership = memberships.get(String(row.asset_key || ""));
        return {
          assetKey: String(row.asset_key || ""),
          imageId: String(row.image_id || ""),
          weddingSlug: String(row.wedding_slug || ""),
          venueSlug: String(row.venue_slug || ""),
          venueName: String(row.venue_name || row.venue_slug || "Unlinked venue"),
          filename: String(row.filename || ""),
          thumbSrc: String(row.thumb_src || ""),
          fullSrc: String(row.full_src || ""),
          alt: String(row.alt || ""),
          caption: String(row.caption || ""),
          included: Boolean(membership),
          hidden: Boolean(membership?.hidden),
          sortOrder: membership?.sortOrder ?? Number.MAX_SAFE_INTEGER,
        };
      })
      .sort((a, b) => {
        if (a.included !== b.included) return a.included ? -1 : 1;
        if (a.included && b.included) return a.sortOrder - b.sortOrder;
        return a.filename.localeCompare(b.filename);
      });

    return Response.json({
      ok: true,
      collection: mapCollection(collectionRow),
      images,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    const slug = cleanSlug(context.params.slug);
    const collection: any = await context.env.MKB_DB.prepare(
      `SELECT id FROM custom_collections WHERE slug = ? LIMIT 1`,
    )
      .bind(slug)
      .first();
    if (!collection) {
      return Response.json({ error: "Collection not found." }, { status: 404 });
    }

    const body: any = await context.request.json();
    const heroAssetKey = String(body?.heroAssetKey || "").trim();
    const rawItems = Array.isArray(body?.items) ? body.items : [];
    const seen = new Set<string>();
    const items = rawItems
      .map((item: any, index: number) => ({
        assetKey: String(item?.assetKey || "").trim(),
        sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index + 1,
        hidden: Boolean(item?.hidden),
      }))
      .filter((item: any) => {
        if (!item.assetKey || seen.has(item.assetKey)) return false;
        seen.add(item.assetKey);
        return true;
      });

    const collectionId = String(collection.id || "");
    const firstBatch = [
      context.env.MKB_DB.prepare(
        `UPDATE custom_collections SET hero_asset_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      ).bind(heroAssetKey, collectionId),
      context.env.MKB_DB.prepare(
        `DELETE FROM collection_images WHERE collection_id = ?`,
      ).bind(collectionId),
    ];
    await context.env.MKB_DB.batch(firstBatch);

    const statements = items.map((item: any) =>
      context.env.MKB_DB.prepare(`
        INSERT INTO collection_images (collection_id, asset_key, sort_order, hidden)
        VALUES (?, ?, ?, ?)
      `).bind(collectionId, item.assetKey, item.sortOrder, item.hidden ? 1 : 0),
    );

    const CHUNK_SIZE = 50;
    for (let index = 0; index < statements.length; index += CHUNK_SIZE) {
      await context.env.MKB_DB.batch(statements.slice(index, index + CHUNK_SIZE));
    }

    return Response.json({
      ok: true,
      collectionId,
      savedImages: items.length,
      heroAssetKey,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
