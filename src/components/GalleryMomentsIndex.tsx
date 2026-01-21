import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ImageWithFallback } from "./figma/ImageWithFallback";

type CsvRow = {
  venue: string;
  category: string;
  filename: string; // ends in _500.webp
};

// IMPORTANT: use your real R2 public dev domain here (same as Venue page)
const THUMB_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/thumb";

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

  if (venueIdx === -1 || categoryIdx === -1 || filenameIdx === -1) {
    console.error("CSV header must be: venue,category,filename");
    return [];
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const venue = (cols[venueIdx] || "").trim();
    const category = (cols[categoryIdx] || "").trim();
    const filename = (cols[filenameIdx] || "").trim();
    if (!venue || !category || !filename) continue;
    rows.push({ venue, category, filename });
  }
  return rows;
}

function thumbUrl(r: CsvRow) {
  return `${THUMB_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(r.filename)}`;
}

export function GalleryMomentsIndex() {
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

  const moments = useMemo(() => {
    // group by category
    const map = new Map<
      string,
      { category: string; momentId: string; count: number; coverRow: CsvRow }
    >();

    for (const r of rows) {
      const key = r.category;
      if (!map.has(key)) {
        map.set(key, { category: r.category, momentId: slugify(r.category), count: 1, coverRow: r });
      } else {
        const v = map.get(key)!;
        v.count += 1;
      }
    }

    return Array.from(map.values()).sort((a, b) => a.category.localeCompare(b.category));
  }, [rows]);

  if (loadError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-xl">
          <h1 className="text-3xl mb-3">Gallery loading error</h1>
          <p className="text-neutral-600 mb-6">{loadError}</p>
          <Link to="/gallery/venues" className="text-neutral-600 hover:text-neutral-900">
            Back to Venues
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
          <div>
            <h1 className="text-4xl mb-2">Gallery by Moments</h1>
            <p className="text-neutral-600">
              Browse photos grouped by moment (category) across all venues.
            </p>
          </div>
          <Link to="/gallery/venues" className="text-neutral-600 hover:text-neutral-900">
            View by Venue
          </Link>
        </div>

        {moments.length === 0 ? (
          <div className="text-neutral-600">No moments found in gallery.csv.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {moments.map((m) => (
              <Link
                key={m.momentId}
                to={`/gallery/moments/${encodeURIComponent(m.momentId)}`}
                className="rounded-lg overflow-hidden border border-neutral-200 hover:shadow-md transition-shadow bg-white"
              >
                <div className="aspect-[4/3] overflow-hidden bg-neutral-100">
                  <ImageWithFallback
                    src={thumbUrl(m.coverRow)}
                    alt={m.category}
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                  />
                </div>
                <div className="p-4">
                  <div className="text-lg">{m.category}</div>
                  <div className="text-sm text-neutral-600">{m.count} images</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
