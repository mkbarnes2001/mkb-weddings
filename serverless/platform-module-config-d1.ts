type D1Db = any;

export type PlatformModuleConfigurationRecord = {
  moduleKey: "crm" | "client-galleries" | "website" | "business";
  accentColor: string;
  iconKey: string;
  markUrl: string;
  activeButtonStyle: "solid" | "soft" | "outline";
  panelAccentStyle: "edge" | "wash" | "header";
  status: "active" | "archived";
  sortOrder: number;
  updatedAt?: string;
};

export const PLATFORM_MODULE_KEYS = ["crm", "client-galleries", "website", "business"] as const;
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

export const DEFAULT_PLATFORM_MODULE_CONFIGURATIONS: PlatformModuleConfigurationRecord[] = [
  { moduleKey: "crm", accentColor: "#2563EB", iconKey: "contact-round", markUrl: "", activeButtonStyle: "solid", panelAccentStyle: "edge", status: "active", sortOrder: 10 },
  { moduleKey: "client-galleries", accentColor: "#7C3AED", iconKey: "images", markUrl: "", activeButtonStyle: "soft", panelAccentStyle: "wash", status: "active", sortOrder: 20 },
  { moduleKey: "website", accentColor: "#0F766E", iconKey: "globe-2", markUrl: "", activeButtonStyle: "solid", panelAccentStyle: "edge", status: "active", sortOrder: 30 },
  { moduleKey: "business", accentColor: "#B45309", iconKey: "briefcase-business", markUrl: "", activeButtonStyle: "outline", panelAccentStyle: "header", status: "active", sortOrder: 40 },
];

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function httpError(message: string, statusCode = 400, details: string[] = []) {
  const error = new Error(message) as Error & { statusCode?: number; details?: string[] };
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function validColour(value: unknown) {
  const candidate = text(value).toUpperCase();
  return /^#[0-9A-F]{6}$/.test(candidate) ? candidate : "";
}

function safeMarkUrl(value: unknown) {
  const candidate = text(value);
  if (!candidate) return "";
  if (candidate.startsWith("/")) return candidate;
  try {
    const url = new URL(candidate);
    if (url.protocol === "https:") return url.toString();
  } catch {
    // Validation below returns a stable message.
  }
  throw httpError("Module mark URL must be empty, a same-origin path, or an https:// URL.");
}

function hydrate(row: any): PlatformModuleConfigurationRecord {
  return {
    moduleKey: text(row.module_key) as PlatformModuleConfigurationRecord["moduleKey"],
    accentColor: validColour(row.accent_color) || "#111111",
    iconKey: text(row.icon_key),
    markUrl: text(row.mark_url),
    activeButtonStyle: text(row.active_button_style) as PlatformModuleConfigurationRecord["activeButtonStyle"],
    panelAccentStyle: text(row.panel_accent_style) as PlatformModuleConfigurationRecord["panelAccentStyle"],
    status: text(row.status || "active") as PlatformModuleConfigurationRecord["status"],
    sortOrder: Number(row.sort_order || 0),
    updatedAt: row.updated_at || undefined,
  };
}

export async function getPlatformModuleConfigurations(db: D1Db) {
  let rows: any[] = [];
  try {
    const result = await db.prepare(`
      SELECT * FROM platform_module_configurations
      WHERE status = 'active'
      ORDER BY sort_order, module_key
    `).all();
    rows = result.results || [];
  } catch {
    return DEFAULT_PLATFORM_MODULE_CONFIGURATIONS.map((item) => ({ ...item }));
  }
  const stored = new Map(rows.map((row) => [text(row.module_key), hydrate(row)]));
  return DEFAULT_PLATFORM_MODULE_CONFIGURATIONS.map((fallback) => ({
    ...fallback,
    ...(stored.get(fallback.moduleKey) || {}),
    moduleKey: fallback.moduleKey,
  }));
}

export async function savePlatformModuleConfiguration(db: D1Db, actor: any, incoming: any) {
  if (text(actor?.platformRole) !== "platform_admin" || !(actor?.permissions || []).includes("platform:admin")) {
    throw httpError("Only a WedPlanned platform administrator can manage module configuration.", 403);
  }
  if (actor?.accessMode === "support") throw httpError("Support sessions cannot change platform configuration.", 403);

  const moduleKey = text(incoming?.moduleKey) as PlatformModuleConfigurationRecord["moduleKey"];
  if (!PLATFORM_MODULE_KEYS.includes(moduleKey)) throw httpError("Choose a valid WedPlanned module.");
  const fallback = DEFAULT_PLATFORM_MODULE_CONFIGURATIONS.find((item) => item.moduleKey === moduleKey)!;
  const accentColor = validColour(incoming?.accentColor);
  const iconKey = text(incoming?.iconKey);
  const markUrl = safeMarkUrl(incoming?.markUrl);
  const activeButtonStyle = lower(incoming?.activeButtonStyle || fallback.activeButtonStyle);
  const panelAccentStyle = lower(incoming?.panelAccentStyle || fallback.panelAccentStyle);
  const details: string[] = [];
  if (!accentColor) details.push("Accent colour must use six-digit hex format, for example #2563EB.");
  if (!PLATFORM_MODULE_ICON_KEYS.includes(iconKey as any)) details.push("Choose a supported module icon.");
  if (!["solid", "soft", "outline"].includes(activeButtonStyle)) details.push("Choose a supported active-button style.");
  if (!["edge", "wash", "header"].includes(panelAccentStyle)) details.push("Choose a supported panel-accent treatment.");
  if (details.length) throw httpError("Module configuration validation failed.", 400, details);

  await db.prepare(`
    INSERT INTO platform_module_configurations (
      module_key, accent_color, icon_key, mark_url, active_button_style,
      panel_accent_style, status, sort_order, updated_by_user_id,
      updated_by_email, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(module_key) DO UPDATE SET
      accent_color = excluded.accent_color,
      icon_key = excluded.icon_key,
      mark_url = excluded.mark_url,
      active_button_style = excluded.active_button_style,
      panel_accent_style = excluded.panel_accent_style,
      status = 'active',
      sort_order = excluded.sort_order,
      updated_by_user_id = excluded.updated_by_user_id,
      updated_by_email = excluded.updated_by_email,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    moduleKey,
    accentColor,
    iconKey,
    markUrl,
    activeButtonStyle,
    panelAccentStyle,
    fallback.sortOrder,
    text(actor?.userId) || null,
    lower(actor?.email),
  ).run();

  await db.prepare(`
    INSERT INTO platform_audit_events (
      id, workspace_id, actor_user_id, actor_email, event_type,
      entity_type, entity_id, summary, metadata_json, created_at
    ) VALUES (?, NULL, ?, ?, 'platform.module_configuration.updated',
      'platform_module', ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    `audit_${crypto.randomUUID()}`,
    text(actor?.userId) || null,
    lower(actor?.email),
    moduleKey,
    `Updated ${moduleKey} module appearance.`,
    JSON.stringify({ accentColor, iconKey, markUrl, activeButtonStyle, panelAccentStyle }),
  ).run();

  return getPlatformModuleConfigurations(db);
}
