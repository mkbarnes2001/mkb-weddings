import { getDefaultWorkspaceId, getWorkspace, updateWorkspaceSettings } from "./workspace-d1";

type D1Db = any;

type AuditInput = {
  eventType: string;
  entityType?: string;
  entityId?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
  actorEmail?: string;
};

const BUSINESS_TYPES = new Set(["sole_trader", "partnership", "limited_company", "charity", "other"]);
const MEMBER_ROLES = new Set(["owner", "admin", "manager", "content", "finance", "staff", "viewer"]);
const MEMBER_STATUSES = new Set(["active", "invited", "disabled"]);
const AREA_TYPES = new Set(["local", "city", "county", "region", "country", "destination", "remote", "custom"]);

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function intOrNull(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function boolInt(value: unknown) {
  return value === true || value === 1 || value === "1" ? 1 : 0;
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function httpError(message: string, statusCode = 400, details: string[] = []) {
  const error = new Error(message) as Error & { statusCode?: number; details?: string[] };
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function parseJson(value: unknown, fallback: Record<string, unknown> = {}) {
  try {
    const parsed = JSON.parse(text(value) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function hydrateBusiness(workspace: any, profile: any) {
  return {
    workspaceId: text(workspace?.id),
    workspaceSlug: text(workspace?.slug),
    workspaceName: text(workspace?.name),
    workspaceStatus: text(workspace?.status || "active"),
    plan: text(workspace?.plan || "internal"),
    publicName: text(profile?.public_name || workspace?.settings?.businessName || workspace?.name),
    legalName: text(profile?.legal_name),
    marketplaceSlug: text(profile?.marketplace_slug),
    businessType: text(profile?.business_type || "sole_trader"),
    summary: text(profile?.summary),
    yearEstablished: profile?.year_established == null ? null : Number(profile.year_established),
    registrationCountry: text(profile?.registration_country || workspace?.settings?.defaultCountry || "GB"),
    companyNumber: text(profile?.company_number),
    taxNumber: text(profile?.tax_number),
    onboardingStatus: text(profile?.onboarding_status || "foundation"),
    marketplaceStatus: text(profile?.marketplace_status || "private"),
    websiteUrl: text(workspace?.settings?.websiteUrl),
    contactEmail: text(workspace?.settings?.contactEmail),
    phone: text(workspace?.settings?.phone),
    instagram: text(workspace?.settings?.instagram),
    facebook: text(profile?.facebook),
    tiktok: text(profile?.tiktok),
    linkedin: text(profile?.linkedin),
    logoUrl: text(workspace?.settings?.logoUrl),
    coverUrl: text(profile?.cover_url),
    defaultCountry: text(workspace?.settings?.defaultCountry || "GB"),
    timezone: text(workspace?.settings?.timezone || "Europe/London"),
    currency: text(workspace?.settings?.currency || "GBP"),
  };
}

function hydrateCategory(row: any) {
  return {
    key: text(row.category_key),
    name: text(row.name),
    group: text(row.group_name),
    description: text(row.description),
    iconKey: text(row.icon_key),
    selected: Number(row.selected || 0) === 1,
    primary: Number(row.is_primary || 0) === 1,
  };
}

function hydrateServiceArea(row: any) {
  return {
    id: text(row.id),
    label: text(row.label),
    areaType: text(row.area_type),
    countryCode: text(row.country_code || "GB"),
    regionCode: text(row.region_code),
    radiusMiles: row.radius_miles == null ? null : Number(row.radius_miles),
    remoteAvailable: Number(row.remote_available || 0) === 1,
    sortOrder: Number(row.sort_order || 0),
    status: text(row.status || "active"),
  };
}

function hydrateMember(row: any) {
  return {
    id: text(row.id),
    userId: text(row.user_id),
    email: text(row.email),
    displayName: text(row.display_name),
    jobTitle: text(row.job_title),
    role: text(row.role),
    status: text(row.status),
    permissions: parseJson(row.permissions_json),
    invitedAt: row.invited_at || undefined,
    acceptedAt: row.accepted_at || undefined,
    lastActiveAt: row.last_active_at || undefined,
    invitationLastSentAt: row.invitation_last_sent_at || undefined,
  };
}

function hydrateEntitlement(row: any) {
  return {
    key: text(row.feature_key),
    name: text(row.name),
    description: text(row.description),
    unitLabel: text(row.unit_label),
    enabled: Number(row.enabled || 0) === 1,
    source: text(row.source),
    limit: row.limit_value == null ? null : Number(row.limit_value),
  };
}

async function audit(db: D1Db, workspaceId: string, input: AuditInput) {
  await db.prepare(`
    INSERT INTO platform_audit_events (
      id, workspace_id, actor_email, event_type, entity_type, entity_id,
      summary, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    id("audit"),
    workspaceId,
    lower(input.actorEmail),
    text(input.eventType),
    text(input.entityType),
    text(input.entityId),
    text(input.summary),
    JSON.stringify(input.metadata || {}),
  ).run();
}

export async function getPlatformFoundation(db: D1Db, workspaceIdInput?: string) {
  const workspaceId = text(workspaceIdInput) || (await getDefaultWorkspaceId(db));
  const workspace = await getWorkspace(db, workspaceId);
  if (!workspace) throw httpError("Business workspace not found.", 404);

  const [profile, categories, serviceAreas, members, entitlements, auditRows] = await Promise.all([
    db.prepare(`SELECT * FROM business_profiles WHERE workspace_id = ? LIMIT 1`).bind(workspaceId).first(),
    db.prepare(`
      SELECT pc.*,
             CASE WHEN bcl.workspace_id IS NULL THEN 0 ELSE 1 END AS selected,
             COALESCE(bcl.is_primary, 0) AS is_primary
      FROM platform_categories pc
      LEFT JOIN business_category_links bcl
        ON bcl.category_key = pc.category_key
       AND bcl.workspace_id = ?
       AND bcl.status = 'active'
      WHERE pc.status = 'active'
      ORDER BY pc.group_name, pc.sort_order, pc.name
    `).bind(workspaceId).all(),
    db.prepare(`
      SELECT * FROM business_service_areas
      WHERE workspace_id = ? AND status = 'active'
      ORDER BY sort_order, label
    `).bind(workspaceId).all(),
    db.prepare(`
      SELECT * FROM business_memberships
      WHERE workspace_id = ? AND status <> 'disabled'
      ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
               display_name, email
    `).bind(workspaceId).all(),
    db.prepare(`
      SELECT pf.feature_key, pf.name, pf.description, pf.unit_label,
             COALESCE(we.enabled, 0) AS enabled,
             COALESCE(we.source, 'plan') AS source,
             we.limit_value
      FROM platform_features pf
      LEFT JOIN workspace_entitlements we
        ON we.feature_key = pf.feature_key AND we.workspace_id = ?
      WHERE pf.status = 'active'
      ORDER BY pf.sort_order, pf.name
    `).bind(workspaceId).all(),
    db.prepare(`
      SELECT id, event_type, entity_type, entity_id, summary, created_at
      FROM platform_audit_events
      WHERE workspace_id = ?
      ORDER BY created_at DESC
      LIMIT 12
    `).bind(workspaceId).all(),
  ]);

  const scopeReadiness = [
    { key: "workspace", label: "Business and workspace identity", status: "scoped", detail: "Workspace-owned settings, domains and entitlements." },
    { key: "assets", label: "Asset Library", status: "scoped", detail: "Canonical assets and files are workspace-owned." },
    { key: "client-galleries", label: "Client Galleries", status: "scoped", detail: "Galleries, visitors, albums and selections are workspace-owned." },
    { key: "locations", label: "Location Intelligence", status: "scoped", detail: "Location types, areas and assignments are workspace-owned." },
    { key: "commerce", label: "Print Store and payments", status: "scoped", detail: "Catalogue, carts, orders, payments and fulfilment are workspace-owned." },
    { key: "weddings", label: "Weddings and stories", status: "migration", detail: "Legacy records still use global slugs and require controlled business scoping." },
    { key: "venues", label: "Venues", status: "migration", detail: "Legacy venue records still require business ownership migration." },
    { key: "suppliers", label: "Supplier records", status: "migration", detail: "Current supplier records are MKB operational data, not marketplace businesses." },
    { key: "galleries", label: "Moments and public galleries", status: "migration", detail: "Legacy gallery definitions require business ownership migration." },
    { key: "authentication", label: "Professional identity and sessions", status: "scoped", detail: "Passwordless sign-in, one-time invitations, business membership resolution and server-owned workspace context are available. Legacy modules remain restricted to MKB until their ownership migrations are complete." },
    { key: "connect", label: "Stripe Connect", status: "planned", detail: "Connected account onboarding follows business authentication and ownership enforcement." },
  ];

  return {
    schemaVersion: 24,
    brand: {
      name: "WedPlanned",
      primaryDomain: "wedplanned.com",
      ukDomain: "wedplanned.co.uk",
    },
    business: hydrateBusiness(workspace, profile || {}),
    categories: (categories.results || []).map(hydrateCategory),
    serviceAreas: (serviceAreas.results || []).map(hydrateServiceArea),
    members: (members.results || []).map(hydrateMember),
    entitlements: (entitlements.results || []).map(hydrateEntitlement),
    scopeReadiness,
    recentAudit: (auditRows.results || []).map((row: any) => ({
      id: text(row.id),
      eventType: text(row.event_type),
      entityType: text(row.entity_type),
      entityId: text(row.entity_id),
      summary: text(row.summary),
      createdAt: row.created_at,
    })),
  };
}

export async function updateBusinessProfile(db: D1Db, input: any) {
  const workspaceId = text(input?.workspaceId) || (await getDefaultWorkspaceId(db));
  const workspace = await getWorkspace(db, workspaceId);
  if (!workspace) throw httpError("Business workspace not found.", 404);

  const publicName = text(input?.publicName) || workspace.name;
  const legalName = text(input?.legalName);
  const marketplaceSlug = lower(input?.marketplaceSlug).replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  const businessType = text(input?.businessType) || "sole_trader";
  const registrationCountry = text(input?.registrationCountry || input?.defaultCountry || "GB").toUpperCase();
  const yearEstablished = intOrNull(input?.yearEstablished);

  const details: string[] = [];
  if (!BUSINESS_TYPES.has(businessType)) details.push("Choose a valid business type.");
  if (marketplaceSlug && marketplaceSlug.length < 3) details.push("Marketplace slug must contain at least three characters.");
  if (registrationCountry && !/^[A-Z]{2}$/.test(registrationCountry)) details.push("Registration country must use a two-letter code.");
  if (yearEstablished != null && (yearEstablished < 1800 || yearEstablished > new Date().getFullYear())) details.push("Year established is not valid.");
  if (details.length) throw httpError("Business profile validation failed.", 400, details);
  if (marketplaceSlug) {
    const duplicate = await db.prepare(`
      SELECT workspace_id FROM business_profiles
      WHERE marketplace_slug = ? AND workspace_id <> ?
      LIMIT 1
    `).bind(marketplaceSlug, workspaceId).first();
    if (duplicate) throw httpError("That marketplace slug is already in use.", 409);
  }

  await updateWorkspaceSettings(db, {
    id: workspaceId,
    name: publicName,
    settings: {
      ...workspace.settings,
      businessName: publicName,
      websiteUrl: text(input?.websiteUrl),
      contactEmail: lower(input?.contactEmail),
      phone: text(input?.phone),
      instagram: text(input?.instagram).replace(/^@/, ""),
      logoUrl: text(input?.logoUrl),
      defaultCountry: text(input?.defaultCountry || registrationCountry || "GB").toUpperCase(),
      timezone: text(input?.timezone || "Europe/London"),
      currency: text(input?.currency || "GBP").toUpperCase(),
    },
  });

  await db.prepare(`
    INSERT INTO business_profiles (
      workspace_id, public_name, legal_name, marketplace_slug, business_type,
      summary, year_established, registration_country, company_number, tax_number,
      facebook, tiktok, linkedin, cover_url, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(workspace_id) DO UPDATE SET
      public_name = excluded.public_name,
      legal_name = excluded.legal_name,
      marketplace_slug = excluded.marketplace_slug,
      business_type = excluded.business_type,
      summary = excluded.summary,
      year_established = excluded.year_established,
      registration_country = excluded.registration_country,
      company_number = excluded.company_number,
      tax_number = excluded.tax_number,
      facebook = excluded.facebook,
      tiktok = excluded.tiktok,
      linkedin = excluded.linkedin,
      cover_url = excluded.cover_url,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    workspaceId,
    publicName,
    legalName,
    marketplaceSlug,
    businessType,
    text(input?.summary),
    yearEstablished,
    registrationCountry,
    text(input?.companyNumber),
    text(input?.taxNumber),
    text(input?.facebook),
    text(input?.tiktok),
    text(input?.linkedin),
    text(input?.coverUrl),
  ).run();

  await audit(db, workspaceId, {
    eventType: "business.profile.updated",
    entityType: "business",
    entityId: workspaceId,
    summary: `Updated business profile for ${publicName}.`,
    actorEmail: input?.actorEmail,
  });
  return getPlatformFoundation(db, workspaceId);
}

export async function saveBusinessCategories(db: D1Db, input: any) {
  const workspaceId = text(input?.workspaceId) || (await getDefaultWorkspaceId(db));
  const keys: string[] = Array.from(new Set<string>((Array.isArray(input?.categoryKeys) ? input.categoryKeys : []).map(text).filter(Boolean)));
  const primaryKey = text(input?.primaryCategoryKey);
  if (!keys.length) throw httpError("Select at least one wedding-business category.");
  if (primaryKey && !keys.includes(primaryKey)) throw httpError("The primary category must also be selected.");

  const valid = await db.prepare(`
    SELECT category_key FROM platform_categories
    WHERE status = 'active' AND category_key IN (${keys.map(() => "?").join(",")})
  `).bind(...keys).all();
  const validKeys = new Set((valid.results || []).map((row: any) => text(row.category_key)));
  const invalid = keys.filter((key) => !validKeys.has(key));
  if (invalid.length) throw httpError("One or more categories are unavailable.", 400, invalid);

  const statements = [
    db.prepare(`DELETE FROM business_category_links WHERE workspace_id = ?`).bind(workspaceId),
    ...keys.map((key) => db.prepare(`
      INSERT INTO business_category_links (
        workspace_id, category_key, is_primary, status, updated_at
      ) VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)
    `).bind(workspaceId, key, key === (primaryKey || keys[0]) ? 1 : 0)),
  ];
  await db.batch(statements);
  await audit(db, workspaceId, {
    eventType: "business.categories.updated",
    entityType: "business",
    entityId: workspaceId,
    summary: `Updated ${keys.length} business categor${keys.length === 1 ? "y" : "ies"}.`,
    metadata: { categoryKeys: keys, primaryCategoryKey: primaryKey || keys[0] },
    actorEmail: input?.actorEmail,
  });
  return getPlatformFoundation(db, workspaceId);
}

export async function saveBusinessServiceArea(db: D1Db, input: any) {
  const workspaceId = text(input?.workspaceId) || (await getDefaultWorkspaceId(db));
  const areaId = text(input?.id) || id("service_area");
  const label = text(input?.label);
  const areaType = text(input?.areaType || "region");
  const countryCode = text(input?.countryCode || "GB").toUpperCase();
  const radiusMiles = intOrNull(input?.radiusMiles);
  const details: string[] = [];
  if (!label) details.push("Service-area label is required.");
  if (!AREA_TYPES.has(areaType)) details.push("Choose a valid service-area type.");
  if (!/^[A-Z]{2}$/.test(countryCode)) details.push("Country must use a two-letter code.");
  if (radiusMiles != null && (radiusMiles < 0 || radiusMiles > 10000)) details.push("Radius must be between 0 and 10,000 miles.");
  if (details.length) throw httpError("Service-area validation failed.", 400, details);

  if (text(input?.id)) {
    const result = await db.prepare(`
      UPDATE business_service_areas
      SET label = ?, area_type = ?, country_code = ?, region_code = ?,
          radius_miles = ?, remote_available = ?, sort_order = ?,
          status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND workspace_id = ?
    `).bind(
      label,
      areaType,
      countryCode,
      text(input?.regionCode),
      radiusMiles,
      boolInt(input?.remoteAvailable),
      intOrNull(input?.sortOrder) || 0,
      areaId,
      workspaceId,
    ).run();
    if (!Number(result.meta?.changes || 0)) throw httpError("Service area not found.", 404);
  } else {
    await db.prepare(`
      INSERT INTO business_service_areas (
        id, workspace_id, label, area_type, country_code, region_code,
        radius_miles, remote_available, sort_order, status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
    `).bind(
      areaId,
      workspaceId,
      label,
      areaType,
      countryCode,
      text(input?.regionCode),
      radiusMiles,
      boolInt(input?.remoteAvailable),
      intOrNull(input?.sortOrder) || 0,
    ).run();
  }
  await audit(db, workspaceId, {
    eventType: "business.service_area.saved",
    entityType: "service_area",
    entityId: areaId,
    summary: `Saved service area ${label}.`,
    actorEmail: input?.actorEmail,
  });
  return getPlatformFoundation(db, workspaceId);
}

export async function archiveBusinessServiceArea(db: D1Db, input: any) {
  const workspaceId = text(input?.workspaceId) || (await getDefaultWorkspaceId(db));
  const areaId = text(input?.id);
  if (!areaId) throw httpError("Service-area ID is required.");
  const result = await db.prepare(`
    UPDATE business_service_areas
    SET status = 'archived', updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workspace_id = ?
  `).bind(areaId, workspaceId).run();
  if (!Number(result.meta?.changes || 0)) throw httpError("Service area not found.", 404);
  await audit(db, workspaceId, {
    eventType: "business.service_area.archived",
    entityType: "service_area",
    entityId: areaId,
    summary: "Archived a business service area.",
    actorEmail: input?.actorEmail,
  });
  return getPlatformFoundation(db, workspaceId);
}

export async function inviteBusinessMember(db: D1Db, input: any) {
  const workspaceId = text(input?.workspaceId) || (await getDefaultWorkspaceId(db));
  const email = lower(input?.email);
  const displayName = text(input?.displayName);
  const role = text(input?.role || "staff");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw httpError("Enter a valid team-member email address.");
  if (!MEMBER_ROLES.has(role)) throw httpError("Choose a valid team role.");

  let user = await db.prepare(`SELECT id FROM platform_users WHERE email_normalized = ? LIMIT 1`).bind(email).first();
  const userId = text(user?.id) || id("user");
  await db.prepare(`
    INSERT INTO platform_users (
      id, email_normalized, email, display_name, platform_role, status, updated_at
    ) VALUES (?, ?, ?, ?, 'member', 'invited', CURRENT_TIMESTAMP)
    ON CONFLICT(email_normalized) DO UPDATE SET
      email = excluded.email,
      display_name = CASE WHEN trim(excluded.display_name) <> '' THEN excluded.display_name ELSE platform_users.display_name END,
      updated_at = CURRENT_TIMESTAMP
  `).bind(userId, email, email, displayName).run();

  const existing = await db.prepare(`
    SELECT id FROM business_memberships
    WHERE workspace_id = ? AND email_normalized = ? LIMIT 1
  `).bind(workspaceId, email).first();
  const membershipId = text(existing?.id) || id("membership");
  await db.prepare(`
    INSERT INTO business_memberships (
      id, workspace_id, user_id, email_normalized, email, display_name,
      job_title, role, status, invited_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'invited', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(workspace_id, email_normalized) DO UPDATE SET
      user_id = excluded.user_id,
      email = excluded.email,
      display_name = excluded.display_name,
      job_title = excluded.job_title,
      role = excluded.role,
      status = 'invited',
      invited_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    membershipId,
    workspaceId,
    userId,
    email,
    email,
    displayName,
    text(input?.jobTitle),
    role,
  ).run();
  await audit(db, workspaceId, {
    eventType: "business.member.invited",
    entityType: "membership",
    entityId: membershipId,
    summary: `Staged team invitation for ${email}.`,
    metadata: { role },
  });
  return getPlatformFoundation(db, workspaceId);
}

export async function updateBusinessMember(db: D1Db, input: any) {
  const workspaceId = text(input?.workspaceId) || (await getDefaultWorkspaceId(db));
  const membershipId = text(input?.id);
  const role = text(input?.role || "staff");
  const status = text(input?.status || "invited");
  if (!membershipId) throw httpError("Membership ID is required.");
  if (!MEMBER_ROLES.has(role)) throw httpError("Choose a valid team role.");
  if (!MEMBER_STATUSES.has(status)) throw httpError("Choose a valid membership status.");

  const result = await db.prepare(`
    UPDATE business_memberships
    SET display_name = ?, job_title = ?, role = ?, status = ?,
        accepted_at = CASE WHEN ? = 'active' AND accepted_at IS NULL THEN CURRENT_TIMESTAMP ELSE accepted_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workspace_id = ?
  `).bind(
    text(input?.displayName),
    text(input?.jobTitle),
    role,
    status,
    status,
    membershipId,
    workspaceId,
  ).run();
  if (!Number(result.meta?.changes || 0)) throw httpError("Team membership not found.", 404);
  await audit(db, workspaceId, {
    eventType: "business.member.updated",
    entityType: "membership",
    entityId: membershipId,
    summary: `Updated team membership (${role}, ${status}).`,
    actorEmail: input?.actorEmail,
  });
  return getPlatformFoundation(db, workspaceId);
}
