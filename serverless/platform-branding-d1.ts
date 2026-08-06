type D1Db = any;

export type PlatformBrandingIdentityRecord = {
  platformName: string;
  wordmarkUrl: string;
  compactWordmarkUrl: string;
  iconUrl: string;
  updatedAt?: string;
};

export const DEFAULT_PLATFORM_BRANDING_IDENTITY: PlatformBrandingIdentityRecord = {
  platformName: "WedPlanned",
  wordmarkUrl: "",
  compactWordmarkUrl: "",
  iconUrl: "",
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function httpError(message: string, statusCode = 400, details: string[] = []) {
  const error = new Error(message) as Error & {
    statusCode?: number;
    details?: string[];
  };
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function requirePlatformAdmin(actor: any) {
  if (
    text(actor?.platformRole) !== "platform_admin"
    || !(actor?.permissions || []).includes("platform:admin")
  ) {
    throw httpError(
      "WedPlanned platform administrator access is required.",
      403,
    );
  }

  if (actor?.accessMode === "support") {
    throw httpError(
      "Support sessions cannot change platform branding.",
      403,
    );
  }
}

function safeAssetUrl(value: unknown) {
  const candidate = text(value);
  if (!candidate) return "";
  if (candidate.startsWith("/")) return candidate;

  try {
    const url = new URL(candidate);
    if (url.protocol === "https:") return url.toString();
  } catch {
    // The stable validation message below is returned.
  }

  throw httpError(
    "Brand asset URLs must be empty, a same-origin path, or an https:// URL.",
  );
}

function hydrate(row: any): PlatformBrandingIdentityRecord {
  if (!row) return { ...DEFAULT_PLATFORM_BRANDING_IDENTITY };

  return {
    platformName: text(row.platform_name) || "WedPlanned",
    wordmarkUrl: text(row.wordmark_url),
    compactWordmarkUrl: text(row.compact_wordmark_url),
    iconUrl: text(row.icon_url),
    updatedAt: row.updated_at || undefined,
  };
}

export async function getPlatformBrandingIdentity(db: D1Db) {
  try {
    const row = await db.prepare(`
      SELECT *
      FROM platform_branding_settings
      WHERE id = 'default'
      LIMIT 1
    `).first();

    return hydrate(row);
  } catch {
    return { ...DEFAULT_PLATFORM_BRANDING_IDENTITY };
  }
}

function normalisePlatformBrandingIdentity(
  incoming: any,
): PlatformBrandingIdentityRecord {
  const platformName = text(
    incoming?.platformName || "WedPlanned",
  ).slice(0, 80);
  const wordmarkUrl = safeAssetUrl(incoming?.wordmarkUrl);
  const compactWordmarkUrl = safeAssetUrl(
    incoming?.compactWordmarkUrl,
  );
  const iconUrl = safeAssetUrl(incoming?.iconUrl);

  if (!platformName) {
    throw httpError("Enter a platform name.");
  }

  return {
    platformName,
    wordmarkUrl,
    compactWordmarkUrl,
    iconUrl,
  };
}

function preparePlatformBrandingUpsert(
  db: D1Db,
  actor: any,
  identity: PlatformBrandingIdentityRecord,
) {
  return db.prepare(`
    INSERT INTO platform_branding_settings (
      id,
      platform_name,
      wordmark_url,
      compact_wordmark_url,
      icon_url,
      updated_by_user_id,
      updated_by_email,
      created_at,
      updated_at
    ) VALUES (
      'default',
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(id) DO UPDATE SET
      platform_name = excluded.platform_name,
      wordmark_url = excluded.wordmark_url,
      compact_wordmark_url = excluded.compact_wordmark_url,
      icon_url = excluded.icon_url,
      updated_by_user_id = excluded.updated_by_user_id,
      updated_by_email = excluded.updated_by_email,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    identity.platformName,
    identity.wordmarkUrl,
    identity.compactWordmarkUrl,
    identity.iconUrl,
    text(actor?.userId) || null,
    lower(actor?.email),
  );
}

function preparePlatformBrandingAudit(
  db: D1Db,
  actor: any,
  identity: PlatformBrandingIdentityRecord,
) {
  return db.prepare(`
    INSERT INTO platform_audit_events (
      id,
      workspace_id,
      actor_user_id,
      actor_email,
      event_type,
      entity_type,
      entity_id,
      summary,
      metadata_json,
      created_at
    ) VALUES (
      ?,
      NULL,
      ?,
      ?,
      'platform.branding.updated',
      'platform_branding',
      'default',
      ?,
      ?,
      CURRENT_TIMESTAMP
    )
  `).bind(
    `audit_${crypto.randomUUID()}`,
    text(actor?.userId) || null,
    lower(actor?.email),
    "Updated the WedPlanned platform identity.",
    JSON.stringify(identity),
  );
}

export function preparePlatformBrandingIdentityStatements(
  db: D1Db,
  actor: any,
  incoming: any,
  includeAudit = true,
) {
  requirePlatformAdmin(actor);

  const identity = normalisePlatformBrandingIdentity(incoming);
  const statements = [
    preparePlatformBrandingUpsert(db, actor, identity),
  ];

  if (includeAudit) {
    statements.push(
      preparePlatformBrandingAudit(db, actor, identity),
    );
  }

  return {
    identity,
    statements,
  };
}

export async function savePlatformBrandingIdentity(
  db: D1Db,
  actor: any,
  incoming: any,
) {
  const prepared = preparePlatformBrandingIdentityStatements(
    db,
    actor,
    incoming,
  );

  await db.batch(prepared.statements);

  return getPlatformBrandingIdentity(db);
}
