// src/lib/galleryCsv.ts
export type CsvRow = {
  venue: string;
  category: string; // primary folder category (moment)
  filename: string; // thumbnail filename, ends _500.webp
  tags?: string; // optional: comma-separated tags (e.g. "creative flash,portfolio")
};

// IMPORTANT: keep same values you use elsewhere
export const THUMB_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/thumb";
export const FULL_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/full";

export function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function encSegment(s: string) {
  return encodeURIComponent(s);
}

// Tiny CSV parser that respects quotes
function parseLine(line: string) {
  const out: string[] = [];
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
}

export function parseGalleryCsv(csvText: string): CsvRow[] {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const header = parseLine(lines[0]).map((h) => h.toLowerCase());
  const venueIdx = header.indexOf("venue");
  const categoryIdx = header.indexOf("category");
  const filenameIdx = header.indexOf("filename");
  const tagsIdx = header.indexOf("tags"); // OPTIONAL column

  if (venueIdx === -1 || categoryIdx === -1 || filenameIdx === -1) {
    console.error("CSV header must include: venue,category,filename (tags optional)");
    return [];
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const venue = (cols[venueIdx] || "").trim();
    const category = (cols[categoryIdx] || "").trim();
    const filename = (cols[filenameIdx] || "").trim();
    const tags = tagsIdx !== -1 ? (cols[tagsIdx] || "").trim() : "";

    if (!venue || !category || !filename) continue;
    rows.push({ venue, category, filename, tags });
  }

  return rows;
}

export async function fetchGalleryRows(): Promise<CsvRow[]> {
  const res = await fetch("/gallery.csv", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load /gallery.csv (${res.status})`);
  const text = await res.text();
  return parseGalleryCsv(text);
}

export function thumbUrl(r: CsvRow) {
  return `${THUMB_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(r.filename)}`;
}

export function fullUrlFromThumb(r: CsvRow) {
  const filename2000 = r.filename.replace(/_500\.webp$/i, "_2000.webp");
  return `${FULL_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(filename2000)}`;
}

export function splitTags(row: CsvRow) {
  return (row.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function hasTag(row: CsvRow, tagSlug: string) {
  const tags = splitTags(row).map(slugify);
  return tags.includes(slugify(tagSlug));
}

