import { getDefaultWorkspaceId } from "./workspace-d1";
import { ClientAuthIdentity, linkAuthenticatedVisitor } from "./client-auth-d1";

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

function normalizeEmail(value: unknown) {
  return text(value).toLowerCase();
}

function validEmail(value: unknown) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    requireEmail: number(row?.require_email) === 1,
    allowGuestDownloads: number(row?.allow_guest_downloads) === 1,
    coverAssetId: text(row?.cover_asset_id),
    coverThumb: text(row?.cover_thumb || row?.cover_web),
    coverWeb: text(row?.cover_web),
    assetCount,
    visibleAssetCount,
    favouriteCount,
    downloadCount,
    visitorCount: number(row?.visitor_count),
    authorisedContactCount: number(row?.authorised_contact_count),
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
      COUNT(DISTINCT cgf.asset_id || ':' || COALESCE(cigv.identity_id, cgf.visitor_key)) AS favourite_count,
      COUNT(DISTINCT ade.id) AS download_count,
      COUNT(DISTINCT cgv.visitor_key) AS visitor_count,
      COUNT(DISTINCT CASE WHEN cgc.status = 'active' THEN cgc.email_normalized END) AS authorised_contact_count,
      COALESCE(cgas.require_email, 0) AS require_email,
      COALESCE(cgas.allow_guest_downloads, 0) AS allow_guest_downloads,
      COALESCE(cover_thumb.url, '') AS cover_thumb,
      COALESCE(cover_web.url, '') AS cover_web
    FROM client_galleries cg
    LEFT JOIN weddings w ON w.slug = cg.wedding_slug
    LEFT JOIN client_gallery_assets cga ON cga.gallery_id = cg.id
    LEFT JOIN client_gallery_favourites cgf ON cgf.gallery_id = cg.id
    LEFT JOIN client_identity_gallery_visitors cigv ON cigv.gallery_id = cgf.gallery_id AND cigv.visitor_key = cgf.visitor_key
    LEFT JOIN asset_download_events ade ON ade.gallery_id = cg.id
    LEFT JOIN client_gallery_access_settings cgas ON cgas.gallery_id = cg.id
    LEFT JOIN client_gallery_visitors cgv ON cgv.gallery_id = cg.id
    LEFT JOIN client_gallery_contacts cgc ON cgc.gallery_id = cg.id
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
        COUNT(DISTINCT cgf.asset_id || ':' || COALESCE(cigv.identity_id, cgf.visitor_key)) AS favourite_count,
        COUNT(DISTINCT ade.id) AS download_count,
        COUNT(DISTINCT cgv.visitor_key) AS visitor_count,
        COUNT(DISTINCT CASE WHEN cgc.status = 'active' THEN cgc.email_normalized END) AS authorised_contact_count,
        COALESCE(cgas.require_email, 0) AS require_email,
        COALESCE(cgas.allow_guest_downloads, 0) AS allow_guest_downloads,
        COALESCE(cover_thumb.url, '') AS cover_thumb,
        COALESCE(cover_web.url, '') AS cover_web
      FROM client_galleries cg
      LEFT JOIN weddings w ON w.slug = cg.wedding_slug
      LEFT JOIN client_gallery_assets cga ON cga.gallery_id = cg.id
      LEFT JOIN client_gallery_favourites cgf ON cgf.gallery_id = cg.id
      LEFT JOIN client_identity_gallery_visitors cigv ON cigv.gallery_id = cgf.gallery_id AND cigv.visitor_key = cgf.visitor_key
      LEFT JOIN asset_download_events ade ON ade.gallery_id = cg.id
      LEFT JOIN client_gallery_access_settings cgas ON cgas.gallery_id = cg.id
      LEFT JOIN client_gallery_visitors cgv ON cgv.gallery_id = cg.id
      LEFT JOIN client_gallery_contacts cgc ON cgc.gallery_id = cg.id
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

  await db.prepare(`
    INSERT OR IGNORE INTO client_gallery_access_settings (gallery_id, require_email, allow_guest_downloads)
    VALUES (?, ?, ?)
  `).bind(
    id,
    bool(input?.requireEmail, false) ? 1 : 0,
    bool(input?.allowGuestDownloads, false) ? 1 : 0,
  ).run();

  const initialClientEmail = text(input?.clientEmail);
  if (initialClientEmail && validEmail(initialClientEmail)) {
    await upsertClientGalleryContact(db, id, {
      email: initialClientEmail,
      displayName: text(input?.clientName),
      role: "primary_client",
      allowOriginalDownloads: true,
    });
  }

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

  const existingAccess = await db.prepare(`
    SELECT require_email, allow_guest_downloads
    FROM client_gallery_access_settings
    WHERE gallery_id = ?
    LIMIT 1
  `).bind(id).first();
  const requireEmail = bool(input?.requireEmail, number(existingAccess?.require_email) === 1);
  const allowGuestDownloads = bool(input?.allowGuestDownloads, number(existingAccess?.allow_guest_downloads) === 1);
  await db.prepare(`
    INSERT INTO client_gallery_access_settings (gallery_id, require_email, allow_guest_downloads, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(gallery_id) DO UPDATE SET
      require_email = excluded.require_email,
      allow_guest_downloads = excluded.allow_guest_downloads,
      updated_at = CURRENT_TIMESTAMP
  `).bind(id, requireEmail ? 1 : 0, allowGuestDownloads ? 1 : 0).run();

  const resolvedClientEmail = text(input?.clientEmail ?? existing.client_email);
  const previousClientEmail = text(existing.client_email);
  if (normalizeEmail(previousClientEmail) && normalizeEmail(previousClientEmail) !== normalizeEmail(resolvedClientEmail)) {
    await db.prepare(`
      UPDATE client_gallery_contacts
      SET status = 'archived', updated_at = CURRENT_TIMESTAMP
      WHERE gallery_id = ? AND email_normalized = ? AND role = 'primary_client'
    `).bind(id, normalizeEmail(previousClientEmail)).run();
  }
  if (resolvedClientEmail && validEmail(resolvedClientEmail)) {
    await upsertClientGalleryContact(db, id, {
      email: resolvedClientEmail,
      displayName: text(input?.clientName ?? existing.client_name),
      role: "primary_client",
      allowOriginalDownloads: true,
    });
  }

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

