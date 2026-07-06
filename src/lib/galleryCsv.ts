// src/lib/galleryCsv.ts

export type CsvRow = {
  imageId?: string;
  venue: string;
  category: string;
  filename: string;
  tags?: string;

  blogSlug?: string;
  blogOrder?: string;
  blogCover?: string;

  venuePin?: string;
  venuePinOrder?: string;

  momentPin?: string;
  momentPinOrder?: string;

  flashPin?: string;
  flashPinOrder?: string;

  aiTags?: string;
  aiAlt?: string;
  aiCaption?: string;
};

export type GalleryAiRow = {
  imageId: string;
  filename?: string;
  aiTags?: string;
  aiAlt?: string;
  aiCaption?: string;
};

export const THUMB_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/thumb";

export const FULL_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/full";

export function slugify(s: string) {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function encSegment(s: string) {
  return encodeURIComponent(s);
}

function parseLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i += 1;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }

  out.push(cur.trim());
  return out;
}

function parseCsvToObjects(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseLine(lines[0]).map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const cols = parseLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = cols[index] || "";
    });

    return row;
  });
}

export function parseGalleryCsv(csvText: string): CsvRow[] {
  return parseCsvToObjects(csvText)
    .map((row) => ({
      imageId: row.imageId || "",
      venue: row.venue || "",
      category: row.category || "",
      filename: row.filename || "",
      tags: row.tags || "",

      blogSlug: row.blogSlug || "",
      blogOrder: row.blogOrder || "",
      blogCover: row.blogCover || "",

      venuePin: row.venuePin || "",
      venuePinOrder: row.venuePinOrder || "",

      momentPin: row.momentPin || "",
      momentPinOrder: row.momentPinOrder || "",

      flashPin: row.flashPin || "",
      flashPinOrder: row.flashPinOrder || "",
    }))
    .filter((row) => row.venue && row.category && row.filename);
}

export function parseGalleryAiCsv(csvText: string): GalleryAiRow[] {
  return parseCsvToObjects(csvText)
    .map((row) => ({
      imageId: row.imageId || "",
      filename: row.filename || "",
      aiTags: row.aiTags || "",
      aiAlt: row.aiAlt || "",
      aiCaption: row.aiCaption || "",
    }))
    .filter((row) => row.imageId || row.filename);
}

export async function fetchGalleryRows(): Promise<CsvRow[]> {
  const galleryRes = await fetch("/gallery.csv", { cache: "no-store" });

  if (!galleryRes.ok) {
    throw new Error(`Failed to load /gallery.csv (${galleryRes.status})`);
  }

  const galleryText = await galleryRes.text();
  const galleryRows = parseGalleryCsv(galleryText);

  try {
    const aiRes = await fetch("/gallery-ai.csv", { cache: "no-store" });

    if (!aiRes.ok) return galleryRows;

    const aiText = await aiRes.text();
    const aiRows = parseGalleryAiCsv(aiText);

    const aiByImageId = new Map(
      aiRows.filter((row) => row.imageId).map((row) => [row.imageId, row]),
    );

    const aiByFilename = new Map(
      aiRows.filter((row) => row.filename).map((row) => [row.filename, row]),
    );

    return galleryRows.map((row) => {
      const ai =
        (row.imageId && aiByImageId.get(row.imageId)) ||
        aiByFilename.get(row.filename);

      return {
        ...row,
        aiTags: ai?.aiTags || "",
        aiAlt: ai?.aiAlt || "",
        aiCaption: ai?.aiCaption || "",
      };
    });
  } catch {
    return galleryRows;
  }
}

export function thumbUrl(r: CsvRow) {
  return `${THUMB_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category,
  )}/${encodeURIComponent(r.filename)}`;
}

export function fullUrlFromThumb(r: CsvRow) {
  const filename2000 = r.filename.replace(/_500\.webp$/i, "_2000.webp");

  return `${FULL_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category,
  )}/${encodeURIComponent(filename2000)}`;
}

export function splitTags(row: CsvRow) {
  return (row.tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function splitAiTags(row: CsvRow) {
  return (row.aiTags || "")
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function imageAlt(row: CsvRow) {
  return (
    row.aiAlt ||
    `${row.venue} wedding photography - ${row.category}`
  );
}

export function imageCaption(row: CsvRow) {
  return row.aiCaption || "";
}

export function hasTag(row: CsvRow, tag: string) {
  const want = slugify(tag);

  return [...splitTags(row), ...splitAiTags(row)].some(
    (t) => slugify(t) === want,
  );
}