type D1Db = any;

type VenueGalleryItem = {
  assetId: string;
  imageId: string;
  weddingSlug: string;
  filename: string;
  order: number;
  included: boolean;
  hidden: boolean;
  rating: number;
  moments: string[];
  tags: string[];
  aiTags: string[];
  aiAlt: string;
  aiCaption: string;
  display: {
    venue: boolean;
    moments: boolean;
    blog: boolean;
    homepage: boolean;
    portfolio: boolean;
    creativeFlash?: boolean;
  };
  thumbSrc: string;
  fullSrc: string;
  source?: Record<string, unknown>;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

const LEGACY_PUBLIC_VENUE_ORDER = [
  "Orange Tree House",
  "Ballyscullion Park",
  "Tullyglass Hotel",
  "Killeavy Castle",
  "Slieve Donard Hotel",
  "Wool Tower",
  "Merchant",
  "Rabbit Hotel and Spa",
  "Leighinmohr House Hotel",
  "Beech Hill",
];

function sortGalleryVenues<T extends { name?: string; gallerySortOrder?: number }>(venues: T[]) {
  const hasSavedOrder = venues.some((venue) => Number(venue.gallerySortOrder || 0) > 0);

  if (hasSavedOrder) {
    return [...venues].sort((a, b) => {
      const aOrder = Number(a.gallerySortOrder || 0);
      const bOrder = Number(b.gallerySortOrder || 0);
      if (aOrder > 0 && bOrder <= 0) return -1;
      if (aOrder <= 0 && bOrder > 0) return 1;
      if (aOrder > 0 && bOrder > 0 && aOrder !== bOrder) return aOrder - bOrder;
      return text(a.name).localeCompare(text(b.name));
    });
  }

  const legacyOrder = new Map(
    LEGACY_PUBLIC_VENUE_ORDER.map((name, index) => [name.toLowerCase(), index]),
  );

  return [...venues].sort((a, b) => {
    const aOrder = legacyOrder.get(text(a.name).toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = legacyOrder.get(text(b.name).toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return text(a.name).localeCompare(text(b.name));
  });
}

function list(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => text(item)).filter(Boolean)
    : [];
}

function json(value: unknown, fallback: any) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value ?? fallback;
  } catch {
    return fallback;
  }
}

