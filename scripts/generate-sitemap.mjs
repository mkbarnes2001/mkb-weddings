// scripts/generate-sitemap.mjs
import fs from "node:fs";
import path from "node:path";

const SITE = "https://www.mkbweddings.co.uk";

// CSV files (adjust if your filenames differ)
const GALLERY_CSV_PATH = path.join(process.cwd(), "public", "gallery.csv");
const VENUE_DETAILS_CSV_PATH = path.join(
  process.cwd(),
  "public",
  "galleryvenuedesc.csv"
);

// Output sitemap to /public so it is deployed at /sitemap.xml
const OUT_PATH = path.join(process.cwd(), "public", "sitemap.xml");

// --- helpers ---
function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Tiny CSV parser that respects quotes (same style as your components)
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

function xmlEscape(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function urlEntry(loc) {
  return `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n  </url>`;
}

// --- main ---
const galleryText = readCsvIfExists(GALLERY_CSV_PATH);
if (!galleryText) {
  console.error(`ERROR: Missing ${GALLERY_CSV_PATH}`);
  process.exit(1);
}

const { rows: galleryRows } = parseCsv(galleryText);

// We’ll generate venues from whichever CSV is available:
// Prefer venue-details CSV (since you’re now maintaining that),
// otherwise fall back to unique venues from gallery.csv.
let venueNames = new Set();

const venueDetailsText = readCsvIfExists(VENUE_DETAILS_CSV_PATH);
if (venueDetailsText) {
  const { rows: venueRows } = parseCsv(venueDetailsText);
  // Expect a "venue" column (your folder key)
  for (const r of venueRows) {
    if (r.venue) venueNames.add(r.venue);
  }
} else {
  // fallback: derive from gallery.csv
  for (const r of galleryRows) {
    if (r.venue) venueNames.add(r.venue);
  }
}

// Build list of URLs
const urls = new Set();

// Core pages (add/remove as you like)
[
  "/",
  "/gallery",
  "/gallery/venues",
  "/gallery/moments",
  "/gallery/styles",
  "/blog",
  "/contact",
].forEach((p) => urls.add(`${SITE}${p}`));

// Venue detail pages
for (const v of venueNames) {
  const slug = slugify(v);
  if (!slug) continue;
  urls.add(`${SITE}/gallery/venue/${slug}`);
}

// Optional: if you also have "moment detail" pages etc, we can add later.

// Write sitemap
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
  `✅ sitemap.xml generated: ${OUT_PATH}\n   URLs: ${urls.size}\n   Venues: ${venueNames.size}`
);
