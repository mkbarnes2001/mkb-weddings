import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";

// Hero images (Figma-selected)
import gettingReadyHero from "figma:asset/fb84c4cbee696343b417ad4224fe2d9c9960ad49.png";
import ceremonyHero from "figma:asset/824b08dfe2d92a128003e19c7f69fd10d28b2015.png";
import couplePortraitHero from "figma:asset/9caf1b2bbff1bbb43c7fe20f8da33be74aa354be.png";
import bridalPartyHero from "figma:asset/7bd3106c0b8c5268adbbc2617f84fb2440375cf1.png";
import receptionHero from "figma:asset/e2462e6839aea3c2d398e8bf894093d9d55e2977.png";
import detailsDecorHero from "figma:asset/7ec5ca5baceba029305e6928146e8f7050cf2009.png";

type CsvRow = {
  venue: string;
  category: string;
  filename: string; // ends in _500.webp
  tags?: string;
};

// R2 base
const THUMB_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/thumb";
const FULL_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/full";

// ---------------- helpers ----------------

function slugify(s: string) {
  return (s || "")
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
  const tagsIdx = header.indexOf("tags"); // optional

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

// stable shuffle (no new libs)
function hashStringToInt(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function stableShuffle<T>(arr: T[], seed: string, keyFn: (t: T) => string) {
  const copy = [...arr];
  copy.sort((a, b) => {
    const ha = hashStringToInt(seed + "|" + keyFn(a));
    const hb = hashStringToInt(seed + "|" + keyFn(b));
    return ha - hb;
  });
  return copy;
}

// Optional: pin a few images to the top PER MOMENT
// Use the _500.webp filenames exactly as in CSV.
const PINNED: Record<string, string[]> = {
  // ceremony: ["example_500.webp", "example2_500.webp"],
};

const MOMENT_META: Record<
  string,
  { name: string; description: string; hero: string; focus?: string }
> = {
  "getting-ready": {
    name: "Getting Ready",
    description: "Preparation and anticipation before the day begins.",
    hero: gettingReadyHero,
    focus: "center",
  },
  ceremony: {
    name: "Ceremony",
    description: "The vows, the emotion, and the moment you say “I do”.",
    hero: ceremonyHero,
    focus: "center",
  },
  "couple-portraits": {
    name: "Couple Portraits",
    description: "Just the two of you — natural, relaxed portraits.",
    hero: couplePortraitHero,
    focus: "center",
  },
  "family-bridal-party": {
    name: "Family and Bridal Party",
    description: "Celebrating with the people who mean the most.",
    hero: bridalPartyHero,
    focus: "center",
  },
  "reception-party": {
    name: "Reception and Party",
    description: "Dance, celebrate, and have fun into the night.",
    hero: receptionHero,
    focus: "center",
  },
  "details-decor": {
    name: "Details and Decor",
    description: "The little things that make your day uniquely yours.",
    hero: detailsDecorHero,
    focus: "center",
  },
};

export function GalleryMomentDetail() {
  const { momentId } = useParams<{ momentId: string }>();

  const meta = momentId ? MOMENT_META[momentId] : undefined;

  const [rows, setRows] = useState<CsvRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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

  const momentRows = useMemo(() => {
    if (!momentId) return [];
    return rows.filter((r) => slugify(r.category) === momentId);
  }, [rows, momentId]);

  const momentName = meta?.name || momentRows[0]?.category;
  const momentDescription = meta?.description;

  const images = useMemo(() => {
    const mapped = momentRows.map((r) => ({
      thumb: thumbUrl(r),
      full: fullUrlFromThumb(r),
      alt: `${r.venue} – ${r.category}`,
      venue: r.venue,
      filename: r.filename,
    }));

    // pinned first (optional)
    const pinnedList = momentId ? PINNED[momentId] || [] : [];
    const pinnedSet = new Set(pinnedList.map((x) => x.toLowerCase().trim()));
    const pinned = mapped.filter((m) =>
      pinnedSet.has(m.filename.toLowerCase().trim())
    );
    const rest = mapped.filter(
      (m) => !pinnedSet.has(m.filename.toLowerCase().trim())
    );

    // stable random order so it looks "mixed up"
    const shuffled = stableShuffle(rest, `moment-${momentId || "unknown"}-v1`, (m) => m.filename);

    return [...pinned, ...shuffled];
  }, [momentRows, momentId]);

  const venueCount = useMemo(() => {
    const set = new Set<string>();
    for (const r of momentRows) set.add(r.venue);
    return set.size;
  }, [momentRows]);

  const venues = useMemo(() => {
    const set = new Set<string>();
    for (const r of momentRows) set.add(r.venue);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [momentRows]);

  if (loadError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-xl">
          <h1 className="text-3xl mb-3">Gallery loading error</h1>
          <p className="text-neutral-600 mb-6">{loadError}</p>
          <Link to="/gallery/moments" className="text-neutral-600 hover:text-neutral-900">
            Back to Moments
          </Link>
        </div>
      </div>
    );
  }

  if (!momentName) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-xl">
          <h1 className="text-4xl mb-3">Moment Not Found</h1>
          <p className="text-neutral-600 mb-6">
            This moment doesn’t exist in gallery.csv (or has no images).
          </p>
          <Link to="/gallery/moments" className="text-neutral-600 hover:text-neutral-900">
            Back to Moments
          </Link>
        </div>
      </div>
    );
  }

  const heroSrc = meta?.hero || images[0]?.full || images[0]?.thumb;
  const heroFocus = meta?.focus || "center";

  return (
    <div className="min-h-screen bg-white">
      {/* HERO (same pattern as Creative Flash) */}
      <div className="relative h-[300px] md:h-[420px] overflow-hidden">
        {heroSrc && (
          <ImageWithFallback
            src={heroSrc}
            alt={momentName}
            className="w-full h-full object-cover"
            style={{ objectPosition: heroFocus }}
          />
        )}
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <h1 className="text-white text-center font-semibold drop-shadow leading-tight
                         text-[34px] sm:text-[42px] md:text-[56px] lg:text-[66px]
                         max-w-6xl mx-auto">
            {momentName.toUpperCase()}
          </h1>
        </div>
      </div>

      {/* CONTENT BELOW HERO (centered) */}
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-16">
        <div className="text-center mb-12">
          <Link
            to="/gallery/moments"
            className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-8 justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Moments
          </Link>

          {momentDescription && (
            <p className="brand-prose mx-auto mb-8">{momentDescription}</p>
          )}

          <div className="eyebrow">
            {images.length} IMAGES · {venueCount} VENUES
          </div>
        </div>

        {/* Venue pills (optional, but neat and still centered) */}
        {venues.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {venues.slice(0, 18).map((v) => (
              <span
                key={v}
                className="px-3 py-1 rounded-full border border-neutral-200 text-sm text-neutral-700 bg-white"
              >
                {v}
              </span>
            ))}
            {venues.length > 18 && (
              <span className="px-3 py-1 rounded-full border border-neutral-200 text-sm text-neutral-500 bg-white">
                +{venues.length - 18} more
              </span>
            )}
          </div>
        )}

        {/* GRID */}
        {images.length === 0 ? (
          <div className="text-center py-20 text-neutral-600">No images found for this moment.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((img, idx) => (
              <button
                key={`${img.thumb}-${idx}`}
                type="button"
                onClick={() => {
                  setLightboxIndex(idx);
                  setLightboxOpen(true);
                }}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg text-left"
              >
                <ImageWithFallback
                  src={img.thumb}
                  alt={img.alt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </button>
            ))}
          </div>
        )}

        {/* LIGHTBOX */}
        {lightboxOpen && images.length > 0 && (
          <ImageLightbox
            images={images.map((i) => i.full)}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
            onNavigate={(newIndex) => setLightboxIndex(newIndex)}
          />
        )}
      </div>
    </div>
  );
}
