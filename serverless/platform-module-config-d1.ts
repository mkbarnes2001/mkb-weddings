type D1Db = any;

export type PlatformModuleConfigurationRecord = {
  moduleKey: "crm" | "client-galleries" | "website" | "business";
  accentColor: string;
  pageBackgroundColor: string;
  sectionBackgroundColor: string;
  recordBackgroundColor: string;
  iconKey: string;
  markUrl: string;
  wordmarkUrl: string;
  darkWordmarkUrl: string;
  compactWordmarkUrl: string;
  activeButtonStyle: "solid" | "soft" | "outline";
  panelAccentStyle: "edge" | "wash" | "header";
  status: "active" | "archived";
  sortOrder: number;
  updatedAt?: string;
};

export const PLATFORM_MODULE_KEYS = [
  "crm",
  "client-galleries",
  "website",
  "business",
] as const;

export const PLATFORM_MODULE_ICON_KEYS = [
  "contact-round",
  "images",
  "globe-2",
  "briefcase-business",
  "calendar-days",
  "camera",
  "layers-3",
  "palette",
  "sparkles",
] as const;

export const DEFAULT_PLATFORM_MODULE_CONFIGURATIONS:
PlatformModuleConfigurationRecord[] = [
  {
    moduleKey: "crm",
    accentColor: "#2563EB",
    pageBackgroundColor: "#F5F3EF",
    sectionBackgroundColor: "#FFFFFF",
    recordBackgroundColor: "#FFFFFF",
    iconKey: "contact-round",
    markUrl: "",
    wordmarkUrl: "",
    darkWordmarkUrl: "",
    compactWordmarkUrl: "",
    activeButtonStyle: "solid",
    panelAccentStyle: "edge",
    status: "active",
    sortOrder: 10,
  },
  {
    moduleKey: "client-galleries",
    accentColor: "#7C3AED",
    pageBackgroundColor: "#F5F3EF",
    sectionBackgroundColor: "#FFFFFF",
    recordBackgroundColor: "#FFFFFF",
    iconKey: "images",
    markUrl: "",
    wordmarkUrl: "",
    darkWordmarkUrl: "",
    compactWordmarkUrl: "",
    activeButtonStyle: "soft",
    panelAccentStyle: "wash",
    status: "active",
    sortOrder: 20,
  },
  {
    moduleKey: "website",
    accentColor: "#0F766E",
    pageBackgroundColor: "#F5F3EF",
    sectionBackgroundColor: "#FFFFFF",
    recordBackgroundColor: "#FFFFFF",
    iconKey: "globe-2",
    markUrl: "",
    wordmarkUrl: "",
    darkWordmarkUrl: "",
    compactWordmarkUrl: "",
    activeButtonStyle: "solid",
    panelAccentStyle: "edge",
    status: "active",
    sortOrder: 30,
  },
  {
    moduleKey: "business",
    accentColor: "#B45309",
    pageBackgroundColor: "#F5F3EF",
    sectionBackgroundColor: "#FFFFFF",
    recordBackgroundColor: "#FFFFFF",
    iconKey: "briefcase-business",
    markUrl: "",
    wordmarkUrl: "",
    darkWordmarkUrl: "",
    compactWordmarkUrl: "",
    activeButtonStyle: "outline",
    panelAccentStyle: "header",
    status: "active",
    sortOrder: 40,
  },
];

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

function validColour(value: unknown) {
  const candidate = text(value).toUpperCase();
  return /^#[0-9A-F]{6}$/.test(candidate) ? candidate : "";
}

function safeAssetUrl(value: unknown) {
  const candidate = text(value);
  if (!candidate) return "";
  if (candidate.startsWith("/")) return candidate;

  try {
    const url = new URL(candidate);
    if (url.protocol === "https:") return url.toString();
  } catch {
    // The validation below returns a stable message.
  }

  throw httpError(
    "Module asset URLs must be empty, a same-origin path, or an https:// URL.",
  );
}

function requirePlatformAdmin(actor: any) {
  if (
    text(actor?.platformRole) !== "platform_admin"
    || !(actor?.permissions || []).includes("platform:admin")
  ) {
    throw httpError(
      "Only a WedPlanned platform administrator can manage module configuration.",
      403,
    );
  }

  if (actor?.accessMode === "support") {
    throw httpError(
      "Support sessions cannot change platform configuration.",
      403,
    );
  }
}

