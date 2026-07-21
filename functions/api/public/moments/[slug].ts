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

function matchesMoment(values: unknown, moment: any) {
  const list = Array.isArray(values) ? values : [];
  const slug = String(moment.slug || "");
  const id = String(moment.id || "");
  const nameSlug = slugify(moment.name);
  return list.some((value) => {
    const raw = String(value || "");
    const normalized = slugify(raw);
    return raw === id || raw === slug || normalized === slug || normalized === nameSlug;
  });
}

function hashStringToInt(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const slug = String(context.params.slug || "").trim();
    const row: any = await context.env.MKB_DB.prepare(`
      SELECT * FROM moments WHERE slug = ? AND status = 'active' LIMIT 1
    `)
      .bind(slug)
      .first();

    if (!row) {
      return Response.json({ error: "Moment not found." }, { status: 404 });
    }

    const doc = parse(row.document_json, {});
    const moment = {
      ...doc,
      id: String(row.id || doc.id || ""),
      slug: String(row.slug || doc.slug || ""),
      name: String(row.name || doc.name || ""),
      description: String(row.description || doc.description || ""),
      cardImageId: String(row.card_image_id || doc.cardImageId || ""),
      sortOrder: Number(row.sort_order || doc.sortOrder || 0),
    };

    const result = await context.env.MKB_DB.prepare(`
      SELECT
        vi.venue_slug,
        vi.asset_key,
        vi.moments_json,
        vi.display_json,
        vi.hidden,
        vi.sort_order,
        i.image_id,
        i.filename,
        i.thumb_src,
        i.full_src,
        i.alt,
        i.caption,
        v.name AS venue_name
      FROM venue_images vi
      JOIN images i ON i.asset_key = vi.asset_key
      LEFT JOIN venues v ON v.slug = vi.venue_slug
      ORDER BY vi.sort_order ASC, i.filename COLLATE NOCASE ASC
    `).all();

    const hidden = new Set(
      (Array.isArray(moment.hiddenImageIds) ? moment.hiddenImageIds : []).map(String),
    );
    const imageOrder = Array.isArray(moment.imageOrderIds)
      ? moment.imageOrderIds.map(String)
      : [];
    const orderRank = new Map(
      imageOrder.map((assetKey: string, index: number) => [assetKey, index]),
    );
    const pinned = Array.isArray(moment.pinnedImageIds)
      ? moment.pinnedImageIds.map(String)
      : [];
    const pinRank = new Map(
      pinned.map((assetKey: string, index: number) => [assetKey, index]),
    );
    const seen = new Set<string>();

    const images = (result.results || [])
      .filter((image: any) => {
        if (Number(image.hidden || 0) === 1) return false;
        const display = parse(image.display_json, {});
        if (!Boolean(display.moments)) return false;
        if (!matchesMoment(parse(image.moments_json, []), moment)) return false;
        const key = String(image.asset_key || "");
        if (!key || hidden.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((image: any) => ({
        assetKey: String(image.asset_key || ""),
        imageId: String(image.image_id || ""),
        filename: String(image.filename || ""),
        venueSlug: String(image.venue_slug || ""),
        venueName: String(image.venue_name || image.venue_slug || ""),
        thumbSrc: String(image.thumb_src || ""),
        fullSrc: String(image.full_src || ""),
        alt: String(image.alt || `${moment.name} wedding photography`),
        caption: String(image.caption || ""),
        sortOrder: Number(image.sort_order || 0),
      }))
      .sort((a: any, b: any) => {
        // New moment galleries can carry an exact editorial order. This is
        // what the admin drag-and-drop grid writes.
        const aOrder = orderRank.get(a.assetKey);
        const bOrder = orderRank.get(b.assetKey);
        if (aOrder !== undefined || bOrder !== undefined) {
          if (aOrder === undefined) return 1;
          if (bOrder === undefined) return -1;
          return aOrder - bOrder;
        }

        // Preserve compatibility with the earlier pinned-image release until
        // a gallery has been explicitly reordered and saved.
        const aPin = pinRank.get(a.assetKey);
        const bPin = pinRank.get(b.assetKey);
        if (aPin !== undefined || bPin !== undefined) {
          if (aPin === undefined) return 1;
          if (bPin === undefined) return -1;
          return aPin - bPin;
        }
        const aHash = hashStringToInt(`${slug}|${a.assetKey}`);
        const bHash = hashStringToInt(`${slug}|${b.assetKey}`);
        return aHash - bHash;
      });

    const heroWanted = String(moment.heroImageId || moment.cardImageId || "");
    const hero =
      images.find(
        (image: any) =>
          heroWanted &&
          (image.assetKey === heroWanted || image.imageId === heroWanted),
      ) || images[0] || null;

    const venueCount = new Set(images.map((image: any) => image.venueSlug).filter(Boolean)).size;

    return Response.json(
      {
        ok: true,
        moment: {
          id: moment.id,
          slug: moment.slug,
          name: moment.name,
          description: moment.description,
        },
        hero,
        images,
        venueCount,
      },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Unable to load moment gallery." },
      { status: 500 },
    );
  }
};
