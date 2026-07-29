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

async function findCollection(env: Env, slug: string, workspaceId: string) {
  return env.MKB_DB.prepare(`
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
    WHERE cc.slug = ? AND cc.workspace_id = ?
    GROUP BY cc.id
    LIMIT 1
  `)
    .bind(slug, workspaceId)
    .first();
}

function mapCollection(row: any) {
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
    heroImage: row.hero_image_asset_key
      ? {
          assetKey: String(row.hero_image_asset_key || ""),
          imageId: String(row.hero_image_id || ""),
          thumbSrc: String(row.hero_thumb_src || ""),
          fullSrc: String(row.hero_full_src || ""),
          alt: String(row.hero_alt || row.name || "Wedding photography"),
        }
      : null,
  };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    const workspaceId = await resolveAdminWorkspaceId(context);
    const slug = cleanSlug(context.params.slug);
    const row: any = await findCollection(context.env, slug, workspaceId);
    if (!row) return Response.json({ error: "Collection not found." }, { status: 404 });
    return Response.json({ ok: true, collection: mapCollection(row) });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    const workspaceId = await resolveAdminWorkspaceId(context);
    const routeSlug = cleanSlug(context.params.slug);
    const current: any = await context.env.MKB_DB.prepare(
      `SELECT * FROM custom_collections WHERE slug = ? AND workspace_id = ? LIMIT 1`,
    )
      .bind(routeSlug, workspaceId)
      .first();
    if (!current) return Response.json({ error: "Collection not found." }, { status: 404 });

    const body: any = await context.request.json();
    const input = body?.collection || body || {};
    const name = String(input.name ?? current.name).trim();
    const nextSlug = cleanSlug(input.slug ?? current.slug);
    if (!name || !nextSlug) {
      return Response.json({ error: "Collection name and slug are required." }, { status: 400 });
    }

    const clash: any = await context.env.MKB_DB.prepare(
      `SELECT id FROM custom_collections WHERE slug = ? AND id <> ? AND workspace_id = ? LIMIT 1`,
    )
      .bind(nextSlug, String(current.id || ""), workspaceId)
      .first();
    if (clash) {
      return Response.json(
        { error: `A collection already uses the slug “${nextSlug}”.` },
        { status: 409 },
      );
    }

    await context.env.MKB_DB.prepare(`
      UPDATE custom_collections SET
        slug = ?, name = ?, description = ?, status = ?, show_on_landing = ?,
        sort_order = ?, hero_asset_key = ?, seo_title = ?, seo_description = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND workspace_id = ?
    `)
      .bind(
        nextSlug,
        name,
        String(input.description ?? current.description ?? ""),
        cleanStatus(input.status ?? current.status),
        input.showOnLanding !== undefined
          ? input.showOnLanding ? 1 : 0
          : Number(current.show_on_landing || 0),
        Number(input.sortOrder ?? current.sort_order ?? 0),
        String(input.heroAssetKey ?? current.hero_asset_key ?? "").trim(),
        String(input.seoTitle ?? current.seo_title ?? ""),
        String(input.seoDescription ?? current.seo_description ?? ""),
        String(current.id || ""),
        workspaceId,
      )
      .run();

    const row: any = await findCollection(context.env, nextSlug, workspaceId);
    return Response.json({ ok: true, collection: mapCollection(row) });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    const workspaceId = await resolveAdminWorkspaceId(context);
    const slug = cleanSlug(context.params.slug);
    const result = await context.env.MKB_DB.prepare(`
      UPDATE custom_collections
      SET status = 'archived', show_on_landing = 0, updated_at = CURRENT_TIMESTAMP
      WHERE slug = ? AND workspace_id = ?
    `)
      .bind(slug, workspaceId)
      .run();

    if (!result.meta.changes) {
      return Response.json({ error: "Collection not found." }, { status: 404 });
    }
    return Response.json({ ok: true, slug, status: "archived" });
  } catch (error) {
    return errorResponse(error);
  }
};
