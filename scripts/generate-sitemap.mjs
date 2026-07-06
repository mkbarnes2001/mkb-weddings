// scripts/generate-sitemap.mjs
import fs from "node:fs";
import path from "node:path";

const SITE = "https://www.mkbweddings.co.uk";
const IMAGE_BASE = "https://images.mkbweddings.co.uk/full";

const GALLERY_CSV_PATH = path.join(process.cwd(), "public", "gallery.csv");
const GALLERY_AI_CSV_PATH = path.join(process.cwd(), "public", "gallery-ai.csv");
const VENUE_DETAILS_CSV_PATH = path.join(process.cwd(), "public", "galleryvenuedesc.csv");
const COUNTY_META_PATH = path.join(process.cwd(), "public", "county-meta.json");
const WEDDING_STORIES_PATH = path.join(process.cwd(), "src", "data", "weddingStories.ts");

// Outputs
const SITEMAP_INDEX_OUT = path.join(process.cwd(), "public", "sitemap.xml");
const PAGES_SITEMAP_OUT = path.join(process.cwd(), "public", "pages-sitemap.xml");
const IMAGE_SITEMAP_OUT = path.join(process.cwd(), "public", "image-sitemap.xml");

// ------------------ HELPERS ------------------

function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { header: [], rows: [] };

  const parseLine = (line) => {
    const out = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (ch === "," && !inQuotes) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }

    out.push(cur.trim());
    return out;
  };

  const header = parseLine(lines[0]).map((h) => h.toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const obj = {};
    header.forEach((h, idx) => (obj[h] = (cols[idx] ?? "").trim()));
    rows.push(obj);
  }

  return { header, rows };
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf8");
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function xmlEscape(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function pageUrlEntry(loc) {
  return `  <url>
    <loc>${xmlEscape(loc)}</loc>
  </url>`;
}

function sitemapIndexEntry(loc) {
  return `  <sitemap>
    <loc>${xmlEscape(loc)}</loc>
  </sitemap>`;
}

function extractWeddingStorySlugs(fileText) {
  if (!fileText) return [];

  const slugs = new Set();
  const slugRegex = /slug\s*:\s*["'`]([^"'`]+)["'`]/g;

  let match;
  while ((match = slugRegex.exec(fileText)) !== null) {
    const slug = match[1]?.trim();
    if (slug) slugs.add(slug);
  }

  return Array.from(slugs);
}

function fullFilenameFromThumb(filename) {
  return String(filename || "").replace(/_500\.webp$/i, "_2000.webp");
}

function imageUrl(row) {
  return `${IMAGE_BASE}/${encodeURIComponent(row.venue)}/${encodeURIComponent(
    row.category,
  )}/${encodeURIComponent(fullFilenameFromThumb(row.filename))}`;
}

function venuePageUrl(row) {
  return `${SITE}/gallery/venue/${slugify(row.venue)}`;
}

function imageTitle(row, ai) {
  return (
    ai?.aialt ||
    ai?.aititle ||
    `${row.category} wedding photography at ${row.venue}`
  );
}

function imageCaption(row, ai) {
  return (
    ai?.aicaption ||
    ai?.aialt ||
    `${row.category} wedding photography at ${row.venue}`
  );
}

// ------------------ LOAD DATA ------------------

const galleryText = readTextIfExists(GALLERY_CSV_PATH);
if (!galleryText) {
  console.error(`ERROR: Missing ${GALLERY_CSV_PATH}`);
  process.exit(1);
}

const { rows: galleryRows } = parseCsv(galleryText);

const galleryAiText = readTextIfExists(GALLERY_AI_CSV_PATH);
const { rows: galleryAiRows } = galleryAiText ? parseCsv(galleryAiText) : { rows: [] };

const aiByImageId = new Map(
  galleryAiRows.filter((r) => r.imageid).map((r) => [r.imageid, r]),
);

const aiByFilename = new Map(
  galleryAiRows.filter((r) => r.filename).map((r) => [r.filename, r]),
);

// ------------------ PAGE SITEMAP ------------------

const pageUrls = new Set();

// ----- Core Pages -----
[
  "/",
  "/gallery",
  "/gallery/venues",
  "/gallery/moments",
  "/gallery/creative-flash",
  "/blog",
  "/contact",
].forEach((p) => pageUrls.add(`${SITE}${p}`));

// Keep this only if the route still exists on your site.
pageUrls.add(`${SITE}/gallery/styles`);

// ----- Wedding Story / Blog Pages -----
const weddingStoriesText = readTextIfExists(WEDDING_STORIES_PATH);
const weddingStorySlugs = extractWeddingStorySlugs(weddingStoriesText);

for (const slug of weddingStorySlugs) {
  pageUrls.add(`${SITE}/blog/${slug}`);
}

// ----- Venue Pages -----
const venueNames = new Set();

const venueDetailsText = readTextIfExists(VENUE_DETAILS_CSV_PATH);
if (venueDetailsText) {
  const { rows: venueRows } = parseCsv(venueDetailsText);
  for (const r of venueRows) {
    if (r.venue) venueNames.add(r.venue);
  }
} else {
  for (const r of galleryRows) {
    if (r.venue) venueNames.add(r.venue);
  }
}

for (const v of venueNames) {
  const slug = slugify(v);
  if (!slug) continue;
  pageUrls.add(`${SITE}/gallery/venue/${slug}`);
}

// ----- Moment Pages -----
const momentNames = new Set();

for (const r of galleryRows) {
  const raw = (r.category || "").trim();
  if (!raw) continue;

  const parts = raw
    .split(/[|;,/]/g)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const p of parts) momentNames.add(p);
}

for (const m of momentNames) {
  const slug = slugify(m);
  if (!slug) continue;
  pageUrls.add(`${SITE}/gallery/moment/${slug}`);
}

// ----- County Pages -----
const countyMeta = readJsonIfExists(COUNTY_META_PATH);
if (countyMeta) {
  for (const slug of Object.keys(countyMeta)) {
    if (!slug) continue;
    pageUrls.add(`${SITE}/wedding-photographer/${slug}`);
  }
}

// ----- Build pages-sitemap.xml -----
const pagesXml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  Array.from(pageUrls)
    .sort((a, b) => a.localeCompare(b))
    .map(pageUrlEntry)
    .join("\n") +
  `\n</urlset>\n`;

fs.writeFileSync(PAGES_SITEMAP_OUT, pagesXml, "utf8");

// ------------------ IMAGE SITEMAP ------------------

const imagesByPage = new Map();

for (const row of galleryRows) {
  if (!row.venue || !row.category || !row.filename) continue;

  const pageLoc = venuePageUrl(row);
  if (!imagesByPage.has(pageLoc)) imagesByPage.set(pageLoc, []);

  const ai =
    (row.imageid && aiByImageId.get(row.imageid)) ||
    aiByFilename.get(row.filename) ||
    null;

  imagesByPage.get(pageLoc).push({
    loc: imageUrl(row),
    title: imageTitle(row, ai),
    caption: imageCaption(row, ai),
  });
}

const imageUrlEntries = Array.from(imagesByPage.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([pageLoc, images]) => {
    const imageXml = images
      .map(
        (img) => `    <image:image>
      <image:loc>${xmlEscape(img.loc)}</image:loc>
      <image:title>${xmlEscape(img.title)}</image:title>
      <image:caption>${xmlEscape(img.caption)}</image:caption>
    </image:image>`,
      )
      .join("\n");

    return `  <url>
    <loc>${xmlEscape(pageLoc)}</loc>
${imageXml}
  </url>`;
  })
  .join("\n");

const imageXml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
>\n` +
  imageUrlEntries +
  `\n</urlset>\n`;

fs.writeFileSync(IMAGE_SITEMAP_OUT, imageXml, "utf8");

// ------------------ SITEMAP INDEX ------------------

const sitemapIndexXml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  [
    `${SITE}/pages-sitemap.xml`,
    `${SITE}/image-sitemap.xml`,
  ]
    .map(sitemapIndexEntry)
    .join("\n") +
  `\n</sitemapindex>\n`;

fs.writeFileSync(SITEMAP_INDEX_OUT, sitemapIndexXml, "utf8");

// ------------------ SUMMARY ------------------

const imageCount = Array.from(imagesByPage.values()).reduce(
  (total, images) => total + images.length,
  0,
);

console.log(
  `✅ sitemaps generated:
   Sitemap index: sitemap.xml
   Page sitemap: pages-sitemap.xml
   Image sitemap: image-sitemap.xml
   URLs: ${pageUrls.size}
   Images: ${imageCount}
   Image pages: ${imagesByPage.size}
   Venues: ${venueNames.size}
   Moments: ${momentNames.size}
   Counties: ${countyMeta ? Object.keys(countyMeta).length : 0}
   Wedding stories: ${weddingStorySlugs.length}`,
);