function slugIsSafe(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function adminApiEnabled(env: Record<string, unknown>) {
  const value = text(env.ADMIN_API_ENABLED).toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function adminApiRequestAllowed(env: Record<string, unknown>, request: Request) {
  if (!adminApiEnabled(env)) return false;

  const allowedHost = text(env.ADMIN_HOSTNAME || "admin.mkbweddings.co.uk").toLowerCase();
  if (!allowedHost) return false;

  // On a Pages custom domain, request.url normally contains the public hostname.
  // Cloudflare can also preserve the original hostname in Host/X-Forwarded-Host,
  // so accept any exact match rather than relying on one representation only.
  const candidates = new Set(
    [
      new URL(request.url).hostname,
      request.headers.get("host"),
      request.headers.get("x-forwarded-host"),
    ]
      .flatMap((value) => String(value || "").split(","))
      .map((value) => value.trim().toLowerCase().replace(/:\d+$/, ""))
      .filter(Boolean),
  );

  return candidates.has(allowedHost);
}

export function notFoundResponse() {
  return Response.json({ error: "Not found." }, { status: 404 });
}

export function errorResponse(error: unknown) {
  const typed = error as { statusCode?: number; details?: string[]; message?: string };
  return Response.json(
    {
      error: typed?.message || "Request failed.",
      ...(typed?.details?.length ? { details: typed.details } : {}),
    },
    { status: typed?.statusCode || 500 },
  );
}

function httpError(message: string, statusCode = 400, details: string[] = []) {
  const error = new Error(message) as Error & { statusCode?: number; details?: string[] };
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function cleanGalleryItem(item: any, index: number): VenueGalleryItem {
  return {
    assetId: text(item?.assetId),
    imageId: text(item?.imageId),
    weddingSlug: text(item?.weddingSlug),
    filename: text(item?.filename),
    order: Number(item?.order || index + 1),
    included: Boolean(item?.included),
    hidden: Boolean(item?.hidden),
    rating: Math.max(0, Math.min(5, Number(item?.rating || 0))),
    moments: list(item?.moments),
    tags: list(item?.tags),
    aiTags: list(item?.aiTags),
    aiAlt: text(item?.aiAlt),
    aiCaption: text(item?.aiCaption),
    display: {
      venue: Boolean(item?.display?.venue),
      moments: Boolean(item?.display?.moments),
      blog: Boolean(item?.display?.blog),
      homepage: Boolean(item?.display?.homepage),
      portfolio: Boolean(item?.display?.portfolio),
      creativeFlash: Boolean(item?.display?.creativeFlash),
    },
    thumbSrc: text(item?.thumbSrc),
    fullSrc: text(item?.fullSrc),
    ...(item?.source && typeof item.source === "object" ? { source: item.source } : {}),
  };
}

export function cleanVenue(incoming: any, existing: any = null) {
  const now = new Date().toISOString();
  const existingDoc = existing || {};
  const slug = text(incoming?.slug);
  const name = text(incoming?.name);

  if (!slugIsSafe(slug)) {
    throw httpError("Venue validation failed.", 400, [
      "slug is required and can contain lowercase letters, numbers and hyphens only.",
    ]);
  }
  if (!name) {
    throw httpError("Venue validation failed.", 400, ["name is required."]);
  }

  const galleryImages = Array.isArray(incoming?.gallery?.images)
    ? incoming.gallery.images.map(cleanGalleryItem)
    : [];

  return {
    schemaVersion: 1,
    id: text(existingDoc.id || incoming?.id) || `venue_${crypto.randomUUID()}`,
    slug,
    name,
    town: text(incoming?.town),
    county: text(incoming?.county),
    country: text(incoming?.country || existingDoc.country),
    intro: text(incoming?.intro),
    description: text(incoming?.description),
    heroImageId: text(incoming?.heroImageId),
    status:
      incoming?.status === "published" || incoming?.status === "archived"
        ? incoming.status
        : "draft",
    links: {
      website: text(incoming?.links?.website ?? incoming?.website),
      instagram: text(incoming?.links?.instagram ?? incoming?.instagram),
      facebook: text(incoming?.links?.facebook),
      googleMaps: text(incoming?.links?.googleMaps),
    },
    contact: {
      email: text(incoming?.contact?.email),
      phone: text(incoming?.contact?.phone),
      coordinatorName: text(incoming?.contact?.coordinatorName),
      coordinatorEmail: text(incoming?.contact?.coordinatorEmail),
    },
    practical: {
      address: text(incoming?.practical?.address),
      parking: text(incoming?.practical?.parking),
      accommodation: text(incoming?.practical?.accommodation),
      ceremonyTypes: text(incoming?.practical?.ceremonyTypes),
      capacity: text(incoming?.practical?.capacity),
      outdoorCeremony: Boolean(incoming?.practical?.outdoorCeremony),
    },
    notes: {
      general: text(incoming?.notes?.general),
      portraitLocations: text(incoming?.notes?.portraitLocations),
      rainBackup: text(incoming?.notes?.rainBackup),
      sunsetNotes: text(incoming?.notes?.sunsetNotes),
      restrictions: text(incoming?.notes?.restrictions),
    },
    seo: {
      title: text(incoming?.seo?.title),
      description: text(incoming?.seo?.description),
    },
    gallery: {
      schemaVersion: 1,
      updatedAt: text(incoming?.gallery?.updatedAt) || now,
      heroAssetId: text(incoming?.gallery?.heroAssetId || incoming?.heroImageId),
      images: galleryImages,
    },
    createdAt: text(existingDoc.createdAt) || now,
    updatedAt: now,
  };
}

function hydrateVenue(row: any) {
  const doc = json(row.document_json, {});
  const gallery = doc?.gallery || {};
  return {
    schemaVersion: 1,
    id: text(doc.id || row.id),
    slug: text(row.slug || doc.slug),
    name: text(row.name || doc.name),
    town: text(row.town || doc.town),
    county: text(row.county || doc.county),
    country: text(row.country || doc.country),
    intro: text(doc.intro),
    description: text(doc.description),
    heroImageId: text(doc.heroImageId || row.hero_asset_id),
    status: text(row.status || doc.status || "draft"),
    galleryVisible: row.gallery_visible === undefined ? true : Boolean(row.gallery_visible),
    gallerySortOrder: Number(row.gallery_sort_order || 0),
    links: {
      website: text(doc?.links?.website),
      instagram: text(doc?.links?.instagram),
      facebook: text(doc?.links?.facebook),
      googleMaps: text(doc?.links?.googleMaps),
    },
    contact: {
      email: text(doc?.contact?.email),
      phone: text(doc?.contact?.phone),
      coordinatorName: text(doc?.contact?.coordinatorName),
      coordinatorEmail: text(doc?.contact?.coordinatorEmail),
    },
    practical: {
      address: text(doc?.practical?.address),
      parking: text(doc?.practical?.parking),
      accommodation: text(doc?.practical?.accommodation),
      ceremonyTypes: text(doc?.practical?.ceremonyTypes),
      capacity: text(doc?.practical?.capacity),
      outdoorCeremony: Boolean(doc?.practical?.outdoorCeremony),
    },
    notes: {
      general: text(doc?.notes?.general),
      portraitLocations: text(doc?.notes?.portraitLocations),
      rainBackup: text(doc?.notes?.rainBackup),
      sunsetNotes: text(doc?.notes?.sunsetNotes),
      restrictions: text(doc?.notes?.restrictions),
    },
    seo: {
      title: text(row.seo_title || doc?.seo?.title),
      description: text(row.seo_description || doc?.seo?.description),
    },
    gallery: {
      schemaVersion: 1,
      updatedAt: text(gallery.updatedAt || row.updated_at),
      heroAssetId: text(gallery.heroAssetId || doc.heroImageId || row.hero_asset_id),
      images: Array.isArray(gallery.images) ? gallery.images.map(cleanGalleryItem) : [],
    },
    createdAt: text(doc.createdAt || row.updated_at),
    updatedAt: text(doc.updatedAt || row.updated_at),
  };
}

async function weddingSummaries(db: D1Db, workspaceId: string) {
  const result = await db.prepare(`
    SELECT
      w.slug, w.title, w.couple, w.venue, w.venue_slug, w.wedding_date, w.status,
      COUNT(i.asset_key) AS image_count
    FROM weddings w
    LEFT JOIN images i ON i.wedding_slug = w.slug AND i.workspace_id = w.workspace_id
    WHERE w.workspace_id = ?
    GROUP BY w.slug, w.title, w.couple, w.venue, w.venue_slug, w.wedding_date, w.status
  `).bind(workspaceId).all();
  return result.results || [];
}

function enrich(venue: any, weddings: any[]) {
  const venueName = text(venue.name).toLowerCase();
  const linked = weddings
    .filter((wedding) =>
      text(wedding.venue_slug) === venue.slug || text(wedding.venue).toLowerCase() === venueName,
    )
    .sort((a, b) => text(b.wedding_date).localeCompare(text(a.wedding_date)));

  return {
    ...venue,
    weddingCount: linked.length,
    publishedWeddingCount: linked.filter((wedding) => wedding.status === "published").length,
    imageCount: linked.reduce((sum, wedding) => sum + Number(wedding.image_count || 0), 0),
    lastWeddingDate: text(linked.find((wedding) => wedding.wedding_date)?.wedding_date),
    recentWeddings: linked.slice(0, 6).map((wedding) => ({
      slug: text(wedding.slug),
      title: text(wedding.title),
      couple: text(wedding.couple),
      weddingDate: text(wedding.wedding_date),
      status: text(wedding.status || "draft"),
    })),
  };
}

export async function listAdminVenues(db: D1Db, workspaceId = "workspace_mkb_weddings") {
  const [venueResult, weddings] = await Promise.all([
    db.prepare(`SELECT * FROM venues WHERE workspace_id = ?`).bind(workspaceId).all(),
    weddingSummaries(db, workspaceId),
  ]);
  const venues = (venueResult.results || [])
    .map(hydrateVenue)
    .map((venue: any) => enrich(venue, weddings));
  return sortGalleryVenues(venues);
}

export async function getAdminVenue(db: D1Db, slug: string, workspaceId = "workspace_mkb_weddings") {
  const row = await db.prepare(`SELECT * FROM venues WHERE slug = ? AND workspace_id = ?`).bind(slug, workspaceId).first();
  if (!row) return null;
  const weddings = await weddingSummaries(db, workspaceId);
  return enrich(hydrateVenue(row), weddings);
}

async function syncVenueImages(db: D1Db, venue: any, workspaceId: string, oldSlug?: string) {
  const statements: any[] = [];
  if (oldSlug && oldSlug !== venue.slug) {
    statements.push(db.prepare(`DELETE FROM venue_images WHERE venue_slug = ? AND workspace_id = ?`).bind(oldSlug, workspaceId));
  }
  statements.push(db.prepare(`DELETE FROM venue_images WHERE venue_slug = ? AND workspace_id = ?`).bind(venue.slug, workspaceId));
  for (const item of venue.gallery.images || []) {
    if (!item.assetId) continue;
    statements.push(
      db.prepare(`
        INSERT INTO venue_images (
          venue_slug, asset_key, sort_order, included, hidden, rating, is_hero,
          moments_json, display_json, workspace_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        venue.slug,
        item.assetId,
        Number(item.order || 0),
        item.included ? 1 : 0,
        item.hidden ? 1 : 0,
        Number(item.rating || 0),
        item.assetId === venue.gallery.heroAssetId ? 1 : 0,
        JSON.stringify(item.moments || []),
        JSON.stringify(item.display || {}),
        workspaceId,
      ),
    );
  }
  await db.batch(statements);
}

export async function createAdminVenue(db: D1Db, incoming: any, workspaceId = "workspace_mkb_weddings") {
  const venue = cleanVenue(incoming);
  const exists = await db.prepare(`SELECT slug FROM venues WHERE slug = ? AND workspace_id = ?`).bind(venue.slug, workspaceId).first();
  if (exists) throw httpError("A venue with this slug already exists.", 409);

  await db.prepare(`
    INSERT INTO venues (
      slug, id, name, town, county, country, status, hero_asset_id,
      seo_title, seo_description, document_json, published_json, published_at, updated_at, workspace_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', NULL, ?, ?)
  `).bind(
    venue.slug, venue.id, venue.name, venue.town, venue.county, venue.country,
    venue.status, venue.gallery.heroAssetId || venue.heroImageId,
    venue.seo.title, venue.seo.description, JSON.stringify(venue), venue.updatedAt, workspaceId,
  ).run();
  await syncVenueImages(db, venue, workspaceId);
  return getAdminVenue(db, venue.slug, workspaceId);
}

export async function updateAdminVenue(db: D1Db, routeSlug: string, incoming: any, workspaceId = "workspace_mkb_weddings") {
  const row = await db.prepare(`SELECT * FROM venues WHERE slug = ? AND workspace_id = ?`).bind(routeSlug, workspaceId).first();
  if (!row) throw httpError("Venue not found.", 404);
  const existing = hydrateVenue(row);
  const venue = cleanVenue(incoming, existing);

  if (routeSlug !== venue.slug) {
    if (row.status === "published" && text(row.published_json)) {
      throw httpError(
        "Published venue slugs cannot be changed directly. Keep the existing slug for now; slug migration will be handled separately so live URLs are not broken.",
        409,
      );
    }
    const duplicate = await db.prepare(`SELECT slug FROM venues WHERE slug = ? AND workspace_id = ?`).bind(venue.slug, workspaceId).first();
    if (duplicate) throw httpError("A venue with the new slug already exists.", 409);
  }

  const publishedJson = text(row.published_json);
  const publishedAt = row.published_at ?? null;

  if (routeSlug === venue.slug) {
    await db.prepare(`
      UPDATE venues SET
        id = ?, name = ?, town = ?, county = ?, country = ?, status = ?, hero_asset_id = ?,
        seo_title = ?, seo_description = ?, document_json = ?, updated_at = ?
      WHERE slug = ? AND workspace_id = ?
    `).bind(
      venue.id, venue.name, venue.town, venue.county, venue.country, venue.status,
      venue.gallery.heroAssetId || venue.heroImageId, venue.seo.title, venue.seo.description,
      JSON.stringify(venue), venue.updatedAt, routeSlug, workspaceId,
    ).run();
  } else {
    await db.batch([
      db.prepare(`
        INSERT INTO venues (
          slug, id, name, town, county, country, status, hero_asset_id,
          seo_title, seo_description, document_json, published_json, published_at, updated_at, workspace_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        venue.slug, venue.id, venue.name, venue.town, venue.county, venue.country, venue.status,
        venue.gallery.heroAssetId || venue.heroImageId, venue.seo.title, venue.seo.description,
        JSON.stringify(venue), publishedJson, publishedAt, venue.updatedAt, workspaceId,
      ),
      db.prepare(`DELETE FROM venues WHERE slug = ? AND workspace_id = ?`).bind(routeSlug, workspaceId),
      db.prepare(`UPDATE weddings SET venue_slug = ? WHERE venue_slug = ? AND workspace_id = ?`).bind(venue.slug, routeSlug, workspaceId),
    ]);
  }

  await syncVenueImages(db, venue, workspaceId, routeSlug);
  return getAdminVenue(db, venue.slug, workspaceId);
}

export async function archiveAdminVenue(db: D1Db, slug: string, workspaceId = "workspace_mkb_weddings") {
  const venue = await getAdminVenue(db, slug, workspaceId);
  if (!venue) throw httpError("Venue not found.", 404);
  return updateAdminVenue(db, slug, { ...venue, status: "archived" }, workspaceId);
}

function publicImagesFromVenue(venue: any) {
  return (venue?.gallery?.images || [])
    .filter((item: any) => {
      const display =
        item?.display && typeof item.display === "object"
          ? item.display
          : null;

      const hasDraftVisibilityMetadata =
        Object.prototype.hasOwnProperty.call(item || {}, "included") ||
        Object.prototype.hasOwnProperty.call(item || {}, "hidden") ||
        Boolean(
          display &&
          Object.prototype.hasOwnProperty.call(display, "venue"),
        );

      // Canonical admin draft documents carry inclusion/display flags.
      // Legacy published snapshots were already filtered before being written
      // and therefore intentionally omit those flags. Treat such images as
      // public rather than filtering every one of them out.
      if (!hasDraftVisibilityMetadata) {
        return true;
      }

      return Boolean(
        item.included &&
        !item.hidden &&
        display?.venue,
      );
    })
    .sort((a: any, b: any) => Number(a.order || 0) - Number(b.order || 0))
    .map((item: any) => ({
      assetId: text(item.assetId),
      imageId: text(item.imageId),
      weddingSlug: text(item.weddingSlug),
      filename: text(item.filename),
      order: Number(item.order || 0),
      rating: Number(item.rating || 0),
      moments: list(item.moments),
      tags: list(item.tags),
      aiTags: list(item.aiTags),
      thumbSrc: text(item.thumbSrc),
      fullSrc: text(item.fullSrc),
      alt:
        text(item.aiAlt || item.alt) ||
        `${text(venue.name)} wedding photography`,
      caption: text(item.aiCaption || item.caption),
    }));
}

export function toPublicVenue(venue: any) {
  const images = publicImagesFromVenue(venue);
  return {
    schemaVersion: 1,
    id: text(venue.id),
    slug: text(venue.slug),
    name: text(venue.name),
    town: text(venue.town),
    county: text(venue.county),
    country: text(venue.country),
    intro: text(venue.intro),
    description: text(venue.description),
    status: "published",
    updatedAt: text(venue.updatedAt),
    links: venue.links,
    practical: venue.practical,
    seo: venue.seo,
    gallery: {
      schemaVersion: 1,
      updatedAt: text(venue?.gallery?.updatedAt || venue.updatedAt),
      heroAssetId: text(venue?.gallery?.heroAssetId || venue.heroImageId),
      images,
    },
  };
}

export async function publishAdminVenue(db: D1Db, slug: string, workspaceId = "workspace_mkb_weddings") {
  const row = await db.prepare(`SELECT * FROM venues WHERE slug = ? AND workspace_id = ?`).bind(slug, workspaceId).first();
  if (!row) throw httpError("Venue not found.", 404);
  const venue = hydrateVenue(row);
  if (venue.status === "archived") throw httpError("Archived venues cannot be published.", 409);

  const publicVenue = toPublicVenue(venue);
  const images = publicVenue.gallery.images;
  const errors: string[] = [];
  if (!images.length) errors.push("The venue has no images enabled for its public gallery.");
  const hero = images.find((item: any) => item.assetId === publicVenue.gallery.heroAssetId);
  if (!publicVenue.gallery.heroAssetId) errors.push("Select a venue hero image before publishing.");
  else if (!hero) errors.push("The selected venue hero is hidden, excluded, or not enabled for the venue page.");
  for (const image of images) {
    if (!image.fullSrc || !image.thumbSrc) errors.push(`${image.filename}: missing full or thumbnail URL.`);
    if (image.fullSrc.startsWith("/uploads/") || image.thumbSrc.startsWith("/uploads/")) {
      errors.push(`${image.filename}: stored locally. Upload it to R2 before publishing.`);
    }
  }
  if (errors.length) throw httpError("Venue publication validation failed.", 400, errors);

  const publishedAt = new Date().toISOString();
  const draft = { ...venue, status: "published", updatedAt: publishedAt };
  await db.prepare(`
    UPDATE venues SET
      status = 'published', document_json = ?, published_json = ?, published_at = ?, updated_at = ?
    WHERE slug = ? AND workspace_id = ?
  `).bind(JSON.stringify(draft), JSON.stringify(draft), publishedAt, publishedAt, slug, workspaceId).run();

  return {
    venueSlug: slug,
    venueName: venue.name,
    noChanges: text(row.published_json) === JSON.stringify(draft),
    publicImageCount: images.length,
    publishedAt,
  };
}

export async function saveVenueListSettings(db: D1Db, items: any[], workspaceId = "workspace_mkb_weddings") {
  const rows = Array.isArray(items) ? items : [];
  const statements = rows
    .map((item) => {
      const slug = text(item?.slug);
      if (!slug) return null;
      return db.prepare(`
        UPDATE venues
        SET gallery_sort_order = ?, gallery_visible = ?, updated_at = CURRENT_TIMESTAMP
        WHERE slug = ? AND workspace_id = ?
      `).bind(Number(item?.sortOrder || 0), item?.galleryVisible === false ? 0 : 1, slug, workspaceId);
    })
    .filter(Boolean);
  for (let index = 0; index < statements.length; index += 75) {
    const chunk = statements.slice(index, index + 75);
    if (chunk.length) await db.batch(chunk);
  }
  return listAdminVenues(db, workspaceId);
}

export async function getPublicVenue(db: D1Db, slug: string, workspaceId = "workspace_mkb_weddings") {
  const row = await db.prepare(`
    SELECT published_json, published_at, updated_at, country
    FROM venues
    WHERE slug = ? AND workspace_id = ? AND status = 'published' AND published_json <> ''
  `).bind(slug, workspaceId).first();
  if (!row) return null;
  const doc = json(row.published_json, null);
  if (!doc) return null;
  return toPublicVenue({ ...doc, country: text(doc.country || row.country) });
}

export async function listPublicVenues(db: D1Db, workspaceId = "workspace_mkb_weddings") {
  const result = await db.prepare(`
    SELECT slug, published_json, published_at, updated_at, country, gallery_sort_order
    FROM venues
    WHERE workspace_id = ? AND status = 'published' AND published_json <> '' AND gallery_visible = 1
  `).bind(workspaceId).all();
  const venues = sortGalleryVenues(
    (result.results || [])
      .map((row: any) => {
        const doc = json(row.published_json, null);
        if (!doc) return null;
        const venue = toPublicVenue({ ...doc, country: text(doc.country || row.country) });
        const images = venue.gallery.images;
        const hero = images.find((item: any) => item.assetId === venue.gallery.heroAssetId) || images[0] || null;
        return {
          id: venue.id,
          slug: venue.slug,
          name: venue.name,
          town: venue.town,
          county: venue.county,
          country: venue.country,
          status: "published",
          updatedAt: venue.updatedAt,
          imageCount: images.length,
          heroAssetId: venue.gallery.heroAssetId,
          coverThumb: hero?.thumbSrc || "",
          coverFull: hero?.fullSrc || "",
          coverAlt: hero?.alt || "",
          coverCaption: hero?.caption || "",
          gallerySortOrder: Number(row.gallery_sort_order || 0),
        };
      })
      .filter(Boolean),
  ).map(({ gallerySortOrder: _gallerySortOrder, ...venue }: any) => venue);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    count: venues.length,
    imageCount: venues.reduce((sum: number, venue: any) => sum + venue.imageCount, 0),
    venues,
  };
}
