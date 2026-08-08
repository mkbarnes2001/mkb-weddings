import {
  cloneDefaultWedPlannedPublicTheme,
  normaliseWedPlannedPublicTheme,
  type WedPlannedPublicTheme,
} from "../src/shared/wedplannedPublicAppearance";

type D1Db = any;

const SITE_KEY = "wedplanned";
const HISTORY_LIMIT = 20;

export type WedPlannedPublicAppearanceVersion = {
  id: string;
  version: number;
  theme: WedPlannedPublicTheme;
  publishedByEmail: string;
  createdAt: string;
};

export type WedPlannedPublicAppearanceAdministration = {
  siteKey: typeof SITE_KEY;
  draftTheme: WedPlannedPublicTheme;
  publishedTheme: WedPlannedPublicTheme;
  publishedVersion: number;
  updatedByEmail: string;
  publishedByEmail: string;
  updatedAt: string;
  publishedAt: string;
  versions: WedPlannedPublicAppearanceVersion[];
};

export type WedPlannedPublishedAppearance = {
  siteKey: typeof SITE_KEY;
  theme: WedPlannedPublicTheme;
  publishedVersion: number;
  publishedAt: string;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function httpError(message: string, statusCode = 400) {
  const error = new Error(message) as Error & {
    statusCode?: number;
  };

  error.statusCode = statusCode;
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
      "Support sessions cannot manage the WedPlanned public appearance.",
      403,
    );
  }
}

function parseTheme(value: unknown) {
  try {
    return normaliseWedPlannedPublicTheme(
      JSON.parse(text(value) || "{}"),
    );
  } catch {
    return cloneDefaultWedPlannedPublicTheme();
  }
}

function serialiseTheme(value: unknown) {
  return JSON.stringify(
    normaliseWedPlannedPublicTheme(value),
  );
}

function hydrateVersion(row: any): WedPlannedPublicAppearanceVersion {
  return {
    id: text(row?.id),
    version: Number(row?.version || 0),
    theme: parseTheme(row?.theme_json),
    publishedByEmail: text(row?.published_by_email),
    createdAt: text(row?.created_at),
  };
}

async function currentAppearanceRow(db: D1Db) {
  const row = await db.prepare(`
    SELECT *
    FROM platform_public_site_appearance
    WHERE id = ?
    LIMIT 1
  `)
    .bind(SITE_KEY)
    .first();

  if (!row) {
    throw httpError(
      "WedPlanned public appearance configuration is unavailable.",
      500,
    );
  }

  return row;
}

async function auditStatement(
  db: D1Db,
  actor: any,
  eventType: string,
  summary: string,
  metadata: Record<string, unknown>,
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
      ?,
      'platform_public_site_appearance',
      ?,
      ?,
      ?,
      CURRENT_TIMESTAMP
    )
  `).bind(
    `audit_${crypto.randomUUID()}`,
    text(actor?.userId) || null,
    lower(actor?.email),
    eventType,
    SITE_KEY,
    summary,
    JSON.stringify(metadata),
  );
}

export async function getWedPlannedPublicAppearanceAdministration(
  db: D1Db,
  actor: any,
): Promise<WedPlannedPublicAppearanceAdministration> {
  requirePlatformAdmin(actor);

  const [row, history] = await Promise.all([
    currentAppearanceRow(db),
    db.prepare(`
      SELECT *
      FROM platform_public_site_appearance_versions
      WHERE site_key = ?
      ORDER BY version DESC
      LIMIT ?
    `)
      .bind(SITE_KEY, HISTORY_LIMIT)
      .all(),
  ]);

  return {
    siteKey: SITE_KEY,
    draftTheme: parseTheme(row.draft_json),
    publishedTheme: parseTheme(row.published_json),
    publishedVersion: Number(row.published_version || 0),
    updatedByEmail: text(row.updated_by_email),
    publishedByEmail: text(row.published_by_email),
    updatedAt: text(row.updated_at),
    publishedAt: text(row.published_at),
    versions: (history.results || []).map(hydrateVersion),
  };
}

export async function saveWedPlannedPublicAppearanceDraft(
  db: D1Db,
  actor: any,
  incomingTheme: unknown,
) {
  requirePlatformAdmin(actor);

  const theme = normaliseWedPlannedPublicTheme(incomingTheme);
  const themeJson = serialiseTheme(theme);

  const audit = await auditStatement(
    db,
    actor,
    "platform.public_site_appearance.draft_saved",
    "Saved the WedPlanned public website appearance draft.",
    {
      siteKey: SITE_KEY,
      schemaVersion: theme.schemaVersion,
    },
  );

  await db.batch([
    db.prepare(`
      UPDATE platform_public_site_appearance
      SET
        draft_json = ?,
        updated_by_user_id = ?,
        updated_by_email = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      themeJson,
      text(actor?.userId) || null,
      lower(actor?.email),
      SITE_KEY,
    ),
    audit,
  ]);

  return getWedPlannedPublicAppearanceAdministration(
    db,
    actor,
  );
}

