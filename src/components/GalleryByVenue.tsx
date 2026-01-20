import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

type CsvRow = {
  venue: string;
  category: string;
  filename: string; // expected to end _500.webp
};

type VenueCard = {
  venue: string;
  imageCount: number;
  thumbUrl: string; // first thumb we find for this venue
};

const R2_BASE = "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev";
const THUMB_BASE = `${R2_BASE}/thumb`;
const FULL_BASE = `${R2_BASE}/full`;

function enc(s: string) {
  return encodeURIComponent(s.trim());
}

// Minimal CSV parser that handles quoted commas.
// Expects header: venue,category,filename
function parseGalleryCsv(text: string): CsvRow[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) return [];

  // Parse a single CSV line (handles quotes)
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"' ) {
        // double quote inside quotes -> escaped quote
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
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

  if (venueIdx === -1 || categoryIdx === -1 || filenameIdx === -1) {
    console.error("CSV header must be: venue,category,filename");
    return [];
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const venue = (cols[venueIdx] || "").replace(/^"|"$/g, "").trim();
    const category = (cols[categoryIdx] || "").replace(/^"|"$/g, "").trim();
    const filename = (cols[filenameIdx] || "").replace(/^"|"$/g, "").trim();

    // Skip broken/blank rows
    if (!venue || !category || !filename) continue;

    rows.push({ venue, category, filename });
  }
  return rows;
}

function thumbUrlFromRow(r: CsvRow) {
  return `${THUMB_BASE}/${enc(r.venue)}/${enc(r.category)}/${encodeURIComponent(
    r.filename
  )}`;
}

function fullUrlFromThumbFilename(venue: string, category: string, filename500: string) {
  const filename2000 = filename500.replace("_500.webp", "_2000.webp");
  return `${FULL_BASE}/${enc(venue)}/${enc(category)}/${encodeURIComponent(filename2000)}`;
}

export function GalleryByVenue() {
  const [searchTerm, setSearchTerm] = useState("");
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

  const venues = useMemo<VenueCard[]>(() => {
    const byVenue = new Map<string, { count: number; thumb?: string }>();

    for (const r of rows) {
      const key = r.venue;
      const entry = byVenue.get(key) || { count: 0, thumb: undefined };
      entry.count += 1;
      if (!entry.thumb) entry.thumb = thumbUrlFromRow(r);
      byVenue.set(key, entry);
    }

    return Array.from(byVenue.entries())
      .map(([venue, v]) => ({
        venue,
        imageCount: v.count,
        thumbUrl:
          v.thumb ||
          "https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=600&q=80",
      }))
      .sort((a, b) => a.venue.localeCompare(b.venue));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return venues;
    return venues.filter((v) => v.venue.toLowerCase().includes(q));
  }, [venues, searchTerm]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        {/* Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search venues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
            />
          </div>
        </div>

        {/* Load error */}
        {loadError && (
          <div className="mb-8 p-4 border border-red-300 bg-red-50 rounded-lg text-red-800">
            <div className="font-semibold mb-1">Couldn’t load gallery data</div>
            <div className="text-sm">{loadError}</div>
            <div className="text-sm mt-2">
              Check that <code className="px-1 bg-white/60 rounded">public/gallery.csv</code> exists in the repo and redeployed.
            </div>
          </div>
        )}

        {/* Count */}
        <div className="mb-8 text-neutral-600">
          Showing {filtered.length} venue{filtered.length !== 1 ? "s" : ""}
        </div>

        {/* Venue Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((v) => (
            <Link
              key={v.venue}
              to={`/gallery/venue/${encodeURIComponent(v.venue)}`}
              className="group"
            >
              <div className="aspect-[4/3] overflow-hidden rounded-lg mb-4">
                <ImageWithFallback
                  src={v.thumbUrl}
                  alt={v.venue}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
              <h3 className="text-2xl mb-2 group-hover:text-neutral-600 transition-colors">
                {v.venue}
              </h3>
              <p className="text-sm text-neutral-500">
                {v.imageCount} {v.imageCount === 1 ? "image" : "images"}
              </p>
            </Link>
          ))}
        </div>

        {/* No Results */}
        {!loadError && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xl text-neutral-600">No venues found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
