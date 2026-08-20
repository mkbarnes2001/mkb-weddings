type D1Db = any;

export type PlatformBrandingIdentityRecord = {
  platformName: string;
  wordmarkUrl: string;
  darkWordmarkUrl: string;
  compactWordmarkUrl: string;
  iconUrl: string;
  adminFontScale: number;
  adminHeadingFontScale: number;
  adminButtonFontScale: number;
  adminNavigationFontScale: number;
  adminMetaFontScale: number;
  pageHeaderLogoScale: number;
  sidebarLogoScale: number;
  mobileLogoScale: number;
  adminHeaderStyle: "flat" | "divider" | "panel";
  adminHeaderDensity: "compact" | "standard";
  adminHeaderTitleSize: "small" | "medium" | "large";
  adminHeaderShadow: "off" | "subtle";
  adminHeaderDescription: "show" | "hide";
  adminHeaderDescriptionSize: "small" | "standard";
  adminHeaderActionSize: "compact" | "standard";
  adminStatusSize: "compact" | "standard";
  adminPageSpacing: "compact" | "standard";
  adminActionIcons: Record<string, string>;
  updatedAt?: string;
};

export const DEFAULT_PLATFORM_BRANDING_IDENTITY: PlatformBrandingIdentityRecord = {
  platformName: "WedPlanned",
  wordmarkUrl: "",
  darkWordmarkUrl: "",
  compactWordmarkUrl: "",
  iconUrl: "",
  adminFontScale: 100,
  adminHeadingFontScale: 100,
  adminButtonFontScale: 100,
  adminNavigationFontScale: 100,
  adminMetaFontScale: 100,
  pageHeaderLogoScale: 100,
  sidebarLogoScale: 100,
  mobileLogoScale: 100,
  adminHeaderStyle: "divider",
  adminHeaderDensity: "compact",
  adminHeaderTitleSize: "medium",
  adminHeaderShadow: "off",
  adminHeaderDescription: "show",
  adminHeaderDescriptionSize: "small",
  adminHeaderActionSize: "compact",
  adminStatusSize: "compact",
  adminPageSpacing: "compact",
  adminActionIcons: {},
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

function hydratedScale(value: unknown) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 75 && parsed <= 140
    ? parsed
    : 100;
}

function requiredScale(value: unknown, label: string) {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(parsed) || parsed < 75 || parsed > 140) {
    throw httpError(
      `${label} must be between 75% and 140%.`,
      400,
    );
  }

  return parsed;
}

function hydratedOption(
  value: unknown,
  allowed: readonly string[],
  fallback: string,
) {
  const candidate = text(value);
  return allowed.includes(candidate)
    ? candidate
    : fallback;
}

function requiredOption(
  value: unknown,
  allowed: readonly string[],
  fallback: string,
  label: string,
) {
  const candidate = text(value) || fallback;

  if (!allowed.includes(candidate)) {
    throw httpError(
      `${label} is not supported.`,
      400,
    );
  }

  return candidate;
}


function hydratedAdminActionIcons(
  value: unknown,
): Record<string, string> {
  let parsed: unknown = {};

  try {
    parsed = JSON.parse(
      text(value) || "{}",
    );
  } catch {
    return {};
  }

  if (
    !parsed
    || typeof parsed !== "object"
    || Array.isArray(parsed)
  ) {
    return {};
  }

  const result: Record<string, string> = {};

  for (
    const [rawKey, rawIcon]
    of Object.entries(parsed)
  ) {
    const key = text(rawKey);
    const icon = text(rawIcon);

    if (
      /^[a-z][a-z0-9-]{0,47}$/.test(key)
      && /^[a-z][a-z0-9-]{0,63}$/.test(icon)
    ) {
      result[key] = icon;
    }
  }

  return result;
}


