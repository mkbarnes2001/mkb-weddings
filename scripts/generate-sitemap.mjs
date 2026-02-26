// scripts/generate-sitemap.mjs
import fs from "node:fs";
import path from "node:path";

const SITE = "https://www.mkbweddings.co.uk";

// CSV paths
const GALLERY_CSV_PATH = path.join(process.cwd(), "public", "gallery.csv");
const VENUE_DETAILS_CSV_PATH = path.join(
  process.cwd(),
  "public",
  "galleryvenuedesc.csv"
);

// County JSON
const COUNTY_META_PATH = path.join(
  process.cwd(),
  "public",
  "county-meta.json"
);

// Output
const OUT_PATH = path.join(process.cwd(), "public", "sitemap.xml");

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
        inQuotes = !inQuotes;
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

function readCsvIfExists(filePath) {
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
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function urlEntry(loc) {
  return `  <url>
    <loc>${xmlEscape(loc)}</loc>
  </url>`;
}

// ------------------ MAIN ------------------

const urls = new Set();

// ----- Core Pages -----
[
  "/",
  "/gallery",
  "/gallery/venues",
  "/gallery/moments",
  "/gallery/styles",
  "/blog",
  "/contact",
].forEach((p) => urls.add(`${SITE}${p}`));

// ----- Venue Pages -----

const galleryText = readCsvIfExists(GALLERY_CSV_PATH);
if (!galleryText) {
  console.error(`ERROR: Missing ${GALLERY_CSV_PATH}`);
  process.exit(1);
}

const { rows: galleryRows } = parseCsv(galleryText);

let venueNames = new Set();

const venueDetailsText = readCsvIfExists(VENUE_DETAILS_CSV_PATH);
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
  urls.add(`${SITE}/gallery/venue/${slug}`);
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
  urls.add(`${SITE}/gallery/moment/${slug}`);
}

// ----- County Pages -----

const countyMeta = readJsonIfExists(COUNTY_META_PATH);
if (countyMeta) {
  for (const slug of Object.keys(countyMeta)) {
    if (!slug) continue;
    urls.add(`${SITE}/county/${slug}`);
  }
}

// ----- Build XML -----

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  Array.from(urls)
    .sort((a, b) => a.localeCompare(b))
    .map(urlEntry)
    .join("\n") +
  `\n</urlset>\n`;

fs.writeFileSync(OUT_PATH, xml, "utf8");

console.log(
  `✅ sitemap.xml generated:
   URLs: ${urls.size}
   Venues: ${venueNames.size}
   Moments: ${momentNames.size}
   Counties: ${countyMeta ? Object.keys(countyMeta).length : 0}`
);