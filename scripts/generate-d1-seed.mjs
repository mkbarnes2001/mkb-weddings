import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { parse } from "csv-parse/sync";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "d1", "seed.sql");
const venuesRoot = path.join(ROOT, "content", "venues");
const weddingsRoot = path.join(ROOT, "public", "weddings");

function sql(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function bool(value) {
  return value ? 1 : 0;
}

function json(value, fallback = {}) {
  return JSON.stringify(value ?? fallback);
}

function normalise(value) {
  return String(value ?? "").trim();
}

function slugify(value) {
  return normalise(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function legacyAssetKey(prefix, ...parts) {
  const hash = crypto
    .createHash("sha1")
    .update(parts.map((part) => String(part ?? "")).join("::"))
    .digest("hex")
    .slice(0, 24);
  return `${prefix}_${hash}`;
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

async function readCsv(filePath) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return parse(text, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      bom: true,
      trim: true,
    });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

function extractLegacyStories(source) {
  const marker = "export const weddingStories";
  const start = source.indexOf(marker);
  if (start < 0) return [];

  const equals = source.indexOf("=", start);
  if (equals < 0) return [];

  const open = source.indexOf("[", equals);
  if (open < 0) return [];

  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let i = open; i < source.length; i += 1) {
    const char = source[i];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        const literal = source.slice(open, i + 1);
        return vm.runInNewContext(`(${literal})`, Object.create(null), {
          timeout: 1000,
        });
      }
    }
  }

  return [];
}

function imageInsert(image) {
  return `INSERT INTO images (
    asset_key, image_id, wedding_slug, filename, full_src, thumb_src,
    alt, caption, tags_json, ai_tags_json, source_type, source_json,
    width, height, orientation, updated_at
  ) VALUES (
    ${sql(image.assetKey)}, ${sql(image.imageId)}, ${sql(image.weddingSlug)},
    ${sql(image.filename)}, ${sql(image.fullSrc)}, ${sql(image.thumbSrc)},
    ${sql(image.alt)}, ${sql(image.caption)}, ${sql(json(image.tags, []))},
    ${sql(json(image.aiTags, []))}, ${sql(image.sourceType)}, ${sql(json(image.source, {}))},
    ${image.width ?? "NULL"}, ${image.height ?? "NULL"}, ${sql(image.orientation)}, CURRENT_TIMESTAMP
  ) ON CONFLICT(asset_key) DO UPDATE SET
    image_id = CASE WHEN excluded.image_id <> '' THEN excluded.image_id ELSE images.image_id END,
    wedding_slug = CASE WHEN excluded.wedding_slug <> '' THEN excluded.wedding_slug ELSE images.wedding_slug END,
    filename = CASE WHEN excluded.filename <> '' THEN excluded.filename ELSE images.filename END,
    full_src = CASE WHEN excluded.full_src <> '' THEN excluded.full_src ELSE images.full_src END,
    thumb_src = CASE WHEN excluded.thumb_src <> '' THEN excluded.thumb_src ELSE images.thumb_src END,
    alt = CASE WHEN excluded.alt <> '' THEN excluded.alt ELSE images.alt END,
    caption = CASE WHEN excluded.caption <> '' THEN excluded.caption ELSE images.caption END,
    tags_json = CASE WHEN excluded.tags_json <> '[]' THEN excluded.tags_json ELSE images.tags_json END,
    ai_tags_json = CASE WHEN excluded.ai_tags_json <> '[]' THEN excluded.ai_tags_json ELSE images.ai_tags_json END,
    source_type = CASE WHEN excluded.source_type <> '' THEN excluded.source_type ELSE images.source_type END,
    source_json = CASE WHEN excluded.source_json <> '{}' THEN excluded.source_json ELSE images.source_json END,
    width = COALESCE(excluded.width, images.width),
    height = COALESCE(excluded.height, images.height),
    orientation = CASE WHEN excluded.orientation <> '' THEN excluded.orientation ELSE images.orientation END,
    updated_at = CURRENT_TIMESTAMP;`;
}

const statements = [];
const stats = {
  venues: 0,
  counties: 0,
  weddings: 0,
  legacyStories: 0,
  images: new Set(),
  venueImages: 0,
  weddingImages: 0,
  storyImages: 0,
  suppliers: 0,
  moments: 0,
};

