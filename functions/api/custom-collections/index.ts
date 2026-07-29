import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../../serverless/venue-d1";
import { resolveAdminWorkspaceId } from "../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

function cleanSlug(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function cleanStatus(value: unknown) {
  return value === "active" || value === "archived" ? value : "draft";
}

function mapCollection(row: any) {
  const heroImage = row.hero_image_asset_key
    ? {
        assetKey: String(row.hero_image_asset_key || ""),
        imageId: String(row.hero_image_id || ""),
        thumbSrc: String(row.hero_thumb_src || ""),
        fullSrc: String(row.hero_full_src || ""),
        alt: String(row.hero_alt || row.name || "Wedding photography"),
      }
    : null;

  return {
    id: String(row.id || ""),
    slug: String(row.slug || ""),
    name: String(row.name || ""),
    description: String(row.description || ""),
    status: cleanStatus(row.status),
    showOnLanding: Number(row.show_on_landing || 0) === 1,
    sortOrder: Number(row.sort_order || 0),
    heroAssetKey: String(row.hero_asset_key || ""),
    seoTitle: String(row.seo_title || ""),
    seoDescription: String(row.seo_description || ""),
    imageCount: Number(row.image_count || 0),
    visibleImageCount: Number(row.visible_image_count || 0),
    heroImage,
  };
}

const LIST_SQL = `
  SELECT
    cc.*,
    COUNT(ci.asset_key) AS image_count,
    SUM(CASE WHEN ci.hidden = 0 THEN 1 ELSE 0 END) AS visible_image_count,
    hi.asset_key AS hero_image_asset_key,
    hi.image_id AS hero_image_id,
    hi.thumb_src AS hero_thumb_src,
    hi.full_src AS hero_full_src,
    hi.alt AS hero_alt
  FROM custom_collections cc
  LEFT JOIN collection_images ci ON ci.collection_id = cc.id AND ci.workspace_id = cc.workspace_id
  LEFT JOIN images hi
    ON hi.asset_key = cc.hero_asset_key AND hi.workspace_id = cc.workspace_id
  WHERE cc.workspace_id = ?
  GROUP BY cc.id
  ORDER BY cc.sort_order ASC, cc.name COLLATE NOCASE ASC
`;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    const workspaceId = await resolveAdminWorkspaceId(context);
    const result = await context.env.MKB_DB.prepare(LIST_SQL).bind(workspaceId).all();
    return Response.json({
      ok: true,
      collections: (result.results || []).map(mapCollection),
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    const workspaceId = await resolveAdminWorkspaceId(context);
    const body: any = await context.request.json();
    const input = body?.collection || body || {};
    const name = String(input.name || "").trim();
    const slug = cleanSlug(input.slug || name);

    if (!name) {
      return Response.json({ error: "Collection name is required." }, { status: 400 });
    }
    if (!slug) {
      return Response.json({ error: "Collection slug is required." }, { status: 400 });
    }

    const existing: any = await context.env.MKB_DB.prepare(
      `SELECT id FROM custom_collections WHERE slug = ? AND workspace_id = ? LIMIT 1`,
    )
      .bind(slug, workspaceId)
      .first();

    if (existing) {
      return Response.json(
        { error: `A collection already uses the slug “${slug}”.` },
        { status: 409 },
      );
    }

    const maxRow: any = await context.env.MKB_DB.prepare(
      `SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM custom_collections WHERE workspace_id = ?`,
    ).bind(workspaceId).first();
    const id = `collection_${crypto.randomUUID()}`;
    const sortOrder = Number(input.sortOrder || Number(maxRow?.max_order || 0) + 1);

    await context.env.MKB_DB.prepare(`
      INSERT INTO custom_collections (
        id, slug, name, description, status, show_on_landing,
        sort_order, hero_asset_key, seo_title, seo_description,
        created_at, updated_at, workspace_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
    `)
      .bind(
        id,
        slug,
        name,
        String(input.description || ""),
        cleanStatus(input.status),
        input.showOnLanding ? 1 : 0,
        sortOrder,
        String(input.heroAssetKey || "").trim(),
        String(input.seoTitle || ""),
        String(input.seoDescription || ""),
        workspaceId,
      )
      .run();

    const row: any = await context.env.MKB_DB.prepare(
      `SELECT cc.*, 0 AS image_count, 0 AS visible_image_count
       FROM custom_collections cc WHERE cc.id = ? AND cc.workspace_id = ? LIMIT 1`,
    )
      .bind(id, workspaceId)
      .first();

    return Response.json({ ok: true, collection: mapCollection(row) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
