import { ensureMasterSupplier } from "./supplier-d1";

type D1Db = any;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function json<T = any>(value: unknown, fallback: T): T {
  try {
    if (typeof value === "string") return JSON.parse(value) as T;
    return (value ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function list(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => text(item)).filter(Boolean)
    : [];
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

async function runBatches(db: D1Db, statements: any[], size = 75) {
  for (let index = 0; index < statements.length; index += size) {
    const chunk = statements.slice(index, index + size);
    if (chunk.length) await db.batch(chunk);
  }
}

function httpError(
  message: string,
  statusCode = 400,
  details: string[] = [],
) {
  const error = new Error(message) as Error & {
    statusCode?: number;
    details?: string[];
  };
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function slugify(value: string) {
  return text(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function cleanSupplier(item: any) {
  return {
    supplierId: text(item?.supplierId || item?.id),
    role: text(item?.role || item?.category),
    name: text(item?.name),
    website: text(item?.website),
    instagram: text(item?.instagram).replace(/^@/, ""),
    email: text(item?.email),
    phone: text(item?.phone),
    location: text(item?.location),
    county: text(item?.county),
  };
}

function cleanWedding(incoming: any, existing?: any) {
  const source = {
    ...(existing && typeof existing === "object" ? existing : {}),
    ...(incoming && typeof incoming === "object" ? incoming : {}),
  };

  const slug = text(source.slug);
  const title = text(source.title);
  const couple = text(source.couple);
  const venue = text(source.venue);
  const weddingDate = text(source.weddingDate);

  const errors: string[] = [];
  if (!slug) errors.push("Slug is required.");
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.push("Slug can contain lowercase letters, numbers and hyphens only.");
  }
  if (!title) errors.push("Title is required.");
  if (!couple) errors.push("Couple is required.");
  if (!venue) errors.push("Venue is required.");
  if (!weddingDate) errors.push("Wedding date is required.");
  if (errors.length) throw httpError("Wedding validation failed.", 400, errors);

  const facts = source.facts && typeof source.facts === "object"
    ? {
        season: text(source.facts.season),
        ceremonyType: text(source.facts.ceremonyType),
        ceremonyLocation: text(source.facts.ceremonyLocation),
        receptionLocation: text(source.facts.receptionLocation),
        celebrant: text(source.facts.celebrant),
        photographer: text(source.facts.photographer),
      }
    : {};

  const suppliers = Array.isArray(source.suppliers)
    ? source.suppliers
        .map(cleanSupplier)
        .filter((supplier: any) => supplier.role || supplier.name)
    : [];

  return {
    schemaVersion: 1,
    slug,
    title,
    couple,
    venue,
    venueSlug: text(source.venueSlug) || slugify(venue),
    venueId: text(source.venueId),
    weddingDate,
    excerpt: text(source.excerpt),
    intro: text(source.intro),
    story: Array.isArray(source.story)
      ? source.story.map((paragraph: any) => text(paragraph)).filter(Boolean)
      : [],
    facts,
    suppliers,
    seo: {
      title: text(source.seo?.title),
      description: text(source.seo?.description),
    },
    status: ["draft", "published", "archived"].includes(text(source.status))
      ? text(source.status)
      : "draft",
    updatedAt: new Date().toISOString(),
  };
}

function hydrateWedding(row: any) {
  const document = json(row.document_json, {} as any);
  return {
    ...document,
    schemaVersion: 1,
    slug: text(row.slug),
    title: text(row.title),
    couple: text(row.couple),
    venue: text(row.venue),
    venueSlug: text(row.venue_slug),
    venueId: text(row.venue_id),
    weddingDate: text(row.wedding_date),
    excerpt: text(row.excerpt),
    intro: text(row.intro),
    status: text(row.status || "draft"),
    storyEnabled: Boolean(row.story_enabled),
    storyStatus: text(row.story_status || "draft"),
    storyPublishedAt: row.story_published_at || undefined,
    storySortOrder: Number(row.story_sort_order || 0),
    storyListVisible: row.story_list_visible === undefined ? true : Boolean(row.story_list_visible),
    seo: {
      title: text(row.seo_title || document?.seo?.title),
      description: text(row.seo_description || document?.seo?.description),
    },
    updatedAt: row.updated_at || document?.updatedAt,
    storage: "d1",
    weddingPath: `d1://weddings/${row.slug}`,
  };
}

function storyFactRows(facts: any) {
  const rows = [
    ["Season", facts?.season],
    ["Ceremony", facts?.ceremonyType],
    ["Ceremony Location", facts?.ceremonyLocation],
    ["Reception Location", facts?.receptionLocation],
    ["Celebrant", facts?.celebrant],
    ["Photography", facts?.photographer],
  ];

  return rows
    .filter(([, value]) => text(value))
    .map(([label, value]) => ({ label, value: text(value) }));
}

function factsFromStoryRows(rows: any[]) {
  const facts: Record<string, string> = {};
  const keyByLabel: Record<string, string> = {
    season: "season",
    ceremony: "ceremonyType",
    "ceremony type": "ceremonyType",
    "ceremony location": "ceremonyLocation",
    reception: "receptionLocation",
    "reception location": "receptionLocation",
    celebrant: "celebrant",
    photography: "photographer",
    photographer: "photographer",
  };

  for (const row of rows || []) {
    const label = text(row?.label);
    const value = text(row?.value);
    if (!label || !value) continue;
    const key = keyByLabel[label.toLowerCase()] || slugify(label).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    facts[key] = value;
  }

  return facts;
}

async function replaceSuppliers(db: D1Db, slug: string, suppliers: any[], workspaceId: string) {
  const cleanRows: any[] = [];

  for (const supplier of suppliers || []) {
    const clean = cleanSupplier(supplier);
    if (!clean.role && !clean.name) continue;
    const master = await ensureMasterSupplier(db, {
      id: clean.supplierId,
      name: clean.name,
      displayName: clean.name,
      category: clean.role,
      website: clean.website,
      instagram: clean.instagram,
      email: clean.email,
      phone: clean.phone,
      location: clean.location,
      county: clean.county,
    }, workspaceId);
    cleanRows.push({
      ...clean,
      supplierId: master?.id || clean.supplierId,
      name: master?.name || clean.name,
      website: master?.website || clean.website,
      instagram: master?.instagram || clean.instagram,
      role: clean.role || master?.category || "Supplier",
    });
  }

  const statements: any[] = [
    db.prepare(`DELETE FROM wedding_suppliers WHERE wedding_slug = ? AND workspace_id = ?`).bind(slug, workspaceId),
    db.prepare(`DELETE FROM wedding_supplier_links WHERE wedding_slug = ? AND workspace_id = ?`).bind(slug, workspaceId),
  ];

  cleanRows.forEach((clean, index) => {
    statements.push(
      db.prepare(`
        INSERT INTO wedding_suppliers (
          wedding_slug, workspace_id, sort_order, role, name, website, instagram
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        slug, workspaceId, index + 1, clean.role, clean.name, clean.website, clean.instagram,
      ),
    );
    if (clean.supplierId) {
      statements.push(
        db.prepare(`
          INSERT INTO wedding_supplier_links (wedding_slug, workspace_id, supplier_id, role, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `).bind(slug, workspaceId, clean.supplierId, clean.role, index + 1),
      );
    }
  });

  await runBatches(db, statements);
  return cleanRows;
}

export async function listAdminWeddings(db: D1Db, workspaceId = "workspace_mkb_weddings") {
  const result = await db.prepare(`
    SELECT *
    FROM weddings
    WHERE workspace_id = ?
    ORDER BY CASE WHEN story_sort_order > 0 THEN 0 ELSE 1 END, story_sort_order ASC, couple COLLATE NOCASE ASC, title COLLATE NOCASE ASC
  `).bind(workspaceId).all();

  return (result.results || []).map(hydrateWedding);
}

export async function getAdminWedding(db: D1Db, slug: string, workspaceId = "workspace_mkb_weddings") {
  const row = await db.prepare(`SELECT * FROM weddings WHERE slug = ? AND workspace_id = ?`).bind(slug, workspaceId).first();
  return row ? hydrateWedding(row) : null;
}

export async function createAdminWedding(db: D1Db, incoming: any, workspaceId = "workspace_mkb_weddings") {
  const wedding = cleanWedding(incoming);
  const exists = await db.prepare(`SELECT slug FROM weddings WHERE slug = ? AND workspace_id = ?`).bind(wedding.slug, workspaceId).first();
  if (exists) throw httpError("A wedding with this slug already exists.", 409);

  await db.prepare(`
    INSERT INTO weddings (
      slug, workspace_id, source, title, couple, venue, venue_slug, venue_id, wedding_date,
      excerpt, intro, status, story_enabled, story_status, story_published_at,
      seo_title, seo_description, document_json, published_json, published_at, updated_at
    ) VALUES (?, ?, 'd1', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'draft', NULL, ?, ?, ?, '', NULL, CURRENT_TIMESTAMP)
  `).bind(
    wedding.slug,
    workspaceId,
    wedding.title,
    wedding.couple,
    wedding.venue,
    wedding.venueSlug,
    wedding.venueId,
    wedding.weddingDate,
    wedding.excerpt,
    wedding.intro,
    wedding.status,
    wedding.seo.title,
    wedding.seo.description,
    JSON.stringify(wedding),
  ).run();

  await replaceSuppliers(db, wedding.slug, wedding.suppliers || [], workspaceId);
  return getAdminWedding(db, wedding.slug, workspaceId);
}

export async function updateAdminWedding(db: D1Db, routeSlug: string, incoming: any, workspaceId = "workspace_mkb_weddings") {
  const row = await db.prepare(`SELECT * FROM weddings WHERE slug = ? AND workspace_id = ?`).bind(routeSlug, workspaceId).first();
  if (!row) throw httpError("Wedding not found.", 404);

  const existing = hydrateWedding(row);
  const wedding = cleanWedding(incoming, existing);

  if (wedding.slug !== routeSlug) {
    const conflict = await db.prepare(`SELECT slug FROM weddings WHERE slug = ? AND workspace_id = ?`).bind(wedding.slug, workspaceId).first();
    if (conflict) throw httpError("A wedding with this slug already exists.", 409);
  }

  const statements: any[] = [];

  if (wedding.slug !== routeSlug) {
    statements.push(
      db.prepare(`UPDATE images SET wedding_slug = ? WHERE wedding_slug = ? AND workspace_id = ?`).bind(wedding.slug, routeSlug, workspaceId),
      db.prepare(`UPDATE wedding_images SET wedding_slug = ? WHERE wedding_slug = ? AND workspace_id = ?`).bind(wedding.slug, routeSlug, workspaceId),
      db.prepare(`UPDATE story_images SET wedding_slug = ? WHERE wedding_slug = ? AND workspace_id = ?`).bind(wedding.slug, routeSlug, workspaceId),
      db.prepare(`UPDATE published_story_images SET wedding_slug = ? WHERE wedding_slug = ? AND workspace_id = ?`).bind(wedding.slug, routeSlug, workspaceId),
      db.prepare(`UPDATE wedding_suppliers SET wedding_slug = ? WHERE wedding_slug = ? AND workspace_id = ?`).bind(wedding.slug, routeSlug, workspaceId),
      db.prepare(`UPDATE wedding_supplier_links SET wedding_slug = ? WHERE wedding_slug = ? AND workspace_id = ?`).bind(wedding.slug, routeSlug, workspaceId),
      db.prepare(`UPDATE asset_wedding_links SET wedding_slug = ? WHERE wedding_slug = ? AND workspace_id = ?`).bind(wedding.slug, routeSlug, workspaceId),
      db.prepare(`UPDATE client_galleries SET wedding_slug = ? WHERE wedding_slug = ? AND workspace_id = ?`).bind(wedding.slug, routeSlug, workspaceId),
      db.prepare(`UPDATE wedding_preview_sets SET wedding_slug = ? WHERE wedding_slug = ? AND workspace_id = ?`).bind(wedding.slug, routeSlug, workspaceId),
    );
  }

  statements.push(
    db.prepare(`
      UPDATE weddings SET
        slug = ?,
        source = 'd1',
        title = ?,
        couple = ?,
        venue = ?,
        venue_slug = ?,
        venue_id = ?,
        wedding_date = ?,
        excerpt = ?,
        intro = ?,
        status = ?,
        seo_title = ?,
        seo_description = ?,
        document_json = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE slug = ? AND workspace_id = ?
    `).bind(
      wedding.slug,
      wedding.title,
      wedding.couple,
      wedding.venue,
      wedding.venueSlug,
      wedding.venueId,
      wedding.weddingDate,
      wedding.excerpt,
      wedding.intro,
      wedding.status,
      wedding.seo.title,
      wedding.seo.description,
      JSON.stringify(wedding),
      routeSlug,
      workspaceId,
    ),
  );

  await runBatches(db, statements);
  await replaceSuppliers(db, wedding.slug, wedding.suppliers || [], workspaceId);
  return getAdminWedding(db, wedding.slug, workspaceId);
}

export async function archiveAdminWedding(db: D1Db, slug: string, workspaceId = "workspace_mkb_weddings") {
  const row = await db.prepare(`SELECT * FROM weddings WHERE slug = ? AND workspace_id = ?`).bind(slug, workspaceId).first();
  if (!row) throw httpError("Wedding not found.", 404);

  const document = json(row.document_json, {} as any);
  const nextDocument = {
    ...document,
    status: "archived",
    updatedAt: new Date().toISOString(),
  };

  await db.prepare(`
    UPDATE weddings SET
      status = 'archived',
      story_enabled = 0,
      story_status = 'archived',
      document_json = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE slug = ? AND workspace_id = ?
  `).bind(JSON.stringify(nextDocument), slug, workspaceId).run();

  return getAdminWedding(db, slug, workspaceId);
}

export async function deleteAdminWeddingPermanently(db: D1Db, slug: string, workspaceId = "workspace_mkb_weddings") {
  const row = await db.prepare(`SELECT slug, title, couple FROM weddings WHERE slug = ? AND workspace_id = ?`).bind(slug, workspaceId).first();
  if (!row) throw httpError("Wedding not found.", 404);

  const liveGalleryResult = await db.prepare(`
    SELECT id, title
    FROM client_galleries
    WHERE wedding_slug = ? AND workspace_id = ? AND status = 'live'
    ORDER BY updated_at DESC
  `).bind(slug, workspaceId).all();
  const liveGalleries = liveGalleryResult?.results || [];
  if (liveGalleries.length) {
    throw httpError(
      "This wedding has a live Client Gallery and cannot be permanently deleted yet.",
      409,
      liveGalleries.map((gallery: any) => `Archive the Client Gallery first: ${text(gallery.title) || text(gallery.id)}`),
    );
  }

  const statements = [
    // Preserve Client Galleries and all canonical/private assets, but detach non-live galleries
    // from the wedding being removed.
    db.prepare(`UPDATE client_galleries SET wedding_slug = NULL, updated_at = CURRENT_TIMESTAMP WHERE wedding_slug = ? AND workspace_id = ?`).bind(slug, workspaceId),

    // Remove wedding-specific Preview Set membership before deleting the parent sets.
    db.prepare(`
      DELETE FROM wedding_preview_assets
      WHERE preview_set_id IN (SELECT id FROM wedding_preview_sets WHERE wedding_slug = ? AND workspace_id = ?)
    `).bind(slug, workspaceId),
    db.prepare(`DELETE FROM wedding_preview_sets WHERE wedding_slug = ? AND workspace_id = ?`).bind(slug, workspaceId),

    // Remove relationships only. Canonical assets and R2 objects are deliberately retained.
    db.prepare(`DELETE FROM asset_wedding_links WHERE wedding_slug = ? AND workspace_id = ?`).bind(slug, workspaceId),
    db.prepare(`DELETE FROM wedding_supplier_links WHERE wedding_slug = ? AND workspace_id = ?`).bind(slug, workspaceId),
    db.prepare(`DELETE FROM wedding_suppliers WHERE wedding_slug = ? AND workspace_id = ?`).bind(slug, workspaceId),
    db.prepare(`DELETE FROM published_story_images WHERE wedding_slug = ? AND workspace_id = ?`).bind(slug, workspaceId),
    db.prepare(`DELETE FROM story_images WHERE wedding_slug = ? AND workspace_id = ?`).bind(slug, workspaceId),
    db.prepare(`DELETE FROM wedding_images WHERE wedding_slug = ? AND workspace_id = ?`).bind(slug, workspaceId),

    // Legacy image rows remain available to the Asset Library; only their wedding ownership is cleared.
    db.prepare(`UPDATE images SET wedding_slug = '', updated_at = CURRENT_TIMESTAMP WHERE wedding_slug = ? AND workspace_id = ?`).bind(slug, workspaceId),

    db.prepare(`DELETE FROM weddings WHERE slug = ? AND workspace_id = ?`).bind(slug, workspaceId),
  ];

  await runBatches(db, statements);

  return {
    slug,
    title: text(row.title),
    couple: text(row.couple),
    deleted: true,
    assetsPreserved: true,
  };
}

export async function getWeddingImages(db: D1Db, slug: string, workspaceId = "workspace_mkb_weddings") {
  const result = await db.prepare(`
    SELECT
      i.asset_key,
      i.image_id,
      i.filename,
      i.full_src,
      i.thumb_src,
      i.alt,
      i.caption,
      i.tags_json,
      i.ai_tags_json,
      i.source_type,
      i.source_json,
      COALESCE(wi.sort_order, si.sort_order, 0) AS sort_order,
      COALESCE(wi.is_cover, si.is_cover, 0) AS is_cover,
      COALESCE(wi.hidden, 0) AS hidden,
      COALESCE(wi.rating, 0) AS rating,
      COALESCE(wi.collections_json, '[]') AS collections_json,
      CASE WHEN si.asset_key IS NULL THEN 0 ELSE 1 END AS in_story
    FROM images i
    LEFT JOIN wedding_images wi
      ON wi.wedding_slug = ? AND wi.asset_key = i.asset_key AND wi.workspace_id = i.workspace_id
    LEFT JOIN story_images si
      ON si.wedding_slug = ? AND si.asset_key = i.asset_key AND si.workspace_id = i.workspace_id
    WHERE i.wedding_slug = ?
      AND i.workspace_id = ?
      AND (wi.asset_key IS NOT NULL OR si.asset_key IS NOT NULL)
    ORDER BY sort_order ASC, i.filename COLLATE NOCASE ASC
  `).bind(slug, slug, slug, workspaceId).all();

  return {
    schemaVersion: 1,
    weddingSlug: slug,
    updatedAt: new Date().toISOString(),
    images: (result.results || []).map((row: any, index: number) => {
      const collections = unique([
        ...list(json(row.collections_json, [])),
        ...(Boolean(row.in_story) ? ["blog"] : []),
      ]);

      return {
        id: text(row.image_id) || text(row.asset_key).split(":").pop() || text(row.asset_key),
        filename: text(row.filename),
        order: Number(row.sort_order || index + 1),
        isCover: Boolean(row.is_cover),
        hidden: Boolean(row.hidden),
        rating: Number(row.rating || 0),
        collections,
        thumbSrc: text(row.thumb_src),
        fullSrc: text(row.full_src),
        tags: json(row.tags_json, []),
        aiTags: json(row.ai_tags_json, []),
        aiAlt: text(row.alt),
        aiCaption: text(row.caption),
        source: {
          ...json(row.source_json, {}),
          type: text(row.source_type) || json<any>(row.source_json, {})?.type || "",
        },
      };
    }),
  };
}

export async function saveWeddingImages(db: D1Db, slug: string, document: any, workspaceId = "workspace_mkb_weddings") {
  const wedding = await db.prepare(`SELECT slug FROM weddings WHERE slug = ? AND workspace_id = ?`).bind(slug, workspaceId).first();
  if (!wedding) throw httpError("Wedding not found.", 404);

  const incoming = Array.isArray(document?.images) ? document.images : [];
  const existing = await db.prepare(`
    SELECT asset_key, image_id, filename
    FROM images
    WHERE wedding_slug = ? AND workspace_id = ?
  `).bind(slug, workspaceId).all();

  const byId = new Map<string, any>();
  const byFilename = new Map<string, any[]>();
  for (const row of existing.results || []) {
    if (text(row.image_id)) byId.set(text(row.image_id), row);
    const filenameKey = text(row.filename).toLowerCase();
    if (filenameKey) {
      const matches = byFilename.get(filenameKey) || [];
      matches.push(row);
      byFilename.set(filenameKey, matches);
    }
  }

  const statements: any[] = [
    db.prepare(`DELETE FROM wedding_images WHERE wedding_slug = ? AND workspace_id = ?`).bind(slug, workspaceId),
    db.prepare(`DELETE FROM story_images WHERE wedding_slug = ? AND workspace_id = ?`).bind(slug, workspaceId),
  ];

  const resolved = new Map<
    string,
    {
      match: any;
      item: any;
      order: number;
      collections: string[];
    }
  >();

  for (let index = 0; index < incoming.length; index += 1) {
    const item = incoming[index];
    const itemId = text(item?.id);
    const filenameMatches =
      byFilename.get(text(item?.filename).toLowerCase()) || [];
    const match =
      (itemId ? byId.get(itemId) : undefined) ||
      (filenameMatches.length === 1 ? filenameMatches[0] : undefined);
    if (!match) continue;

    const collections = unique(list(item?.collections));
    const order = Number(item?.order || index + 1);

    const assetKey = text(match.asset_key);
    if (!assetKey) continue;

    const previous = resolved.get(assetKey);
    if (previous) {
      resolved.set(assetKey, {
        match,
        item: {
          ...previous.item,
          ...item,
          isCover: Boolean(previous.item?.isCover || item?.isCover),
          hidden: Boolean(previous.item?.hidden || item?.hidden),
          rating: Math.max(
            Number(previous.item?.rating || 0),
            Number(item?.rating || 0),
          ),
        },
        order: Math.min(previous.order, order),
        collections: unique([
          ...previous.collections,
          ...collections,
        ]),
      });
      continue;
    }

    resolved.set(assetKey, {
      match,
      item,
      order,
      collections,
    });
  }

  let saved = 0;
  for (const { match, item, order, collections } of resolved.values()) {

    statements.push(
      db.prepare(`
        INSERT INTO wedding_images (
          wedding_slug, workspace_id, asset_key, sort_order, is_cover, hidden, rating, collections_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        slug,
        workspaceId,
        match.asset_key,
        order,
        item?.isCover ? 1 : 0,
        item?.hidden ? 1 : 0,
        Number(item?.rating || 0),
        JSON.stringify(collections),
      ),
    );

    if (collections.includes("blog")) {
      statements.push(
        db.prepare(`
          INSERT INTO story_images (
            wedding_slug, workspace_id, asset_key, sort_order, is_cover
          ) VALUES (?, ?, ?, ?, ?)
        `).bind(slug, workspaceId, match.asset_key, order, item?.isCover ? 1 : 0),
      );
    }

    saved += 1;
  }

  await runBatches(db, statements);
  return {
    ok: true,
    slug,
    savedImages: saved,
    backupPath: null,
  };
}

export async function getWeddingSuppliers(db: D1Db, slug: string, workspaceId = "workspace_mkb_weddings") {
  const result = await db.prepare(`
    SELECT l.wedding_slug, l.sort_order, l.role, l.supplier_id,
           s.name, s.website, s.instagram, s.email, s.phone, s.location, s.county, s.category
    FROM wedding_supplier_links l
    JOIN suppliers s ON s.id = l.supplier_id AND s.workspace_id = l.workspace_id
    WHERE l.wedding_slug = ? AND l.workspace_id = ?
    ORDER BY l.sort_order ASC, l.role COLLATE NOCASE ASC, s.name COLLATE NOCASE ASC
  `).bind(slug, workspaceId).all();

  if ((result.results || []).length) {
    return (result.results || []).map((row: any) => ({
      supplierId: text(row.supplier_id),
      blogSlug: text(row.wedding_slug),
      role: text(row.role || row.category),
      name: text(row.name),
      website: text(row.website),
      instagram: text(row.instagram),
      email: text(row.email),
      phone: text(row.phone),
      location: text(row.location),
      county: text(row.county),
      sortOrder: String(Number(row.sort_order || 0)),
    }));
  }

  const legacy = await db.prepare(`
    SELECT wedding_slug, sort_order, role, name, website, instagram
    FROM wedding_suppliers
    WHERE wedding_slug = ? AND workspace_id = ?
    ORDER BY sort_order ASC, role COLLATE NOCASE ASC, name COLLATE NOCASE ASC
  `).bind(slug, workspaceId).all();

  return (legacy.results || []).map((row: any) => ({
    blogSlug: text(row.wedding_slug), role: text(row.role), name: text(row.name),
    website: text(row.website), instagram: text(row.instagram),
    sortOrder: String(Number(row.sort_order || 0)),
  }));
}

export async function listAdminSuppliers(db: D1Db, workspaceId = "workspace_mkb_weddings") {
  const result = await db.prepare(`
    SELECT l.wedding_slug, l.sort_order, l.role, l.supplier_id,
           s.name, s.website, s.instagram, s.email, s.phone, s.location, s.county
    FROM wedding_supplier_links l
    JOIN suppliers s ON s.id = l.supplier_id AND s.workspace_id = l.workspace_id
    WHERE l.workspace_id = ?
    ORDER BY l.wedding_slug COLLATE NOCASE ASC, l.sort_order ASC
  `).bind(workspaceId).all();

  return (result.results || []).map((row: any) => ({
    supplierId: text(row.supplier_id), blogSlug: text(row.wedding_slug), role: text(row.role),
    name: text(row.name), website: text(row.website), instagram: text(row.instagram),
    email: text(row.email), phone: text(row.phone), location: text(row.location), county: text(row.county),
    sortOrder: String(Number(row.sort_order || 0)),
  }));
}

export async function saveWeddingSuppliers(db: D1Db, slug: string, rows: any[], workspaceId = "workspace_mkb_weddings") {
  const weddingRow = await db.prepare(`SELECT * FROM weddings WHERE slug = ? AND workspace_id = ?`).bind(slug, workspaceId).first();
  if (!weddingRow) throw httpError("Wedding not found.", 404);

  const suppliers = (Array.isArray(rows) ? rows : [])
    .map(cleanSupplier)
    .filter((supplier) => supplier.role || supplier.name);

  const validation: string[] = [];
  suppliers.forEach((supplier, index) => {
    if (!supplier.role) validation.push(`Supplier ${index + 1}: role is required.`);
    if (!supplier.name) validation.push(`Supplier ${index + 1}: name is required.`);
    if (supplier.website && !/^https?:\/\//i.test(supplier.website)) {
      validation.push(`Supplier ${index + 1}: website must begin with http:// or https://.`);
    }
  });
  if (validation.length) throw httpError("Supplier validation failed.", 400, validation);

  const savedSuppliers = await replaceSuppliers(db, slug, suppliers, workspaceId);

  const document = json(weddingRow.document_json, {} as any);
  const nextDocument = {
    ...document,
    suppliers: savedSuppliers.map(({ supplierId, email, phone, location, county, ...supplier }) => supplier),
    updatedAt: new Date().toISOString(),
  };

  await db.prepare(`
    UPDATE weddings
    SET document_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE slug = ? AND workspace_id = ?
  `).bind(JSON.stringify(nextDocument), slug, workspaceId).run();

  return {
    ok: true,
    blogSlug: slug,
    savedRows: savedSuppliers.length,
    totalRows: savedSuppliers.length,
    backupPath: null,
  };
}

export async function getWeddingStory(db: D1Db, slug: string, workspaceId = "workspace_mkb_weddings") {
  const wedding = await getAdminWedding(db, slug, workspaceId);
  if (!wedding) return null;

  return {
    slug,
    title: text(wedding.title),
    excerpt: text(wedding.excerpt),
    intro: text(wedding.intro),
    paragraphs: Array.isArray(wedding.story) ? wedding.story : [],
    facts: storyFactRows(wedding.facts || {}),
    updatedAt: wedding.updatedAt,
  };
}

export async function saveWeddingStory(db: D1Db, slug: string, story: any, workspaceId = "workspace_mkb_weddings") {
  const row = await db.prepare(`SELECT * FROM weddings WHERE slug = ? AND workspace_id = ?`).bind(slug, workspaceId).first();
  if (!row) throw httpError("Wedding not found.", 404);

  const title = text(story?.title);
  const intro = text(story?.intro);
  const paragraphs = Array.isArray(story?.paragraphs)
    ? story.paragraphs.map((item: any) => text(item)).filter(Boolean)
    : [];

  const errors: string[] = [];
  if (!title) errors.push("Title is required.");
  if (!intro) errors.push("Intro is required.");
  if (!paragraphs.length) errors.push("At least one paragraph is required.");
  if (errors.length) throw httpError("Story validation failed.", 400, errors);

  const document = json(row.document_json, {} as any);
  const nextDocument = {
    ...document,
    title,
    excerpt: text(story?.excerpt),
    intro,
    story: paragraphs,
    facts: factsFromStoryRows(Array.isArray(story?.facts) ? story.facts : []),
    updatedAt: new Date().toISOString(),
  };

  await db.prepare(`
    UPDATE weddings SET
      title = ?,
      excerpt = ?,
      intro = ?,
      document_json = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE slug = ? AND workspace_id = ?
  `).bind(
    nextDocument.title,
    nextDocument.excerpt,
    nextDocument.intro,
    JSON.stringify(nextDocument),
    slug,
    workspaceId,
  ).run();

  return {
    ok: true,
    slug,
    story: await getWeddingStory(db, slug, workspaceId),
    backupPath: null,
    weddingBackupPath: null,
  };
}

async function publicImages(db: D1Db, slug: string, published = true, workspaceId = "workspace_mkb_weddings") {
  const table = published ? "published_story_images" : "story_images";
  const result = await db.prepare(`
    SELECT
      si.sort_order,
      si.is_cover,
      i.asset_key,
      i.image_id,
      i.filename,
      i.full_src,
      i.thumb_src,
      i.alt,
      i.caption,
      i.tags_json,
      i.ai_tags_json
    FROM ${table} si
    JOIN images i ON i.asset_key = si.asset_key AND i.workspace_id = si.workspace_id
    WHERE si.wedding_slug = ? AND si.workspace_id = ?
    ORDER BY si.sort_order ASC, i.filename COLLATE NOCASE ASC
  `).bind(slug, workspaceId).all();

  return (result.results || [])
    .map((row: any, index: number) => ({
      id: text(row.image_id) || text(row.asset_key).split(":").pop() || text(row.asset_key),
      filename: text(row.filename),
      order: Number(row.sort_order || index + 1),
      thumbSrc: text(row.thumb_src) || text(row.full_src),
      fullSrc: text(row.full_src) || text(row.thumb_src),
      alt: text(row.alt),
      caption: text(row.caption),
      tags: unique([
        ...list(json(row.tags_json, [])),
        ...list(json(row.ai_tags_json, [])),
      ]),
      isCover: Boolean(row.is_cover),
    }))
    .filter((image: any) => image.filename && (image.thumbSrc || image.fullSrc));
}

function publishChecks(wedding: any, images: any[]) {
  const cover = images.find((image) => image.isCover) || images[0];
  const checks = [
    {
      id: "title",
      label: "Story title",
      detail: wedding.title ? "A title is present." : "Add a story title.",
      passed: Boolean(text(wedding.title)),
      severity: "required" as const,
    },
    {
      id: "couple",
      label: "Couple and venue",
      detail:
        wedding.couple && wedding.venue
          ? `${wedding.couple} · ${wedding.venue}`
          : "Couple and venue are required.",
      passed: Boolean(text(wedding.couple) && text(wedding.venue)),
      severity: "required" as const,
    },
    {
      id: "date",
      label: "Wedding date",
      detail: wedding.weddingDate || "Add a wedding date.",
      passed: Boolean(text(wedding.weddingDate)),
      severity: "required" as const,
    },
    {
      id: "intro",
      label: "Story introduction",
      detail: wedding.intro ? "An introduction is present." : "Add an introduction.",
      passed: Boolean(text(wedding.intro)),
      severity: "required" as const,
    },
    {
      id: "story",
      label: "Story body",
      detail: `${Array.isArray(wedding.story) ? wedding.story.length : 0} story paragraphs selected.`,
      passed: Array.isArray(wedding.story) && wedding.story.some((item: any) => text(item)),
      severity: "required" as const,
    },
    {
      id: "images",
      label: "Wedding story images",
      detail: `${images.length} images are assigned to the Blog collection.`,
      passed: images.length > 0,
      severity: "required" as const,
    },
    {
      id: "cover",
      label: "Cover image",
      detail: cover ? `Cover: ${cover.filename}` : "Select a cover image.",
      passed: Boolean(cover),
      severity: "required" as const,
    },
    {
      id: "image-urls",
      label: "Public image URLs",
      detail: images.every((image) => /^https:\/\//i.test(image.fullSrc) && /^https:\/\//i.test(image.thumbSrc))
        ? "All selected images use public HTTPS URLs."
        : "One or more selected images are missing public URLs.",
      passed: images.length > 0 && images.every((image) => /^https:\/\//i.test(image.fullSrc) && /^https:\/\//i.test(image.thumbSrc)),
      severity: "required" as const,
    },
    {
      id: "alt",
      label: "Image alt text",
      detail: `${images.filter((image) => text(image.alt)).length}/${images.length} selected images have alt text.`,
      passed: images.length > 0 && images.every((image) => text(image.alt)),
      severity: "recommended" as const,
    },
    {
      id: "seo",
      label: "SEO metadata",
      detail:
        wedding.seo?.title && wedding.seo?.description
          ? "SEO title and description are present."
          : "Add an SEO title and description for best search presentation.",
      passed: Boolean(text(wedding.seo?.title) && text(wedding.seo?.description)),
      severity: "recommended" as const,
    },
  ];

  return { checks, cover };
}

export async function getWeddingPublishPreview(db: D1Db, slug: string, workspaceId = "workspace_mkb_weddings") {
  const wedding = await getAdminWedding(db, slug, workspaceId);
  if (!wedding) throw httpError("Wedding not found.", 404);

  const images = await publicImages(db, slug, false, workspaceId);
  const { checks, cover } = publishChecks(wedding, images);
  const required = checks.filter((check) => check.severity === "required");
  const recommended = checks.filter((check) => check.severity === "recommended");

  return {
    slug,
    wedding,
    storyEnabled: Boolean(wedding.storyEnabled),
    storyStatus: wedding.storyStatus || "draft",
    action: wedding.storyEnabled && wedding.storyStatus === "published" ? "unpublish" : "publish",
    readyToPublish: required.every((check) => check.passed),
    checks,
    requiredPassed: required.filter((check) => check.passed).length,
    requiredTotal: required.length,
    recommendedPassed: recommended.filter((check) => check.passed).length,
    recommendedTotal: recommended.length,
    imageCount: images.length,
    coverImage: cover
      ? {
          id: cover.id,
          filename: cover.filename,
          thumbSrc: cover.thumbSrc,
          fullSrc: cover.fullSrc,
          alt: cover.alt,
        }
      : null,
  };
}

export async function publishAdminWedding(db: D1Db, slug: string, storyEnabled: boolean, workspaceId = "workspace_mkb_weddings") {
  const row = await db.prepare(`SELECT * FROM weddings WHERE slug = ? AND workspace_id = ?`).bind(slug, workspaceId).first();
  if (!row) throw httpError("Wedding not found.", 404);

  const wedding = hydrateWedding(row);
  const now = new Date().toISOString();

  if (!storyEnabled) {
    await db.prepare(`
      UPDATE weddings SET
        story_enabled = 0,
        story_status = 'draft',
        updated_at = CURRENT_TIMESTAMP
      WHERE slug = ? AND workspace_id = ?
    `).bind(slug, workspaceId).run();

    return {
      weddingSlug: slug,
      weddingTitle: wedding.title,
      storyEnabled: false,
      storyStatus: "draft",
      action: "unpublished",
      branch: "d1",
      noChanges: false,
      commit: "",
      pushed: false,
      publicImageCount: 0,
      stagedPaths: [],
      backupPath: null,
      publicWeddingData: {
        generatedAt: now,
        weddingCount: 0,
        imageCount: 0,
        outputPath: "d1://weddings",
        indexPath: "d1://weddings/public-index",
        legacyIndexPath: "",
        managedSlugs: [],
      },
    };
  }

  const preview = await getWeddingPublishPreview(db, slug, workspaceId);
  const failed = preview.checks.filter((check: any) => check.severity === "required" && !check.passed);
  if (failed.length) {
    throw httpError(
      "Wedding story is not ready to publish.",
      400,
      failed.map((check: any) => `${check.label}: ${check.detail}`),
    );
  }

  const document = json(row.document_json, {} as any);
  const publishedDocument = {
    ...document,
    storyEnabled: true,
    storyStatus: "published",
    storyPublishedAt: now,
    status: document.status === "archived" ? "draft" : document.status || "published",
    updatedAt: now,
  };

  const statements: any[] = [
    db.prepare(`DELETE FROM published_story_images WHERE wedding_slug = ? AND workspace_id = ?`).bind(slug, workspaceId),
    db.prepare(`
      INSERT INTO published_story_images (
        wedding_slug, workspace_id, asset_key, sort_order, is_cover
      )
      SELECT wedding_slug, workspace_id, asset_key, sort_order, is_cover
      FROM story_images
      WHERE wedding_slug = ? AND workspace_id = ?
    `).bind(slug, workspaceId),
    db.prepare(`
      UPDATE weddings SET
        story_enabled = 1,
        story_status = 'published',
        story_published_at = ?,
        published_json = ?,
        published_at = ?,
        status = CASE WHEN status = 'archived' THEN 'draft' ELSE status END,
        updated_at = CURRENT_TIMESTAMP
      WHERE slug = ? AND workspace_id = ?
    `).bind(now, JSON.stringify(publishedDocument), now, slug, workspaceId),
  ];

  await db.batch(statements);

  const countRow = await db.prepare(`
    SELECT COUNT(*) AS count
    FROM published_story_images
    WHERE wedding_slug = ? AND workspace_id = ?
  `).bind(slug, workspaceId).first();

  return {
    weddingSlug: slug,
    weddingTitle: wedding.title,
    storyEnabled: true,
    storyStatus: "published",
    action: "published",
    branch: "d1",
    noChanges: false,
    commit: "",
    pushed: false,
    publicImageCount: Number(countRow?.count || 0),
    stagedPaths: [],
    backupPath: null,
    publicWeddingData: {
      generatedAt: now,
      weddingCount: 1,
      imageCount: Number(countRow?.count || 0),
      outputPath: `d1://weddings/${slug}/published_json`,
      indexPath: "d1://weddings/public-index",
      legacyIndexPath: "",
      managedSlugs: [slug],
    },
  };
}

export async function saveWeddingListSettings(db: D1Db, items: any[], workspaceId = "workspace_mkb_weddings") {
  const rows = Array.isArray(items) ? items : [];
  const statements: any[] = [];
  for (const item of rows) {
    const slug = text(item?.slug);
    if (!slug) continue;
    const requestedVisible = item?.storyVisible === true;
    if (requestedVisible) {
      const row = await db.prepare(`SELECT story_enabled, story_status, published_json FROM weddings WHERE slug = ? AND workspace_id = ?`).bind(slug, workspaceId).first();
      if (!row) throw httpError(`Wedding not found: ${slug}`, 404);
      if (!Boolean(row.story_enabled) || text(row.story_status) !== "published" || !text(row.published_json)) {
        throw httpError("A wedding story must be published before it can be shown on Stories & Reviews.", 409, [slug]);
      }
    }
    statements.push(
      db.prepare(`UPDATE weddings SET story_sort_order = ?, story_list_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ? AND workspace_id = ?`)
        .bind(Number(item?.sortOrder || 0), requestedVisible ? 1 : 0, slug, workspaceId),
    );
  }
  await runBatches(db, statements);
  return listAdminWeddings(db, workspaceId);
}

export async function listPublicWeddings(db: D1Db, workspaceId = "workspace_mkb_weddings") {
  const [allResult, publishedResult] = await Promise.all([
    db.prepare(`SELECT slug FROM weddings WHERE workspace_id = ? ORDER BY slug ASC`).bind(workspaceId).all(),
    db.prepare(`
      SELECT slug, published_json, published_at, story_sort_order
      FROM weddings
      WHERE workspace_id = ?
        AND story_enabled = 1
        AND story_status = 'published'
        AND story_list_visible = 1
        AND published_json <> ''
      ORDER BY CASE WHEN story_sort_order > 0 THEN 0 ELSE 1 END, story_sort_order ASC, COALESCE(story_published_at, published_at, updated_at) DESC, slug ASC
    `).bind(workspaceId).all(),
  ]);

  const weddings = [] as any[];
  for (const row of publishedResult.results || []) {
    const document = json(row.published_json, {} as any);
    const images = await publicImages(db, text(row.slug), true, workspaceId);
    const cover = images.find((image: any) => image.isCover) || images[0];

    weddings.push({
      slug: text(row.slug),
      title: text(document.title),
      couple: text(document.couple),
      venue: text(document.venue),
      venueSlug: text(document.venueSlug),
      weddingDate: text(document.weddingDate),
      excerpt: text(document.excerpt),
      intro: text(document.intro),
      seo: {
        title: text(document.seo?.title),
        description: text(document.seo?.description),
      },
      updatedAt: document.updatedAt || row.published_at || undefined,
      storyEnabled: true,
      storyStatus: "published",
      storyPublishedAt: document.storyPublishedAt || row.published_at || undefined,
      imageCount: images.length,
      coverImage: cover,
      source: "d1",
    });
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    count: weddings.length,
    imageCount: weddings.reduce(
      (sum, wedding) => sum + Number(wedding.imageCount || 0),
      0,
    ),
    managedSlugs: (allResult.results || []).map((row: any) => text(row.slug)).filter(Boolean),
    weddings,
  };
}

export async function getPublicWedding(db: D1Db, slug: string, workspaceId = "workspace_mkb_weddings") {
  const row = await db.prepare(`
    SELECT slug, published_json, published_at
    FROM weddings
    WHERE slug = ?
      AND workspace_id = ?
      AND story_enabled = 1
      AND story_status = 'published'
      AND published_json <> ''
  `).bind(slug, workspaceId).first();

  if (!row?.published_json) return null;

  const document = json(row.published_json, {} as any);
  const images = await publicImages(db, slug, true, workspaceId);

  return {
    ...document,
    schemaVersion: 1,
    slug,
    storyEnabled: true,
    storyStatus: "published",
    storyPublishedAt: document.storyPublishedAt || row.published_at || undefined,
    images,
    source: "d1",
  };
}