function hydrate(row: any): PlatformModuleConfigurationRecord {
  return {
    moduleKey: text(row.module_key) as
      PlatformModuleConfigurationRecord["moduleKey"],
    accentColor: validColour(row.accent_color) || "#111111",
    pageBackgroundColor:
      validColour(row.page_background_color) || "#F5F3EF",
    sectionBackgroundColor:
      validColour(row.section_background_color) || "#FFFFFF",
    recordBackgroundColor:
      validColour(row.record_background_color) || "#FFFFFF",
    iconKey: text(row.icon_key),
    markUrl: text(row.mark_url),
    wordmarkUrl: text(row.wordmark_url),
    darkWordmarkUrl: text(row.dark_wordmark_url),
    compactWordmarkUrl: text(row.compact_wordmark_url),
    activeButtonStyle: text(row.active_button_style) as
      PlatformModuleConfigurationRecord["activeButtonStyle"],
    panelAccentStyle: text(row.panel_accent_style) as
      PlatformModuleConfigurationRecord["panelAccentStyle"],
    status: text(row.status || "active") as
      PlatformModuleConfigurationRecord["status"],
    sortOrder: Number(row.sort_order || 0),
    updatedAt: row.updated_at || undefined,
  };
}

export async function getPlatformModuleConfigurations(db: D1Db) {
  let rows: any[] = [];

  try {
    const result = await db.prepare(`
      SELECT *
      FROM platform_module_configurations
      WHERE status = 'active'
      ORDER BY sort_order, module_key
    `).all();

    rows = result.results || [];
  } catch {
    return DEFAULT_PLATFORM_MODULE_CONFIGURATIONS.map((item) => ({
      ...item,
    }));
  }

  const stored = new Map(
    rows.map((row) => [text(row.module_key), hydrate(row)]),
  );

  return DEFAULT_PLATFORM_MODULE_CONFIGURATIONS.map((fallback) => ({
    ...fallback,
    ...(stored.get(fallback.moduleKey) || {}),
    moduleKey: fallback.moduleKey,
  }));
}

function normalisePlatformModuleConfiguration(
  incoming: any,
): PlatformModuleConfigurationRecord {
  const moduleKey = text(incoming?.moduleKey) as
    PlatformModuleConfigurationRecord["moduleKey"];

  if (!PLATFORM_MODULE_KEYS.includes(moduleKey)) {
    throw httpError("Choose a valid WedPlanned module.");
  }

  const fallback = DEFAULT_PLATFORM_MODULE_CONFIGURATIONS.find(
    (item) => item.moduleKey === moduleKey,
  )!;

  const accentColor = validColour(incoming?.accentColor);
  const pageBackgroundColor = validColour(incoming?.pageBackgroundColor);
  const sectionBackgroundColor = validColour(
    incoming?.sectionBackgroundColor,
  );
  const recordBackgroundColor = validColour(
    incoming?.recordBackgroundColor,
  );
  const iconKey = text(incoming?.iconKey);
  const markUrl = safeAssetUrl(incoming?.markUrl);
  const wordmarkUrl = safeAssetUrl(incoming?.wordmarkUrl);
  const darkWordmarkUrl = safeAssetUrl(
    incoming?.darkWordmarkUrl,
  );
  const compactWordmarkUrl = safeAssetUrl(
    incoming?.compactWordmarkUrl,
  );

  const activeButtonStyle = lower(
    incoming?.activeButtonStyle || fallback.activeButtonStyle,
  ) as PlatformModuleConfigurationRecord["activeButtonStyle"];

  const panelAccentStyle = lower(
    incoming?.panelAccentStyle || fallback.panelAccentStyle,
  ) as PlatformModuleConfigurationRecord["panelAccentStyle"];

  const details: string[] = [];

  if (!accentColor) {
    details.push(
      "Accent colour must use six-digit hex format, for example #2563EB.",
    );
  }

  if (!pageBackgroundColor) {
    details.push(
      "Page background colour must use six-digit hex format.",
    );
  }

  if (!sectionBackgroundColor) {
    details.push(
      "Section background colour must use six-digit hex format.",
    );
  }

  if (!recordBackgroundColor) {
    details.push(
      "Record card background colour must use six-digit hex format.",
    );
  }

  if (!PLATFORM_MODULE_ICON_KEYS.includes(iconKey as any)) {
    details.push("Choose a supported module icon.");
  }

  if (!["solid", "soft", "outline"].includes(activeButtonStyle)) {
    details.push("Choose a supported active-button style.");
  }

  if (!["edge", "wash", "header"].includes(panelAccentStyle)) {
    details.push("Choose a supported panel-accent treatment.");
  }

  if (details.length) {
    throw httpError(
      "Module configuration validation failed.",
      400,
      details,
    );
  }

  return {
    moduleKey,
    accentColor,
    pageBackgroundColor,
    sectionBackgroundColor,
    recordBackgroundColor,
    iconKey,
    markUrl,
    wordmarkUrl,
    darkWordmarkUrl,
    compactWordmarkUrl,
    activeButtonStyle,
    panelAccentStyle,
    status: "active",
    sortOrder: fallback.sortOrder,
  };
}