export async function publishWedPlannedPublicAppearance(
  db: D1Db,
  actor: any,
) {
  requirePlatformAdmin(actor);

  const row = await currentAppearanceRow(db);

  const theme = parseTheme(row.draft_json);
  const themeJson = serialiseTheme(theme);
  const currentVersion = Number(row.published_version || 0);
  const nextVersion = currentVersion + 1;
  const versionId =
    `public_appearance_${SITE_KEY}_v${nextVersion}_${crypto.randomUUID()}`;

  const audit = await auditStatement(
    db,
    actor,
    "platform.public_site_appearance.published",
    `Published WedPlanned public website appearance version ${nextVersion}.`,
    {
      siteKey: SITE_KEY,
      previousVersion: currentVersion,
      publishedVersion: nextVersion,
      schemaVersion: theme.schemaVersion,
    },
  );

  await db.batch([
    db.prepare(`
      UPDATE platform_public_site_appearance
      SET
        draft_json = ?,
        published_json = ?,
        published_version = ?,
        updated_by_user_id = ?,
        updated_by_email = ?,
        published_by_user_id = ?,
        published_by_email = ?,
        updated_at = CURRENT_TIMESTAMP,
        published_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND published_version = ?
    `).bind(
      themeJson,
      themeJson,
      nextVersion,
      text(actor?.userId) || null,
      lower(actor?.email),
      text(actor?.userId) || null,
      lower(actor?.email),
      SITE_KEY,
      currentVersion,
    ),

    db.prepare(`
      INSERT INTO platform_public_site_appearance_versions (
        id,
        site_key,
        version,
        theme_json,
        published_by_user_id,
        published_by_email,
        created_at
      ) VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        CURRENT_TIMESTAMP
      )
    `).bind(
      versionId,
      SITE_KEY,
      nextVersion,
      themeJson,
      text(actor?.userId) || null,
      lower(actor?.email),
    ),

    audit,
  ]);

  return getWedPlannedPublicAppearanceAdministration(
    db,
    actor,
  );
}

export async function restoreWedPlannedPublicAppearanceVersionToDraft(
  db: D1Db,
  actor: any,
  versionInput: unknown,
) {
  requirePlatformAdmin(actor);

  const version = Number(versionInput);

  if (
    !Number.isInteger(version)
    || version <= 0
  ) {
    throw httpError(
      "Choose a valid WedPlanned public appearance version.",
      400,
    );
  }

  const historyRow = await db.prepare(`
    SELECT *
    FROM platform_public_site_appearance_versions
    WHERE site_key = ?
      AND version = ?
    LIMIT 1
  `)
    .bind(SITE_KEY, version)
    .first();

  if (!historyRow) {
    throw httpError(
      "WedPlanned public appearance version not found.",
      404,
    );
  }

  const restoredTheme = parseTheme(historyRow.theme_json);
  const restoredJson = serialiseTheme(restoredTheme);

  const audit = await auditStatement(
    db,
    actor,
    "platform.public_site_appearance.version_restored_to_draft",
    `Restored WedPlanned public website appearance version ${version} to draft.`,
    {
      siteKey: SITE_KEY,
      restoredVersion: version,
      publishedVersionChanged: false,
    },
  );

  await db.batch([
    db.prepare(`
      UPDATE platform_public_site_appearance
      SET
        draft_json = ?,
        updated_by_user_id = ?,
        updated_by_email = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      restoredJson,
      text(actor?.userId) || null,
      lower(actor?.email),
      SITE_KEY,
    ),

    audit,
  ]);

  return getWedPlannedPublicAppearanceAdministration(
    db,
    actor,
  );
}

export async function getPublishedWedPlannedPublicAppearance(
  db: D1Db,
): Promise<WedPlannedPublishedAppearance> {
  try {
    const row = await currentAppearanceRow(db);

    return {
      siteKey: SITE_KEY,
      theme: parseTheme(row.published_json),
      publishedVersion: Number(row.published_version || 0),
      publishedAt: text(row.published_at),
    };
  } catch {
    return {
      siteKey: SITE_KEY,
      theme: cloneDefaultWedPlannedPublicTheme(),
      publishedVersion: 0,
      publishedAt: "",
    };
  }
}