statements.push(`-- Generated ${new Date().toISOString()}`);
statements.push(`-- Safe to re-run: canonical tables are refreshed from repository data.`);
statements.push(`DELETE FROM venue_images;`);
statements.push(`DELETE FROM wedding_images;`);
statements.push(`DELETE FROM story_images;`);
statements.push(`DELETE FROM wedding_suppliers;`);
statements.push(`DELETE FROM images;`);
statements.push(`DELETE FROM venues;`);
statements.push(`DELETE FROM weddings;`);
statements.push(`DELETE FROM counties;`);
statements.push(`DELETE FROM moments;`);

// Venues and venue gallery images. This is the canonical replacement for runtime gallery.csv/gallery-ai.csv use.
for (const entry of (await fs.readdir(venuesRoot, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
  if (!entry.isDirectory()) continue;
  const venue = await readJson(path.join(venuesRoot, entry.name, "venue.json"));
  if (!venue?.slug) continue;

  const gallery = venue.gallery || { images: [] };
  const document = { ...venue };
  delete document.gallery;

  const country = normalise(venue.country) ||
    (/cavan|monaghan|louth|donegal|meath|slane/i.test(`${venue.county} ${venue.town}`) ? "Ireland" : "Northern Ireland");

  statements.push(`INSERT INTO venues (
    slug, id, name, town, county, country, status, hero_asset_id,
    seo_title, seo_description, document_json, updated_at
  ) VALUES (
    ${sql(venue.slug)}, ${sql(venue.id || `venue_${venue.slug}`)}, ${sql(venue.name || venue.slug)},
    ${sql(venue.town || "")}, ${sql(venue.county || "")}, ${sql(country || "")}, ${sql(venue.status || "draft")},
    ${sql(venue.heroImageId || gallery.heroAssetId || "")}, ${sql(venue.seo?.title || "")},
    ${sql(venue.seo?.description || "")}, ${sql(json(document))}, ${sql(gallery.updatedAt || new Date().toISOString())}
  ) ON CONFLICT(slug) DO UPDATE SET
    id=excluded.id, name=excluded.name, town=excluded.town, county=excluded.county,
    country=excluded.country, status=excluded.status, hero_asset_id=excluded.hero_asset_id,
    seo_title=excluded.seo_title, seo_description=excluded.seo_description,
    document_json=excluded.document_json, updated_at=excluded.updated_at;`);
  stats.venues += 1;

  for (const item of gallery.images || []) {
    const assetKey = normalise(item.assetId) || legacyAssetKey("venue", venue.slug, item.imageId, item.filename);
    const source = item.source || {};
    const image = {
      assetKey,
      imageId: normalise(item.imageId),
      weddingSlug: normalise(item.weddingSlug),
      filename: normalise(item.filename),
      fullSrc: normalise(item.fullSrc),
      thumbSrc: normalise(item.thumbSrc),
      alt: normalise(item.aiAlt),
      caption: normalise(item.aiCaption),
      tags: item.tags || [],
      aiTags: item.aiTags || [],
      sourceType: normalise(source.type),
      source,
      width: source.width ?? null,
      height: source.height ?? null,
      orientation: normalise(source.orientation),
    };
    statements.push(imageInsert(image));
    stats.images.add(assetKey);
    statements.push(`INSERT INTO venue_images (
      venue_slug, asset_key, sort_order, included, hidden, rating, is_hero,
      moments_json, display_json
    ) VALUES (
      ${sql(venue.slug)}, ${sql(assetKey)}, ${Number(item.order || 0)}, ${bool(item.included !== false)},
      ${bool(item.hidden)}, ${Number(item.rating || 0)}, ${bool(assetKey === (gallery.heroAssetId || venue.heroImageId))},
      ${sql(json(item.moments, []))}, ${sql(json(item.display, {}))}
    ) ON CONFLICT(venue_slug, asset_key) DO UPDATE SET
      sort_order=excluded.sort_order, included=excluded.included, hidden=excluded.hidden,
      rating=excluded.rating, is_hero=excluded.is_hero, moments_json=excluded.moments_json,
      display_json=excluded.display_json;`);
    stats.venueImages += 1;
  }
}

// Counties are imported from generated JSON, not county.csv.
const countyMeta = await readJson(path.join(ROOT, "public", "county-meta.json"), {});
for (const [slug, county] of Object.entries(countyMeta || {})) {
  statements.push(`INSERT INTO counties (
    slug, county, country, country_code, seo_title, seo_description, document_json, updated_at
  ) VALUES (
    ${sql(slug)}, ${sql(county.county || "")}, ${sql(county.country || "")}, ${sql(county.countryCode || "")},
    ${sql(county.seoTitle || "")}, ${sql(county.seoDescription || "")}, ${sql(json(county))}, CURRENT_TIMESTAMP
  ) ON CONFLICT(slug) DO UPDATE SET
    county=excluded.county, country=excluded.country, country_code=excluded.country_code,
    seo_title=excluded.seo_title, seo_description=excluded.seo_description,
    document_json=excluded.document_json, updated_at=CURRENT_TIMESTAMP;`);
  stats.counties += 1;
}

// Managed JSON weddings.
const managedWeddingSlugs = new Set();
try {
  const weddingEntries = (await fs.readdir(weddingsRoot, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of weddingEntries) {
    if (!entry.isDirectory()) continue;
    const wedding = await readJson(path.join(weddingsRoot, entry.name, "wedding.json"));
    if (!wedding?.slug) continue;
    managedWeddingSlugs.add(wedding.slug);

    const publish = await readJson(path.join(weddingsRoot, entry.name, "publish.json"), {});
    const merged = { ...wedding };
    if (publish?.storyEnabled !== undefined) {
      merged.storyEnabled = publish.storyEnabled;
    } else if (merged.storyEnabled === undefined) {
      // Older JSON stories pre-date the explicit display toggle. Preserve an
      // already-published story as visible during the one-time migration.
      merged.storyEnabled =
        merged.status === "published" &&
        Array.isArray(merged.story) &&
        merged.story.length > 0;
    }
    if (publish?.status) {
      merged.storyStatus = publish.status;
    } else if (!merged.storyStatus) {
      merged.storyStatus =
        merged.storyEnabled && merged.status === "published"
          ? "published"
          : "draft";
    }
    if (publish?.publishedAt) merged.storyPublishedAt = publish.publishedAt;

    statements.push(`INSERT INTO weddings (
      slug, source, title, couple, venue, venue_slug, venue_id, wedding_date,
      excerpt, intro, status, story_enabled, story_status, story_published_at,
      seo_title, seo_description, document_json, updated_at
    ) VALUES (
      ${sql(merged.slug)}, 'json', ${sql(merged.title || "")}, ${sql(merged.couple || "")}, ${sql(merged.venue || "")},
      ${sql(merged.venueSlug || "")}, ${sql(merged.venueId || "")}, ${sql(merged.weddingDate || "")}, ${sql(merged.excerpt || "")},
      ${sql(merged.intro || "")}, ${sql(merged.status || "draft")}, ${bool(merged.storyEnabled)},
      ${sql(merged.storyStatus || "draft")}, ${sql(merged.storyPublishedAt || null)},
      ${sql(merged.seo?.title || "")}, ${sql(merged.seo?.description || "")},
      ${sql(json(merged))}, ${sql(merged.updatedAt || new Date().toISOString())}
    ) ON CONFLICT(slug) DO UPDATE SET
      source=excluded.source, title=excluded.title, couple=excluded.couple, venue=excluded.venue,
      venue_slug=excluded.venue_slug, venue_id=excluded.venue_id, wedding_date=excluded.wedding_date,
      excerpt=excluded.excerpt, intro=excluded.intro, status=excluded.status,
      story_enabled=excluded.story_enabled, story_status=excluded.story_status,
      story_published_at=excluded.story_published_at, seo_title=excluded.seo_title,
      seo_description=excluded.seo_description, document_json=excluded.document_json,
      updated_at=excluded.updated_at;`);
    stats.weddings += 1;

    (merged.suppliers || []).forEach((supplier, index) => {
      statements.push(`INSERT OR REPLACE INTO wedding_suppliers (
        wedding_slug, sort_order, role, name, website, instagram
      ) VALUES (${sql(merged.slug)}, ${index + 1}, ${sql(supplier.role)}, ${sql(supplier.name)},
        ${sql(supplier.website)}, ${sql(supplier.instagram)});`);
      stats.suppliers += 1;
    });

    const imagesDoc = await readJson(path.join(weddingsRoot, entry.name, "images.json"), { images: [] });
    for (const item of imagesDoc?.images || []) {
      const assetKey = `${merged.slug}:${item.id}`;
      const source = item.source || {};
      statements.push(imageInsert({
        assetKey,
        imageId: normalise(item.id),
        weddingSlug: merged.slug,
        filename: normalise(item.filename),
        fullSrc: normalise(item.fullSrc || source.fullPath),
        thumbSrc: normalise(item.thumbSrc || source.thumbPath),
        alt: normalise(item.aiAlt),
        caption: normalise(item.aiCaption),
        tags: item.tags || [],
        aiTags: item.aiTags || [],
        sourceType: normalise(source.type),
        source,
        width: source.width ?? null,
        height: source.height ?? null,
        orientation: normalise(source.orientation),
      }));
      stats.images.add(assetKey);

      statements.push(`INSERT INTO wedding_images (
        wedding_slug, asset_key, sort_order, is_cover, hidden, rating, collections_json
      ) VALUES (
        ${sql(merged.slug)}, ${sql(assetKey)}, ${Number(item.order || 0)}, ${bool(item.isCover)},
        ${bool(item.hidden)}, ${Number(item.rating || 0)}, ${sql(json(item.collections, []))}
      ) ON CONFLICT(wedding_slug, asset_key) DO UPDATE SET
        sort_order=excluded.sort_order, is_cover=excluded.is_cover, hidden=excluded.hidden,
        rating=excluded.rating, collections_json=excluded.collections_json;`);
      stats.weddingImages += 1;

      if ((item.collections || []).includes("blog")) {
        statements.push(`INSERT OR REPLACE INTO story_images (
          wedding_slug, asset_key, sort_order, is_cover
        ) VALUES (${sql(merged.slug)}, ${sql(assetKey)}, ${Number(item.order || 0)}, ${bool(item.isCover)});`);
        stats.storyImages += 1;
      }
    }
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

// Legacy static stories are migrated into D1 so weddingStories.ts stops being a runtime source later.
const storySource = await fs.readFile(path.join(ROOT, "src", "data", "weddingStories.ts"), "utf8");
const legacyStories = extractLegacyStories(storySource);
for (const story of legacyStories) {
  if (!story?.slug || managedWeddingSlugs.has(story.slug)) continue;
  const venueSlug = normalise(story.venueSlug) || slugify(story.venue);
  const document = {
    schemaVersion: 1,
    ...story,
    venueSlug,
    seo: {
      title: story.seoTitle || "",
      description: story.seoDescription || "",
    },
    status: "published",
    storyEnabled: true,
    storyStatus: "published",
  };
  delete document.seoTitle;
  delete document.seoDescription;

  statements.push(`INSERT INTO weddings (
    slug, source, title, couple, venue, venue_slug, venue_id, wedding_date,
    excerpt, intro, status, story_enabled, story_status, story_published_at,
    seo_title, seo_description, document_json, updated_at
  ) VALUES (
    ${sql(story.slug)}, 'legacy-story', ${sql(story.title || "")}, ${sql(story.couple || "")}, ${sql(story.venue || "")},
    ${sql(venueSlug)}, '', ${sql(story.weddingDate || "")}, ${sql(story.excerpt || "")}, ${sql(story.intro || "")},
    'published', 1, 'published', NULL, ${sql(story.seoTitle || "")}, ${sql(story.seoDescription || "")},
    ${sql(json(document))}, CURRENT_TIMESTAMP
  ) ON CONFLICT(slug) DO NOTHING;`);
  stats.legacyStories += 1;

  (story.suppliers || []).forEach((supplier, index) => {
    statements.push(`INSERT OR REPLACE INTO wedding_suppliers (
      wedding_slug, sort_order, role, name, website, instagram
    ) VALUES (${sql(story.slug)}, ${index + 1}, ${sql(supplier.role)}, ${sql(supplier.name)},
      ${sql(supplier.website)}, ${sql(supplier.instagram)});`);
    stats.suppliers += 1;
  });
}

// One-time legacy blog image migration. This is the only CSV input here; no runtime code will need it after cutover.
const blogRows = await readCsv(path.join(ROOT, "public", "blog-gallery.csv"));
const aiRows = await readCsv(path.join(ROOT, "public", "gallery-ai.csv"));
const aiMap = new Map();
for (const row of aiRows) {
  if (normalise(row.source).toLowerCase() !== "blog") continue;
  const key = `${normalise(row.blogSlug).toLowerCase()}::${normalise(row.filename).replace(/_2000(\.[^.]+)$/i, "_500$1").toLowerCase()}`;
  aiMap.set(key, row);
}

const blogBase = "https://images.mkbweddings.co.uk/blog";
function encodePathPart(value) {
  return encodeURIComponent(value || "").replace(/%2F/g, "/");
}
function fullFilename(filename) {
  return filename.replace(/_500(\.[a-z0-9]+)$/i, "_2000$1");
}

for (let index = 0; index < blogRows.length; index += 1) {
  const row = blogRows[index];
  const weddingSlug = normalise(row.blogSlug);
  const filename = normalise(row.filename);
  if (!weddingSlug || !filename) continue;

  const normalisedFilename = filename.replace(/_2000(\.[^.]+)$/i, "_500$1").toLowerCase();
  const ai = aiMap.get(`${weddingSlug.toLowerCase()}::${normalisedFilename}`) || {};
  const assetKey = legacyAssetKey("legacy_blog", weddingSlug, filename);
  const order = Number(row.blogOrder || index + 1);
  const isCover = ["true", "yes", "1", "cover"].includes(normalise(row.blogCover).toLowerCase());
  const thumbSrc = `${blogBase}/thumb/${encodePathPart(weddingSlug)}/${encodePathPart(filename)}`;
  const fullSrc = `${blogBase}/full/${encodePathPart(weddingSlug)}/${encodePathPart(fullFilename(filename))}`;

  statements.push(imageInsert({
    assetKey,
    imageId: normalise(ai.imageId),
    weddingSlug,
    filename,
    fullSrc,
    thumbSrc,
    alt: normalise(ai.aiAlt),
    caption: normalise(ai.aiCaption),
    tags: [],
    aiTags: normalise(ai.aiTags).split("|").map((v) => v.trim()).filter(Boolean),
    sourceType: "legacy-blog-csv",
    source: { type: "legacy-blog-csv" },
    width: null,
    height: null,
    orientation: "",
  }));
  stats.images.add(assetKey);

  statements.push(`INSERT OR IGNORE INTO story_images (
    wedding_slug, asset_key, sort_order, is_cover
  ) VALUES (${sql(weddingSlug)}, ${sql(assetKey)}, ${Number.isFinite(order) ? order : index + 1}, ${bool(isCover)});`);
  stats.storyImages += 1;
}

// Moments definitions are already JSON-backed. Assignments are retained on venue_images.moments_json.
const momentsDoc = await readJson(path.join(ROOT, "content", "moments", "moments.json"), { moments: [] });
for (const moment of momentsDoc?.moments || []) {
  statements.push(`INSERT INTO moments (
    id, slug, name, description, available_for_assignment, show_on_landing,
    card_image_id, sort_order, status, document_json, updated_at
  ) VALUES (
    ${sql(moment.id)}, ${sql(moment.slug)}, ${sql(moment.name)}, ${sql(moment.description)},
    ${bool(moment.availableForAssignment !== false)}, ${bool(moment.showOnMomentsLanding !== false)},
    ${sql(moment.cardImageId)}, ${Number(moment.sortOrder || 0)}, ${sql(moment.status || "active")},
    ${sql(json(moment))}, ${sql(momentsDoc.updatedAt || new Date().toISOString())}
  ) ON CONFLICT(id) DO UPDATE SET
    slug=excluded.slug, name=excluded.name, description=excluded.description,
    available_for_assignment=excluded.available_for_assignment,
    show_on_landing=excluded.show_on_landing, card_image_id=excluded.card_image_id,
    sort_order=excluded.sort_order, status=excluded.status, document_json=excluded.document_json,
    updated_at=excluded.updated_at;`);
  stats.moments += 1;
}

statements.push(`INSERT INTO migration_log (migration_key, detail) VALUES (
  'repository-seed-v1',
  ${sql(JSON.stringify({
    generatedAt: new Date().toISOString(),
    venues: stats.venues,
    counties: stats.counties,
    managedWeddings: stats.weddings,
    legacyStories: stats.legacyStories,
    uniqueImages: stats.images.size,
    venueImages: stats.venueImages,
    weddingImages: stats.weddingImages,
    storyImages: stats.storyImages,
    suppliers: stats.suppliers,
    moments: stats.moments,
  }))}
);`);

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, `${statements.join("\n\n")}\n`, "utf8");

console.log("D1 seed generated:", path.relative(ROOT, OUT));
console.log({
  venues: stats.venues,
  counties: stats.counties,
  managedWeddings: stats.weddings,
  legacyStories: stats.legacyStories,
  uniqueImages: stats.images.size,
  venueImages: stats.venueImages,
  weddingImages: stats.weddingImages,
  storyImages: stats.storyImages,
  suppliers: stats.suppliers,
  moments: stats.moments,
});