function preparePlatformModuleUpsert(
  db: D1Db,
  actor: any,
  module: PlatformModuleConfigurationRecord,
) {
  return db.prepare(`
    INSERT INTO platform_module_configurations (
      module_key,
      accent_color,
      page_background_color,
      section_background_color,
      record_background_color,
      icon_key,
      mark_url,
      wordmark_url,
      dark_wordmark_url,
      compact_wordmark_url,
      active_button_style,
      panel_accent_style,
      status,
      sort_order,
      updated_by_user_id,
      updated_by_email,
      created_at,
      updated_at
    ) VALUES (
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      'active',
      ?,
      ?,
      ?,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(module_key) DO UPDATE SET
      accent_color = excluded.accent_color,
      page_background_color = excluded.page_background_color,
      section_background_color = excluded.section_background_color,
      record_background_color = excluded.record_background_color,
      icon_key = excluded.icon_key,
      mark_url = excluded.mark_url,
      wordmark_url = excluded.wordmark_url,
      dark_wordmark_url = excluded.dark_wordmark_url,
      compact_wordmark_url = excluded.compact_wordmark_url,
      active_button_style = excluded.active_button_style,
      panel_accent_style = excluded.panel_accent_style,
      status = 'active',
      sort_order = excluded.sort_order,
      updated_by_user_id = excluded.updated_by_user_id,
      updated_by_email = excluded.updated_by_email,
      updated_at = CURRENT_TIMESTAMP
    `).bind(
      module.moduleKey,
      module.accentColor,
      module.pageBackgroundColor,
      module.sectionBackgroundColor,
      module.recordBackgroundColor,
      module.iconKey,
      module.markUrl,
      module.wordmarkUrl,
      module.darkWordmarkUrl,
      module.compactWordmarkUrl,
      module.activeButtonStyle,
      module.panelAccentStyle,
      module.sortOrder,
      text(actor?.userId) || null,
      lower(actor?.email),
    );
}

function preparePlatformModuleAudit(
  db: D1Db,
  actor: any,
  module: PlatformModuleConfigurationRecord,
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
      'platform.module_configuration.updated',
      'platform_module',
      ?,
      ?,
      ?,
      CURRENT_TIMESTAMP
    )
  `).bind(
    `audit_${crypto.randomUUID()}`,
    text(actor?.userId) || null,
    lower(actor?.email),
    module.moduleKey,
    `Updated ${module.moduleKey} module appearance.`,
    JSON.stringify({
      accentColor: module.accentColor,
      pageBackgroundColor: module.pageBackgroundColor,
      sectionBackgroundColor: module.sectionBackgroundColor,
      recordBackgroundColor: module.recordBackgroundColor,
      iconKey: module.iconKey,
      markUrl: module.markUrl,
      wordmarkUrl: module.wordmarkUrl,
      darkWordmarkUrl: module.darkWordmarkUrl,
      compactWordmarkUrl: module.compactWordmarkUrl,
      activeButtonStyle: module.activeButtonStyle,
      panelAccentStyle: module.panelAccentStyle,
    }),
  );
}

export function preparePlatformModuleConfigurationStatements(
  db: D1Db,
  actor: any,
  incoming: any,
  includeAudit = true,
) {
  requirePlatformAdmin(actor);

  const module = normalisePlatformModuleConfiguration(incoming);
  const statements = [
    preparePlatformModuleUpsert(db, actor, module),
  ];

  if (includeAudit) {
    statements.push(
      preparePlatformModuleAudit(db, actor, module),
    );
  }

  return {
    module,
    statements,
  };
}

export function preparePlatformModuleConfigurationsStatements(
  db: D1Db,
  actor: any,
  incoming: any,
  includeAudit = true,
) {
  requirePlatformAdmin(actor);

  const modules = Array.isArray(incoming) ? incoming : [];
  const keys = modules.map(
    (module: any) => text(module?.moduleKey),
  );

  if (
    modules.length !== PLATFORM_MODULE_KEYS.length
    || new Set(keys).size !== PLATFORM_MODULE_KEYS.length
    || PLATFORM_MODULE_KEYS.some((key) => !keys.includes(key))
  ) {
    throw httpError(
      "Submit one configuration for each WedPlanned module.",
    );
  }

  const prepared = modules.map((module: any) =>
    preparePlatformModuleConfigurationStatements(
      db,
      actor,
      module,
      includeAudit,
    )
  );

  return {
    modules: prepared.map((item) => item.module),
    statements: prepared.flatMap((item) => item.statements),
  };
}

export async function savePlatformModuleConfiguration(
  db: D1Db,
  actor: any,
  incoming: any,
) {
  const prepared = preparePlatformModuleConfigurationStatements(
    db,
    actor,
    incoming,
  );

  await db.batch(prepared.statements);

  return getPlatformModuleConfigurations(db);
}

export async function savePlatformModuleConfigurations(
  db: D1Db,
  actor: any,
  incoming: any,
) {
  const prepared = preparePlatformModuleConfigurationsStatements(
    db,
    actor,
    incoming,
  );

  await db.batch(prepared.statements);

  return getPlatformModuleConfigurations(db);
}
