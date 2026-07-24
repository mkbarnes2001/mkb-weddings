import { getDefaultWorkspaceId } from "./workspace-d1";

type D1Db = any;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJson<T>(value: unknown, fallback: T): T {
  try {
    return value ? (JSON.parse(String(value)) as T) : fallback;
  } catch {
    return fallback;
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function httpError(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

async function requireWedding(db: D1Db, slug: string) {
  const row = await db.prepare(`
    SELECT * FROM weddings WHERE slug = ? LIMIT 1
  `).bind(slug).first();
  if (!row) throw httpError("Wedding not found.", 404);
  return row;
}

async function previewSetRow(db: D1Db, workspaceId: string, weddingSlug: string) {
  return db.prepare(`
    SELECT * FROM wedding_preview_sets
    WHERE workspace_id = ? AND wedding_slug = ? AND slug = 'wedding-day-previews' AND status = 'active'
    LIMIT 1
  `).bind(workspaceId, weddingSlug).first();
}

async function ensurePreviewSet(db: D1Db, workspaceId: string, weddingSlug: string) {
  const existing = await previewSetRow(db, workspaceId, weddingSlug);
  if (existing) return existing;
  const id = `preview_set_${crypto.randomUUID()}`;
  await db.prepare(`
    INSERT INTO wedding_preview_sets (
      id, workspace_id, wedding_slug, slug, name, status, created_at, updated_at
    ) VALUES (?, ?, ?, 'wedding-day-previews', 'Wedding Day Previews', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(id, workspaceId, weddingSlug).run();
  return previewSetRow(db, workspaceId, weddingSlug);
}

async function resolveWeddingAssets(db: D1Db, workspaceId: string, weddingSlug: string) {
  const result = await db.prepare(`
    SELECT
      a.id,
      a.legacy_asset_key,
      a.filename,
      a.original_filename,
      a.width,
      a.height,
      a.source_type,
      COALESCE(web.url, '') AS web_src,
      COALESCE(thumb.url, web.url, '') AS thumb_src,
      CASE WHEN original_file.status = 'active' THEN 1 ELSE 0 END AS has_original,
      awl.sort_order,
      CASE WHEN wpa.asset_id IS NULL THEN 0 ELSE 1 END AS is_preview,
      COALESCE(wpa.sort_order, 0) AS preview_sort_order
    FROM asset_wedding_links awl
    JOIN assets a
      ON a.id = awl.asset_id
      AND a.workspace_id = ?
      AND a.status = 'active'
    LEFT JOIN asset_files web
      ON web.asset_id = a.id AND web.variant = 'web' AND web.status = 'active'
    LEFT JOIN asset_files thumb
      ON thumb.asset_id = a.id AND thumb.variant = 'thumb' AND thumb.status = 'active'
    LEFT JOIN asset_files original_file
      ON original_file.asset_id = a.id AND original_file.variant = 'original' AND original_file.status = 'active'
    LEFT JOIN wedding_preview_sets wps
      ON wps.workspace_id = ? AND wps.wedding_slug = awl.wedding_slug
      AND wps.slug = 'wedding-day-previews' AND wps.status = 'active'
    LEFT JOIN wedding_preview_assets wpa
      ON wpa.preview_set_id = wps.id AND wpa.asset_id = a.id
    WHERE awl.wedding_slug = ?
    ORDER BY
      CASE WHEN wpa.asset_id IS NULL THEN 1 ELSE 0 END ASC,
      wpa.sort_order ASC,
      awl.sort_order ASC,
      a.created_at ASC
  `).bind(workspaceId, workspaceId, weddingSlug).all();

  return (result.results || []).map((row: any) => ({
    id: text(row.id),
    legacyAssetKey: text(row.legacy_asset_key),
    filename: text(row.filename || row.original_filename),
    originalFilename: text(row.original_filename || row.filename),
    width: number(row.width),
    height: number(row.height),
    webSrc: text(row.web_src),
    thumbSrc: text(row.thumb_src || row.web_src),
    hasOriginal: number(row.has_original) === 1,
    sortOrder: number(row.sort_order),
    isPreview: number(row.is_preview) === 1,
    previewSortOrder: number(row.preview_sort_order),
    sourceType: text(row.source_type),
  }));
}

export async function getWeddingWorkspace(db: D1Db, weddingSlug: string) {
  const workspaceId = await getDefaultWorkspaceId(db);
  const wedding = await requireWedding(db, weddingSlug);

  const [assets, previewSet, momentsResult, galleriesResult, clientGalleriesResult, venueRow, workspaceSettings] = await Promise.all([
    resolveWeddingAssets(db, workspaceId, weddingSlug),
    previewSetRow(db, workspaceId, weddingSlug),
    db.prepare(`
      SELECT id, slug, name, sort_order
      FROM moments
      WHERE status <> 'archived' AND available_for_assignment = 1
      ORDER BY sort_order ASC, name COLLATE NOCASE ASC
    `).all(),
    db.prepare(`
      SELECT id, slug, name, status, sort_order
      FROM custom_collections
      WHERE status <> 'archived'
      ORDER BY sort_order ASC, name COLLATE NOCASE ASC
    `).all(),
    db.prepare(`
      SELECT id, slug, title, client_name, client_email, status, access_token, allow_downloads, updated_at
      FROM client_galleries
      WHERE workspace_id = ? AND wedding_slug = ? AND status <> 'archived'
      ORDER BY updated_at DESC
    `).bind(workspaceId, weddingSlug).all(),
    text(wedding.venue_slug)
      ? db.prepare(`SELECT slug, name, document_json FROM venues WHERE slug = ? LIMIT 1`).bind(text(wedding.venue_slug)).first()
      : Promise.resolve(null),
    db.prepare(`SELECT business_name, instagram, website_url FROM workspace_settings WHERE workspace_id = ? LIMIT 1`).bind(workspaceId).first(),
  ]);

  const venueDocument = parseJson<any>(venueRow?.document_json, {});
  const previewAssetIds = assets.filter((asset: any) => asset.isPreview).map((asset: any) => asset.id);

  return {
    workspaceId,
    wedding: {
      slug: text(wedding.slug),
      title: text(wedding.title),
      couple: text(wedding.couple),
      venue: text(wedding.venue),
      venueSlug: text(wedding.venue_slug),
      weddingDate: text(wedding.wedding_date),
      status: text(wedding.status),
    },
    venue: venueRow
      ? {
          slug: text(venueRow.slug),
          name: text(venueRow.name),
          instagram: text(venueDocument?.links?.instagram),
        }
      : null,
    workspace: {
      businessName: text(workspaceSettings?.business_name || "MKB Weddings"),
      instagram: text(workspaceSettings?.instagram),
      websiteUrl: text(workspaceSettings?.website_url),
    },
    previewSet: {
      id: text(previewSet?.id),
      name: text(previewSet?.name || "Wedding Day Previews"),
      assetIds: previewAssetIds,
    },
    assets,
    moments: (momentsResult.results || []).map((row: any) => ({
      id: text(row.id),
      slug: text(row.slug),
      name: text(row.name),
      sortOrder: number(row.sort_order),
    })),
    galleries: [
      { id: "creative-flash", slug: "creative-flash", name: "Creative Flash", compatibility: true },
      ...(galleriesResult.results || []).map((row: any) => ({
        id: text(row.id),
        slug: text(row.slug),
        name: text(row.name),
        status: text(row.status),
        compatibility: false,
      })),
    ],
    clientGalleries: (clientGalleriesResult.results || []).map((row: any) => ({
      id: text(row.id),
      slug: text(row.slug),
      title: text(row.title),
      clientName: text(row.client_name),
      clientEmail: text(row.client_email),
      status: text(row.status),
      accessToken: text(row.access_token),
      allowDownloads: number(row.allow_downloads) === 1,
    })),
  };
}

export async function saveWeddingPreviewSet(db: D1Db, weddingSlug: string, assetIds: string[]) {
  const workspaceId = await getDefaultWorkspaceId(db);
  await requireWedding(db, weddingSlug);
  const cleanIds = unique((assetIds || []).map(text));

  if (cleanIds.length) {
    const placeholders = cleanIds.map(() => "?").join(",");
    const allowed = await db.prepare(`
      SELECT awl.asset_id
      FROM asset_wedding_links awl
      JOIN assets a ON a.id = awl.asset_id
      WHERE awl.wedding_slug = ? AND a.workspace_id = ? AND a.status = 'active'
        AND awl.asset_id IN (${placeholders})
    `).bind(weddingSlug, workspaceId, ...cleanIds).all();
    const allowedSet = new Set((allowed.results || []).map((row: any) => text(row.asset_id)));
    const invalid = cleanIds.filter((id) => !allowedSet.has(id));
    if (invalid.length) throw httpError("One or more preview assets do not belong to this wedding.", 400);
  }

  const previewSet = await ensurePreviewSet(db, workspaceId, weddingSlug);
  await db.prepare(`DELETE FROM wedding_preview_assets WHERE preview_set_id = ?`).bind(text(previewSet.id)).run();

  const CHUNK = 50;
  for (let start = 0; start < cleanIds.length; start += CHUNK) {
    const chunk = cleanIds.slice(start, start + CHUNK);
    await db.batch(chunk.map((assetId, index) => db.prepare(`
      INSERT INTO wedding_preview_assets (preview_set_id, asset_id, sort_order, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(text(previewSet.id), assetId, start + index + 1)));
  }

  await db.prepare(`UPDATE wedding_preview_sets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(text(previewSet.id)).run();
  return getWeddingWorkspace(db, weddingSlug);
}

async function ensureCompatibilityImage(db: D1Db, weddingSlug: string, assetId: string) {
  const asset = await db.prepare(`
    SELECT a.*, COALESCE(web.url, '') AS web_src, COALESCE(thumb.url, web.url, '') AS thumb_src
    FROM assets a
    LEFT JOIN asset_files web ON web.asset_id = a.id AND web.variant = 'web' AND web.status = 'active'
    LEFT JOIN asset_files thumb ON thumb.asset_id = a.id AND thumb.variant = 'thumb' AND thumb.status = 'active'
    WHERE a.id = ? AND a.status = 'active'
    LIMIT 1
  `).bind(assetId).first();
  if (!asset) throw httpError("Asset not found.", 404);
  const webSrc = text(asset.web_src);
  if (!webSrc) throw httpError(`Asset ${text(asset.filename || assetId)} has no web derivative and cannot be published.`, 400);

  const assetKey = text(asset.legacy_asset_key) || assetId;
  const imageId = text(asset.image_id) || assetId;
  const filename = text(asset.filename || asset.original_filename || `${assetId}.jpg`);

  await db.prepare(`
    INSERT INTO images (
      asset_key, image_id, wedding_slug, filename, full_src, thumb_src,
      alt, caption, tags_json, ai_tags_json, source_type, source_json,
      width, height, orientation, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, '', '', '[]', '[]', 'private_client_upload', ?, ?, ?, '', CURRENT_TIMESTAMP)
    ON CONFLICT(asset_key) DO UPDATE SET
      image_id = CASE WHEN images.image_id = '' THEN excluded.image_id ELSE images.image_id END,
      wedding_slug = CASE WHEN images.wedding_slug = '' THEN excluded.wedding_slug ELSE images.wedding_slug END,
      filename = excluded.filename,
      full_src = excluded.full_src,
      thumb_src = excluded.thumb_src,
      width = COALESCE(excluded.width, images.width),
      height = COALESCE(excluded.height, images.height),
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    assetKey,
    imageId,
    weddingSlug,
    filename,
    webSrc,
    text(asset.thumb_src || webSrc),
    JSON.stringify({ assetId, managed: true, privateOriginal: true }),
    asset.width || null,
    asset.height || null,
  ).run();

  if (!text(asset.legacy_asset_key)) {
    await db.prepare(`UPDATE assets SET legacy_asset_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(assetKey, assetId).run();
  }

  return { assetKey, imageId, filename, webSrc, thumbSrc: text(asset.thumb_src || webSrc) };
}

export async function publishWeddingPreviewAssignments(db: D1Db, weddingSlug: string, input: any) {
  const workspaceId = await getDefaultWorkspaceId(db);
  const wedding = await requireWedding(db, weddingSlug);
  const assetIds = unique((input?.assetIds || []).map(text));
  if (!assetIds.length) throw httpError("Select at least one preview image.", 400);

  const venueSlug = text(input?.venueSlug || wedding.venue_slug);
  const addToVenue = Boolean(input?.addToVenue) && Boolean(venueSlug);
  const requestedMoments = unique((input?.momentIds || []).map(text));
  const requestedGalleries = unique((input?.galleryIds || []).map(text));

  const placeholders = assetIds.map(() => "?").join(",");
  const allowed = await db.prepare(`
    SELECT awl.asset_id
    FROM asset_wedding_links awl
    JOIN assets a ON a.id = awl.asset_id
    WHERE awl.wedding_slug = ? AND a.workspace_id = ? AND a.status = 'active'
      AND awl.asset_id IN (${placeholders})
  `).bind(weddingSlug, workspaceId, ...assetIds).all();
  const allowedSet = new Set((allowed.results || []).map((row: any) => text(row.asset_id)));
  if (assetIds.some((id) => !allowedSet.has(id))) throw httpError("One or more selected assets do not belong to this wedding.", 400);

  let venue = null;
  if (addToVenue) {
    venue = await db.prepare(`SELECT slug, name FROM venues WHERE slug = ? AND status <> 'archived' LIMIT 1`).bind(venueSlug).first();
    if (!venue) throw httpError("Linked venue is not available.", 400);
  }

  const moments: Array<{ id: string; slug: string; name: string }> = [];
  for (const requested of requestedMoments) {
    const row = await db.prepare(`
      SELECT id, slug, name FROM moments
      WHERE (id = ? OR slug = ?) AND status <> 'archived' AND available_for_assignment = 1
      LIMIT 1
    `).bind(requested, requested).first();
    if (row && !moments.some((moment) => moment.id === text(row.id))) {
      moments.push({ id: text(row.id), slug: text(row.slug), name: text(row.name) });
    }
  }

  const customGalleries: Array<{ id: string; slug: string; name: string }> = [];
  const creativeFlash = requestedGalleries.includes("creative-flash");
  for (const requested of requestedGalleries.filter((value) => value !== "creative-flash")) {
    const row = await db.prepare(`
      SELECT id, slug, name FROM custom_collections
      WHERE (id = ? OR slug = ?) AND status <> 'archived'
      LIMIT 1
    `).bind(requested, requested).first();
    if (row && !customGalleries.some((gallery) => gallery.id === text(row.id))) {
      customGalleries.push({ id: text(row.id), slug: text(row.slug), name: text(row.name) });
    }
  }

  const weddingMaxRow = await db.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM wedding_images WHERE wedding_slug = ?`).bind(weddingSlug).first();
  let weddingOrder = number(weddingMaxRow?.max_order);
  let venueOrder = 0;
  if (addToVenue) {
    const venueMaxRow = await db.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM venue_images WHERE venue_slug = ?`).bind(venueSlug).first();
    venueOrder = number(venueMaxRow?.max_order);
  }
  const galleryOrders = new Map<string, number>();
  for (const gallery of customGalleries) {
    const row = await db.prepare(`SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM collection_images WHERE collection_id = ?`).bind(gallery.id).first();
    galleryOrders.set(gallery.id, number(row?.max_order));
  }

  let published = 0;
  for (const assetId of assetIds) {
    const compatible = await ensureCompatibilityImage(db, weddingSlug, assetId);
    weddingOrder += 1;
    await db.prepare(`
      INSERT INTO wedding_images (wedding_slug, asset_key, sort_order, is_cover, hidden, rating, collections_json)
      VALUES (?, ?, ?, 0, 0, 0, '[]')
      ON CONFLICT(wedding_slug, asset_key) DO UPDATE SET hidden = 0
    `).bind(weddingSlug, compatible.assetKey, weddingOrder).run();

    await db.prepare(`
      INSERT OR IGNORE INTO asset_wedding_links (asset_id, wedding_slug, sort_order, is_primary)
      VALUES (?, ?, ?, 1)
    `).bind(assetId, weddingSlug, weddingOrder).run();

    if (creativeFlash) {
      const imageRow = await db.prepare(`SELECT tags_json FROM images WHERE asset_key = ? LIMIT 1`).bind(compatible.assetKey).first();
      const tags = unique([...parseJson<string[]>(imageRow?.tags_json, []).map(text), "creative-flash"]);
      await db.prepare(`UPDATE images SET tags_json = ?, updated_at = CURRENT_TIMESTAMP WHERE asset_key = ?`).bind(JSON.stringify(tags), compatible.assetKey).run();
    }

    if (addToVenue) {
      const existing = await db.prepare(`
        SELECT moments_json, display_json, sort_order
        FROM venue_images WHERE venue_slug = ? AND asset_key = ? LIMIT 1
      `).bind(venueSlug, compatible.assetKey).first();
      const currentMoments = parseJson<string[]>(existing?.moments_json, []).map(text).filter(Boolean);
      const mergedMoments = unique([...currentMoments, ...moments.map((moment) => moment.slug || moment.id)]);
      const display = parseJson<Record<string, any>>(existing?.display_json, {});
      display.venue = true;
      if (moments.length) display.moments = true;
      if (creativeFlash) display.creativeFlash = true;
      if (!existing) venueOrder += 1;

      await db.prepare(`
        INSERT INTO venue_images (
          venue_slug, asset_key, sort_order, included, hidden, rating, is_hero, moments_json, display_json
        ) VALUES (?, ?, ?, 1, 0, 0, 0, ?, ?)
        ON CONFLICT(venue_slug, asset_key) DO UPDATE SET
          included = 1,
          hidden = 0,
          moments_json = excluded.moments_json,
          display_json = excluded.display_json
      `).bind(
        venueSlug,
        compatible.assetKey,
        existing ? number(existing.sort_order) : venueOrder,
        JSON.stringify(mergedMoments),
        JSON.stringify(display),
      ).run();

      await db.prepare(`
        INSERT OR IGNORE INTO asset_venue_links (asset_id, venue_slug, sort_order, is_primary)
        VALUES (?, ?, ?, 1)
      `).bind(assetId, venueSlug, existing ? number(existing.sort_order) : venueOrder).run();
    }

    for (const moment of moments) {
      await db.prepare(`
        INSERT OR IGNORE INTO asset_moment_links (asset_id, moment_id, sort_order, source)
        VALUES (?, ?, ?, 'wedding_workspace')
      `).bind(assetId, moment.id, weddingOrder).run();
    }

    for (const gallery of customGalleries) {
      const nextOrder = (galleryOrders.get(gallery.id) || 0) + 1;
      galleryOrders.set(gallery.id, nextOrder);
      await db.prepare(`
        INSERT INTO collection_images (collection_id, asset_key, sort_order, hidden)
        VALUES (?, ?, ?, 0)
        ON CONFLICT(collection_id, asset_key) DO UPDATE SET hidden = 0
      `).bind(gallery.id, compatible.assetKey, nextOrder).run();
      await db.prepare(`
        INSERT INTO asset_gallery_links (asset_id, gallery_id, sort_order, hidden, source)
        VALUES (?, ?, ?, 0, 'wedding_workspace')
        ON CONFLICT(asset_id, gallery_id) DO UPDATE SET hidden = 0
      `).bind(assetId, gallery.id, nextOrder).run();
    }

    published += 1;
  }

  return {
    ok: true,
    published,
    venue: addToVenue ? { slug: venueSlug, name: text(venue?.name) } : null,
    moments,
    galleries: [
      ...(creativeFlash ? [{ id: "creative-flash", slug: "creative-flash", name: "Creative Flash" }] : []),
      ...customGalleries,
    ],
  };
}
