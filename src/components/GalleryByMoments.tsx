import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ChevronRight } from "lucide-react";

// Your original Figma-selected images:
import gettingReadyImage from "figma:asset/fb84c4cbee696343b417ad4224fe2d9c9960ad49.png";
import ceremonyImage from "figma:asset/824b08dfe2d92a128003e19c7f69fd10d28b2015.png";
import couplePortraitImage from "figma:asset/9caf1b2bbff1bbb43c7fe20f8da33be74aa354be.png";
import bridalPartyImage from "figma:asset/7bd3106c0b8c5268adbbc2617f84fb2440375cf1.png";
import receptionImage from "figma:asset/e2462e6839aea3c2d398e8bf894093d9d55e2977.png";
import detailsDecorImage from "figma:asset/7ec5ca5baceba029305e6928146e8f7050cf2009.png";

type CsvRow = {
  venue: string;
  category: string;
  filename: string;
};

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

  if (venueIdx === -1 || categoryIdx === -1 || filenameIdx === -1) return [];

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

/**
 * Your curated Moments tiles (Figma-selected cover images + copy).
 * The `id` MUST match slugify(category) for the categories in your CSV.
 */
const MOMENT_TILES = [
  {
    id: "getting-ready",
    name: "Getting Ready",
    description: "Preparation and anticipation",
    image: gettingReadyImage,
  },
  {
    id: "ceremony",
    name: "Ceremony",
    description: 'The moment you say "I do"',
    image: ceremonyImage,
  },
  {
    id: "couple-portraits",
    name: "Couple Portraits",
    description: "Just the two of you",
    image: couplePortraitImage,
  },
  {
    id: "family-and-bridal-party",
    name: "Family and Bridal Party",
    description: "Celebrating with loved ones",
    image: bridalPartyImage,
  },
  {
    id: "reception-and-party",
    name: "Reception and Party",
    description: "Dance, celebrate, and have fun",
    image: receptionImage,
  },
  {
    id: "details-and-decor",
    name: "Details and Decor",
    description: "The little things that matter",
    image: detailsDecorImage,
  },
] as const;

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

  const countsByMomentId = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const id = slugify(r.category);
      map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [rows]);

  // Option A (recommended): show all your curated tiles, even if count is 0
  // const tilesToShow = MOMENT_TILES;

  // Option B: hide tiles that have no images in CSV
  const tilesToShow = useMemo(() => {
    return MOMENT_TILES.filter((t) => (countsByMomentId.get(t.id) ?? 0) > 0);
  }, [countsByMomentId]);

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
        {/* Moments Grid (preserves your Figma design) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tilesToShow.map((moment) => {
            const count = countsByMomentId.get(moment.id) ?? 0;
            return (
              <Link
                key={moment.id}
                to={`/gallery/moment/${encodeURIComponent(moment.id)}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg"
              >
                <ImageWithFallback
                  src={moment.image}
                  alt={moment.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <h2 className="text-white text-2xl mb-2">{moment.name}</h2>
                  <p className="text-white/90 text-sm mb-3">{moment.description}</p>
                  <div className="flex items-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm uppercase tracking-wider">
                      View Gallery{count ? ` (${count})` : ""}
                    </span>
                    <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-2" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {tilesToShow.length === 0 && (
          <div className="text-center py-20 text-neutral-600">
            No moments found (check gallery.csv categories).
          </div>
        )}
      </div>
    </div>
  );
}
