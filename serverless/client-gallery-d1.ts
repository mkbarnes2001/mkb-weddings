import { getDefaultWorkspaceId } from "./workspace-d1";

type D1Db = any;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || value === 1 || value === "1" || value === "true";
}

function cleanSlug(value: unknown) {
  return text(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

function cleanStatus(value: unknown) {
  const status = text(value);
  return status === "live" || status === "archived" ? status : "draft";
}

function accessToken() {
  return `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(value: string) {
  const clean = value.trim();
  const bytes = new Uint8Array(Math.floor(clean.length / 2));
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(clean.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function hashPin(value: string) {
  const iterations = 120000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(value),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256,
  );
  return `pbkdf2$${iterations}$${hex(salt)}$${hex(new Uint8Array(bits))}`;
}

async function verifyPinHash(stored: string, value: string) {
  const [scheme, iterationText, saltHex, expectedHex] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterationText || !saltHex || !expectedHex) return false;
  const iterations = Number(iterationText);
  if (!Number.isFinite(iterations) || iterations < 10000 || iterations > 1000000) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(value),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex), iterations },
    key,
    256,
  );
  const actual = new Uint8Array(bits);
  const expected = fromHex(expectedHex);
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < actual.length; index += 1) mismatch |= actual[index] ^ expected[index];
  return mismatch === 0;
}

async function uniqueSlug(db: D1Db, workspaceId: string, wanted: string, excludeId = "") {
  const base = cleanSlug(wanted) || "client-gallery";
  let candidate = base;
  let attempt = 1;
  while (attempt < 100) {
    const row = await db.prepare(`
      SELECT id FROM client_galleries
      WHERE workspace_id = ? AND slug = ? AND id <> ?
      LIMIT 1
    `).bind(workspaceId, candidate, excludeId).first();
    if (!row) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function mapGallery(row: any) {
  const assetCount = number(row?.asset_count);
  const visibleAssetCount = number(row?.visible_asset_count);
  const favouriteCount = number(row?.favourite_count);
  const downloadCount = number(row?.download_count);
  return {
    id: text(row?.id),
    workspaceId: text(row?.workspace_id),
    weddingSlug: text(row?.wedding_slug),
    weddingTitle: text(row?.wedding_title || row?.wedding_couple),
    slug: text(row?.slug),
    title: text(row?.title),
    clientName: text(row?.client_name),
    clientEmail: text(row?.client_email),
    intro: text(row?.intro),
    status: cleanStatus(row?.status),
    accessToken: text(row?.access_token),
    pinEnabled: Boolean(text(row?.pin_hash)),
    expiresAt: text(row?.expires_at),
    allowFavourites: number(row?.allow_favourites, 1) === 1,
    allowDownloads: number(row?.allow_downloads) === 1,
    coverAssetId: text(row?.cover_asset_id),
    coverThumb: text(row?.cover_thumb || row?.cover_web),
    coverWeb: text(row?.cover_web),
    assetCount,
    visibleAssetCount,
    favouriteCount,
    downloadCount,
    createdAt: text(row?.created_at),
    updatedAt: text(row?.updated_at),
  };
}

function galleryIsExpired(row: any) {
  const expiresAt = text(row?.expires_at);
  if (!expiresAt) return false;
  const timestamp = Date.parse(expiresAt);
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

async function galleryBaseRow(db: D1Db, id: string, workspaceId: string) {
  return db.prepare(`
    SELECT
      cg.*,
      w.title AS wedding_title,
      w.couple AS wedding_couple,
      COUNT(DISTINCT cga.asset_id) AS asset_count,
      COUNT(DISTINCT CASE WHEN cga.hidden = 0 THEN cga.asset_id END) AS visible_asset_count,
      COUNT(DISTINCT cgf.asset_id || ':' || cgf.visitor_key) AS favourite_count,
      COUNT(DISTINCT ade.id) AS download_count,
      COALESCE(cover_thumb.url, '') AS cover_thumb,
      COALESCE(cover_web.url, '') AS cover_web
    FROM client_galleries cg
    LEFT JOIN weddings w ON w.slug = cg.wedding_slug
    LEFT JOIN client_gallery_assets cga ON cga.gallery_id = cg.id
    LEFT JOIN client_gallery_favourites cgf ON cgf.gallery_id = cg.id
    LEFT JOIN asset_download_events ade ON ade.gallery_id = cg.id
    LEFT JOIN asset_files cover_thumb
      ON cover_thumb.asset_id = cg.cover_asset_id
      AND cover_thumb.variant = 'thumb'
      AND cover_thumb.status = 'active'
    LEFT JOIN asset_files cover_web
      ON cover_web.asset_id = cg.cover_asset_id
      AND cover_web.variant = 'web'
      AND cover_web.status = 'active'
    WHERE cg.id = ? AND cg.workspace_id = ?
    GROUP BY cg.id
    LIMIT 1
  `).bind(id, workspaceId).first();
}

async function listWeddingOptions(db: D1Db) {
  const result = await db.prepare(`
    SELECT slug, title, couple, venue, wedding_date, status
    FROM weddings
    WHERE status <> 'archived'
    ORDER BY wedding_date DESC, title COLLATE NOCASE ASC
  `).all();
  return (result.results || []).map((row: any) => ({
    slug: text(row.slug),
    title: text(row.title || row.couple || row.slug),
    couple: text(row.couple),
    venue: text(row.venue),
    weddingDate: text(row.wedding_date),
    status: text(row.status),
  }));
}

export async function listClientGalleries(db: D1Db) {
  const workspaceId = await getDefaultWorkspaceId(db);
  const [galleryResult, weddings] = await Promise.all([
    db.prepare(`
      SELECT
        cg.*,
        w.title AS wedding_title,
        w.couple AS wedding_couple,
        COUNT(DISTINCT cga.asset_id) AS asset_count,
        COUNT(DISTINCT CASE WHEN cga.hidden = 0 THEN cga.asset_id END) AS visible_asset_count,
        COUNT(DISTINCT cgf.asset_id || ':' || cgf.visitor_key) AS favourite_count,
        COUNT(DISTINCT ade.id) AS download_count,
        COALESCE(cover_thumb.url, '') AS cover_thumb,
        COALESCE(cover_web.url, '') AS cover_web
      FROM client_galleries cg
      LEFT JOIN weddings w ON w.slug = cg.wedding_slug
      LEFT JOIN client_gallery_assets cga ON cga.gallery_id = cg.id
      LEFT JOIN client_gallery_favourites cgf ON cgf.gallery_id = cg.id
      LEFT JOIN asset_download_events ade ON ade.gallery_id = cg.id
      LEFT JOIN asset_files cover_thumb
        ON cover_thumb.asset_id = cg.cover_asset_id
        AND cover_thumb.variant = 'thumb'
        AND cover_thumb.status = 'active'
      LEFT JOIN asset_files cover_web
        ON cover_web.asset_id = cg.cover_asset_id
        AND cover_web.variant = 'web'
        AND cover_web.status = 'active'
      WHERE cg.workspace_id = ? AND cg.status <> 'archived'
      GROUP BY cg.id
      ORDER BY cg.updated_at DESC, cg.title COLLATE NOCASE ASC
    `).bind(workspaceId).all(),
    listWeddingOptions(db),
  ]);
  return {
    workspaceId,
    galleries: (galleryResult.results || []).map(mapGallery),
    weddings,
  };
}

export async function createClientGallery(db: D1Db, input: any) {
  const workspaceId = await getDefaultWorkspaceId(db);
  const title = text(input?.title);
  if (!title) throw new Error("Gallery title is required.");
  const id = `client_gallery_${crypto.randomUUID()}`;
  const slug = await uniqueSlug(db, workspaceId, input?.slug || title);
  const weddingSlug = text(input?.weddingSlug);
  const token = accessToken();
  const pin = text(input?.pin);
  const pinHash = pin ? await hashPin(pin) : "";

  await db.prepare(`
    INSERT INTO client_galleries (
      id, workspace_id, wedding_slug, slug, title, client_name, client_email,
      intro, status, access_token, pin_hash, expires_at, allow_favourites,
      allow_downloads, cover_asset_id, created_at, updated_at
    ) VALUES (?, ?, NULLIF(?, ''), ?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?, ''), ?, ?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    id,
    workspaceId,
    weddingSlug,
    slug,
    title,
    text(input?.clientName),
    text(input?.clientEmail),
    text(input?.intro),
    cleanStatus(input?.status),
    token,
    pinHash,
    text(input?.expiresAt),
    bool(input?.allowFavourites, true) ? 1 : 0,
    bool(input?.allowDownloads, false) ? 1 : 0,
  ).run();

  if (weddingSlug && bool(input?.importWeddingAssets, true)) {
    await importWeddingAssets(db, id, workspaceId, weddingSlug);
  }

  const row = await galleryBaseRow(db, id, workspaceId);
  return mapGallery(row);
}

export async function updateClientGallery(db: D1Db, id: string, input: any) {
  const workspaceId = await getDefaultWorkspaceId(db);
  const existing = await db.prepare(`
    SELECT * FROM client_galleries WHERE id = ? AND workspace_id = ? LIMIT 1
  `).bind(id, workspaceId).first();
  if (!existing) throw new Error("Client gallery not found.");

  const title = text(input?.title ?? existing.title) || text(existing.title);
  const slug = await uniqueSlug(db, workspaceId, input?.slug ?? existing.slug ?? title, id);
  let pinHash = text(existing.pin_hash);
  if (Object.prototype.hasOwnProperty.call(input || {}, "pin")) {
    const pin = text(input?.pin);
    pinHash = pin ? await hashPin(pin) : "";
  }

  const coverAssetId = text(input?.coverAssetId ?? existing.cover_asset_id);
  if (coverAssetId) {
    const asset = await db.prepare(`
      SELECT id FROM assets WHERE id = ? AND workspace_id = ? AND status = 'active' LIMIT 1
    `).bind(coverAssetId, workspaceId).first();
    if (!asset) throw new Error("Selected cover asset is not available in this workspace.");
  }

  await db.prepare(`
    UPDATE client_galleries
    SET
      wedding_slug = NULLIF(?, ''),
      slug = ?,
      title = ?,
      client_name = ?,
      client_email = ?,
      intro = ?,
      status = ?,
      pin_hash = ?,
      expires_at = NULLIF(?, ''),
      allow_favourites = ?,
      allow_downloads = ?,
      cover_asset_id = NULLIF(?, ''),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workspace_id = ?
  `).bind(
    text(input?.weddingSlug ?? existing.wedding_slug),
    slug,
    title,
    text(input?.clientName ?? existing.client_name),
    text(input?.clientEmail ?? existing.client_email),
    text(input?.intro ?? existing.intro),
    cleanStatus(input?.status ?? existing.status),
    pinHash,
    text(input?.expiresAt ?? existing.expires_at),
    bool(input?.allowFavourites, number(existing.allow_favourites, 1) === 1) ? 1 : 0,
    bool(input?.allowDownloads, number(existing.allow_downloads) === 1) ? 1 : 0,
    coverAssetId,
    id,
    workspaceId,
  ).run();

  const row = await galleryBaseRow(db, id, workspaceId);
  return mapGallery(row);
}

export async function archiveClientGallery(db: D1Db, id: string) {
  const workspaceId = await getDefaultWorkspaceId(db);
  await db.prepare(`
    UPDATE client_galleries
    SET status = 'archived', updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workspace_id = ?
  `).bind(id, workspaceId).run();
  const row = await galleryBaseRow(db, id, workspaceId);
  if (!row) throw new Error("Client gallery not found.");
  return mapGallery(row);
}

async function adminGalleryAssets(db: D1Db, galleryId: string) {
  const result = await db.prepare(`
    SELECT
      cga.asset_id,
      cga.sort_order,
      cga.hidden,
      a.filename,
      a.original_filename,
      a.width,
      a.height,
      COALESCE(tf.url, '') AS thumb_url,
      COALESCE(wf.url, '') AS web_url,
      CASE WHEN of.variant IS NULL THEN 0 ELSE 1 END AS has_original
    FROM client_gallery_assets cga
    JOIN assets a ON a.id = cga.asset_id
    LEFT JOIN asset_files tf ON tf.asset_id = a.id AND tf.variant = 'thumb' AND tf.status = 'active'
    LEFT JOIN asset_files wf ON wf.asset_id = a.id AND wf.variant = 'web' AND wf.status = 'active'
    LEFT JOIN asset_files of ON of.asset_id = a.id AND of.variant = 'original' AND of.status = 'active'
    WHERE cga.gallery_id = ? AND a.status = 'active'
    ORDER BY cga.sort_order ASC, a.filename COLLATE NOCASE ASC
  `).bind(galleryId).all();
  return (result.results || []).map((row: any) => ({
    assetId: text(row.asset_id),
    filename: text(row.filename || row.original_filename),
    thumbSrc: text(row.thumb_url || row.web_url),
    webSrc: text(row.web_url || row.thumb_url),
    width: number(row.width),
    height: number(row.height),
    sortOrder: number(row.sort_order),
    hidden: number(row.hidden) === 1,
    hasOriginal: number(row.has_original) === 1,
  }));
}

export async function getClientGalleryAdmin(db: D1Db, id: string) {
  const workspaceId = await getDefaultWorkspaceId(db);
  const [row, assets, weddings] = await Promise.all([
    galleryBaseRow(db, id, workspaceId),
    adminGalleryAssets(db, id),
    listWeddingOptions(db),
  ]);
  if (!row) throw new Error("Client gallery not found.");
  return { workspaceId, gallery: mapGallery(row), assets, weddings };
}

export async function importWeddingAssets(db: D1Db, galleryId: string, workspaceId?: string, weddingSlug?: string) {
  const resolvedWorkspaceId = workspaceId || await getDefaultWorkspaceId(db);
  const gallery = await db.prepare(`
    SELECT id, wedding_slug FROM client_galleries
    WHERE id = ? AND workspace_id = ? LIMIT 1
  `).bind(galleryId, resolvedWorkspaceId).first();
  if (!gallery) throw new Error("Client gallery not found.");
  const resolvedWeddingSlug = text(weddingSlug || gallery.wedding_slug);
  if (!resolvedWeddingSlug) throw new Error("Assign a wedding before importing wedding assets.");

  const maxRow = await db.prepare(`
    SELECT COALESCE(MAX(sort_order), -1) AS max_order
    FROM client_gallery_assets WHERE gallery_id = ?
  `).bind(galleryId).first();
  const startOrder = number(maxRow?.max_order, -1) + 1;

  await db.prepare(`
    INSERT OR IGNORE INTO client_gallery_assets (gallery_id, asset_id, sort_order, hidden)
    SELECT ?, awl.asset_id, ? + ROW_NUMBER() OVER (ORDER BY awl.sort_order ASC, awl.asset_id ASC) - 1, 0
    FROM asset_wedding_links awl
    JOIN assets a ON a.id = awl.asset_id
    WHERE awl.wedding_slug = ?
      AND a.workspace_id = ?
      AND a.status = 'active'
    ORDER BY awl.sort_order ASC, awl.asset_id ASC
  `).bind(galleryId, startOrder, resolvedWeddingSlug, resolvedWorkspaceId).run();

  const firstRow = await db.prepare(`
    SELECT asset_id FROM client_gallery_assets
    WHERE gallery_id = ? AND hidden = 0
    ORDER BY sort_order ASC LIMIT 1
  `).bind(galleryId).first();
  await db.prepare(`
    UPDATE client_galleries
    SET cover_asset_id = COALESCE(NULLIF(cover_asset_id, ''), ?), updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workspace_id = ?
  `).bind(text(firstRow?.asset_id), galleryId, resolvedWorkspaceId).run();

  const countRow = await db.prepare(`
    SELECT COUNT(*) AS total FROM client_gallery_assets WHERE gallery_id = ?
  `).bind(galleryId).first();
  return number(countRow?.total);
}

export async function mutateClientGalleryAssets(db: D1Db, galleryId: string, input: any) {
  const workspaceId = await getDefaultWorkspaceId(db);
  const gallery = await db.prepare(`
    SELECT * FROM client_galleries WHERE id = ? AND workspace_id = ? LIMIT 1
  `).bind(galleryId, workspaceId).first();
  if (!gallery) throw new Error("Client gallery not found.");
  const action = text(input?.action);

  if (action === "importWedding") {
    const total = await importWeddingAssets(db, galleryId, workspaceId, text(input?.weddingSlug || gallery.wedding_slug));
    return { total };
  }

  if (action === "add") {
    const assetIds = Array.isArray(input?.assetIds) ? [...new Set(input.assetIds.map(text).filter(Boolean))] : [];
    if (!assetIds.length) return { total: number((await db.prepare(`SELECT COUNT(*) AS total FROM client_gallery_assets WHERE gallery_id = ?`).bind(galleryId).first())?.total) };
    const maxRow = await db.prepare(`SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM client_gallery_assets WHERE gallery_id = ?`).bind(galleryId).first();
    let next = number(maxRow?.max_order, -1) + 1;
    const statements: any[] = [];
    for (const assetId of assetIds) {
      statements.push(db.prepare(`
        INSERT OR IGNORE INTO client_gallery_assets (gallery_id, asset_id, sort_order, hidden)
        SELECT ?, id, ?, 0 FROM assets
        WHERE id = ? AND workspace_id = ? AND status = 'active'
      `).bind(galleryId, next++, assetId, workspaceId));
    }
    if (statements.length) await db.batch(statements);
  } else if (action === "remove") {
    const assetId = text(input?.assetId);
    if (assetId) {
      await db.batch([
        db.prepare(`DELETE FROM client_gallery_assets WHERE gallery_id = ? AND asset_id = ?`).bind(galleryId, assetId),
        db.prepare(`DELETE FROM client_gallery_favourites WHERE gallery_id = ? AND asset_id = ?`).bind(galleryId, assetId),
        db.prepare(`UPDATE client_galleries SET cover_asset_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND cover_asset_id = ?`).bind(galleryId, assetId),
      ]);
    }
  } else if (action === "setCover") {
    const assetId = text(input?.assetId);
    const member = await db.prepare(`SELECT asset_id FROM client_gallery_assets WHERE gallery_id = ? AND asset_id = ? LIMIT 1`).bind(galleryId, assetId).first();
    if (!member) throw new Error("Cover image must already belong to this client gallery.");
    await db.prepare(`UPDATE client_galleries SET cover_asset_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`).bind(assetId, galleryId, workspaceId).run();
  } else if (action === "setHidden") {
    const assetId = text(input?.assetId);
    await db.prepare(`UPDATE client_gallery_assets SET hidden = ? WHERE gallery_id = ? AND asset_id = ?`).bind(bool(input?.hidden) ? 1 : 0, galleryId, assetId).run();
  } else if (action === "reorder") {
    const assetIds = Array.isArray(input?.assetIds) ? input.assetIds.map(text).filter(Boolean) : [];
    const statements = assetIds.map((assetId: string, index: number) => db.prepare(`UPDATE client_gallery_assets SET sort_order = ? WHERE gallery_id = ? AND asset_id = ?`).bind(index, galleryId, assetId));
    if (statements.length) await db.batch(statements);
  } else {
    throw new Error("Unsupported client gallery asset action.");
  }

  const countRow = await db.prepare(`SELECT COUNT(*) AS total FROM client_gallery_assets WHERE gallery_id = ?`).bind(galleryId).first();
  return { total: number(countRow?.total) };
}

async function publicGalleryRow(db: D1Db, token: string) {
  return db.prepare(`
    SELECT
      cg.*,
      ws.business_name,
      ws.logo_url,
      ws.website_url,
      w.couple,
      w.venue,
      w.wedding_date
    FROM client_galleries cg
    LEFT JOIN workspace_settings ws ON ws.workspace_id = cg.workspace_id
    LEFT JOIN weddings w ON w.slug = cg.wedding_slug
    WHERE cg.access_token = ? AND cg.status = 'live'
    LIMIT 1
  `).bind(token).first();
}

async function verifyPublicAccess(row: any, pin: string) {
  if (!row) return { ok: false, status: 404, error: "Gallery not found." };
  if (galleryIsExpired(row)) return { ok: false, status: 410, error: "This gallery has expired." };
  const wantedHash = text(row.pin_hash);
  if (!wantedHash) return { ok: true, status: 200, error: "" };
  if (!pin) return { ok: false, status: 401, error: "PIN required." };
  if (!(await verifyPinHash(wantedHash, pin))) return { ok: false, status: 401, error: "Incorrect PIN." };
  return { ok: true, status: 200, error: "" };
}

async function publicAssets(db: D1Db, galleryId: string) {
  const result = await db.prepare(`
    SELECT
      cga.asset_id,
      cga.sort_order,
      a.filename,
      a.width,
      a.height,
      COALESCE(tf.url, wf.url, '') AS thumb_url,
      COALESCE(wf.url, tf.url, '') AS web_url,
      CASE WHEN of.variant IS NULL THEN 0 ELSE 1 END AS has_original
    FROM client_gallery_assets cga
    JOIN assets a ON a.id = cga.asset_id
    LEFT JOIN asset_files tf ON tf.asset_id = a.id AND tf.variant = 'thumb' AND tf.status = 'active'
    LEFT JOIN asset_files wf ON wf.asset_id = a.id AND wf.variant = 'web' AND wf.status = 'active'
    LEFT JOIN asset_files of ON of.asset_id = a.id AND of.variant = 'original' AND of.status = 'active'
    WHERE cga.gallery_id = ? AND cga.hidden = 0 AND a.status = 'active'
    ORDER BY cga.sort_order ASC, a.filename COLLATE NOCASE ASC
  `).bind(galleryId).all();
  return (result.results || []).map((row: any) => ({
    assetId: text(row.asset_id),
    filename: text(row.filename),
    thumbSrc: text(row.thumb_url),
    webSrc: text(row.web_url),
    width: number(row.width),
    height: number(row.height),
    hasOriginal: number(row.has_original) === 1,
  }));
}

async function favouriteIds(db: D1Db, galleryId: string, visitorKey: string) {
  if (!visitorKey) return [] as string[];
  const result = await db.prepare(`
    SELECT asset_id FROM client_gallery_favourites
    WHERE gallery_id = ? AND visitor_key = ?
    ORDER BY created_at ASC
  `).bind(galleryId, visitorKey).all();
  return (result.results || []).map((row: any) => text(row.asset_id)).filter(Boolean);
}

export async function getPublicClientGallery(db: D1Db, token: string, pin = "", visitorKey = "") {
  const row = await publicGalleryRow(db, token);
  if (!row) return { status: 404, body: { error: "Gallery not found." } };
  if (galleryIsExpired(row)) return { status: 410, body: { error: "This gallery has expired." } };

  const locked = Boolean(text(row.pin_hash));
  const base = {
    id: text(row.id),
    title: text(row.title),
    clientName: text(row.client_name),
    intro: text(row.intro),
    couple: text(row.couple),
    venue: text(row.venue),
    weddingDate: text(row.wedding_date),
    businessName: text(row.business_name || "Photography Gallery"),
    logoUrl: text(row.logo_url),
    websiteUrl: text(row.website_url),
    allowFavourites: number(row.allow_favourites, 1) === 1,
    allowDownloads: number(row.allow_downloads) === 1,
    requiresPin: locked,
    expiresAt: text(row.expires_at),
  };

  const access = await verifyPublicAccess(row, pin);
  if (!access.ok) {
    return { status: access.status, body: { ok: false, locked: true, ...base, error: access.error } };
  }

  const [assets, favourites] = await Promise.all([
    publicAssets(db, text(row.id)),
    favouriteIds(db, text(row.id), visitorKey),
  ]);
  const coverAssetId = text(row.cover_asset_id);
  const cover = assets.find((asset) => asset.assetId === coverAssetId) || assets[0] || null;
  return {
    status: 200,
    body: {
      ok: true,
      locked: false,
      ...base,
      cover,
      assets,
      favouriteAssetIds: favourites,
    },
  };
}

export async function setPublicFavourite(db: D1Db, token: string, input: any) {
  const row = await publicGalleryRow(db, token);
  const pin = text(input?.pin);
  const access = await verifyPublicAccess(row, pin);
  if (!access.ok) return { status: access.status, body: { error: access.error } };
  if (number(row?.allow_favourites, 1) !== 1) return { status: 403, body: { error: "Favourites are disabled for this gallery." } };

  const galleryId = text(row.id);
  const visitorKey = text(input?.visitorKey).slice(0, 160);
  const assetId = text(input?.assetId);
  const favourite = bool(input?.favourite, true);
  if (!visitorKey || !assetId) return { status: 400, body: { error: "Visitor and asset are required." } };

  const member = await db.prepare(`
    SELECT asset_id FROM client_gallery_assets
    WHERE gallery_id = ? AND asset_id = ? AND hidden = 0 LIMIT 1
  `).bind(galleryId, assetId).first();
  if (!member) return { status: 404, body: { error: "Image not found in this gallery." } };

  if (favourite) {
    await db.prepare(`
      INSERT OR IGNORE INTO client_gallery_favourites (gallery_id, visitor_key, asset_id)
      VALUES (?, ?, ?)
    `).bind(galleryId, visitorKey, assetId).run();
  } else {
    await db.prepare(`
      DELETE FROM client_gallery_favourites
      WHERE gallery_id = ? AND visitor_key = ? AND asset_id = ?
    `).bind(galleryId, visitorKey, assetId).run();
  }

  return { status: 200, body: { ok: true, favouriteAssetIds: await favouriteIds(db, galleryId, visitorKey) } };
}

export async function authoriseClientGalleryOriginalDownload(db: D1Db, token: string, input: any) {
  const row = await publicGalleryRow(db, token);
  const pin = text(input?.pin);
  const access = await verifyPublicAccess(row, pin);
  if (!access.ok) return { status: access.status, error: access.error } as const;
  if (number(row?.allow_downloads) !== 1) {
    return { status: 403, error: "Downloads are disabled for this gallery." } as const;
  }

  const galleryId = text(row.id);
  const workspaceId = text(row.workspace_id);
  const assetId = text(input?.assetId);
  if (!assetId) return { status: 400, error: "Asset is required." } as const;

  const asset = await db.prepare(`
    SELECT
      a.id,
      a.original_filename,
      a.filename,
      af.storage_key,
      af.mime_type,
      af.file_size
    FROM client_gallery_assets cga
    JOIN assets a ON a.id = cga.asset_id
    JOIN asset_files af
      ON af.asset_id = a.id
      AND af.variant = 'original'
      AND af.status = 'active'
      AND af.access_level = 'private'
    WHERE cga.gallery_id = ?
      AND cga.asset_id = ?
      AND cga.hidden = 0
      AND a.status = 'active'
    LIMIT 1
  `).bind(galleryId, assetId).first();

  if (!asset || !text(asset.storage_key)) {
    return { status: 404, error: "Full-resolution original is not available for this image." } as const;
  }

  return {
    status: 200,
    workspaceId,
    galleryId,
    assetId: text(asset.id),
    filename: text(asset.original_filename || asset.filename || "photograph.jpg"),
    storageKey: text(asset.storage_key),
    mimeType: text(asset.mime_type || "image/jpeg"),
    fileSize: number(asset.file_size),
    visitorKey: text(input?.visitorKey).slice(0, 160),
  } as const;
}

export async function recordClientGalleryDownload(
  db: D1Db,
  input: {
    workspaceId: string;
    galleryId: string;
    assetId: string;
    visitorKey?: string;
    bytesSent?: number;
    userAgent?: string;
  },
) {
  await db.prepare(`
    INSERT INTO asset_download_events (
      id, workspace_id, gallery_id, asset_id, visitor_key,
      delivery, bytes_sent, user_agent, created_at
    ) VALUES (?, ?, ?, ?, ?, 'original', ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    `asset_download_${crypto.randomUUID()}`,
    text(input.workspaceId),
    text(input.galleryId),
    text(input.assetId),
    text(input.visitorKey).slice(0, 160),
    number(input.bytesSent),
    text(input.userAgent).slice(0, 500),
  ).run();
}