function requiredAdminActionIcons(
  value: unknown,
): Record<string, string> {
  if (
    value === undefined
    || value === null
    || value === ""
  ) {
    return {};
  }

  if (
    typeof value !== "object"
    || Array.isArray(value)
  ) {
    throw httpError(
      "Admin action icons must be an object.",
      400,
    );
  }

  const entries = Object.entries(value);

  if (entries.length > 80) {
    throw httpError(
      "Too many Admin action icon overrides.",
      400,
    );
  }

  const result: Record<string, string> = {};

  for (
    const [rawKey, rawIcon]
    of entries
  ) {
    const key = text(rawKey);
    const icon = text(rawIcon);

    if (
      !/^[a-z][a-z0-9-]{0,47}$/.test(key)
      || !/^[a-z][a-z0-9-]{0,63}$/.test(icon)
    ) {
      throw httpError(
        "Admin action icon configuration contains an invalid key.",
        400,
      );
    }

    result[key] = icon;
  }

  const encoded = JSON.stringify(
    result
  );

  if (encoded.length > 12000) {
    throw httpError(
      "Admin action icon configuration is too large.",
      400,
    );
  }

  return result;
}


function hydrate(row: any): PlatformBrandingIdentityRecord {
  if (!row) return { ...DEFAULT_PLATFORM_BRANDING_IDENTITY };

  return {
    platformName: text(row.platform_name) || "WedPlanned",
    wordmarkUrl: text(row.wordmark_url),
    darkWordmarkUrl: text(row.dark_wordmark_url),
    compactWordmarkUrl: text(row.compact_wordmark_url),
    iconUrl: text(row.icon_url),
    adminFontScale: hydratedScale(row.admin_font_scale),
    adminHeadingFontScale: hydratedScale(row.admin_heading_font_scale),
    adminButtonFontScale: hydratedScale(row.admin_button_font_scale),
    adminNavigationFontScale: hydratedScale(row.admin_navigation_font_scale),
    adminMetaFontScale: hydratedScale(row.admin_meta_font_scale),
    pageHeaderLogoScale: hydratedScale(row.page_header_logo_scale),
    sidebarLogoScale: hydratedScale(row.sidebar_logo_scale),
    mobileLogoScale: hydratedScale(row.mobile_logo_scale),
    adminHeaderStyle: hydratedOption(
      row.admin_header_style,
      ["flat", "divider", "panel"],
      "divider",
    ) as PlatformBrandingIdentityRecord["adminHeaderStyle"],
    adminHeaderDensity: hydratedOption(
      row.admin_header_density,
      ["compact", "standard"],
      "compact",
    ) as PlatformBrandingIdentityRecord["adminHeaderDensity"],
    adminHeaderTitleSize: hydratedOption(
      row.admin_header_title_size,
      ["small", "medium", "large"],
      "medium",
    ) as PlatformBrandingIdentityRecord["adminHeaderTitleSize"],
    adminHeaderShadow: hydratedOption(
      row.admin_header_shadow,
      ["off", "subtle"],
      "off",
    ) as PlatformBrandingIdentityRecord["adminHeaderShadow"],
    adminHeaderDescription: hydratedOption(
      row.admin_header_description,
      ["show", "hide"],
      "show",
    ) as PlatformBrandingIdentityRecord["adminHeaderDescription"],
    adminHeaderDescriptionSize: hydratedOption(
      row.admin_header_description_size,
      ["small", "standard"],
      "small",
    ) as PlatformBrandingIdentityRecord["adminHeaderDescriptionSize"],
    adminHeaderActionSize: hydratedOption(
      row.admin_header_action_size,
      ["compact", "standard"],
      "compact",
    ) as PlatformBrandingIdentityRecord["adminHeaderActionSize"],
    adminStatusSize: hydratedOption(
      row.admin_status_size,
      ["compact", "standard"],
      "compact",
    ) as PlatformBrandingIdentityRecord["adminStatusSize"],
    adminPageSpacing: hydratedOption(
      row.admin_page_spacing,
      ["compact", "standard"],
      "compact",
    ) as PlatformBrandingIdentityRecord["adminPageSpacing"],
    adminActionIcons: hydratedAdminActionIcons(
      row.admin_action_icons_json,
    ),
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
  const darkWordmarkUrl = safeAssetUrl(incoming?.darkWordmarkUrl);
  const compactWordmarkUrl = safeAssetUrl(
    incoming?.compactWordmarkUrl,
  );
  const iconUrl = safeAssetUrl(incoming?.iconUrl);

  if (!platformName) {
    throw httpError("Enter a platform name.");
  }

  const adminFontScale = requiredScale(
    incoming?.adminFontScale ?? 100,
    "Overall Admin text scale",
  );
  const adminHeadingFontScale = requiredScale(
    incoming?.adminHeadingFontScale ?? 100,
    "Admin heading scale",
  );
  const adminButtonFontScale = requiredScale(
    incoming?.adminButtonFontScale ?? 100,
    "Admin button scale",
  );
  const adminNavigationFontScale = requiredScale(
    incoming?.adminNavigationFontScale ?? 100,
    "Admin navigation scale",
  );
  const adminMetaFontScale = requiredScale(
    incoming?.adminMetaFontScale ?? 100,
    "Admin helper and status text scale",
  );
  const pageHeaderLogoScale = requiredScale(
    incoming?.pageHeaderLogoScale ?? 100,
    "Global page-header logo scale",
  );
  const sidebarLogoScale = requiredScale(
    incoming?.sidebarLogoScale ?? 100,
    "Global sidebar logo scale",
  );
  const mobileLogoScale = requiredScale(
    incoming?.mobileLogoScale ?? 100,
    "Global mobile logo scale",
  );


  const adminHeaderStyle = requiredOption(
    incoming?.adminHeaderStyle,
    ["flat", "divider", "panel"],
    "divider",
    "Admin header style",
  ) as PlatformBrandingIdentityRecord["adminHeaderStyle"];

  const adminHeaderDensity = requiredOption(
    incoming?.adminHeaderDensity,
    ["compact", "standard"],
    "compact",
    "Admin header density",
  ) as PlatformBrandingIdentityRecord["adminHeaderDensity"];

  const adminHeaderTitleSize = requiredOption(
    incoming?.adminHeaderTitleSize,
    ["small", "medium", "large"],
    "medium",
    "Admin header title size",
  ) as PlatformBrandingIdentityRecord["adminHeaderTitleSize"];

  const adminHeaderShadow = requiredOption(
    incoming?.adminHeaderShadow,
    ["off", "subtle"],
    "off",
    "Admin header shadow",
  ) as PlatformBrandingIdentityRecord["adminHeaderShadow"];

  const adminHeaderDescription = requiredOption(
    incoming?.adminHeaderDescription,
    ["show", "hide"],
    "show",
    "Admin header description visibility",
  ) as PlatformBrandingIdentityRecord["adminHeaderDescription"];

  const adminHeaderDescriptionSize = requiredOption(
    incoming?.adminHeaderDescriptionSize,
    ["small", "standard"],
    "small",
    "Admin header description size",
  ) as PlatformBrandingIdentityRecord["adminHeaderDescriptionSize"];

  const adminHeaderActionSize = requiredOption(
    incoming?.adminHeaderActionSize,
    ["compact", "standard"],
    "compact",
    "Admin header action size",
  ) as PlatformBrandingIdentityRecord["adminHeaderActionSize"];

  const adminStatusSize = requiredOption(
    incoming?.adminStatusSize,
    ["compact", "standard"],
    "compact",
    "Admin status size",
  ) as PlatformBrandingIdentityRecord["adminStatusSize"];

  const adminPageSpacing = requiredOption(
    incoming?.adminPageSpacing,
    ["compact", "standard"],
    "compact",
    "Admin page spacing",
  ) as PlatformBrandingIdentityRecord["adminPageSpacing"];

  const adminActionIcons = requiredAdminActionIcons(
    incoming?.adminActionIcons,
  );

  return {
    platformName,
    wordmarkUrl,
    darkWordmarkUrl,
    compactWordmarkUrl,
    iconUrl,
    adminFontScale,
    adminHeadingFontScale,
    adminButtonFontScale,
    adminNavigationFontScale,
    adminMetaFontScale,
    pageHeaderLogoScale,
    sidebarLogoScale,
    mobileLogoScale,
    adminHeaderStyle,
    adminHeaderDensity,
    adminHeaderTitleSize,
    adminHeaderShadow,
    adminHeaderDescription,
    adminHeaderDescriptionSize,
    adminHeaderActionSize,
    adminStatusSize,
    adminPageSpacing,
    adminActionIcons,
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
      dark_wordmark_url,
      compact_wordmark_url,
      icon_url,
      admin_font_scale,
      admin_heading_font_scale,
      admin_button_font_scale,
      admin_navigation_font_scale,
      admin_meta_font_scale,
      page_header_logo_scale,
      sidebar_logo_scale,
      mobile_logo_scale,
      admin_header_style,
      admin_header_density,
      admin_header_title_size,
      admin_header_shadow,
      admin_header_description,
      admin_header_description_size,
      admin_header_action_size,
      admin_status_size,
      admin_page_spacing,
      admin_action_icons_json,
      updated_by_user_id,
      updated_by_email,
      created_at,
      updated_at
    ) VALUES (
      'default',
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?,
      ?, ?,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(id) DO UPDATE SET
      platform_name = excluded.platform_name,
      wordmark_url = excluded.wordmark_url,
      dark_wordmark_url = excluded.dark_wordmark_url,
      compact_wordmark_url = excluded.compact_wordmark_url,
      icon_url = excluded.icon_url,
      admin_font_scale = excluded.admin_font_scale,
      admin_heading_font_scale = excluded.admin_heading_font_scale,
      admin_button_font_scale = excluded.admin_button_font_scale,
      admin_navigation_font_scale = excluded.admin_navigation_font_scale,
      admin_meta_font_scale = excluded.admin_meta_font_scale,
      page_header_logo_scale = excluded.page_header_logo_scale,
      sidebar_logo_scale = excluded.sidebar_logo_scale,
      mobile_logo_scale = excluded.mobile_logo_scale,
      admin_header_style = excluded.admin_header_style,
      admin_header_density = excluded.admin_header_density,
      admin_header_title_size = excluded.admin_header_title_size,
      admin_header_shadow = excluded.admin_header_shadow,
      admin_header_description = excluded.admin_header_description,
      admin_header_description_size = excluded.admin_header_description_size,
      admin_header_action_size = excluded.admin_header_action_size,
      admin_status_size = excluded.admin_status_size,
      admin_page_spacing = excluded.admin_page_spacing,
      admin_action_icons_json = excluded.admin_action_icons_json,
      updated_by_user_id = excluded.updated_by_user_id,
      updated_by_email = excluded.updated_by_email,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    identity.platformName,
    identity.wordmarkUrl,
    identity.darkWordmarkUrl,
    identity.compactWordmarkUrl,
    identity.iconUrl,
    identity.adminFontScale,
    identity.adminHeadingFontScale,
    identity.adminButtonFontScale,
    identity.adminNavigationFontScale,
    identity.adminMetaFontScale,
    identity.pageHeaderLogoScale,
    identity.sidebarLogoScale,
    identity.mobileLogoScale,
    identity.adminHeaderStyle,
    identity.adminHeaderDensity,
    identity.adminHeaderTitleSize,
    identity.adminHeaderShadow,
    identity.adminHeaderDescription,
    identity.adminHeaderDescriptionSize,
    identity.adminHeaderActionSize,
    identity.adminStatusSize,
    identity.adminPageSpacing,
    JSON.stringify(identity.adminActionIcons),
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
