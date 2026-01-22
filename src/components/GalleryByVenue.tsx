import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

type CsvRow = {
  venue: string;
  category: string;
  filename: string;
  tags?: string;
};

// IMPORTANT: use your real R2 public dev domain here
const THUMB_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/thumb";

// Put your favourite venues here (use VENUE NAMES exactly as in CSV)
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
    const tags = tagsIdx !== -1 ? (cols[tagsIdx] || "").trim() : "";

    if (!venue || !category || !filename) continue;
    rows.push({ venue, category, filename, tags });
  }
  return rows;
}

function thumbUrl(venue: string, category: string, filename: string) {
  return `${THUMB_BASE}/${encSegment(venue)}/${encSegment(category)}/${encodeURIComponent(
    filename
  )}`;
}

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

  const venueCards = useMemo(() => {
    // pick one thumbnail per venue (first row encountered)
    const firstByVenue = new Map<string, CsvRow>();
    for (const r of rows) {
      if (!firstByVenue.has(r.venue)) firstByVenue.set(r.venue, r);
    }

    let cards = Array.from(firstByVenue.values()).map((r) => ({
      venue: r.venue,
      venueSlug: slugify(r.venue),
      coverThumb: thumbUrl(r.venue, r.category, r.filename),
    }));

    // Base ordering: alphabetical
    cards.sort((a, b) => a.venue.localeCompare(b.venue));

    // Pinning: move pinned to top (in your specified order)
    if (PINNED_VENUES.length) {
      const pinnedLower = PINNED_VENUES.map((v) => v.toLowerCase());
      const pinned: typeof cards = [];
      const rest: typeof cards = [];

      for (const c of cards) {
        if (pinnedLower.includes(c.venue.toLowerCase())) pinned.push(c);
        else rest.push(c);
      }

      pinned.sort(
        (a, b) =>
          pinnedLower.indexOf(a.venue.toLowerCase()) -
          pinnedLower.indexOf(b.venue.toLowerCase())
      );

      cards = [...pinned, ...rest];
    }

    return cards;
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
        <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
          <div>
            <h1 className="text-5xl mb-3">Venues</h1>
            <p className="text-neutral-600">
              Browse weddings by location
            </p>
          </div>
          <Link to="/gallery" className="text-neutral-600 hover:text-neutral-900">
            Back to Gallery
          </Link>
        </div>

        {venueCards.length === 0 ? (
          <div className="text-center py-20 text-neutral-600">No venues found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venueCards.map((v) => (
              <Link
                key={v.venueSlug}
                to={`/gallery/venue/${v.venueSlug}`}
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
