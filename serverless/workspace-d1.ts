type D1Db = any;

export const DEFAULT_WORKSPACE_ID = "workspace_mkb_weddings";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function json<T = Record<string, unknown>>(value: unknown, fallback: T): T {
  try {
    if (typeof value === "string") return JSON.parse(value) as T;
    return (value ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function colour(value: unknown, fallback: string) {
  const candidate = text(value);
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : fallback;
}


const DEFAULT_SUPPLIER_CATEGORIES = [
  "Photography", "Videography & Content", "Planning & Coordination", "Venue & Catering",
  "Floristry", "Hair & Beauty", "Attire", "Jewellery & Accessories", "Cake & Confectionery",
  "Music & Entertainment", "Ceremony", "Styling & Décor", "Stationery & Signage",
  "Transport", "Hire & Production", "Favours & Gifts", "Other",
];

const DEFAULT_SUPPLIER_ROLES = [
  ["Photographer", "Photography"], ["Second Photographer", "Photography"], ["Photo Booth", "Photography"],
  ["Videographer", "Videography & Content"], ["Content Creator", "Videography & Content"],
  ["Wedding Planner", "Planning & Coordination"], ["Wedding Coordinator", "Planning & Coordination"],
  ["Venue", "Venue & Catering"], ["Caterer", "Venue & Catering"], ["Bar Service", "Venue & Catering"],
  ["Florist", "Floristry"], ["Hair Stylist", "Hair & Beauty"], ["Makeup Artist", "Hair & Beauty"], ["Barber", "Hair & Beauty"],
  ["Bridal Boutique", "Attire"], ["Dress Designer", "Attire"], ["Seamstress", "Attire"], ["Menswear", "Attire"],
  ["Jeweller", "Jewellery & Accessories"], ["Accessories", "Jewellery & Accessories"],
  ["Wedding Cake", "Cake & Confectionery"], ["Dessert Supplier", "Cake & Confectionery"],
  ["Band", "Music & Entertainment"], ["DJ", "Music & Entertainment"], ["Ceremony Musician", "Music & Entertainment"],
  ["Solo Musician", "Music & Entertainment"], ["Entertainment", "Music & Entertainment"],
  ["Celebrant", "Ceremony"], ["Officiant", "Ceremony"],
  ["Venue Stylist", "Styling & Décor"], ["Décor Hire", "Styling & Décor"], ["Lighting", "Styling & Décor"],
  ["Stationer", "Stationery & Signage"], ["Signage", "Stationery & Signage"],
  ["Wedding Transport", "Transport"], ["Equipment Hire", "Hire & Production"], ["Production", "Hire & Production"],
  ["Favours", "Favours & Gifts"], ["Wedding Gifts", "Favours & Gifts"], ["Other Supplier", "Other"],
].map(([name, category]) => ({ name, category }));

function taxonomyKey(value: unknown) {
  return text(value).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function uniqueTaxonomyNames(values: unknown, fallback: string[]) {
  const source = Array.isArray(values) && values.length ? values : fallback;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of source) {
    const name = text(value);
    const key = taxonomyKey(name);
    if (!name || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(name.slice(0, 80));
  }
  return result.length ? result : [...fallback];
}

function supplierTaxonomy(document: any) {
  const incoming = document?.supplierTaxonomy && typeof document.supplierTaxonomy === "object" ? document.supplierTaxonomy : {};
  const categories = uniqueTaxonomyNames(incoming.categories, DEFAULT_SUPPLIER_CATEGORIES);
  const categoryMap = new Map(categories.map((category) => [taxonomyKey(category), category]));
  const fallbackCategory = categories[0] || "Other";
  const sourceRoles = Array.isArray(incoming.roles) && incoming.roles.length ? incoming.roles : DEFAULT_SUPPLIER_ROLES;
  const seen = new Set<string>();
  const roles: Array<{ name: string; category: string }> = [];
  for (const item of sourceRoles) {
    const name = text(item?.name);
    const key = taxonomyKey(name);
    if (!name || !key || seen.has(key)) continue;
    const category = categoryMap.get(taxonomyKey(item?.category)) || fallbackCategory;
    roles.push({ name: name.slice(0, 80), category });
    seen.add(key);
  }
  if (!roles.length) roles.push({ name: "Other Supplier", category: fallbackCategory });
  return { categories, roles };
}

function httpError(message: string, statusCode = 400, details: string[] = []) {
  const error = new Error(message) as Error & { statusCode?: number; details?: string[] };
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function hydrate(workspace: any, settings: any, domains: any[]) {
  const document = json<any>(settings?.document_json, {});
  const portal = document?.portal && typeof document.portal === "object" ? document.portal : {};
  const taxonomy = supplierTaxonomy(document);
  return {
    id: text(workspace?.id),
    slug: text(workspace?.slug),
    name: text(workspace?.name),
    status: text(workspace?.status || "active"),
    plan: text(workspace?.plan || "internal"),
    settings: {
      businessName: text(settings?.business_name || workspace?.name),
      websiteUrl: text(settings?.website_url),
      adminHostname: text(settings?.admin_hostname),
      publicHostname: text(settings?.public_hostname),
      contactEmail: text(settings?.contact_email),
      phone: text(settings?.phone),
      instagram: text(settings?.instagram),
      logoUrl: text(settings?.logo_url),
      accentColor: colour(settings?.accent_color, "#111111"),
      portalBannerUrl: text(portal.bannerUrl),
      portalSecondaryColor: colour(portal.secondaryColor, "#f1efe9"),
      portalBackgroundColor: colour(portal.backgroundColor, "#f7f6f3"),
      portalWelcomeHeading: text(portal.welcomeHeading || "Welcome to your client portal"),
      portalWelcomeMessage: text(portal.welcomeMessage || "Everything for your booking is organised here in one secure place."),
      portalFooterText: text(portal.footerText),
      defaultCountry: text(settings?.default_country || "GB"),
      timezone: text(settings?.timezone || "Europe/London"),
      currency: text(settings?.currency || "GBP"),
      supplierCategories: taxonomy.categories,
      supplierRoles: taxonomy.roles,
    },
    domains: (domains || []).map((domain) => ({
      id: text(domain.id),
      hostname: text(domain.hostname),
      purpose: text(domain.purpose),
      verified: Number(domain.verified || 0) === 1,
    })),
    createdAt: workspace?.created_at || undefined,
    updatedAt: workspace?.updated_at || undefined,
  };
}

export async function getDefaultWorkspaceId(db: D1Db) {
  const row = await db.prepare(`SELECT value FROM schema_meta WHERE key = 'default_workspace_id'`).first();
  return text(row?.value) || DEFAULT_WORKSPACE_ID;
}

export async function getWorkspace(db: D1Db, id?: string) {
  const workspaceId = text(id) || (await getDefaultWorkspaceId(db));
  const workspace = await db.prepare(`SELECT * FROM workspaces WHERE id = ?`).bind(workspaceId).first();
  if (!workspace) return null;
  const settings = await db.prepare(`SELECT * FROM workspace_settings WHERE workspace_id = ?`).bind(workspaceId).first();
  const domains = await db.prepare(`SELECT * FROM workspace_domains WHERE workspace_id = ? ORDER BY purpose, hostname`).bind(workspaceId).all();
  return hydrate(workspace, settings || {}, domains.results || []);
}

export async function updateWorkspaceSettings(db: D1Db, incoming: any) {
  const workspaceId = text(incoming?.id) || (await getDefaultWorkspaceId(db));
  const existing = await getWorkspace(db, workspaceId);
  if (!existing) throw httpError("Workspace not found.", 404);

  const settings = incoming?.settings || incoming || {};
  const name = text(incoming?.name) || existing.name;
  const existingSettingsRow = await db.prepare(`SELECT document_json FROM workspace_settings WHERE workspace_id = ? LIMIT 1`).bind(workspaceId).first();
  const document = json<any>(existingSettingsRow?.document_json, {});
  const existingPortal = document?.portal && typeof document.portal === "object" ? document.portal : {};
  const supplied = (key: string) => Object.prototype.hasOwnProperty.call(settings, key);
  const portalDocument = {
    ...existingPortal,
    bannerUrl: supplied("portalBannerUrl") ? text(settings.portalBannerUrl) : text(existingPortal.bannerUrl),
    secondaryColor: supplied("portalSecondaryColor") ? colour(settings.portalSecondaryColor, "#f1efe9") : colour(existingPortal.secondaryColor, "#f1efe9"),
    backgroundColor: supplied("portalBackgroundColor") ? colour(settings.portalBackgroundColor, "#f7f6f3") : colour(existingPortal.backgroundColor, "#f7f6f3"),
    welcomeHeading: supplied("portalWelcomeHeading") ? text(settings.portalWelcomeHeading || "Welcome to your client portal") : text(existingPortal.welcomeHeading || "Welcome to your client portal"),
    welcomeMessage: supplied("portalWelcomeMessage") ? text(settings.portalWelcomeMessage || "Everything for your booking is organised here in one secure place.") : text(existingPortal.welcomeMessage || "Everything for your booking is organised here in one secure place."),
    footerText: supplied("portalFooterText") ? text(settings.portalFooterText) : text(existingPortal.footerText),
  };
  const existingTaxonomy = supplierTaxonomy(document);
  const suppliedTaxonomy = supplied("supplierCategories") || supplied("supplierRoles");
  const taxonomyDocument = suppliedTaxonomy
    ? supplierTaxonomy({ supplierTaxonomy: {
        categories: supplied("supplierCategories") ? settings.supplierCategories : existingTaxonomy.categories,
        roles: supplied("supplierRoles") ? settings.supplierRoles : existingTaxonomy.roles,
      } })
    : existingTaxonomy;
  const nextDocument = { ...document, portal: portalDocument } as any;
  nextDocument.supplierTaxonomy = taxonomyDocument;
  const websiteUrl = text(settings.websiteUrl);
  if (websiteUrl && !/^https?:\/\//i.test(websiteUrl)) {
    throw httpError("Workspace validation failed.", 400, ["Website URL must begin with http:// or https://."]);
  }

  await db.prepare(`
    UPDATE workspaces
    SET name = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(name, workspaceId).run();

  await db.prepare(`
    INSERT INTO workspace_settings (
      workspace_id, business_name, website_url, admin_hostname, public_hostname,
      contact_email, phone, instagram, logo_url, accent_color,
      default_country, timezone, currency, document_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(workspace_id) DO UPDATE SET
      business_name = excluded.business_name,
      website_url = excluded.website_url,
      admin_hostname = excluded.admin_hostname,
      public_hostname = excluded.public_hostname,
      contact_email = excluded.contact_email,
      phone = excluded.phone,
      instagram = excluded.instagram,
      logo_url = excluded.logo_url,
      accent_color = excluded.accent_color,
      default_country = excluded.default_country,
      timezone = excluded.timezone,
      currency = excluded.currency,
      document_json = excluded.document_json,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    workspaceId,
    text(settings.businessName) || name,
    websiteUrl,
    text(settings.adminHostname),
    text(settings.publicHostname),
    text(settings.contactEmail),
    text(settings.phone),
    text(settings.instagram).replace(/^@/, ""),
    text(settings.logoUrl),
    colour(settings.accentColor, existing.settings.accentColor || "#111111"),
    text(settings.defaultCountry) || "GB",
    text(settings.timezone) || "Europe/London",
    text(settings.currency) || "GBP",
    JSON.stringify(nextDocument),
  ).run();

  return getWorkspace(db, workspaceId);
}
