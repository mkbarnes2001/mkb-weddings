import {
  adminApiRequestAllowed,
  errorResponse,
  notFoundResponse,
} from "../../../../serverless/venue-d1";

type Env = { MKB_DB: D1Database; ADMIN_API_ENABLED?: string };

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

function assignedToMoment(values: unknown, moment: any) {
  const list = Array.isArray(values) ? values : [];
  const slug = String(moment.slug || "");
  const nameSlug = slugify(moment.name);
  const id = String(moment.id || "");
  return list.some((value) => {
    const raw = String(value || "");
    const normalized = slugify(raw);
    return raw === id || raw === slug || normalized === slug || normalized === nameSlug;
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    const slug = String(context.params.slug || "").trim();
    const momentRow: any = await context.env.MKB_DB.prepare(
      `SELECT * FROM moments WHERE slug = ? LIMIT 1`,
    )
      .bind(slug)
      .first();

    if (!momentRow) {
      return Response.json({ error: "Moment not found." }, { status: 404 });
    }

    const moment = {
      ...parse(momentRow.document_json, {}),
      id: String(momentRow.id || ""),
      slug: String(momentRow.slug || ""),
      name: String(momentRow.name || ""),
      description: String(momentRow.description || ""),
      cardImageId: String(momentRow.card_image_id || ""),
      sortOrder: Number(momentRow.sort_order || 0),
      status: String(momentRow.status || "active"),
    };

    const result = await context.env.MKB_DB.prepare(`
      SELECT
        vi.venue_slug,
        vi.asset_key,
        vi.moments_json,
        vi.display_json,
        vi.hidden AS venue_hidden,
        i.image_id,
        i.wedding_slug,
        i.filename,
        i.thumb_src,
        i.full_src,
        i.alt,
        i.caption,
        v.name AS venue_name
      FROM venue_images vi
      JOIN images i ON i.asset_key = vi.asset_key
      LEFT JOIN venues v ON v.slug = vi.venue_slug
      ORDER BY v.name COLLATE NOCASE ASC, vi.sort_order ASC, i.filename COLLATE NOCASE ASC
    `).all();

    const seen = new Set<string>();
    const images = (result.results || [])
      .filter((row: any) => {
        if (!assignedToMoment(parse(row.moments_json, []), moment)) return false;
        const key = String(row.asset_key || "");
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((row: any) => {
        const display = parse(row.display_json, {});
        return {
          assetKey: String(row.asset_key || ""),
          imageId: String(row.image_id || ""),
          weddingSlug: String(row.wedding_slug || ""),
          venueSlug: String(row.venue_slug || ""),
          venueName: String(row.venue_name || row.venue_slug || ""),
          filename: String(row.filename || ""),
          thumbSrc: String(row.thumb_src || ""),
          fullSrc: String(row.full_src || ""),
          alt: String(row.alt || ""),
          caption: String(row.caption || ""),
          globallyEnabled: Number(row.venue_hidden || 0) === 0 && Boolean(display.moments),
        };
      });

    return Response.json({ ok: true, moment, images });
  } catch (error) {
    return errorResponse(error);
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  if (!adminApiRequestAllowed(context.env as any, context.request)) {
    return notFoundResponse();
  }

  try {
    const body: any = await context.request.json();
    const enabledAssetKeys = new Set(
      (Array.isArray(body?.enabledAssetKeys) ? body.enabledAssetKeys : [])
        .map((value: unknown) => String(value || "").trim())
        .filter(Boolean),
    );

    if (!enabledAssetKeys.size) {
      return Response.json({ ok: true, updated: 0 });
    }

    const placeholders = [...enabledAssetKeys].map(() => "?").join(",");
    const rows = await context.env.MKB_DB.prepare(`
      SELECT venue_slug, asset_key, display_json
      FROM venue_images
      WHERE asset_key IN (${placeholders})
    `)
      .bind(...enabledAssetKeys)
      .all();

    const statements = (rows.results || []).map((row: any) => {
      const display = parse(row.display_json, {});
      const next = { ...display, moments: true };
      return context.env.MKB_DB.prepare(`
        UPDATE venue_images
        SET display_json = ?
        WHERE venue_slug = ? AND asset_key = ?
      `).bind(JSON.stringify(next), String(row.venue_slug), String(row.asset_key));
    });

    if (statements.length) await context.env.MKB_DB.batch(statements);

    return Response.json({ ok: true, updated: statements.length });
  } catch (error) {
    return errorResponse(error);
  }
};
