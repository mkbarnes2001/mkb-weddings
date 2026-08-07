type D1Db = any;

export type PlatformBrandAssetRecord = {
  id: string;
  name: string;
  assetType: "logo" | "icon";
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  status: "active" | "archived";
  uploadedByEmail: string;
  createdAt: string;
  updatedAt: string;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function httpError(message: string, statusCode = 400) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function requirePlatformAdmin(actor: any) {
  if (text(actor?.platformRole) !== "platform_admin" || !(actor?.permissions || []).includes("platform:admin")) {
    throw httpError("WedPlanned platform administrator access is required.", 403);
  }
  if (actor?.accessMode === "support") throw httpError("Support sessions cannot manage platform brand assets.", 403);
}

function hydrate(row: any): PlatformBrandAssetRecord {
  return {
    id: text(row.id),
    name: text(row.name),
    assetType: text(row.asset_type) as PlatformBrandAssetRecord["assetType"],
    storageKey: text(row.storage_key),
    url: text(row.url),
    mimeType: text(row.mime_type),
    sizeBytes: Number(row.size_bytes || 0),
    status: text(row.status || "active") as PlatformBrandAssetRecord["status"],
    uploadedByEmail: text(row.uploaded_by_email),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

export async function listPlatformBrandAssets(db: D1Db, actor: any) {
  requirePlatformAdmin(actor);
  try {
    const result = await db.prepare(`
      SELECT *
      FROM platform_brand_assets
      WHERE status = 'active'
      ORDER BY CASE asset_type WHEN 'logo' THEN 0 ELSE 1 END,
               name COLLATE NOCASE,
               created_at DESC
    `).all();
    return (result.results || []).map(hydrate);
  } catch {
    return [];
  }
}

export async function createPlatformBrandAsset(db: D1Db, actor: any, input: {
  id: string;
  name: string;
  assetType: "logo" | "icon";
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}) {
  requirePlatformAdmin(actor);
  const name = text(input.name).slice(0, 80);
  const assetType = text(input.assetType) as "logo" | "icon";
  if (!name) throw httpError("Enter a name for the platform asset.");
  if (!["logo", "icon"].includes(assetType)) throw httpError("Platform asset type must be logo or icon.");

  await db.prepare(`
    INSERT INTO platform_brand_assets (
      id, name, asset_type, storage_key, url, mime_type, size_bytes,
      status, uploaded_by_user_id, uploaded_by_email, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    text(input.id),
    name,
    assetType,
    text(input.storageKey),
    text(input.url),
    text(input.mimeType),
    Number(input.sizeBytes || 0),
    text(actor?.userId) || null,
    lower(actor?.email),
  ).run();

  await db.prepare(`
    INSERT INTO platform_audit_events (
      id, workspace_id, actor_user_id, actor_email, event_type,
      entity_type, entity_id, summary, metadata_json, created_at
    ) VALUES (?, NULL, ?, ?, 'platform.brand_asset.created',
      'platform_brand_asset', ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    `audit_${crypto.randomUUID()}`,
    text(actor?.userId) || null,
    lower(actor?.email),
    text(input.id),
    `Added platform ${assetType}: ${name}.`,
    JSON.stringify({ name, assetType, url: text(input.url) }),
  ).run();

  return hydrate(await db.prepare(`SELECT * FROM platform_brand_assets WHERE id = ?`).bind(text(input.id)).first());
}

export async function archivePlatformBrandAsset(db: D1Db, actor: any, assetId: string) {
  requirePlatformAdmin(actor);
  const asset = await db.prepare(`
    SELECT * FROM platform_brand_assets
    WHERE id = ? AND status = 'active'
    LIMIT 1
  `).bind(text(assetId)).first();
  if (!asset) throw httpError("Platform brand asset not found.", 404);

  const reference = await db.prepare(`
    SELECT module_key
    FROM platform_module_configurations
    WHERE status = 'active'
      AND (
        mark_url = ?
        OR wordmark_url = ?
        OR dark_wordmark_url = ?
        OR compact_wordmark_url = ?
      )
    LIMIT 1
  `).bind(
    text(asset.url),
    text(asset.url),
    text(asset.url),
    text(asset.url),
  ).first();

  if (reference) {
    throw httpError(
      `This asset is assigned to the ${text(reference.module_key)} module. Choose another asset before deleting it.`,
      409,
    );
  }

  const platformReference = await db.prepare(`
    SELECT id
    FROM platform_branding_settings
    WHERE id = 'default'
      AND (
        wordmark_url = ?
        OR dark_wordmark_url = ?
        OR compact_wordmark_url = ?
        OR icon_url = ?
      )
    LIMIT 1
  `).bind(
    text(asset.url),
    text(asset.url),
    text(asset.url),
    text(asset.url),
  ).first();

  if (platformReference) {
    throw httpError(
      "This asset is assigned to the WedPlanned platform identity. Choose another asset before deleting it.",
      409,
    );
  }

  await db.prepare(`
    UPDATE platform_brand_assets
    SET status = 'archived', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(text(assetId)).run();

  await db.prepare(`
    INSERT INTO platform_audit_events (
      id, workspace_id, actor_user_id, actor_email, event_type,
      entity_type, entity_id, summary, metadata_json, created_at
    ) VALUES (?, NULL, ?, ?, 'platform.brand_asset.archived',
      'platform_brand_asset', ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    `audit_${crypto.randomUUID()}`,
    text(actor?.userId) || null,
    lower(actor?.email),
    text(assetId),
    `Archived platform brand asset: ${text(asset.name)}.`,
    JSON.stringify({ name: text(asset.name), assetType: text(asset.asset_type) }),
  ).run();

  return {
    id: text(asset.id),
    storageKey: text(asset.storage_key),
    url: text(asset.url),
  };
}
