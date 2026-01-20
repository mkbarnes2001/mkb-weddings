// src/components/galleryLoader.ts
export type GalleryRow = {
  venue: string;
  category: string;
  filename: string; // thumb filename (ends _500.webp)
};

export type GalleryItem = {
  venue: string;
  venueId: string;
  category: string;
  categoryId: string;
  thumbUrl: string;
  fullUrl: string;
};

const THUMB_BASE = "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/thumb";
const FULL_BASE  = "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/full";

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function encSeg(s: string) {
  // encode each path segment safely (spaces -> %20, etc.)
  return encodeURIComponent(s);
}

export async function loadGallery(): Promise<GalleryItem[]> {
  const res = await fetch("/gallery.csv", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load gallery.csv: ${res.status}`);
  const text = await res.text();

  // Simple CSV parser (works with your 3 columns)
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines.shift();
  if (!header) return [];

  const rows: GalleryRow[] = lines.map((line) => {
    // split on commas but tolerate quotes (basic)
    // If your CSV is ever complex, we can swap to PapaParse.
    const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(p => p.replace(/^"|"$/g,"").trim()) ?? [];
    return {
      venue: parts[0] ?? "",
      category: parts[1] ?? "",
      filename: parts[2] ?? "",
    };
  }).filter(r => r.venue && r.category && r.filename);

  return rows.map((r) => {
    const venueId = slugify(r.venue);
    const categoryId = slugify(r.category);

    const thumbFile = r.filename; // already _500.webp
    const fullFile = r.filename.replace(/_500\.webp$/i, "_2000.webp");

    const thumbUrl = `${THUMB_BASE}/${encSeg(r.venue)}/${encSeg(r.category)}/${encSeg(thumbFile)}`;
    const fullUrl  = `${FULL_BASE}/${encSeg(r.venue)}/${encSeg(r.category)}/${encSeg(fullFile)}`;

    return { venue: r.venue, venueId, category: r.category, categoryId, thumbUrl, fullUrl };
  });
}
