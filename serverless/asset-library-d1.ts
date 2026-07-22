import { getDefaultWorkspaceId } from "./workspace-d1";

type D1Db = any;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJson<T = any>(value: unknown, fallback: T): T {
  try {
    if (typeof value === "string") return JSON.parse(value) as T;
    return (value ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function assetIdForLegacyKey(assetKey: string) {
  return `asset:${assetKey}`;
}

export async function syncLegacyAssets(db: D1Db, workspaceId?: string) {
  const resolvedWorkspaceId = text(workspaceId) || (await getDefaultWorkspaceId(db));

  const statements = [
    db.prepare(`
      INSERT OR IGNORE INTO assets (
        id, workspace_id, legacy_asset_key, image_id, original_filename, filename,
        mime_type, width, height, checksum, source_type, source_json, status,
        created_at, updated_at
      )
      SELECT
        'asset:' || i.asset_key,
        ?,
        i.asset_key,
        i.image_id,
        i.filename,
        i.filename,
        '',
        i.width,
        i.height,
        '',
        i.source_type,
        i.source_json,
        'active',
        CURRENT_TIMESTAMP,
        i.updated_at
      FROM images i
    `).bind(resolvedWorkspaceId),
    db.prepare(`
      INSERT OR IGNORE INTO asset_files (
        asset_id, variant, storage_key, url, mime_type, width, height,
        access_level, status, created_at, updated_at
      )
      SELECT
        'asset:' || i.asset_key,
        'web',
        '',
        i.full_src,
        '',
        i.width,
        i.height,
        'public',
        'active',
        CURRENT_TIMESTAMP,
        i.updated_at
      FROM images i
      WHERE TRIM(i.full_src) <> ''
    `),
    db.prepare(`
      INSERT OR IGNORE INTO asset_files (
        asset_id, variant, storage_key, url, mime_type, width, height,
        access_level, status, created_at, updated_at
      )
      SELECT
        'asset:' || i.asset_key,
        'thumb',
        '',
        i.thumb_src,
        '',
        NULL,
        NULL,
        'public',
        'active',
        CURRENT_TIMESTAMP,
        i.updated_at
      FROM images i
      WHERE TRIM(i.thumb_src) <> ''
    `),
  ];

  await db.batch(statements);

  const countRow = await db.prepare(`
    SELECT COUNT(*) AS total
    FROM assets
    WHERE workspace_id = ? AND status = 'active'
  `).bind(resolvedWorkspaceId).first();

  return {
    workspaceId: resolvedWorkspaceId,
    totalAssets: number(countRow?.total),
  };
}

function buildFilters(url: URL) {
  const q = text(url.searchParams.get("q"));
  const wedding = text(url.searchParams.get("wedding"));
  const venue = text(url.searchParams.get("venue"));
  const moment = text(url.searchParams.get("moment"));
  const gallery = text(url.searchParams.get("gallery"));
  const unassigned = url.searchParams.get("unassigned") === "1";
  const limit = Math.min(Math.max(number(url.searchParams.get("limit"), 60), 1), 120);
  const offset = Math.max(number(url.searchParams.get("offset"), 0), 0);
  return { q, wedding, venue, moment, gallery, unassigned, limit, offset };
}

function queryParts(filters: ReturnType<typeof buildFilters>) {
  const where: string[] = ["a.workspace_id = ?", "a.status = 'active'"];
  const bindings: any[] = [];

  if (filters.q) {
    where.push(`(
      lower(a.filename) LIKE ? OR
      lower(a.original_filename) LIKE ? OR
      lower(COALESCE(i.alt, '')) LIKE ? OR
      lower(COALESCE(i.caption, '')) LIKE ?
    )`);
    const needle = `%${filters.q.toLowerCase()}%`;
    bindings.push(needle, needle, needle, needle);
  }

  if (filters.wedding) {
    where.push(`EXISTS (
      SELECT 1 FROM wedding_images wi
      WHERE wi.asset_key = a.legacy_asset_key AND wi.wedding_slug = ?
    )`);
    bindings.push(filters.wedding);
  }

  if (filters.venue) {
    where.push(`EXISTS (
      SELECT 1 FROM venue_images vi
      WHERE vi.asset_key = a.legacy_asset_key AND vi.venue_slug = ?
    )`);
    bindings.push(filters.venue);
  }

  if (filters.moment) {
    where.push(`EXISTS (
      SELECT 1
      FROM venue_images vi
      JOIN json_each(CASE WHEN json_valid(vi.moments_json) THEN vi.moments_json ELSE '[]' END) j
      LEFT JOIN moments m ON m.slug = ? OR m.id = ?
      WHERE vi.asset_key = a.legacy_asset_key
        AND (
          lower(TRIM(CAST(j.value AS TEXT))) = lower(TRIM(?)) OR
          lower(TRIM(CAST(j.value AS TEXT))) = lower(TRIM(COALESCE(m.id, ''))) OR
          lower(TRIM(CAST(j.value AS TEXT))) = lower(TRIM(COALESCE(m.slug, ''))) OR
          lower(TRIM(CAST(j.value AS TEXT))) = lower(TRIM(COALESCE(m.name, '')))
        )
    )`);
    bindings.push(filters.moment, filters.moment, filters.moment);
  }

  if (filters.gallery) {
    if (filters.gallery === "creative-flash") {
      where.push(`(
        EXISTS (
          SELECT 1 FROM venue_images vi
          WHERE vi.asset_key = a.legacy_asset_key
            AND json_extract(CASE WHEN json_valid(vi.display_json) THEN vi.display_json ELSE '{}' END, '$.creativeFlash') = 1
        )
        OR EXISTS (
          SELECT 1 FROM json_each(CASE WHEN json_valid(i.tags_json) THEN i.tags_json ELSE '[]' END) tag
          WHERE lower(TRIM(CAST(tag.value AS TEXT))) = 'creative-flash'
        )
        OR EXISTS (
          SELECT 1 FROM json_each(CASE WHEN json_valid(i.ai_tags_json) THEN i.ai_tags_json ELSE '[]' END) tag
          WHERE lower(TRIM(CAST(tag.value AS TEXT))) = 'creative-flash'
        )
      )`);
    } else {
      where.push(`EXISTS (
        SELECT 1
        FROM collection_images ci
        JOIN custom_collections cc ON cc.id = ci.collection_id
        WHERE ci.asset_key = a.legacy_asset_key
          AND (cc.id = ? OR cc.slug = ?)
      )`);
      bindings.push(filters.gallery, filters.gallery);
    }
  }

  if (filters.unassigned) {
    where.push(`
      NOT EXISTS (SELECT 1 FROM wedding_images wi WHERE wi.asset_key = a.legacy_asset_key)
      AND NOT EXISTS (SELECT 1 FROM venue_images vi WHERE vi.asset_key = a.legacy_asset_key)
      AND NOT EXISTS (SELECT 1 FROM collection_images ci WHERE ci.asset_key = a.legacy_asset_key)
    `);
  }

  return { whereSql: where.join(" AND "), bindings };
}

async function listFacets(db: D1Db) {
  const [weddings, venues, moments, galleries] = await Promise.all([
    db.prepare(`
      SELECT slug, title
      FROM weddings
      WHERE status <> 'archived'
      ORDER BY title COLLATE NOCASE ASC
    `).all(),
    db.prepare(`
      SELECT slug, name
      FROM venues
      WHERE status <> 'archived'
      ORDER BY name COLLATE NOCASE ASC
    `).all(),
    db.prepare(`
      SELECT id, slug, name
      FROM moments
      WHERE status <> 'archived' AND available_for_assignment = 1
      ORDER BY sort_order ASC, name COLLATE NOCASE ASC
    `).all(),
    db.prepare(`
      SELECT id, slug, name
      FROM custom_collections
      WHERE status <> 'archived'
      ORDER BY sort_order ASC, name COLLATE NOCASE ASC
    `).all(),
  ]);

  return {
    weddings: (weddings.results || []).map((row: any) => ({ slug: text(row.slug), name: text(row.title || row.slug) })),
    venues: (venues.results || []).map((row: any) => ({ slug: text(row.slug), name: text(row.name || row.slug) })),
    moments: (moments.results || []).map((row: any) => ({ id: text(row.id), slug: text(row.slug), name: text(row.name) })),
    galleries: [
      { id: "creative-flash", slug: "creative-flash", name: "Creative Flash", compatibility: true },
      ...(galleries.results || []).map((row: any) => ({
        id: text(row.id),
        slug: text(row.slug),
        name: text(row.name),
        compatibility: false,
      })),
    ],
  };
}

async function relationMaps(db: D1Db, assetKeys: string[]) {
  const weddings = new Map<string, any[]>();
  const venues = new Map<string, any[]>();
  const moments = new Map<string, any[]>();
  const galleries = new Map<string, any[]>();
  const locations = new Map<string, any[]>();
  const creativeFlash = new Set<string>();

  if (!assetKeys.length) {
    return { weddings, venues, moments, galleries, locations, creativeFlash };
  }

  const CHUNK = 60;
  for (let start = 0; start < assetKeys.length; start += CHUNK) {
    const chunk = assetKeys.slice(start, start + CHUNK);
    const placeholders = chunk.map(() => "?").join(",");
    const [weddingRows, venueRows, galleryRows] = await Promise.all([
      db.prepare(`
        SELECT wi.asset_key, wi.wedding_slug, w.title, wi.sort_order
        FROM wedding_images wi
        LEFT JOIN weddings w ON w.slug = wi.wedding_slug
        WHERE wi.asset_key IN (${placeholders})
        ORDER BY wi.sort_order ASC
      `).bind(...chunk).all(),
      db.prepare(`
        SELECT vi.asset_key, vi.venue_slug, v.name, vi.sort_order, vi.moments_json, vi.display_json,
               i.tags_json, i.ai_tags_json
        FROM venue_images vi
        LEFT JOIN venues v ON v.slug = vi.venue_slug
        LEFT JOIN images i ON i.asset_key = vi.asset_key
        WHERE vi.asset_key IN (${placeholders})
        ORDER BY vi.sort_order ASC
      `).bind(...chunk).all(),
      db.prepare(`
        SELECT ci.asset_key, cc.id, cc.slug, cc.name, ci.sort_order, ci.hidden
        FROM collection_images ci
        JOIN custom_collections cc ON cc.id = ci.collection_id
        WHERE ci.asset_key IN (${placeholders}) AND cc.status <> 'archived'
        ORDER BY cc.sort_order ASC, cc.name COLLATE NOCASE ASC
      `).bind(...chunk).all(),
    ]);

    for (const row of weddingRows.results || []) {
      const key = text(row.asset_key);
      const list = weddings.get(key) || [];
      list.push({ slug: text(row.wedding_slug), name: text(row.title || row.wedding_slug), sortOrder: number(row.sort_order) });
      weddings.set(key, list);
    }

    const venueSlugsByAsset = new Map<string, string[]>();
    for (const row of venueRows.results || []) {
      const key = text(row.asset_key);
      const venueSlug = text(row.venue_slug);
      const venueList = venues.get(key) || [];
      venueList.push({ slug: venueSlug, name: text(row.name || venueSlug), sortOrder: number(row.sort_order) });
      venues.set(key, venueList);
      const venueSlugs = venueSlugsByAsset.get(key) || [];
      if (venueSlug) venueSlugs.push(venueSlug);
      venueSlugsByAsset.set(key, venueSlugs);

      const display = parseJson<any>(row.display_json, {});
      const tagValues = [
        ...parseJson<any[]>(row.tags_json, []),
        ...parseJson<any[]>(row.ai_tags_json, []),
      ].map(lower);
      if (Boolean(display.creativeFlash) || tagValues.includes("creative-flash")) creativeFlash.add(key);

      const rawMoments = Array.isArray(parseJson<any[]>(row.moments_json, []))
        ? parseJson<any[]>(row.moments_json, [])
        : [];
      if (rawMoments.length) {
        const momentList = moments.get(key) || [];
        for (const raw of rawMoments) {
          const value = text(raw);
          if (!value || momentList.some((item) => item.raw === value)) continue;
          momentList.push({ raw: value, id: value, slug: value, name: value });
        }
        moments.set(key, momentList);
      }
    }

    for (const row of galleryRows.results || []) {
      const key = text(row.asset_key);
      const list = galleries.get(key) || [];
      list.push({
        id: text(row.id),
        slug: text(row.slug),
        name: text(row.name),
        sortOrder: number(row.sort_order),
        hidden: number(row.hidden) === 1,
        compatibility: false,
      });
      galleries.set(key, list);
    }

    const allVenueSlugs = unique([...venueSlugsByAsset.values()].flat().filter(Boolean));
    if (allVenueSlugs.length) {
      const venuePlaceholders = allVenueSlugs.map(() => "?").join(",");
      const locationRows = await db.prepare(`
        SELECT vll.venue_slug, la.id, la.slug, la.name, la.area_type, vll.primary_location
        FROM venue_location_links vll
        JOIN location_areas la ON la.id = vll.location_id
        WHERE vll.venue_slug IN (${venuePlaceholders}) AND la.status = 'active'
        ORDER BY la.area_type ASC, la.sort_order ASC, la.name COLLATE NOCASE ASC
      `).bind(...allVenueSlugs).all();

      const byVenue = new Map<string, any[]>();
      for (const row of locationRows.results || []) {
        const venueSlug = text(row.venue_slug);
        const list = byVenue.get(venueSlug) || [];
        list.push({
          id: text(row.id),
          slug: text(row.slug),
          name: text(row.name),
          type: text(row.area_type || "custom"),
          inherited: true,
          primary: number(row.primary_location) === 1,
        });
        byVenue.set(venueSlug, list);
      }

      for (const [assetKey, venueSlugs] of venueSlugsByAsset.entries()) {
        const inherited = venueSlugs.flatMap((slug) => byVenue.get(slug) || []);
        const deduped = new Map<string, any>();
        for (const item of inherited) deduped.set(item.id, item);
        locations.set(assetKey, [...deduped.values()]);
      }
    }
  }

  const unresolvedMomentValues = unique(
    [...moments.values()].flat().map((item) => item.raw).filter(Boolean),
  );
  if (unresolvedMomentValues.length) {
    const allMomentRows = await db.prepare(`
      SELECT id, slug, name
      FROM moments
      WHERE status <> 'archived'
    `).all();
    const lookup = new Map<string, any>();
    for (const row of allMomentRows.results || []) {
      const hydrated = { id: text(row.id), slug: text(row.slug), name: text(row.name) };
      for (const key of [hydrated.id, hydrated.slug, hydrated.name]) {
        if (key) lookup.set(lower(key), hydrated);
      }
    }
    for (const [assetKey, list] of moments.entries()) {
      moments.set(assetKey, list.map((item) => lookup.get(lower(item.raw)) || item));
    }
  }

  return { weddings, venues, moments, galleries, locations, creativeFlash };
}

export async function listAssetLibrary(db: D1Db, requestUrl: string) {
  const workspaceId = await getDefaultWorkspaceId(db);
  const filters = buildFilters(new URL(requestUrl));
  const parts = queryParts(filters);
  const baseBindings = [workspaceId, ...parts.bindings];

  const [countRow, rowsResult, facets, statsRow] = await Promise.all([
    db.prepare(`
      SELECT COUNT(*) AS total
      FROM assets a
      LEFT JOIN images i ON i.asset_key = a.legacy_asset_key
      WHERE ${parts.whereSql}
    `).bind(...baseBindings).first(),
    db.prepare(`
      SELECT
        a.id,
        a.workspace_id,
        a.legacy_asset_key,
        a.image_id,
        a.original_filename,
        a.filename,
        a.mime_type,
        a.width,
        a.height,
        a.source_type,
        a.source_json,
        a.status,
        a.created_at,
        a.updated_at,
        web.url AS web_url,
        web.storage_key AS web_storage_key,
        thumb.url AS thumb_url,
        thumb.storage_key AS thumb_storage_key,
        original.url AS original_url,
        original.storage_key AS original_storage_key,
        original.access_level AS original_access_level,
        i.alt,
        i.caption
      FROM assets a
      LEFT JOIN images i ON i.asset_key = a.legacy_asset_key
      LEFT JOIN asset_files web ON web.asset_id = a.id AND web.variant = 'web' AND web.status = 'active'
      LEFT JOIN asset_files thumb ON thumb.asset_id = a.id AND thumb.variant = 'thumb' AND thumb.status = 'active'
      LEFT JOIN asset_files original ON original.asset_id = a.id AND original.variant = 'original' AND original.status = 'active'
      WHERE ${parts.whereSql}
      ORDER BY a.updated_at DESC, a.filename COLLATE NOCASE ASC
      LIMIT ? OFFSET ?
    `).bind(...baseBindings, filters.limit, filters.offset).all(),
    listFacets(db),
    db.prepare(`
      SELECT
        COUNT(*) AS total_assets,
        SUM(CASE WHEN EXISTS (
          SELECT 1 FROM asset_files af
          WHERE af.asset_id = a.id AND af.variant = 'original' AND af.status = 'active'
        ) THEN 1 ELSE 0 END) AS original_assets,
        SUM(CASE WHEN a.legacy_asset_key <> '' THEN 1 ELSE 0 END) AS compatibility_assets
      FROM assets a
      WHERE a.workspace_id = ? AND a.status = 'active'
    `).bind(workspaceId).first(),
  ]);

  const rows = rowsResult.results || [];
  const assetKeys = rows.map((row: any) => text(row.legacy_asset_key)).filter(Boolean);
  const relations = await relationMaps(db, assetKeys);

  const assets = rows.map((row: any) => {
    const assetKey = text(row.legacy_asset_key);
    const source = parseJson<any>(row.source_json, {});
    const galleryList = [...(relations.galleries.get(assetKey) || [])];
    if (relations.creativeFlash.has(assetKey)) {
      galleryList.unshift({
        id: "creative-flash",
        slug: "creative-flash",
        name: "Creative Flash",
        sortOrder: 0,
        hidden: false,
        compatibility: true,
      });
    }

    return {
      id: text(row.id),
      workspaceId: text(row.workspace_id),
      legacyAssetKey: assetKey,
      imageId: text(row.image_id),
      filename: text(row.filename),
      originalFilename: text(source.originalFilename || row.original_filename || row.filename),
      mimeType: text(source.originalMimeType || row.mime_type),
      width: number(row.width),
      height: number(row.height),
      alt: text(row.alt),
      caption: text(row.caption),
      sourceType: text(row.source_type),
      source: {
        storage: text(source.storage),
        webKey: text(row.web_storage_key || source.fullKey),
        thumbKey: text(row.thumb_storage_key || source.thumbKey),
        originalKey: text(row.original_storage_key),
      },
      files: {
        original: text(row.original_url),
        web: text(row.web_url),
        thumb: text(row.thumb_url),
        originalAccess: text(row.original_access_level),
      },
      weddings: relations.weddings.get(assetKey) || [],
      venues: relations.venues.get(assetKey) || [],
      moments: relations.moments.get(assetKey) || [],
      locations: relations.locations.get(assetKey) || [],
      galleries: galleryList,
      status: text(row.status || "active"),
      compatibilityBacked: Boolean(assetKey),
      createdAt: text(row.created_at),
      updatedAt: text(row.updated_at),
    };
  });

  return {
    workspaceId,
    assets,
    facets,
    pagination: {
      total: number(countRow?.total),
      limit: filters.limit,
      offset: filters.offset,
      hasMore: filters.offset + assets.length < number(countRow?.total),
    },
    stats: {
      totalAssets: number(statsRow?.total_assets),
      originalAssets: number(statsRow?.original_assets),
      compatibilityAssets: number(statsRow?.compatibility_assets),
    },
    filters,
  };
}

export { assetIdForLegacyKey };
