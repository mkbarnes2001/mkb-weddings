import { resolvePublicWorkspaceId } from "../../../../serverless/tenant-context";

type Env = { MKB_DB: D1Database };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const workspaceId = await resolvePublicWorkspaceId(context.env.MKB_DB, context.request);
    const slug = String(context.params.slug || "").trim().toLowerCase();
    const collection: any = await context.env.MKB_DB.prepare(`
      SELECT * FROM custom_collections
      WHERE slug = ? AND workspace_id = ? AND status = 'active'
      LIMIT 1
    `)
      .bind(slug, workspaceId)
      .first();

    if (!collection) {
      return Response.json({ error: "Collection not found." }, { status: 404 });
    }

    const result = await context.env.MKB_DB.prepare(`
      SELECT
        ci.asset_key,
        ci.sort_order,
        i.image_id,
        i.filename,
        i.thumb_src,
        i.full_src,
        i.alt,
        i.caption,
        i.wedding_slug
      FROM collection_images ci
      JOIN images i ON i.asset_key = ci.asset_key AND i.workspace_id = ci.workspace_id
      WHERE ci.collection_id = ? AND ci.workspace_id = ? AND ci.hidden = 0
      ORDER BY ci.sort_order ASC, i.filename COLLATE NOCASE ASC
    `)
      .bind(String(collection.id || ""), workspaceId)
      .all();

    const images = (result.results || []).map((row: any) => ({
      assetKey: String(row.asset_key || ""),
      imageId: String(row.image_id || ""),
      filename: String(row.filename || ""),
      thumbSrc: String(row.thumb_src || ""),
      fullSrc: String(row.full_src || ""),
      alt: String(row.alt || `${collection.name} wedding photography`),
      caption: String(row.caption || ""),
      weddingSlug: String(row.wedding_slug || ""),
      sortOrder: Number(row.sort_order || 0),
    }));

    const heroWanted = String(collection.hero_asset_key || "");
    const hero =
      images.find(
        (image: any) =>
          heroWanted &&
          (image.assetKey === heroWanted || image.imageId === heroWanted),
      ) || images[0] || null;

    return Response.json(
      {
        ok: true,
        collection: {
          id: String(collection.id || ""),
          slug: String(collection.slug || ""),
          name: String(collection.name || ""),
          description: String(collection.description || ""),
          seoTitle: String(collection.seo_title || ""),
          seoDescription: String(collection.seo_description || ""),
        },
        hero,
        images,
      },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Unable to load collection gallery." },
      { status: 500 },
    );
  }
};
