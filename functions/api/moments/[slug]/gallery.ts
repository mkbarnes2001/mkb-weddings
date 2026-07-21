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
        vi.included,
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
        const moments = parse(row.moments_json, []);
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
          included: Boolean(Number(row.included || 0)),
          moments: Array.isArray(moments) ? moments.map((value: unknown) => String(value || "")).filter(Boolean) : [],
          display: {
            venue: Boolean(display.venue ?? row.included),
            moments: Boolean(display.moments),
            blog: Boolean(display.blog),
            homepage: Boolean(display.homepage),
            portfolio: Boolean(display.portfolio),
            creativeFlash: Boolean(display.creativeFlash),
          },
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
    const updates = Array.isArray(body?.updates) ? body.updates : [];

    const requestedKeys = new Set<string>([
      ...enabledAssetKeys,
      ...updates.map((item: any) => String(item?.assetKey || "").trim()).filter(Boolean),
    ]);

    if (!requestedKeys.size) {
      return Response.json({ ok: true, updated: 0 });
    }

    const updateMap = new Map<string, any>();
    for (const item of updates) {
      const key = String(item?.assetKey || "").trim();
      if (!key) continue;
      updateMap.set(key, item);
    }

    const assetKeys = [...requestedKeys];
    const rows: any[] = [];
    const SELECT_CHUNK_SIZE = 75;

    for (let start = 0; start < assetKeys.length; start += SELECT_CHUNK_SIZE) {
      const chunk = assetKeys.slice(start, start + SELECT_CHUNK_SIZE);
      const placeholders = chunk.map(() => "?").join(",");
      const result = await context.env.MKB_DB.prepare(`
        SELECT venue_slug, asset_key, included, moments_json, display_json
        FROM venue_images
        WHERE asset_key IN (${placeholders})
      `)
        .bind(...chunk)
        .all();
      rows.push(...(result.results || []));
    }

    const statements = rows.map((row: any) => {
      const assetKey = String(row.asset_key || "");
      const currentDisplay = parse(row.display_json, {});
      const currentMoments = parse(row.moments_json, []);
      const requested = updateMap.get(assetKey);

      const nextMoments = Array.isArray(requested?.moments)
        ? [...new Set(requested.moments.map((value: unknown) => String(value || "").trim()).filter(Boolean))]
        : Array.isArray(currentMoments)
          ? currentMoments
          : [];

      const requestedDisplay = requested?.display && typeof requested.display === "object"
        ? requested.display
        : {};
      const nextDisplay = {
        ...currentDisplay,
        ...requestedDisplay,
        moments: nextMoments.length > 0,
      };

      if (enabledAssetKeys.has(assetKey) && !requested) {
        nextDisplay.moments = true;
      }

      const nextIncluded = typeof requested?.included === "boolean"
        ? requested.included
        : Boolean(Number(row.included || 0));
      nextDisplay.venue = nextIncluded;

      return context.env.MKB_DB.prepare(`
        UPDATE venue_images
        SET included = ?, moments_json = ?, display_json = ?
        WHERE venue_slug = ? AND asset_key = ?
      `).bind(
        nextIncluded ? 1 : 0,
        JSON.stringify(nextMoments),
        JSON.stringify(nextDisplay),
        String(row.venue_slug || ""),
        assetKey,
      );
    });

    const UPDATE_CHUNK_SIZE = 50;
    for (let start = 0; start < statements.length; start += UPDATE_CHUNK_SIZE) {
      await context.env.MKB_DB.batch(statements.slice(start, start + UPDATE_CHUNK_SIZE));
    }

    return Response.json({ ok: true, updated: statements.length });
  } catch (error) {
    return errorResponse(error);
  }
};
