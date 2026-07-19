type D1Db = any;

function text(value: unknown) { return String(value ?? "").trim(); }
function json(value: unknown, fallback: any) { try { return typeof value === "string" ? JSON.parse(value) : value ?? fallback; } catch { return fallback; } }
function httpError(message: string, statusCode = 400, details: string[] = []) {
  const error = new Error(message) as Error & { statusCode?: number; details?: string[] };
  error.statusCode = statusCode; error.details = details; return error;
}

export async function listAdminWeddings(db: D1Db) {
  const result = await db.prepare(`SELECT * FROM weddings ORDER BY couple COLLATE NOCASE ASC`).all();
  return (result.results || []).map((row: any) => ({
    ...json(row.document_json, {}),
    slug: row.slug,
    title: row.title,
    couple: row.couple,
    venue: row.venue,
    venueSlug: row.venue_slug,
    venueId: row.venue_id,
    weddingDate: row.wedding_date,
    excerpt: row.excerpt,
    intro: row.intro,
    status: row.status,
    storyEnabled: Boolean(row.story_enabled),
    storyStatus: row.story_status,
    storyPublishedAt: row.story_published_at || undefined,
    seo: { title: row.seo_title || "", description: row.seo_description || "" },
    storage: "json",
    weddingPath: `d1://weddings/${row.slug}`,
  }));
}

export async function getAdminWedding(db: D1Db, slug: string) {
  const row = await db.prepare(`SELECT * FROM weddings WHERE slug = ?`).bind(slug).first();
  if (!row) return null;
  return (await listAdminWeddings(db)).find((item: any) => item.slug === slug) || null;
}

export async function getWeddingImages(db: D1Db, slug: string) {
  const result = await db.prepare(`
    SELECT wi.*, i.image_id, i.filename, i.full_src, i.thumb_src, i.alt, i.caption,
           i.tags_json, i.ai_tags_json, i.source_type, i.source_json
    FROM wedding_images wi
    JOIN images i ON i.asset_key = wi.asset_key
    WHERE wi.wedding_slug = ?
    ORDER BY wi.sort_order ASC, i.filename ASC
  `).bind(slug).all();

  return {
    schemaVersion: 1,
    weddingSlug: slug,
    updatedAt: new Date().toISOString(),
    images: (result.results || []).map((row: any) => ({
      id: text(row.image_id) || text(row.asset_key).split(":").pop() || text(row.asset_key),
      filename: text(row.filename),
      order: Number(row.sort_order || 0),
      isCover: Boolean(row.is_cover),
      hidden: Boolean(row.hidden),
      rating: Number(row.rating || 0),
      collections: json(row.collections_json, []),
      thumbSrc: text(row.thumb_src),
      fullSrc: text(row.full_src),
      aiTags: json(row.ai_tags_json, []),
      aiAlt: text(row.alt),
      aiCaption: text(row.caption),
      source: { ...json(row.source_json, {}), type: text(row.source_type) || json(row.source_json, {})?.type || "" },
    })),
  };
}

export async function saveWeddingImages(db: D1Db, slug: string, document: any) {
  const wedding = await db.prepare(`SELECT slug FROM weddings WHERE slug = ?`).bind(slug).first();
  if (!wedding) throw httpError("Wedding not found.", 404);
  const incoming = Array.isArray(document?.images) ? document.images : [];
  const existing = await db.prepare(`SELECT asset_key, image_id, filename FROM images WHERE wedding_slug = ?`).bind(slug).all();
  const byId = new Map<string, any>();
  const byFilename = new Map<string, any>();
  for (const row of existing.results || []) {
    if (text(row.image_id)) byId.set(text(row.image_id), row);
    byFilename.set(text(row.filename).toLowerCase(), row);
  }

  const statements: any[] = [db.prepare(`DELETE FROM wedding_images WHERE wedding_slug = ?`).bind(slug)];
  statements.push(db.prepare(`DELETE FROM story_images WHERE wedding_slug = ?`).bind(slug));
  let saved = 0;
  for (let index = 0; index < incoming.length; index += 1) {
    const item = incoming[index];
    const match = byId.get(text(item?.id)) || byFilename.get(text(item?.filename).toLowerCase());
    if (!match) continue;
    const collections = Array.isArray(item?.collections) ? [...new Set(item.collections.map((v: any) => text(v)).filter(Boolean))] : [];
    statements.push(db.prepare(`
      INSERT INTO wedding_images (wedding_slug, asset_key, sort_order, is_cover, hidden, rating, collections_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(slug, match.asset_key, Number(item?.order || index + 1), item?.isCover ? 1 : 0, item?.hidden ? 1 : 0, Number(item?.rating || 0), JSON.stringify(collections)));
    if (collections.includes("blog")) {
      statements.push(db.prepare(`
        INSERT INTO story_images (wedding_slug, asset_key, sort_order, is_cover) VALUES (?, ?, ?, ?)
      `).bind(slug, match.asset_key, Number(item?.order || index + 1), item?.isCover ? 1 : 0));
    }
    saved += 1;
  }
  await db.batch(statements);
  return { ok: true, slug, savedImages: saved, backupPath: null };
}
