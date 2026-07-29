import { getDefaultWorkspaceId } from "./workspace-d1";

type D1Db = any;
type R2BucketLike = any;

const PART_SIZE = 8 * 1024 * 1024;
const MAX_ORIGINAL_SIZE = 250 * 1024 * 1024;

function text(value: unknown) {
  return String(value ?? "").trim();
}

async function resolvedWorkspaceId(db: D1Db, workspaceId?: string) {
  return text(workspaceId) || await getDefaultWorkspaceId(db);
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function json<T>(value: unknown, fallback: T): T {
  try {
    return value ? JSON.parse(String(value)) as T : fallback;
  } catch {
    return fallback;
  }
}

function safeFilename(value: unknown) {
  const raw = text(value) || "photograph.jpg";
  const dot = raw.lastIndexOf(".");
  const base = (dot > 0 ? raw.slice(0, dot) : raw)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140) || "photograph";
  return `${base}.jpg`;
}

function publicBaseUrl(env: { IMAGE_PUBLIC_BASE_URL?: string }) {
  return text(env.IMAGE_PUBLIC_BASE_URL || "https://images.mkbweddings.co.uk").replace(/\/+$/, "");
}

function uploadedParts(value: unknown) {
  return json<Array<{ partNumber: number; etag: string }>>(value, [])
    .map((part) => ({ partNumber: number(part.partNumber), etag: text(part.etag) }))
    .filter((part) => part.partNumber > 0 && part.etag)
    .sort((a, b) => a.partNumber - b.partNumber);
}

async function galleryRow(db: D1Db, galleryId: string, workspaceId: string) {
  return db.prepare(`
    SELECT id, workspace_id, wedding_slug, title
    FROM client_galleries
    WHERE id = ? AND workspace_id = ? AND status <> 'archived'
    LIMIT 1
  `).bind(galleryId, workspaceId).first();
}

async function sessionRow(db: D1Db, galleryId: string, sessionId: string, workspaceId: string) {
  return db.prepare(`
    SELECT * FROM asset_upload_sessions
    WHERE id = ? AND gallery_id = ? AND workspace_id = ?
    LIMIT 1
  `).bind(sessionId, galleryId, workspaceId).first();
}

function mapSession(row: any) {
  return {
    id: text(row?.id),
    galleryId: text(row?.gallery_id),
    assetId: text(row?.asset_id),
    originalFilename: text(row?.original_filename),
    mimeType: text(row?.mime_type),
    fileSize: number(row?.file_size),
    width: number(row?.width),
    height: number(row?.height),
    partSize: number(row?.part_size, PART_SIZE),
    status: text(row?.status),
    uploadedParts: uploadedParts(row?.uploaded_parts_json),
    error: text(row?.error_message),
    createdAt: text(row?.created_at),
    updatedAt: text(row?.updated_at),
  };
}

