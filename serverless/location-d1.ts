type D1Db = any;

export const DEFAULT_LOCATION_WORKSPACE_ID = "workspace_mkb_weddings";

function text(value: unknown) {
  return String(value ?? "").trim();
}

function bool(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || Number(value) === 1 || String(value).toLowerCase() === "true";
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJson(value: unknown, fallback: any = {}) {
  try {
    return JSON.parse(String(value || ""));
  } catch {
    return fallback;
  }
}

function slugify(value: unknown) {
  return text(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function cleanBasePath(value: unknown) {
  const raw = text(value) || "/gallery/locations";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash;
}

function httpError(message: string, statusCode = 400, details: string[] = []) {
  const error = new Error(message) as Error & { statusCode?: number; details?: string[] };
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

const DEFAULT_SETTINGS = {
  enabled: true,
  landingTitle: "Explore by Location",
  galleryTitle: "Wedding Photography by Location",
  cardDescription: "Browse wedding galleries by location",
  singularLabel: "Location",
  pluralLabel: "Locations",
  groupingLevel: "custom",
  publicBasePath: "/gallery/locations",
  intro: "",
  seoTitle: "",
  seoDescription: "",
  heroImageUrl: "",
  publicOrigin: "https://www.mkbweddings.co.uk",
};

const DEFAULT_LOCATION_TYPES = [
  { key: "county", label: "County", pluralLabel: "Counties", sortOrder: 10 },
  { key: "region", label: "Region", pluralLabel: "Regions", sortOrder: 20 },
  { key: "state", label: "State / Province", pluralLabel: "States / Provinces", sortOrder: 30 },
  { key: "country", label: "Country", pluralLabel: "Countries", sortOrder: 40 },
  { key: "city", label: "City / Town", pluralLabel: "Cities / Towns", sortOrder: 50 },
  { key: "destination", label: "Destination", pluralLabel: "Destinations", sortOrder: 60 },
  { key: "custom", label: "Custom area", pluralLabel: "Custom areas", sortOrder: 70 },
];

function hydrateLocationType(row: any) {
  return {
    id: text(row?.id),
    workspaceId: text(row?.workspace_id),
    key: text(row?.type_key),
    label: text(row?.label),
    pluralLabel: text(row?.plural_label),
    enabled: Number(row?.enabled || 0) === 1,
    galleryEligible: Number(row?.gallery_eligible || 0) === 1,
    sortOrder: number(row?.sort_order),
    system: Number(row?.system || 0) === 1,
  };
}

export async function loadLocationTypes(
  db: D1Db,
  workspaceId = DEFAULT_LOCATION_WORKSPACE_ID,
) {
  const result = await db.prepare(`
    SELECT *
    FROM location_types
    WHERE workspace_id = ?
    ORDER BY sort_order ASC, label COLLATE NOCASE ASC
  `).bind(workspaceId).all();

  const rows = result.results || [];
  if (rows.length) return rows.map(hydrateLocationType);

  return DEFAULT_LOCATION_TYPES.map((type, index) => ({
    id: `location_type_${workspaceId}_${type.key}`,
    workspaceId,
    key: type.key,
    label: type.label,
    pluralLabel: type.pluralLabel,
    enabled: true,
    galleryEligible: type.key === "county",
    sortOrder: type.sortOrder || (index + 1) * 10,
    system: true,
  }));
}

async function getWorkspacePublicOrigin(db: D1Db, workspaceId: string) {
  const row = await db.prepare(`
    SELECT website_url, public_hostname
    FROM workspace_settings
    WHERE workspace_id = ?
    LIMIT 1
  `).bind(workspaceId).first();

  const website = text(row?.website_url).replace(/\/+$/, "");
  if (/^https?:\/\//i.test(website)) return website;
  const hostname = text(row?.public_hostname);
  return hostname ? `https://${hostname}` : DEFAULT_SETTINGS.publicOrigin;
}

export async function loadLocationGallerySettings(
  db: D1Db,
  workspaceId = DEFAULT_LOCATION_WORKSPACE_ID,
) {
  const row = await db.prepare(`
    SELECT *
    FROM location_gallery_settings
    WHERE workspace_id = ?
    LIMIT 1
  `).bind(workspaceId).first();

  return {
    enabled: row ? Number(row.enabled || 0) === 1 : DEFAULT_SETTINGS.enabled,
    landingTitle: text(row?.landing_title) || DEFAULT_SETTINGS.landingTitle,
    galleryTitle: text(row?.gallery_title) || DEFAULT_SETTINGS.galleryTitle,
    cardDescription: text(row?.card_description) || DEFAULT_SETTINGS.cardDescription,
    singularLabel: text(row?.singular_label) || DEFAULT_SETTINGS.singularLabel,
    pluralLabel: text(row?.plural_label) || DEFAULT_SETTINGS.pluralLabel,
    groupingLevel: text(row?.grouping_level) || DEFAULT_SETTINGS.groupingLevel,
    publicBasePath: cleanBasePath(row?.public_base_path || DEFAULT_SETTINGS.publicBasePath),
    intro: text(row?.intro),
    seoTitle: text(row?.seo_title),
    seoDescription: text(row?.seo_description),
    heroImageUrl: text(row?.hero_image_url),
    publicOrigin: await getWorkspacePublicOrigin(db, workspaceId),
  };
}

function hydrateLocation(row: any, venueSlugs: string[] = []) {
  const doc = parseJson(row?.document_json, {});
  return {
    id: text(row?.id),
    workspaceId: text(row?.workspace_id),
    slug: text(row?.slug),
    name: text(row?.name) || text(doc?.county) || text(doc?.name),
    areaType: text(row?.area_type) || "custom",
    parentId: text(row?.parent_id),
    country: text(row?.country) || text(doc?.country),
    countryCode: text(row?.country_code) || text(doc?.countryCode),
    region: text(row?.region),
    status: row?.status === "archived" ? "archived" : "active",
    showOnLanding: Number(row?.show_on_landing || 0) === 1,
    sortOrder: number(row?.sort_order),
    heroImageUrl:
      text(row?.hero_image_url) || text(doc?.heroImageUrl) || text(doc?.heroThumbUrl),
    seoTitle: text(row?.seo_title) || text(doc?.seoTitle),
    seoDescription: text(row?.seo_description) || text(doc?.seoDescription),
    intro: text(row?.intro) || text(doc?.intro),
    primaryKeyword: text(doc?.primaryKeyword),
    secondaryKeywords: Array.isArray(doc?.secondaryKeywords) ? doc.secondaryKeywords : [],
    whySection: text(doc?.whySection),
    travelSection: text(doc?.travelSection),
    faqs: Array.isArray(doc?.faqs) ? doc.faqs : [],
    venueSlugs,
  };
}

export async function listLocationConfiguration(
  db: D1Db,
  workspaceId = DEFAULT_LOCATION_WORKSPACE_ID,
) {
  const [settings, types, areaResult, linkResult, venueResult] = await Promise.all([
    loadLocationGallerySettings(db, workspaceId),
    loadLocationTypes(db, workspaceId),
    db.prepare(`
      SELECT *
      FROM location_areas
      WHERE workspace_id = ?
      ORDER BY sort_order ASC, name COLLATE NOCASE ASC
    `).bind(workspaceId).all(),
    db.prepare(`
      SELECT links.location_id, links.venue_slug
      FROM venue_location_links links
      JOIN location_areas location ON location.id = links.location_id
      WHERE location.workspace_id = ?
      ORDER BY links.sort_order ASC, links.venue_slug ASC
    `).bind(workspaceId).all(),
    db.prepare(`
      SELECT slug, name, town, county, country, status
      FROM venues
      WHERE workspace_id = ? AND status <> 'archived'
      ORDER BY name COLLATE NOCASE ASC
    `).bind(workspaceId).all(),
  ]);

  const links = new Map<string, string[]>();
  for (const row of linkResult.results || []) {
    const id = text((row as any).location_id);
    const slug = text((row as any).venue_slug);
    if (!id || !slug) continue;
    links.set(id, [...(links.get(id) || []), slug]);
  }

  return {
    settings,
    types,
    locations: (areaResult.results || []).map((row: any) =>
      hydrateLocation(row, links.get(text(row.id)) || []),
    ),
    venues: (venueResult.results || []).map((row: any) => ({
      slug: text(row.slug),
      name: text(row.name),
      town: text(row.town),
      county: text(row.county),
      country: text(row.country),
      status: text(row.status),
    })),
  };
}

async function runBatches(db: D1Db, statements: any[], size = 50) {
  for (let index = 0; index < statements.length; index += size) {
    await db.batch(statements.slice(index, index + size));
  }
}

function cleanLocation(incoming: any, index: number) {
  const name = text(incoming?.name);
  const slug = slugify(incoming?.slug || name);
  if (!name) throw httpError("Location validation failed.", 400, ["Every location needs a name."]);
  if (!slug) throw httpError("Location validation failed.", 400, [`${name} needs a valid slug.`]);

  return {
    id: text(incoming?.id) || `location_${crypto.randomUUID()}`,
    slug,
    name,
    areaType: text(incoming?.areaType) || "custom",
    parentId: text(incoming?.parentId),
    country: text(incoming?.country),
    countryCode: text(incoming?.countryCode).toUpperCase(),
    region: text(incoming?.region),
    status: incoming?.status === "archived" ? "archived" : "active",
    showOnLanding: bool(incoming?.showOnLanding, true),
    sortOrder: number(incoming?.sortOrder, index + 1),
    heroImageUrl: text(incoming?.heroImageUrl),
    seoTitle: text(incoming?.seoTitle),
    seoDescription: text(incoming?.seoDescription),
    intro: text(incoming?.intro),
    venueSlugs: [...new Set((Array.isArray(incoming?.venueSlugs) ? incoming.venueSlugs : [])
      .map((value: unknown) => text(value))
      .filter(Boolean))],
  };
}

export async function saveLocationConfiguration(
  db: D1Db,
  incoming: any,
  workspaceId = DEFAULT_LOCATION_WORKSPACE_ID,
) {
  const current = await listLocationConfiguration(db, workspaceId);

  if (incoming?.settings) {
    const settingsInput = incoming.settings;
    const settings = {
      ...current.settings,
      enabled: bool(settingsInput.enabled, current.settings.enabled),
      landingTitle: text(settingsInput.landingTitle) || current.settings.landingTitle,
      galleryTitle: text(settingsInput.galleryTitle) || current.settings.galleryTitle,
      cardDescription: text(settingsInput.cardDescription) || current.settings.cardDescription,
      singularLabel: text(settingsInput.singularLabel) || current.settings.singularLabel,
      pluralLabel: text(settingsInput.pluralLabel) || current.settings.pluralLabel,
      groupingLevel: text(settingsInput.groupingLevel) || current.settings.groupingLevel,
      publicBasePath: cleanBasePath(settingsInput.publicBasePath || current.settings.publicBasePath),
      intro: text(settingsInput.intro),
      seoTitle: text(settingsInput.seoTitle),
      seoDescription: text(settingsInput.seoDescription),
      heroImageUrl: text(settingsInput.heroImageUrl),
    };

    const validGallerySource = current.types.some(
      (type: any) => type.key === settings.groupingLevel && type.enabled && type.galleryEligible,
    );
    if (!validGallerySource) {
      throw httpError(
        "Location Gallery validation failed.",
        400,
        ["The selected location type is not enabled as a gallery source."],
      );
    }

    await db.prepare(`
      INSERT INTO location_gallery_settings (
        workspace_id, enabled, landing_title, gallery_title, card_description,
        singular_label, plural_label, grouping_level, public_base_path,
        intro, seo_title, seo_description, hero_image_url, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(workspace_id) DO UPDATE SET
        enabled = excluded.enabled,
        landing_title = excluded.landing_title,
        gallery_title = excluded.gallery_title,
        card_description = excluded.card_description,
        singular_label = excluded.singular_label,
        plural_label = excluded.plural_label,
        grouping_level = excluded.grouping_level,
        public_base_path = excluded.public_base_path,
        intro = excluded.intro,
        seo_title = excluded.seo_title,
        seo_description = excluded.seo_description,
        hero_image_url = excluded.hero_image_url,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      workspaceId,
      settings.enabled ? 1 : 0,
      settings.landingTitle,
      settings.galleryTitle,
      settings.cardDescription,
      settings.singularLabel,
      settings.pluralLabel,
      settings.groupingLevel,
      settings.publicBasePath,
      settings.intro,
      settings.seoTitle,
      settings.seoDescription,
      settings.heroImageUrl,
    ).run();
  }

  if (Array.isArray(incoming?.types)) {
    const cleanedTypes = incoming.types.map((incomingType: any, index: number) => {
      const label = text(incomingType?.label);
      const key = slugify(incomingType?.key || label);
      if (!label || !key) {
        throw httpError("Location type validation failed.", 400, ["Every location type needs a label and key."]);
      }
      return {
        id: text(incomingType?.id) || `location_type_${crypto.randomUUID()}`,
        key,
        label,
        pluralLabel: text(incomingType?.pluralLabel) || `${label}s`,
        enabled: bool(incomingType?.enabled, true),
        galleryEligible: bool(incomingType?.galleryEligible, false),
        sortOrder: number(incomingType?.sortOrder, (index + 1) * 10),
        system: bool(incomingType?.system, false),
      };
    });
    const keys = new Set<string>();
    for (const type of cleanedTypes) {
      if (keys.has(type.key)) {
        throw httpError("Location type validation failed.", 400, [`Duplicate location type key: ${type.key}`]);
      }
      keys.add(type.key);
    }
    if (current.settings.enabled) {
      const activeGalleryType = cleanedTypes.find(
        (type: any) => type.key === current.settings.groupingLevel,
      );
      if (activeGalleryType && (!activeGalleryType.enabled || !activeGalleryType.galleryEligible)) {
        throw httpError(
          "Location type validation failed.",
          400,
          ["Change or disable the current Location Gallery source in Gallery Management before disabling this type for galleries."],
        );
      }
    }
    await runBatches(db, cleanedTypes.map((type: any) => db.prepare(`
      INSERT INTO location_types (
        id, workspace_id, type_key, label, plural_label, enabled,
        gallery_eligible, sort_order, system, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        type_key = excluded.type_key,
        label = excluded.label,
        plural_label = excluded.plural_label,
        enabled = excluded.enabled,
        gallery_eligible = excluded.gallery_eligible,
        sort_order = excluded.sort_order,
        updated_at = CURRENT_TIMESTAMP
      WHERE location_types.workspace_id = excluded.workspace_id
    `).bind(
      type.id, workspaceId, type.key, type.label, type.pluralLabel,
      type.enabled ? 1 : 0, type.galleryEligible ? 1 : 0, type.sortOrder, type.system ? 1 : 0,
    )));
  }

  if (Array.isArray(incoming?.locations)) {
    const cleaned = incoming.locations.map(cleanLocation);
    const slugs = new Set<string>();
    for (const location of cleaned) {
      if (slugs.has(location.slug)) {
        throw httpError("Location validation failed.", 400, [`Duplicate slug: ${location.slug}`]);
      }
      slugs.add(location.slug);
    }

    const statements: any[] = [];
    for (const location of cleaned) {
      statements.push(
        db.prepare(`
          INSERT INTO location_areas (
            id, workspace_id, slug, name, area_type, parent_id, country, country_code,
            region, status, show_on_landing, sort_order, hero_image_url,
            seo_title, seo_description, intro, document_json, updated_at
          ) VALUES (?, ?, ?, ?, ?, NULLIF(?, ''), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            COALESCE((SELECT document_json FROM location_areas WHERE id = ? AND workspace_id = ?), '{}'), CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            slug = excluded.slug,
            name = excluded.name,
            area_type = excluded.area_type,
            parent_id = excluded.parent_id,
            country = excluded.country,
            country_code = excluded.country_code,
            region = excluded.region,
            status = excluded.status,
            show_on_landing = excluded.show_on_landing,
            sort_order = excluded.sort_order,
            hero_image_url = excluded.hero_image_url,
            seo_title = excluded.seo_title,
            seo_description = excluded.seo_description,
            intro = excluded.intro,
            updated_at = CURRENT_TIMESTAMP
          WHERE location_areas.workspace_id = excluded.workspace_id
        `).bind(
          location.id,
          workspaceId,
          location.slug,
          location.name,
          location.areaType,
          location.parentId,
          location.country,
          location.countryCode,
          location.region,
          location.status,
          location.showOnLanding ? 1 : 0,
          location.sortOrder,
          location.heroImageUrl,
          location.seoTitle,
          location.seoDescription,
          location.intro,
          location.id,
          workspaceId,
        ),
      );
      statements.push(
        db.prepare(`
          DELETE FROM venue_location_links
          WHERE location_id = ?
            AND EXISTS (SELECT 1 FROM location_areas WHERE id = ? AND workspace_id = ?)
        `).bind(location.id, location.id, workspaceId),
      );
      location.venueSlugs.forEach((venueSlug, venueIndex) => {
        statements.push(
          db.prepare(`
            INSERT OR IGNORE INTO venue_location_links (
              location_id, venue_slug, sort_order, primary_location
            )
            SELECT ?, ?, ?, ?
            WHERE EXISTS (SELECT 1 FROM location_areas WHERE id = ? AND workspace_id = ?)
              AND EXISTS (SELECT 1 FROM venues WHERE slug = ? AND workspace_id = ?)
          `).bind(
            location.id,
            venueSlug,
            venueIndex + 1,
            venueIndex === 0 ? 1 : 0,
            location.id,
            workspaceId,
            venueSlug,
            workspaceId,
          ),
        );
      });
    }
    await runBatches(db, statements);
  }

  return listLocationConfiguration(db, workspaceId);
}

function venueMatchesArea(venue: any, area: any) {
  const target = text(area.name).toLowerCase();
  if (!target) return false;
  switch (text(area.area_type).toLowerCase()) {
    case "county":
      return text(venue.county).toLowerCase() === target;
    case "country":
      return text(venue.country).toLowerCase() === target;
    case "city":
    case "town":
      return text(venue.town).toLowerCase() === target;
    default:
      return false;
  }
}

function publicArea(row: any, venues: any[]) {
  const hydrated = hydrateLocation(row);
  return {
    ...hydrated,
    venueCount: venues.length,
    venues: venues.map((venue: any) => ({
      venueSlug: text(venue.slug),
      venueName: text(venue.name),
      town: text(venue.town),
      county: text(venue.county),
      country: text(venue.country),
      url: `/gallery/venue/${encodeURIComponent(text(venue.slug))}`,
    })),
  };
}

export async function listPublicLocations(
  db: D1Db,
  workspaceId = DEFAULT_LOCATION_WORKSPACE_ID,
) {
  const settings = await loadLocationGallerySettings(db, workspaceId);
  if (!settings.enabled) return { ok: true, settings, locations: [] };

  const [areaResult, venueResult, linkResult] = await Promise.all([
    db.prepare(`
      SELECT * FROM location_areas
      WHERE workspace_id = ? AND area_type = ? AND status = 'active' AND show_on_landing = 1
      ORDER BY sort_order ASC, name COLLATE NOCASE ASC
    `).bind(workspaceId, settings.groupingLevel).all(),
    db.prepare(`
      SELECT slug, name, town, county, country, gallery_sort_order
      FROM venues
      WHERE workspace_id = ? AND status = 'published' AND gallery_visible = 1
      ORDER BY gallery_sort_order ASC, name COLLATE NOCASE ASC
    `).bind(workspaceId).all(),
    db.prepare(`
      SELECT links.location_id, links.venue_slug
      FROM venue_location_links links
      JOIN location_areas location ON location.id = links.location_id
      WHERE location.workspace_id = ?
    `).bind(workspaceId).all(),
  ]);

  const venues = venueResult.results || [];
  const manualLinks = new Map<string, Set<string>>();
  for (const row of linkResult.results || []) {
    const id = text((row as any).location_id);
    const slug = text((row as any).venue_slug);
    if (!id || !slug) continue;
    if (!manualLinks.has(id)) manualLinks.set(id, new Set());
    manualLinks.get(id)!.add(slug);
  }

  const locations = (areaResult.results || []).map((area: any) => {
    const explicit = manualLinks.get(text(area.id)) || new Set<string>();
    const matched = venues.filter(
      (venue: any) => explicit.has(text(venue.slug)) || venueMatchesArea(venue, area),
    );
    return publicArea(area, matched);
  });

  return { ok: true, settings, locations };
}

export async function getPublicLocation(
  db: D1Db,
  slug: string,
  workspaceId = DEFAULT_LOCATION_WORKSPACE_ID,
) {
  const cleanSlug = slugify(slug);
  const settings = await loadLocationGallerySettings(db, workspaceId);
  if (!settings.enabled) return null;
  const area = await db.prepare(`
    SELECT * FROM location_areas
    WHERE workspace_id = ? AND area_type = ? AND slug = ? AND status = 'active'
    LIMIT 1
  `).bind(workspaceId, settings.groupingLevel, cleanSlug).first();
  if (!area) return null;

  const [venueResult, linkResult] = await Promise.all([
    db.prepare(`
      SELECT slug, name, town, county, country, gallery_sort_order
      FROM venues
      WHERE workspace_id = ? AND status = 'published' AND gallery_visible = 1
      ORDER BY gallery_sort_order ASC, name COLLATE NOCASE ASC
    `).bind(workspaceId).all(),
    db.prepare(`SELECT venue_slug FROM venue_location_links WHERE location_id = ?`).bind(area.id).all(),
  ]);
  const explicit = new Set((linkResult.results || []).map((row: any) => text(row.venue_slug)));
  const venues = (venueResult.results || []).filter(
    (venue: any) => explicit.has(text(venue.slug)) || venueMatchesArea(venue, area),
  );

  return { ok: true, settings, location: publicArea(area, venues) };
}
