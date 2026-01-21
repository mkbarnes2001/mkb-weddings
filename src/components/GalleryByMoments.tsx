import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ChevronRight } from "lucide-react";

type CsvRow = {
  venue: string;
  category: string;
  filename: string; // ends in _500.webp
};

// Your working R2 public domain (same as Venue pages)
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

  // Tiny CSV parser that respects quotes
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

// Optional: keep your Figma moment descriptions.
// Key is slugified category (momentId in the URL).
const MOMENT_DESCRIPTIONS: Record<string, string> = {
  "getting-ready": "Intimate moments as the day begins",
  ceremony: "The vows, the emotions, the magic",
  "couple-portraits": "Beautiful portraits together",
  "family-bridal-party": "Your people, your joy",
  "reception-party": "Energy, speeches and dancing",
  "details-decor": "The styling, florals and finishing touches",
};

export function GalleryByMoments() {
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
      { id: string; name: string; description: string; cover: string; count: number }
    >();

    for (const r of rows) {
      const id = slugify(r.category);
      const existing = map.get(id);
      if (!existing) {
        map.set(id, {
          id,
          name: r.category,
          description: MOMENT_DESCRIPTIONS[id] ?? "View the gallery",
          cover: thumbUrl(r), // first image becomes cover
          count: 1,
        });
      } else {
        existing.count += 1;
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
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
        {/* Moments Grid (same design as your Figma cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {moments.map((moment) => (
            <Link
              key={moment.id}
              to={`/gallery/moment/${encodeURIComponent(moment.id)}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg"
            >
              <ImageWithFallback
                src={moment.cover}
                alt={moment.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <h2 className="text-white text-2xl mb-2">{moment.name}</h2>
                <p className="text-white/90 text-sm mb-3">{moment.description}</p>

                <div className="flex items-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm uppercase tracking-wider">
                    View Gallery{moment.count ? ` (${moment.count})` : ""}
                  </span>
                  <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-2" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {moments.length === 0 && (
          <div className="text-center py-20 text-neutral-600">No moments found.</div>
        )}
      </div>
    </div>
  );
}
