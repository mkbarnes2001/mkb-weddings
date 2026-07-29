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
    imageCount: 0,
    visibleImageCount: 0,
    heroImage: null,
  };
}

/**
 * Dedicated create route for photographer-defined galleries.
 *
 * Keeping creation on its own static route avoids ambiguity with the dynamic
 * /api/custom-collections/[slug] route and gives the admin UI a stable endpoint
 * whose only responsibility is creating a new draft gallery.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    const workspaceId = await resolveAdminWorkspaceId(context);
    const body: any = await context.request.json().catch(() => ({}));
    const input = body?.collection || body || {};
    const name = String(input.name || "").trim();
    const slug = cleanSlug(input.slug || name);

    if (!name) {
      return Response.json({ error: "Gallery name is required." }, { status: 400 });
    }
    if (!slug) {
      return Response.json({ error: "Gallery slug is required." }, { status: 400 });
    }

    const existing: any = await context.env.MKB_DB.prepare(
      `SELECT id FROM custom_collections WHERE slug = ? AND workspace_id = ? LIMIT 1`,
    )
      .bind(slug, workspaceId)
      .first();

    if (existing) {
      return Response.json(
        { error: `A gallery already uses the slug “${slug}”. Choose a different name.` },
        { status: 409 },
      );
    }

    const maxRow: any = await context.env.MKB_DB.prepare(
      `SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM custom_collections WHERE workspace_id = ?`,
    ).bind(workspaceId).first();

    const id = `collection_${crypto.randomUUID()}`;
    const nextOrder = Number(maxRow?.max_order || 0) + 1;
    const requestedOrder = Number(input.sortOrder);
    const sortOrder = Number.isFinite(requestedOrder) && requestedOrder > 0
      ? requestedOrder
      : nextOrder;

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
      `SELECT * FROM custom_collections WHERE id = ? AND workspace_id = ? LIMIT 1`,
    )
      .bind(id, workspaceId)
      .first();

    if (!row) {
      return Response.json(
        { error: "Gallery was not returned after creation. Refresh and check Gallery Management." },
        { status: 500 },
      );
    }

    return Response.json({ ok: true, collection: mapCollection(row) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};