export async function createPrivateOriginalUpload(
  db: D1Db,
  privateBucket: R2BucketLike,
  galleryId: string,
  input: any,
  workspaceIdInput?: string,
) {
  if (!privateBucket) throw new Error("Private R2 binding MKB_PRIVATE_ASSETS is not configured.");
  const workspaceId = await resolvedWorkspaceId(db, workspaceIdInput);
  const gallery = await galleryRow(db, galleryId, workspaceId);
  if (!gallery) throw new Error("Client gallery not found.");

  const originalFilename = text(input?.filename);
  const mimeType = text(input?.mimeType).toLowerCase();
  const fileSize = number(input?.fileSize);
  const width = number(input?.width);
  const height = number(input?.height);
  const fingerprint = text(input?.fingerprint).slice(0, 240);
  const capturedAtInput = text(input?.capturedAt).slice(0, 40);
  const capturedAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(capturedAtInput) ? capturedAtInput : '';
  const captureSourceInput = text(input?.captureSource);
  const captureSource = captureSourceInput === 'exif' || captureSourceInput === 'file_modified' ? captureSourceInput : 'created_at_fallback';

  if (!originalFilename) throw new Error("Original filename is required.");
  if (mimeType !== "image/jpeg") throw new Error("Private original upload currently supports full-resolution JPEG files only.");
  if (fileSize <= 0 || fileSize > MAX_ORIGINAL_SIZE) throw new Error("JPEG must be between 1 byte and 250 MB.");

  if (fingerprint) {
    const existing = await db.prepare(`
      SELECT * FROM asset_upload_sessions
      WHERE workspace_id = ? AND gallery_id = ? AND client_fingerprint = ?
        AND status IN ('created', 'uploading', 'processing')
      ORDER BY updated_at DESC
      LIMIT 1
    `).bind(workspaceId, galleryId, fingerprint).first();
    if (existing) return { resumed: true, session: mapSession(existing) };
  }

  const sessionId = `asset_upload_${crypto.randomUUID()}`;
  const assetId = `asset_${crypto.randomUUID()}`;
  const filename = safeFilename(originalFilename);
  const privateStorageKey = `workspaces/${workspaceId}/assets/${assetId}/original/${filename}`;
  const multipart = await privateBucket.createMultipartUpload(privateStorageKey, {
    httpMetadata: {
      contentType: "image/jpeg",
      contentDisposition: `attachment; filename="${filename.replace(/"/g, "")}"`,
      cacheControl: "private, no-store",
    },
    customMetadata: {
      workspaceId,
      galleryId,
      assetId,
      originalFilename: originalFilename.slice(0, 900),
      variant: "original",
    },
  });

  try {
    const nextOrderRow = await db.prepare(`
      SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
      FROM client_gallery_assets WHERE gallery_id = ?
    `).bind(galleryId).first();
    const nextOrder = number(nextOrderRow?.next_order, 1);

    await db.batch([
      db.prepare(`
        INSERT INTO assets (
          id, workspace_id, legacy_asset_key, image_id, original_filename, filename,
          mime_type, width, height, checksum, source_type, source_json, status,
          created_at, updated_at
        ) VALUES (?, ?, '', '', ?, ?, 'image/jpeg', ?, ?, '', 'private_client_upload', ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(
        assetId,
        workspaceId,
        originalFilename,
        filename,
        width || null,
        height || null,
        JSON.stringify({ galleryId, privateStorageKey, managed: true }),
      ),
      db.prepare(`
        INSERT INTO asset_files (
          asset_id, variant, storage_key, url, mime_type, width, height, file_size,
          access_level, status, created_at, updated_at
        ) VALUES (?, 'original', ?, '', 'image/jpeg', ?, ?, ?, 'private', 'processing', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(assetId, privateStorageKey, width || null, height || null, fileSize),
      db.prepare(`
        INSERT INTO asset_capture_metadata (asset_id, captured_at, capture_source, updated_at)
        VALUES (?, COALESCE(NULLIF(?, ''), STRFTIME('%Y-%m-%dT%H:%M:%S', 'now')), ?, CURRENT_TIMESTAMP)
        ON CONFLICT(asset_id) DO UPDATE SET
          captured_at = excluded.captured_at,
          capture_source = excluded.capture_source,
          updated_at = CURRENT_TIMESTAMP
      `).bind(assetId, capturedAt, captureSource),
      db.prepare(`
        INSERT INTO client_gallery_assets (gallery_id, asset_id, sort_order, hidden, created_at)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
      `).bind(galleryId, assetId, nextOrder),
      db.prepare(`
        INSERT INTO asset_upload_sessions (
          id, workspace_id, gallery_id, asset_id, client_fingerprint,
          original_filename, mime_type, file_size, width, height,
          private_storage_key, multipart_upload_id, part_size,
          uploaded_parts_json, status, error_message, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'image/jpeg', ?, ?, ?, ?, ?, ?, '[]', 'created', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(
        sessionId,
        workspaceId,
        galleryId,
        assetId,
        fingerprint,
        originalFilename,
        fileSize,
        width || null,
        height || null,
        privateStorageKey,
        text(multipart.uploadId),
        PART_SIZE,
      ),
    ]);

    const weddingSlug = text(gallery.wedding_slug);
    if (weddingSlug) {
      await db.prepare(`
        INSERT OR IGNORE INTO asset_wedding_links (asset_id, wedding_slug, sort_order, is_primary, workspace_id)
        VALUES (?, ?, ?, 1, ?)
      `).bind(assetId, weddingSlug, nextOrder, workspaceId).run();
    }
  } catch (error) {
    await multipart.abort().catch(() => {});
    throw error;
  }

  const row = await sessionRow(db, galleryId, sessionId, workspaceId);
  return { resumed: false, session: mapSession(row) };
}

export async function getPrivateOriginalUpload(db: D1Db, galleryId: string, sessionId: string, workspaceIdInput?: string) {
  const workspaceId = await resolvedWorkspaceId(db, workspaceIdInput);
  const row = await sessionRow(db, galleryId, sessionId, workspaceId);
  if (!row) throw new Error("Upload session not found.");
  return mapSession(row);
}

export async function uploadPrivateOriginalPart(
  db: D1Db,
  privateBucket: R2BucketLike,
  galleryId: string,
  sessionId: string,
  partNumber: number,
  body: ArrayBuffer,
  workspaceIdInput?: string,
) {
  if (!privateBucket) throw new Error("Private R2 binding MKB_PRIVATE_ASSETS is not configured.");
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) throw new Error("Invalid multipart part number.");
  if (!body.byteLength || body.byteLength > PART_SIZE) throw new Error("Upload part is empty or exceeds the configured part size.");

  const workspaceId = await resolvedWorkspaceId(db, workspaceIdInput);
  const row = await sessionRow(db, galleryId, sessionId, workspaceId);
  if (!row) throw new Error("Upload session not found.");
  if (!['created', 'uploading'].includes(text(row.status))) throw new Error("Upload session is no longer accepting parts.");

  const multipart = privateBucket.resumeMultipartUpload(text(row.private_storage_key), text(row.multipart_upload_id));
  const uploaded = await multipart.uploadPart(partNumber, body);
  const parts = uploadedParts(row.uploaded_parts_json).filter((part) => part.partNumber !== partNumber);
  parts.push({ partNumber: number(uploaded.partNumber, partNumber), etag: text(uploaded.etag) });
  parts.sort((a, b) => a.partNumber - b.partNumber);

  await db.prepare(`
    UPDATE asset_upload_sessions
    SET uploaded_parts_json = ?, status = 'uploading', error_message = '', updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND gallery_id = ? AND workspace_id = ?
  `).bind(JSON.stringify(parts), sessionId, galleryId, workspaceId).run();

  return { partNumber: number(uploaded.partNumber, partNumber), etag: text(uploaded.etag), uploadedParts: parts };
}

export async function completePrivateOriginalUpload(
  db: D1Db,
  privateBucket: R2BucketLike,
  galleryId: string,
  sessionId: string,
  input: any,
  workspaceIdInput?: string,
) {
  if (!privateBucket) throw new Error("Private R2 binding MKB_PRIVATE_ASSETS is not configured.");
  const workspaceId = await resolvedWorkspaceId(db, workspaceIdInput);
  const row = await sessionRow(db, galleryId, sessionId, workspaceId);
  if (!row) throw new Error("Upload session not found.");
  if (!['created', 'uploading'].includes(text(row.status))) {
    if (text(row.status) === 'processing' || text(row.status) === 'complete') return mapSession(row);
    throw new Error("Upload session cannot be completed.");
  }

  const parts = uploadedParts(input?.parts?.length ? JSON.stringify(input.parts) : row.uploaded_parts_json);
  const expectedParts = Math.ceil(number(row.file_size) / number(row.part_size, PART_SIZE));
  if (parts.length !== expectedParts) throw new Error(`Upload is incomplete: ${parts.length} of ${expectedParts} parts are present.`);

  const multipart = privateBucket.resumeMultipartUpload(text(row.private_storage_key), text(row.multipart_upload_id));
  await multipart.complete(parts);
  await db.batch([
    db.prepare(`
      UPDATE asset_files
      SET status = 'active', file_size = ?, updated_at = CURRENT_TIMESTAMP
      WHERE asset_id = ? AND variant = 'original'
    `).bind(number(row.file_size), text(row.asset_id)),
    db.prepare(`
      UPDATE asset_upload_sessions
      SET status = 'processing', uploaded_parts_json = ?, error_message = '', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND gallery_id = ? AND workspace_id = ?
    `).bind(JSON.stringify(parts), sessionId, galleryId, workspaceId),
  ]);
  return mapSession(await sessionRow(db, galleryId, sessionId, workspaceId));
}

export async function uploadPrivateOriginalDerivatives(
  db: D1Db,
  publicBucket: R2BucketLike,
  env: { IMAGE_PUBLIC_BASE_URL?: string },
  galleryId: string,
  sessionId: string,
  input: { webFile: File; thumbFile: File; width: number; height: number },
  workspaceIdInput?: string,
) {
  if (!publicBucket) throw new Error("Public R2 binding MKB_IMAGES is not configured.");
  const workspaceId = await resolvedWorkspaceId(db, workspaceIdInput);
  const row = await sessionRow(db, galleryId, sessionId, workspaceId);
  if (!row) throw new Error("Upload session not found.");
  if (!['processing', 'complete'].includes(text(row.status))) throw new Error("Original upload must complete before derivatives are stored.");
  if (!(input.webFile instanceof File) || !(input.thumbFile instanceof File)) throw new Error("Web and thumbnail derivatives are required.");
  if (input.webFile.type !== 'image/webp' || input.thumbFile.type !== 'image/webp') throw new Error("Derivatives must be WebP files.");
  if (input.webFile.size > 20 * 1024 * 1024 || input.thumbFile.size > 5 * 1024 * 1024) throw new Error("Generated derivative exceeds the allowed size.");

  const assetId = text(row.asset_id);
  const webKey = `workspaces/${workspaceId}/assets/${assetId}/web/display.webp`;
  const thumbKey = `workspaces/${workspaceId}/assets/${assetId}/thumb/thumb.webp`;
  const base = publicBaseUrl(env);

  await publicBucket.put(webKey, input.webFile, {
    httpMetadata: { contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' },
    customMetadata: { workspaceId, galleryId, assetId, variant: 'web' },
  });
  try {
    await publicBucket.put(thumbKey, input.thumbFile, {
      httpMetadata: { contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' },
      customMetadata: { workspaceId, galleryId, assetId, variant: 'thumb' },
    });
  } catch (error) {
    await publicBucket.delete(webKey).catch(() => {});
    throw error;
  }

  const width = number(input.width, number(row.width));
  const height = number(input.height, number(row.height));
  await db.batch([
    db.prepare(`
      INSERT INTO asset_files (
        asset_id, variant, storage_key, url, mime_type, width, height, file_size,
        access_level, status, created_at, updated_at
      ) VALUES (?, 'web', ?, ?, 'image/webp', ?, ?, ?, 'controlled', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(asset_id, variant) DO UPDATE SET
        storage_key = excluded.storage_key, url = excluded.url, mime_type = excluded.mime_type,
        width = excluded.width, height = excluded.height, file_size = excluded.file_size,
        access_level = excluded.access_level, status = 'active', updated_at = CURRENT_TIMESTAMP
    `).bind(assetId, webKey, `${base}/${webKey}`, width || null, height || null, input.webFile.size),
    db.prepare(`
      INSERT INTO asset_files (
        asset_id, variant, storage_key, url, mime_type, width, height, file_size,
        access_level, status, created_at, updated_at
      ) VALUES (?, 'thumb', ?, ?, 'image/webp', NULL, NULL, ?, 'controlled', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(asset_id, variant) DO UPDATE SET
        storage_key = excluded.storage_key, url = excluded.url, mime_type = excluded.mime_type,
        file_size = excluded.file_size, access_level = excluded.access_level,
        status = 'active', updated_at = CURRENT_TIMESTAMP
    `).bind(assetId, thumbKey, `${base}/${thumbKey}`, input.thumbFile.size),
    db.prepare(`
      UPDATE assets
      SET width = ?, height = ?, mime_type = 'image/jpeg', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND workspace_id = ?
    `).bind(width || null, height || null, assetId, workspaceId),
    db.prepare(`
      UPDATE client_gallery_assets
      SET hidden = 0
      WHERE gallery_id = ? AND asset_id = ?
    `).bind(galleryId, assetId),
    db.prepare(`
      UPDATE asset_upload_sessions
      SET status = 'complete', width = ?, height = ?, error_message = '',
          completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND gallery_id = ? AND workspace_id = ?
    `).bind(width || null, height || null, sessionId, galleryId, workspaceId),
  ]);

  return mapSession(await sessionRow(db, galleryId, sessionId, workspaceId));
}

export async function failPrivateOriginalUpload(db: D1Db, galleryId: string, sessionId: string, message: string, workspaceIdInput?: string) {
  const workspaceId = await resolvedWorkspaceId(db, workspaceIdInput);
  await db.prepare(`
    UPDATE asset_upload_sessions
    SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND gallery_id = ? AND workspace_id = ?
  `).bind(text(message).slice(0, 1000), sessionId, galleryId, workspaceId).run();
}
