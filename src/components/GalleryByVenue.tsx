import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ChevronRight } from "lucide-react";

type CsvRow = {
  venue: string;
  category: string;
  filename: string; // ends in _500.webp
  tags?: string; // optional (e.g. "creative-flash")
};

// IMPORTANT: keep consistent with the other gallery pages
const THUMB_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/thumb";
const FULL_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/full";

// Pin favourite venues to the top (use the *display name* exactly as in CSV)
const PINNED_VENUES: string[] = [
    "Orange tree house",
   "Ballyscullion park",
   "Tullyglass hotel",
   "Killeavy castle",
   "Slieve donard hotel",
   "Wool tower",
];

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function encSegment(s: string) {
  return encodeURIComponent(s);
}

function parseGalleryCsv(csvText: string): CsvRow[] {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const parseLine = (line: string) => {
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
  };

  const header = parseLine(lines[0]).map((h) => h.toLowerCase());
  const venueIdx = header.indexOf("venue");
  const categoryIdx = header.indexOf("category");
  const filenameIdx = header.indexOf("filename");
  const tagsIdx = header.indexOf("tags");

  if (venueIdx === -1 || categoryIdx === -1 || filenameIdx === -1) return [];

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const venue = (cols[venueIdx] || "").trim();
    const category = (cols[categoryIdx] || "").trim();
    const filename = (cols[filenameIdx] || "").trim();
    const tags = tagsIdx >= 0 ? (cols[tagsIdx] || "").trim() : "";

    if (!venue || !category || !filename) continue;
    rows.push({ venue, category, filename, tags });
  }
  return rows;
}

function thumbUrl(r: CsvRow) {
  return `${THUMB_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(r.filename)}`;
}

function fullUrlFromThumb(r: CsvRow) {
  const filename2000 = r.filename.replace(/_500\.webp$/i, "_2000.webp");
  return `${FULL_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(filename2000)}`;
}

type VenueCard = {
  venue: string;
  venueId: string;
  coverThumb: string;
  coverFull: string;
  count: number;
};

export function GalleryByVenue() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadError(null);
        const res = await fetch("/gallery.csv", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load /gallery.csv (${res.status})`);
        const text = await res.text();
        const parsed = parseGalleryCsv(text);
        if (!cancelled) setRows(parsed);
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || "Failed to load gallery.csv");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const venueCards = useMemo((): VenueCard[] => {
    const map = new Map<string, CsvRow[]>();
    for (const r of rows) {
      const key = r.venue;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }

    const cards: VenueCard[] = [];
    for (const [venue, venueRows] of map.entries()) {
      // Pick a nice cover: first row with a valid thumb
      const coverRow = venueRows[0];
      if (!coverRow) continue;

      cards.push({
        venue,
        venueId: slugify(venue),
        coverThumb: thumbUrl(coverRow),
        coverFull: fullUrlFromThumb(coverRow),
        count: venueRows.length,
      });
    }

    // Sort with pinned venues first, then alphabetical
    const pinnedSet = new Set(PINNED_VENUES.map((v) => v.trim().toLowerCase()));

    return cards.sort((a, b) => {
      const ap = pinnedSet.has(a.venue.trim().toLowerCase()) ? 0 : 1;
      const bp = pinnedSet.has(b.venue.trim().toLowerCase()) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return a.venue.localeCompare(b.venue);
    });
  }, [rows]);

  if (loadError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-xl">
          <h1 className="text-3xl mb-3">Gallery loading error</h1>
          <p className="text-neutral-600 mb-6">{loadError}</p>
          <Link to="/gallery" className="text-neutral-600 hover:text-neutral-900">
            Back to Gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
        {/* Header removed (as requested). Optional tiny spacer: */}
        <div className="mb-2" />

        {venueCards.length === 0 ? (
          <div className="text-center py-20 text-neutral-600">
            No venues found yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venueCards.map((v) => (
              <Link
                key={v.venueId}
                to={`/gallery/venue/${v.venueId}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg"
              >
                <ImageWithFallback
                  src={v.coverThumb}
                  alt={v.venue}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <h2 className="text-white text-2xl mb-2">{v.venue}</h2>
                  <p className="text-white/85 text-sm mb-3">
                    {v.count} image{v.count !== 1 ? "s" : ""}
                  </p>
                  <div className="flex items-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm uppercase tracking-wider">Explore</span>
                    <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-2" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