function mapContact(row: any) {
  return {
    email: text(row?.email),
    emailNormalized: text(row?.email_normalized),
    displayName: text(row?.display_name),
    role: text(row?.role || "client"),
    allowOriginalDownloads: number(row?.allow_original_downloads, 1) === 1,
    status: text(row?.status) === "archived" ? "archived" : "active",
    createdAt: text(row?.created_at),
    updatedAt: text(row?.updated_at),
  };
}

export async function listClientGalleryContacts(db: D1Db, galleryId: string) {
  const result = await db.prepare(`
    SELECT * FROM client_gallery_contacts
    WHERE gallery_id = ? AND status = 'active'
    ORDER BY CASE role WHEN 'primary_client' THEN 0 WHEN 'client' THEN 1 ELSE 2 END, display_name COLLATE NOCASE, email COLLATE NOCASE
  `).bind(galleryId).all();
  return (result.results || []).map(mapContact);
}

export async function upsertClientGalleryContact(db: D1Db, galleryId: string, input: any) {
  const email = text(input?.email);
  const emailNormalized = normalizeEmail(email);
  if (!validEmail(email)) throw new Error("Enter a valid email address.");
  const workspaceId = await getDefaultWorkspaceId(db);
  const gallery = await db.prepare(`SELECT id FROM client_galleries WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(galleryId, workspaceId).first();
  if (!gallery) throw new Error("Client gallery not found.");
  await db.prepare(`
    INSERT INTO client_gallery_contacts (
      gallery_id, email_normalized, email, display_name, role, allow_original_downloads, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(gallery_id, email_normalized) DO UPDATE SET
      email = excluded.email,
      display_name = excluded.display_name,
      role = excluded.role,
      allow_original_downloads = excluded.allow_original_downloads,
      status = 'active',
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    galleryId,
    emailNormalized,
    email,
    text(input?.displayName),
    text(input?.role || "client") || "client",
    bool(input?.allowOriginalDownloads, true) ? 1 : 0,
  ).run();
  return listClientGalleryContacts(db, galleryId);
}

export async function removeClientGalleryContact(db: D1Db, galleryId: string, email: string) {
  const workspaceId = await getDefaultWorkspaceId(db);
  const gallery = await db.prepare(`SELECT id FROM client_galleries WHERE id = ? AND workspace_id = ? LIMIT 1`).bind(galleryId, workspaceId).first();
  if (!gallery) throw new Error("Client gallery not found.");
  await db.prepare(`
    UPDATE client_gallery_contacts
    SET status = 'archived', updated_at = CURRENT_TIMESTAMP
    WHERE gallery_id = ? AND email_normalized = ?
  `).bind(galleryId, normalizeEmail(email)).run();
  return listClientGalleryContacts(db, galleryId);
}

async function listClientGalleryVisitors(db: D1Db, galleryId: string) {
  const result = await db.prepare(`
    SELECT
      cgv.*,
      COALESCE(cgc.role, 'guest') AS contact_role,
      CASE
        WHEN cg.allow_downloads <> 1 THEN 0
        WHEN COALESCE(cgas.require_email, 0) = 0 THEN 1
        WHEN COALESCE(cgc.allow_original_downloads, 0) = 1 THEN 1
        WHEN COALESCE(cgas.allow_guest_downloads, 0) = 1 THEN 1
        ELSE 0
      END AS contact_downloads
    FROM client_gallery_visitors cgv
    JOIN client_galleries cg ON cg.id = cgv.gallery_id
    LEFT JOIN client_gallery_access_settings cgas ON cgas.gallery_id = cgv.gallery_id
    LEFT JOIN client_gallery_contacts cgc
      ON cgc.gallery_id = cgv.gallery_id
      AND cgc.email_normalized = cgv.email_normalized
      AND cgc.status = 'active'
    WHERE cgv.gallery_id = ?
    ORDER BY cgv.last_seen_at DESC
    LIMIT 100
  `).bind(galleryId).all();
  return (result.results || []).map((row: any) => ({
    visitorKey: text(row.visitor_key),
    email: text(row.email),
    emailNormalized: text(row.email_normalized),
    displayName: text(row.display_name),
    role: text(row.contact_role || "guest"),
    canDownloadOriginals: number(row.contact_downloads) === 1,
    firstSeenAt: text(row.first_seen_at),
    lastSeenAt: text(row.last_seen_at),
    visitCount: number(row.visit_count, 1),
  }));
}


function mapSelectionRequest(row: any) {
  return {
    id: text(row?.id),
    galleryId: text(row?.gallery_id),
    name: text(row?.name),
    instructions: text(row?.instructions),
    minImages: number(row?.min_images),
    maxImages: number(row?.max_images),
    status: text(row?.status) === "archived" ? "archived" : "active",
    sortOrder: number(row?.sort_order),
    createdAt: text(row?.created_at),
    updatedAt: text(row?.updated_at),
  };
}

export async function listClientGallerySelectionRequests(db: D1Db, galleryId: string, includeArchived = true) {
  const result = await db.prepare(`
    SELECT * FROM client_gallery_selection_requests
    WHERE gallery_id = ? ${includeArchived ? "" : "AND status = 'active'"}
    ORDER BY status ASC, sort_order ASC, created_at ASC
  `).bind(galleryId).all();
  return (result.results || []).map(mapSelectionRequest);
}

async function listClientGallerySelections(db: D1Db, galleryId: string) {
  const [selectionResult, assetResult] = await Promise.all([
    db.prepare(`
      SELECT
        cgs.*,
        cgsr.name AS request_name,
        COUNT(cgsa.asset_id) AS selected_count
      FROM client_gallery_selections cgs
      JOIN client_gallery_selection_requests cgsr ON cgsr.id = cgs.request_id
      LEFT JOIN client_gallery_selection_assets cgsa ON cgsa.selection_id = cgs.id
      WHERE cgs.gallery_id = ?
      GROUP BY cgs.id
      ORDER BY CASE cgs.status WHEN 'submitted' THEN 0 ELSE 1 END,
               COALESCE(cgs.submitted_at, cgs.updated_at) DESC
    `).bind(galleryId).all(),
    db.prepare(`
      SELECT
        cgsa.selection_id,
        cgsa.asset_id,
        cgsa.sort_order,
        a.filename,
        a.original_filename,
        COALESCE(tf.url, wf.url, '') AS thumb_url,
        COALESCE(wf.url, tf.url, '') AS web_url
      FROM client_gallery_selection_assets cgsa
      JOIN client_gallery_selections cgs ON cgs.id = cgsa.selection_id
      JOIN assets a ON a.id = cgsa.asset_id
      LEFT JOIN asset_files tf ON tf.asset_id = a.id AND tf.variant = 'thumb' AND tf.status = 'active'
      LEFT JOIN asset_files wf ON wf.asset_id = a.id AND wf.variant = 'web' AND wf.status = 'active'
      WHERE cgs.gallery_id = ?
      ORDER BY cgsa.selection_id, cgsa.sort_order ASC, cgsa.selected_at ASC
    `).bind(galleryId).all(),
  ]);
  const assetsBySelection = new Map<string, any[]>();
  for (const row of assetResult.results || []) {
    const selectionId = text((row as any).selection_id);
    const list = assetsBySelection.get(selectionId) || [];
    list.push({
      assetId: text((row as any).asset_id),
      filename: text((row as any).filename || (row as any).original_filename),
      thumbSrc: text((row as any).thumb_url),
      webSrc: text((row as any).web_url),
      sortOrder: number((row as any).sort_order),
    });
    assetsBySelection.set(selectionId, list);
  }
  return (selectionResult.results || []).map((row: any) => ({
    id: text(row.id),
    requestId: text(row.request_id),
    requestName: text(row.request_name),
    visitorKey: text(row.visitor_key),
    email: text(row.email),
    displayName: text(row.display_name),
    status: text(row.status) === 'submitted' ? 'submitted' : 'draft',
    submittedAt: text(row.submitted_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    selectedCount: number(row.selected_count),
    assets: assetsBySelection.get(text(row.id)) || [],
  }));
}

export async function mutateClientGallerySelections(db: D1Db, galleryId: string, input: any) {
  const workspaceId = await getDefaultWorkspaceId(db);
  const gallery = await db.prepare(`SELECT id FROM client_galleries WHERE id = ? AND workspace_id = ? LIMIT 1`)
    .bind(galleryId, workspaceId).first();
  if (!gallery) throw new Error('Client gallery not found.');
  const action = text(input?.action || 'createRequest');

  if (action === 'createRequest') {
    const name = text(input?.name);
    if (!name) throw new Error('Selection name is required.');
    const maxRow = await db.prepare(`SELECT COALESCE(MAX(sort_order), -10) AS max_order FROM client_gallery_selection_requests WHERE gallery_id = ?`)
      .bind(galleryId).first();
    const minImages = Math.max(0, Math.floor(number(input?.minImages)));
    const maxImages = Math.max(0, Math.floor(number(input?.maxImages)));
    if (maxImages > 0 && minImages > maxImages) throw new Error('Minimum images cannot exceed maximum images.');
    await db.prepare(`
      INSERT INTO client_gallery_selection_requests (
        id, gallery_id, name, instructions, min_images, max_images, status, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      `selection_request_${crypto.randomUUID()}`,
      galleryId,
      name,
      text(input?.instructions),
      minImages,
      maxImages,
      number(maxRow?.max_order, -10) + 10,
    ).run();
  } else if (action === 'updateRequest') {
    const requestId = text(input?.requestId);
    if (!requestId) throw new Error('Selection request is required.');
    const minImages = Math.max(0, Math.floor(number(input?.minImages)));
    const maxImages = Math.max(0, Math.floor(number(input?.maxImages)));
    if (maxImages > 0 && minImages > maxImages) throw new Error('Minimum images cannot exceed maximum images.');
    await db.prepare(`
      UPDATE client_gallery_selection_requests
      SET name = ?, instructions = ?, min_images = ?, max_images = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND gallery_id = ?
    `).bind(text(input?.name), text(input?.instructions), minImages, maxImages, requestId, galleryId).run();
  } else if (action === 'archiveRequest') {
    await db.prepare(`
      UPDATE client_gallery_selection_requests SET status = 'archived', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND gallery_id = ?
    `).bind(text(input?.requestId), galleryId).run();
  } else if (action === 'reopenSelection') {
    await db.prepare(`
      UPDATE client_gallery_selections
      SET status = 'draft', submitted_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND gallery_id = ?
    `).bind(text(input?.selectionId), galleryId).run();
  } else {
    throw new Error('Unsupported selection action.');
  }

  return {
    selectionRequests: await listClientGallerySelectionRequests(db, galleryId, true),
    selections: await listClientGallerySelections(db, galleryId),
  };
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
  const [row, assets, weddings, contacts, visitors, selectionRequests, selections] = await Promise.all([
    galleryBaseRow(db, id, workspaceId),
    adminGalleryAssets(db, id),
    listWeddingOptions(db),
    listClientGalleryContacts(db, id),
    listClientGalleryVisitors(db, id),
    listClientGallerySelectionRequests(db, id, true),
    listClientGallerySelections(db, id),
  ]);
  if (!row) throw new Error("Client gallery not found.");
  return { workspaceId, gallery: mapGallery(row), assets, weddings, contacts, visitors, selectionRequests, selections };
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
      COALESCE(cgas.require_email, 0) AS require_email,
      COALESCE(cgas.allow_guest_downloads, 0) AS allow_guest_downloads,
      ws.business_name,
      ws.logo_url,
      ws.website_url,
      w.couple,
      w.venue,
      w.wedding_date
    FROM client_galleries cg
    LEFT JOIN client_gallery_access_settings cgas ON cgas.gallery_id = cg.id
    LEFT JOIN workspace_settings ws ON ws.workspace_id = cg.workspace_id
    LEFT JOIN weddings w ON w.slug = cg.wedding_slug
    WHERE cg.access_token = ? AND cg.status = 'live'
    LIMIT 1
  `).bind(token).first();
}

type PublicVisitorIdentity = {
  visitorKey: string;
  email: string;
  emailNormalized: string;
  displayName: string;
  role: string;
  contactAllowsOriginals: boolean;
};

async function visitorIdentity(db: D1Db, galleryId: string, visitorKey: string): Promise<PublicVisitorIdentity | null> {
  if (!visitorKey) return null;
  const row = await db.prepare(`
    SELECT
      cgv.visitor_key,
      cgv.email,
      cgv.email_normalized,
      cgv.display_name,
      COALESCE(cgc.role, 'guest') AS role,
      COALESCE(cgc.allow_original_downloads, 0) AS contact_downloads
    FROM client_gallery_visitors cgv
    LEFT JOIN client_gallery_contacts cgc
      ON cgc.gallery_id = cgv.gallery_id
      AND cgc.email_normalized = cgv.email_normalized
      AND cgc.status = 'active'
    WHERE cgv.gallery_id = ? AND cgv.visitor_key = ?
    LIMIT 1
  `).bind(galleryId, visitorKey).first();
  if (!row || !text(row.email_normalized)) return null;
  return {
    visitorKey: text(row.visitor_key),
    email: text(row.email),
    emailNormalized: text(row.email_normalized),
    displayName: text(row.display_name),
    role: text(row.role || 'guest'),
    contactAllowsOriginals: number(row.contact_downloads) === 1,
  };
}

async function registerVisitorIdentity(db: D1Db, galleryId: string, visitorKey: string, emailValue: string, displayName = '') {
  const email = text(emailValue);
  if (!visitorKey) throw new Error('Visitor identity is required.');
  if (!validEmail(email)) throw new Error('Enter a valid email address.');
  const emailNormalized = normalizeEmail(email);
  await db.prepare(`
    INSERT INTO client_gallery_visitors (
      gallery_id, visitor_key, email, email_normalized, display_name,
      first_seen_at, last_seen_at, visit_count
    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
    ON CONFLICT(gallery_id, visitor_key) DO UPDATE SET
      email = excluded.email,
      email_normalized = excluded.email_normalized,
      display_name = CASE WHEN trim(excluded.display_name) <> '' THEN excluded.display_name ELSE client_gallery_visitors.display_name END,
      last_seen_at = CURRENT_TIMESTAMP,
      visit_count = client_gallery_visitors.visit_count + 1
  `).bind(galleryId, visitorKey, email, emailNormalized, text(displayName)).run();
  return visitorIdentity(db, galleryId, visitorKey);
}

async function touchVisitor(db: D1Db, galleryId: string, visitorKey: string) {
  if (!visitorKey) return;
  await db.prepare(`
    UPDATE client_gallery_visitors
    SET last_seen_at = CURRENT_TIMESTAMP, visit_count = visit_count + 1
    WHERE gallery_id = ? AND visitor_key = ?
  `).bind(galleryId, visitorKey).run();
}

async function verifyPublicAccess(
  db: D1Db,
  row: any,
  input: { pin?: string; visitorKey?: string; email?: string; displayName?: string },
  authenticatedIdentity: ClientAuthIdentity | null = null,
) {
  if (!row) return { ok: false, status: 404, error: 'Gallery not found.', identity: null as PublicVisitorIdentity | null, authenticatedIdentity: null as ClientAuthIdentity | null };
  if (galleryIsExpired(row)) return { ok: false, status: 410, error: 'This gallery has expired.', identity: null as PublicVisitorIdentity | null, authenticatedIdentity: null as ClientAuthIdentity | null };

  const galleryId = text(row.id);
  const visitorKey = text(input.visitorKey).slice(0, 160);
  const verifiedIdentity = authenticatedIdentity?.workspaceId === text(row.workspace_id) ? authenticatedIdentity : null;
  let identity = await visitorIdentity(db, galleryId, visitorKey);

  if (verifiedIdentity?.emailNormalized) {
    try {
      identity = await registerVisitorIdentity(db, galleryId, visitorKey, verifiedIdentity.email, verifiedIdentity.displayName);
      await linkAuthenticatedVisitor(db, verifiedIdentity, galleryId, visitorKey);
    } catch (error: any) {
      return { ok: false, status: 400, error: error?.message || 'Unable to restore secure client identity.', identity, authenticatedIdentity: verifiedIdentity };
    }
  } else if (text(input.email)) {
    try {
      identity = await registerVisitorIdentity(db, galleryId, visitorKey, text(input.email), text(input.displayName));
    } catch (error: any) {
      return { ok: false, status: 400, error: error?.message || 'Enter a valid email address.', identity, authenticatedIdentity: null as ClientAuthIdentity | null };
    }
  } else if (identity) {
    await touchVisitor(db, galleryId, visitorKey);
    identity = await visitorIdentity(db, galleryId, visitorKey);
  }

  const requireEmail = number(row.require_email) === 1;
  if (requireEmail && !identity?.emailNormalized) {
    return { ok: false, status: 401, error: 'Email required.', identity, authenticatedIdentity: verifiedIdentity };
  }

  const wantedHash = text(row.pin_hash);
  if (wantedHash) {
    const pin = text(input.pin);
    if (!pin) return { ok: false, status: 401, error: 'PIN required.', identity, authenticatedIdentity: verifiedIdentity };
    if (!(await verifyPinHash(wantedHash, pin))) return { ok: false, status: 401, error: 'Incorrect PIN.', identity, authenticatedIdentity: verifiedIdentity };
  }
  return { ok: true, status: 200, error: '', identity, authenticatedIdentity: verifiedIdentity };
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

async function favouriteIds(db: D1Db, galleryId: string, visitorKey: string, identityId = '') {
  if (!visitorKey && !identityId) return [] as string[];
  const result = identityId
    ? await db.prepare(`
        SELECT DISTINCT cgf.asset_id, MIN(cgf.created_at) AS first_created_at
        FROM client_gallery_favourites cgf
        WHERE cgf.gallery_id = ?
          AND (
            cgf.visitor_key = ?
            OR cgf.visitor_key IN (
              SELECT visitor_key
              FROM client_identity_gallery_visitors
              WHERE identity_id = ? AND gallery_id = ?
            )
          )
        GROUP BY cgf.asset_id
        ORDER BY first_created_at ASC
      `).bind(galleryId, visitorKey, identityId, galleryId).all()
    : await db.prepare(`
        SELECT asset_id FROM client_gallery_favourites
        WHERE gallery_id = ? AND visitor_key = ?
        ORDER BY created_at ASC
      `).bind(galleryId, visitorKey).all();
  return (result.results || []).map((row: any) => text(row.asset_id)).filter(Boolean);
}


async function publicSelectionState(db: D1Db, galleryId: string, visitorKey: string, emailNormalized = "") {
  const requestResult = await db.prepare(`
    SELECT * FROM client_gallery_selection_requests
    WHERE gallery_id = ? AND status = 'active'
    ORDER BY sort_order ASC, created_at ASC
  `).bind(galleryId).all();
  const requests = (requestResult.results || []).map(mapSelectionRequest);
  if ((!visitorKey && !emailNormalized) || !requests.length) {
    return requests.map((request: any) => ({ ...request, selection: null }));
  }
  const selectionResult = await db.prepare(`
    SELECT * FROM client_gallery_selections
    WHERE gallery_id = ?
      AND (visitor_key = ? OR (? <> '' AND email_normalized = ?))
    ORDER BY CASE WHEN visitor_key = ? THEN 0 ELSE 1 END, updated_at DESC
  `).bind(galleryId, visitorKey, emailNormalized, emailNormalized, visitorKey).all();
  const selections = selectionResult.results || [];
  const selectionIds = selections.map((row: any) => text(row.id)).filter(Boolean);
  const assetMap = new Map<string, string[]>();
  if (selectionIds.length) {
    const placeholders = selectionIds.map(() => '?').join(',');
    const assetResult = await db.prepare(`
      SELECT selection_id, asset_id
      FROM client_gallery_selection_assets
      WHERE selection_id IN (${placeholders})
      ORDER BY sort_order ASC, selected_at ASC
    `).bind(...selectionIds).all();
    for (const row of assetResult.results || []) {
      const selectionId = text((row as any).selection_id);
      const list = assetMap.get(selectionId) || [];
      list.push(text((row as any).asset_id));
      assetMap.set(selectionId, list);
    }
  }
  const byRequest = new Map<string, any>();
  for (const row of selections as any[]) {
    const requestId = text(row.request_id);
    if (!byRequest.has(requestId)) byRequest.set(requestId, row);
  }
  return requests.map((request: any) => {
    const row: any = byRequest.get(request.id);
    if (!row) return { ...request, selection: null };
    const assetIds = assetMap.get(text(row.id)) || [];
    return {
      ...request,
      selection: {
        id: text(row.id),
        status: text(row.status) === 'submitted' ? 'submitted' : 'draft',
        submittedAt: text(row.submitted_at),
        selectedCount: assetIds.length,
        assetIds,
      },
    };
  });
}

async function ensurePublicSelection(
  db: D1Db,
  galleryId: string,
  requestId: string,
  visitorKey: string,
  identity: PublicVisitorIdentity | null,
) {
  let row = await db.prepare(`
    SELECT * FROM client_gallery_selections
    WHERE request_id = ? AND gallery_id = ?
      AND (visitor_key = ? OR (? <> '' AND email_normalized = ?))
    ORDER BY CASE WHEN visitor_key = ? THEN 0 ELSE 1 END, updated_at DESC
    LIMIT 1
  `).bind(requestId, galleryId, visitorKey, identity?.emailNormalized || '', identity?.emailNormalized || '', visitorKey).first();
  if (row) {
    if (text(row.visitor_key) !== visitorKey) {
      await db.prepare(`UPDATE client_gallery_selections SET visitor_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(visitorKey, text(row.id)).run();
      row = { ...row, visitor_key: visitorKey };
    }
    return row;
  }
  const id = `selection_${crypto.randomUUID()}`;
  await db.prepare(`
    INSERT INTO client_gallery_selections (
      id, request_id, gallery_id, visitor_key, email, email_normalized, display_name,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    id,
    requestId,
    galleryId,
    visitorKey,
    identity?.email || '',
    identity?.emailNormalized || '',
    identity?.displayName || '',
  ).run();
  row = await db.prepare(`SELECT * FROM client_gallery_selections WHERE id = ? LIMIT 1`).bind(id).first();
  return row;
}

export async function mutatePublicClientGallerySelection(db: D1Db, token: string, input: any, authenticatedIdentity: ClientAuthIdentity | null = null) {
  const row = await publicGalleryRow(db, token);
  const access = await verifyPublicAccess(db, row, {
    pin: text(input?.pin),
    visitorKey: text(input?.visitorKey),
    email: text(input?.email),
  }, authenticatedIdentity);
  if (!access.ok) return { status: access.status, body: { error: access.error } };

  const galleryId = text(row.id);
  const visitorKey = text(input?.visitorKey).slice(0, 160);
  const requestId = text(input?.requestId);
  const action = text(input?.action || 'toggle');
  if (!visitorKey || !requestId) return { status: 400, body: { error: 'Visitor and selection request are required.' } };

  const request = await db.prepare(`
    SELECT * FROM client_gallery_selection_requests
    WHERE id = ? AND gallery_id = ? AND status = 'active' LIMIT 1
  `).bind(requestId, galleryId).first();
  if (!request) return { status: 404, body: { error: 'Selection request not found.' } };

  const selection: any = await ensurePublicSelection(db, galleryId, requestId, visitorKey, access.identity);
  if (!selection) return { status: 500, body: { error: 'Unable to create selection.' } };

  if (action === 'toggle') {
    if (text(selection.status) === 'submitted') {
      return { status: 409, body: { error: 'This selection has already been submitted. Ask your photographer to reopen it before making changes.' } };
    }
    const assetId = text(input?.assetId);
    if (!assetId) return { status: 400, body: { error: 'Asset is required.' } };
    const member = await db.prepare(`
      SELECT asset_id FROM client_gallery_assets
      WHERE gallery_id = ? AND asset_id = ? AND hidden = 0 LIMIT 1
    `).bind(galleryId, assetId).first();
    if (!member) return { status: 404, body: { error: 'Image not found in this gallery.' } };
    const existing = await db.prepare(`
      SELECT asset_id FROM client_gallery_selection_assets
      WHERE selection_id = ? AND asset_id = ? LIMIT 1
    `).bind(text(selection.id), assetId).first();
    const selected = bool(input?.selected, !existing);
    if (selected && !existing) {
      const countRow = await db.prepare(`SELECT COUNT(*) AS total FROM client_gallery_selection_assets WHERE selection_id = ?`)
        .bind(text(selection.id)).first();
      const currentCount = number(countRow?.total);
      const maxImages = number(request.max_images);
      if (maxImages > 0 && currentCount >= maxImages) {
        return { status: 409, body: { error: `This selection is limited to ${maxImages} image${maxImages === 1 ? '' : 's'}.` } };
      }
      await db.prepare(`
        INSERT OR IGNORE INTO client_gallery_selection_assets (selection_id, asset_id, sort_order, selected_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(text(selection.id), assetId, currentCount).run();
    } else if (!selected && existing) {
      await db.prepare(`DELETE FROM client_gallery_selection_assets WHERE selection_id = ? AND asset_id = ?`)
        .bind(text(selection.id), assetId).run();
    }
    await db.prepare(`UPDATE client_gallery_selections SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(text(selection.id)).run();
  } else if (action === 'submit') {
    if (text(selection.status) === 'submitted') {
      return { status: 409, body: { error: 'This selection has already been submitted.' } };
    }
    const countRow = await db.prepare(`SELECT COUNT(*) AS total FROM client_gallery_selection_assets WHERE selection_id = ?`)
      .bind(text(selection.id)).first();
    const total = number(countRow?.total);
    const minImages = number(request.min_images);
    const maxImages = number(request.max_images);
    if (minImages > 0 && total < minImages) {
      return { status: 400, body: { error: `Please select at least ${minImages} image${minImages === 1 ? '' : 's'} before submitting.` } };
    }
    if (maxImages > 0 && total > maxImages) {
      return { status: 400, body: { error: `Please select no more than ${maxImages} image${maxImages === 1 ? '' : 's'}.` } };
    }
    await db.prepare(`
      UPDATE client_gallery_selections
      SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
          email = ?, email_normalized = ?, display_name = ?
      WHERE id = ?
    `).bind(
      access.identity?.email || text(selection.email),
      access.identity?.emailNormalized || text(selection.email_normalized),
      access.identity?.displayName || text(selection.display_name),
      text(selection.id),
    ).run();
  } else {
    return { status: 400, body: { error: 'Unsupported selection action.' } };
  }

  return {
    status: 200,
    body: {
      ok: true,
      selectionRequests: await publicSelectionState(db, galleryId, visitorKey, access.identity?.emailNormalized || ""),
    },
  };
}

function effectiveDownloadPermission(row: any, identity: PublicVisitorIdentity | null) {
  if (number(row?.allow_downloads) !== 1) return false;
  if (number(row?.require_email) !== 1) return true;
  if (!identity?.emailNormalized) return false;
  if (identity.contactAllowsOriginals) return true;
  return number(row?.allow_guest_downloads) === 1;
}

export async function getPublicClientGallery(db: D1Db, token: string, pin = '', visitorKey = '', email = '', displayName = '', authenticatedIdentity: ClientAuthIdentity | null = null) {
  const row = await publicGalleryRow(db, token);
  if (!row) return { status: 404, body: { error: 'Gallery not found.' } };
  if (galleryIsExpired(row)) return { status: 410, body: { error: 'This gallery has expired.' } };

  const requiresPin = Boolean(text(row.pin_hash));
  const requireEmail = number(row.require_email) === 1;
  const access = await verifyPublicAccess(db, row, { pin, visitorKey, email, displayName }, authenticatedIdentity);
  const identity = access.identity;
  const base = {
    id: text(row.id),
    title: text(row.title),
    clientName: text(row.client_name),
    intro: text(row.intro),
    couple: text(row.couple),
    venue: text(row.venue),
    weddingDate: text(row.wedding_date),
    businessName: text(row.business_name || 'Photography Gallery'),
    logoUrl: text(row.logo_url),
    websiteUrl: text(row.website_url),
    allowFavourites: number(row.allow_favourites, 1) === 1,
    allowDownloads: effectiveDownloadPermission(row, identity),
    galleryDownloadsEnabled: number(row.allow_downloads) === 1,
    requireEmail,
    requiresEmail: requireEmail,
    emailRequired: requireEmail && !identity?.emailNormalized,
    requiresPin,
    visitorEmail: identity?.email || '',
    visitorRole: identity?.role || 'guest',
    visitorCanDownloadOriginals: effectiveDownloadPermission(row, identity),
    authenticated: Boolean(access.authenticatedIdentity?.id),
    authenticatedEmail: access.authenticatedIdentity?.email || '',
    expiresAt: text(row.expires_at),
  };

  if (!access.ok) {
    return { status: access.status, body: { ok: false, locked: true, ...base, error: access.error } };
  }

  const [assets, favourites, selectionRequests] = await Promise.all([
    publicAssets(db, text(row.id)),
    favouriteIds(db, text(row.id), visitorKey, access.authenticatedIdentity?.id || ''),
    publicSelectionState(db, text(row.id), visitorKey, identity?.emailNormalized || ""),
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
      selectionRequests,
    },
  };
}

export async function setPublicFavourite(db: D1Db, token: string, input: any, authenticatedIdentity: ClientAuthIdentity | null = null) {
  const row = await publicGalleryRow(db, token);
  const access = await verifyPublicAccess(db, row, {
    pin: text(input?.pin),
    visitorKey: text(input?.visitorKey),
    email: text(input?.email),
  }, authenticatedIdentity);
  if (!access.ok) return { status: access.status, body: { error: access.error } };
  if (number(row?.allow_favourites, 1) !== 1) return { status: 403, body: { error: 'Favourites are disabled for this gallery.' } };

  const galleryId = text(row.id);
  const visitorKey = text(input?.visitorKey).slice(0, 160);
  const assetId = text(input?.assetId);
  const favourite = bool(input?.favourite, true);
  if (!visitorKey || !assetId) return { status: 400, body: { error: 'Visitor and asset are required.' } };

  const member = await db.prepare(`
    SELECT asset_id FROM client_gallery_assets
    WHERE gallery_id = ? AND asset_id = ? AND hidden = 0 LIMIT 1
  `).bind(galleryId, assetId).first();
  if (!member) return { status: 404, body: { error: 'Image not found in this gallery.' } };

  const identityId = access.authenticatedIdentity?.id || '';
  if (favourite) {
    await db.prepare(`
      INSERT OR IGNORE INTO client_gallery_favourites (gallery_id, visitor_key, asset_id)
      VALUES (?, ?, ?)
    `).bind(galleryId, visitorKey, assetId).run();
  } else if (identityId) {
    await db.prepare(`
      DELETE FROM client_gallery_favourites
      WHERE gallery_id = ? AND asset_id = ?
        AND (
          visitor_key = ?
          OR visitor_key IN (
            SELECT visitor_key
            FROM client_identity_gallery_visitors
            WHERE identity_id = ? AND gallery_id = ?
          )
        )
    `).bind(galleryId, assetId, visitorKey, identityId, galleryId).run();
  } else {
    await db.prepare(`
      DELETE FROM client_gallery_favourites
      WHERE gallery_id = ? AND visitor_key = ? AND asset_id = ?
    `).bind(galleryId, visitorKey, assetId).run();
  }

  return { status: 200, body: { ok: true, favouriteAssetIds: await favouriteIds(db, galleryId, visitorKey, identityId) } };
}

export async function authoriseClientGalleryOriginalDownload(db: D1Db, token: string, input: any, authenticatedIdentity: ClientAuthIdentity | null = null) {
  const row = await publicGalleryRow(db, token);
  const access = await verifyPublicAccess(db, row, {
    pin: text(input?.pin),
    visitorKey: text(input?.visitorKey),
    email: text(input?.email),
  }, authenticatedIdentity);
  if (!access.ok) return { status: access.status, error: access.error } as const;
  if (!effectiveDownloadPermission(row, access.identity)) {
    return { status: 403, error: 'Full-resolution downloads are not enabled for this visitor.' } as const;
  }

  const galleryId = text(row.id);
  const workspaceId = text(row.workspace_id);
  const assetId = text(input?.assetId);
  if (!assetId) return { status: 400, error: 'Asset is required.' } as const;

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
    return { status: 404, error: 'Full-resolution original is not available for this image.' } as const;
  }

  return {
    status: 200,
    workspaceId,
    galleryId,
    assetId: text(asset.id),
    filename: text(asset.original_filename || asset.filename || 'photograph.jpg'),
    storageKey: text(asset.storage_key),
    mimeType: text(asset.mime_type || 'image/jpeg'),
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
    delivery?: 'original' | 'web' | 'zip';
  },
) {
  await db.prepare(`
    INSERT INTO asset_download_events (
      id, workspace_id, gallery_id, asset_id, visitor_key,
      delivery, bytes_sent, user_agent, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    `asset_download_${crypto.randomUUID()}`,
    text(input.workspaceId),
    text(input.galleryId),
    text(input.assetId),
    text(input.visitorKey).slice(0, 160),
    input.delivery === 'zip' || input.delivery === 'web' ? input.delivery : 'original',
    number(input.bytesSent),
    text(input.userAgent).slice(0, 500),
  ).run();
}

export type AdminClientGalleryFavouriteAsset = {
  assetId: string;
  filename: string;
  thumbSrc: string;
  webSrc: string;
  hasOriginal: boolean;
  fileSize: number;
  firstFavouritedAt: string;
};

export type AdminClientGalleryFavouriteGroup = {
  key: string;
  label: string;
  email: string;
  displayName: string;
  verified: boolean;
  assetCount: number;
  assets: AdminClientGalleryFavouriteAsset[];
};

type AdminFavouriteInternalAsset = AdminClientGalleryFavouriteAsset & {
  originalFilename: string;
  storageKey: string;
  mimeType: string;
};

type AdminFavouriteInternalGroup = Omit<AdminClientGalleryFavouriteGroup, 'assets'> & {
  assets: AdminFavouriteInternalAsset[];
};

async function collectAdminClientGalleryFavourites(db: D1Db, galleryId: string) {
  const workspaceId = await getDefaultWorkspaceId(db);
  const gallery = await db.prepare(`
    SELECT id, title, client_name, wedding_slug
    FROM client_galleries
    WHERE id = ? AND workspace_id = ?
    LIMIT 1
  `).bind(galleryId, workspaceId).first();
  if (!gallery) throw new Error('Client gallery not found.');

  const result = await db.prepare(`
    SELECT
      cgf.visitor_key,
      cgf.asset_id,
      cgf.created_at AS favourited_at,
      cigv.identity_id,
      ci.email AS identity_email,
      ci.display_name AS identity_display_name,
      ci.verified_at AS identity_verified_at,
      cgv.email AS visitor_email,
      cgv.display_name AS visitor_display_name,
      a.filename,
      a.original_filename,
      COALESCE(tf.url, wf.url, '') AS thumb_url,
      COALESCE(wf.url, tf.url, '') AS web_url,
      ofile.storage_key AS original_storage_key,
      ofile.mime_type AS original_mime_type,
      ofile.file_size AS original_file_size
    FROM client_gallery_favourites cgf
    JOIN assets a ON a.id = cgf.asset_id AND a.status = 'active'
    LEFT JOIN client_identity_gallery_visitors cigv
      ON cigv.gallery_id = cgf.gallery_id AND cigv.visitor_key = cgf.visitor_key
    LEFT JOIN client_identities ci
      ON ci.id = cigv.identity_id AND ci.status = 'active'
    LEFT JOIN client_gallery_visitors cgv
      ON cgv.gallery_id = cgf.gallery_id AND cgv.visitor_key = cgf.visitor_key
    LEFT JOIN asset_files tf
      ON tf.asset_id = a.id AND tf.variant = 'thumb' AND tf.status = 'active'
    LEFT JOIN asset_files wf
      ON wf.asset_id = a.id AND wf.variant = 'web' AND wf.status = 'active'
    LEFT JOIN asset_files ofile
      ON ofile.asset_id = a.id
      AND ofile.variant = 'original'
      AND ofile.status = 'active'
      AND ofile.access_level = 'private'
    WHERE cgf.gallery_id = ?
    ORDER BY cgf.created_at ASC, a.filename COLLATE NOCASE ASC
  `).bind(galleryId).all();

  const groups = new Map<string, AdminFavouriteInternalGroup>();
  const combined = new Map<string, AdminFavouriteInternalAsset>();

  for (const row of result.results || []) {
    const identityId = text((row as any).identity_id);
    const identityEmail = text((row as any).identity_email);
    const visitorEmail = text((row as any).visitor_email);
    const email = identityEmail || visitorEmail;
    const emailNormalized = normalizeEmail(email);
    const visitorKey = text((row as any).visitor_key);
    const groupKey = identityId
      ? `identity:${identityId}`
      : emailNormalized
        ? `email:${emailNormalized}`
        : `visitor:${visitorKey}`;
    const displayName = text((row as any).identity_display_name || (row as any).visitor_display_name);
    const label = displayName || email || 'Anonymous visitor';

    let group = groups.get(groupKey);
    if (!group) {
      group = {
        key: groupKey,
        label,
        email,
        displayName,
        verified: Boolean(text((row as any).identity_verified_at)),
        assetCount: 0,
        assets: [],
      };
      groups.set(groupKey, group);
    }

    const asset: AdminFavouriteInternalAsset = {
      assetId: text((row as any).asset_id),
      filename: text((row as any).original_filename || (row as any).filename || 'photograph.jpg'),
      originalFilename: text((row as any).original_filename || (row as any).filename || 'photograph.jpg'),
      thumbSrc: text((row as any).thumb_url),
      webSrc: text((row as any).web_url),
      hasOriginal: Boolean(text((row as any).original_storage_key)),
      storageKey: text((row as any).original_storage_key),
      mimeType: text((row as any).original_mime_type || 'image/jpeg'),
      fileSize: number((row as any).original_file_size),
      firstFavouritedAt: text((row as any).favourited_at),
    };

    if (!group.assets.some((item) => item.assetId === asset.assetId)) {
      group.assets.push(asset);
      group.assetCount = group.assets.length;
    }
    const existingCombined = combined.get(asset.assetId);
    if (!existingCombined || asset.firstFavouritedAt < existingCombined.firstFavouritedAt) {
      combined.set(asset.assetId, asset);
    }
  }

  const orderedGroups = Array.from(groups.values()).sort((a, b) => {
    if (b.assetCount !== a.assetCount) return b.assetCount - a.assetCount;
    return a.label.localeCompare(b.label);
  });
  const combinedAssets = Array.from(combined.values()).sort((a, b) =>
    a.firstFavouritedAt.localeCompare(b.firstFavouritedAt) || a.filename.localeCompare(b.filename),
  );

  return {
    workspaceId,
    gallery: {
      id: text(gallery.id),
      title: text(gallery.title),
      clientName: text(gallery.client_name),
      weddingSlug: text(gallery.wedding_slug),
    },
    combinedAssets,
    groups: orderedGroups,
  };
}

export async function listAdminClientGalleryFavourites(db: D1Db, galleryId: string) {
  const data = await collectAdminClientGalleryFavourites(db, galleryId);
  const publicAsset = (asset: AdminFavouriteInternalAsset): AdminClientGalleryFavouriteAsset => ({
    assetId: asset.assetId,
    filename: asset.filename,
    thumbSrc: asset.thumbSrc,
    webSrc: asset.webSrc,
    hasOriginal: asset.hasOriginal,
    fileSize: asset.fileSize,
    firstFavouritedAt: asset.firstFavouritedAt,
  });
  return {
    workspaceId: data.workspaceId,
    gallery: data.gallery,
    combinedAssets: data.combinedAssets.map(publicAsset),
    groups: data.groups.map((group) => ({
      key: group.key,
      label: group.label,
      email: group.email,
      displayName: group.displayName,
      verified: group.verified,
      assetCount: group.assetCount,
      assets: group.assets.map(publicAsset),
    })),
  };
}

export async function resolveAdminClientGalleryOriginalDownload(db: D1Db, galleryId: string, assetId: string) {
  const workspaceId = await getDefaultWorkspaceId(db);
  const row = await db.prepare(`
    SELECT
      cg.id AS gallery_id,
      a.id AS asset_id,
      COALESCE(NULLIF(a.original_filename, ''), a.filename, 'photograph.jpg') AS download_filename,
      af.storage_key,
      af.mime_type,
      af.file_size
    FROM client_galleries cg
    JOIN client_gallery_assets cga ON cga.gallery_id = cg.id
    JOIN assets a ON a.id = cga.asset_id AND a.status = 'active'
    JOIN asset_files af
      ON af.asset_id = a.id
      AND af.variant = 'original'
      AND af.status = 'active'
      AND af.access_level = 'private'
    WHERE cg.id = ?
      AND cg.workspace_id = ?
      AND a.id = ?
    LIMIT 1
  `).bind(galleryId, workspaceId, assetId).first();
  if (!row || !text(row.storage_key)) return null;
  return {
    workspaceId,
    galleryId: text(row.gallery_id),
    assetId: text(row.asset_id),
    filename: text(row.download_filename),
    storageKey: text(row.storage_key),
    mimeType: text(row.mime_type || 'image/jpeg'),
    fileSize: number(row.file_size),
  };
}

export async function resolveAdminClientGalleryBulkDownload(
  db: D1Db,
  galleryId: string,
  input: { source?: string; group?: string; selectionId?: string },
) {
  const source = text(input.source || 'favourites');
  if (source === 'selection') {
    const workspaceId = await getDefaultWorkspaceId(db);
    const selectionId = text(input.selectionId);
    const gallery = await db.prepare(`SELECT id, title FROM client_galleries WHERE id = ? AND workspace_id = ? LIMIT 1`)
      .bind(galleryId, workspaceId).first();
    if (!gallery) throw new Error('Client gallery not found.');
    const selection = await db.prepare(`
      SELECT cgs.id, cgsr.name
      FROM client_gallery_selections cgs
      JOIN client_gallery_selection_requests cgsr ON cgsr.id = cgs.request_id
      WHERE cgs.id = ? AND cgs.gallery_id = ?
      LIMIT 1
    `).bind(selectionId, galleryId).first();
    if (!selection) throw new Error('Client selection not found.');
    const result = await db.prepare(`
      SELECT
        a.id AS asset_id,
        COALESCE(NULLIF(a.original_filename, ''), a.filename, 'photograph.jpg') AS download_filename,
        af.storage_key,
        af.mime_type,
        af.file_size
      FROM client_gallery_selection_assets cgsa
      JOIN assets a ON a.id = cgsa.asset_id AND a.status = 'active'
      JOIN asset_files af
        ON af.asset_id = a.id
        AND af.variant = 'original'
        AND af.status = 'active'
        AND af.access_level = 'private'
      WHERE cgsa.selection_id = ?
      ORDER BY cgsa.sort_order ASC, cgsa.selected_at ASC
    `).bind(selectionId).all();
    return {
      workspaceId,
      galleryId,
      label: text(selection.name || 'Client Selection'),
      assets: (result.results || []).map((row: any) => ({
        assetId: text(row.asset_id),
        filename: text(row.download_filename),
        storageKey: text(row.storage_key),
        mimeType: text(row.mime_type || 'image/jpeg'),
        fileSize: number(row.file_size),
      })).filter((asset: any) => asset.storageKey),
    };
  }

  const data = await collectAdminClientGalleryFavourites(db, galleryId);
  const groupKey = text(input.group || 'combined');
  const selected = groupKey === 'combined'
    ? data.combinedAssets
    : (data.groups.find((group) => group.key === groupKey)?.assets || []);
  const label = groupKey === 'combined'
    ? `${data.gallery.title || 'Client Gallery'} Favourites`
    : `${data.groups.find((group) => group.key === groupKey)?.label || 'Client'} Favourites`;
  return {
    workspaceId: data.workspaceId,
    galleryId,
    label,
    assets: selected.filter((asset) => asset.hasOriginal && asset.storageKey).map((asset) => ({
      assetId: asset.assetId,
      filename: asset.originalFilename || asset.filename,
      storageKey: asset.storageKey,
      mimeType: asset.mimeType,
      fileSize: asset.fileSize,
    })),
  };
}
