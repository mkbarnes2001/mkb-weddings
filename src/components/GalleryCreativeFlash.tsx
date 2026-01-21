import { useEffect, useMemo, useState } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";

// Figma hero (already in your project)
import creativeFlashHero from "figma:asset/4e80a09ae14c9e2aaefa75a7ed64281f0bbc855b.png";

type CsvRow = {
  venue: string;
  category: string;
  filename: string; // _500.webp
  tags?: string; // optional
};

// Your R2 public base (same pattern as venues/moments)
const THUMB_BASE = "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/thumb";
const FULL_BASE = "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/full";

/**
 * Put these FIRST. Use filenames exactly as in CSV (the _500.webp names).
 * If you only have _2000.webp names, convert to _500.webp.
 */
const PINNED: string[] = [
  "MKB_weddings_mkb_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-killeavy-castle-wedding-photography-100_500.webp",
  "mkb-weddings-northern-ireland-wedding-photographer-killeavy-castle-newry-wedding-photography-113_500.webp",
  "mkb-weddings-irish-wedding-photographer-redcastle-hotel-moville-wedding-photography-24_500.webp",
  "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-112_500.webp"
];

// ----------------------- helpers --------------------------------------------

function normalize(s: string) {
  return (s || "").trim().toLowerCase();
}

function encSegment(s: string) {
  return encodeURIComponent(s);
}

function fullFromThumbFilename(filename500: string) {
  return filename500.replace(/_500\.webp$/i, "_2000.webp");
}

function thumbUrl(r: CsvRow) {
  return `${THUMB_BASE}/${encSegment(r.venue)}/${encSegment(r.category)}/${encodeURIComponent(
    r.filename
  )}`;
}

function fullUrl(r: CsvRow) {
  return `${FULL_BASE}/${encSegment(r.venue)}/${encSegment(r.category)}/${encodeURIComponent(
    fullFromThumbFilename(r.filename)
  )}`;
}

// tiny CSV parser (handles quotes)
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

  const header = parseLine(lines[0]).map((h) => normalize(h));
  const venueIdx = header.indexOf("venue");
  const categoryIdx = header.indexOf("category");
  const filenameIdx = header.indexOf("filename");
  const tagsIdx = header.indexOf("tags"); // optional

  if (venueIdx === -1 || categoryIdx === -1 || filenameIdx === -1) {
    console.error("CSV header must include: venue,category,filename (optional: tags)");
    return [];
  }

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

function hasTag(tags: string | undefined, target: string) {
  if (!tags) return false;
  // supports comma or | separated list
  const parts = tags
    .split(/[,\|]/g)
    .map((t) => normalize(t))
    .filter(Boolean);
  return parts.includes(normalize(target));
}

// Stable “random” order (no new libs)
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

// ----------------------- component ------------------------------------------

export function GalleryCreativeFlash() {
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

  const flashRows = useMemo(() => {
    // primary: tags column
    const tagged = rows.filter((r) => hasTag(r.tags, "creative-flash"));
    if (tagged.length > 0) return tagged;

    // fallback: category literal match if you ever use it
    return rows.filter((r) => normalize(r.category) === "creative flash");
  }, [rows]);

  const images = useMemo(() => {
    const mapped = flashRows.map((r) => ({
      thumb: thumbUrl(r),
      full: fullUrl(r),
      venue: r.venue,
      filename: r.filename,
      alt: `Creative Flash – ${r.venue}`,
    }));

    const pinnedSet = new Set(PINNED.map(normalize));
    const pinned = mapped.filter((m) => pinnedSet.has(normalize(m.filename)));
    const rest = mapped.filter((m) => !pinnedSet.has(normalize(m.filename)));

    // stable random
    const shuffled = stableShuffle(rest, "creative-flash-v1", (m) => m.filename);

    return [...pinned, ...shuffled];
  }, [flashRows]);

  if (loadError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-xl">
          <h1 className="text-3xl mb-3">Gallery loading error</h1>
          <p className="text-neutral-600 mb-6">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* HERO */}
      <div className="relative h-[320px] md:h-[420px] overflow-hidden mb-20">
        <ImageWithFallback
          src={creativeFlashHero}
          alt="Creative Flash Photography"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 flex items-center justify-center px-6">
      <h1 className="text-white text-center font-semibold drop-shadow leading-tight
               text-[34px] sm:text-[42px] md:text-[56px] lg:text-[68px]
               max-w-5xl mx-auto">
          Bold, dramatic, and unforgettable moments illuminated with expert flash lighting
    </h1>

        </div>
      </div>

      {/* TEXT */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="eyebrow mb-10 mt-2 text-center">
      Master of Flash Wedding Photography</div>

          <div className="brand-prose mx-auto">
            <p>
              Known as a master of flash wedding photography, MKB Weddings creates bold, vibrant,
              and dramatic images that stand out. Our flash photography expertise is perfect for
              evening portraits, dark venues, Irish weather conditions, and high-energy dance-floor
              shots.
            </p>

            <p>
              Using advanced off-camera flash techniques, we create striking editorial-style images
              with perfect lighting regardless of the conditions. From moody atmospheric shots to
              bright vibrant portraits, our flash work adds a unique artistic dimension to your
              wedding story.
            </p>
          </div>
        </div>

        {/* GRID */}
        {images.length === 0 ? (
          <div className="text-center py-20 text-neutral-600">No Creative Flash images found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-16">
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
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
                  <div className="text-white/95 text-sm tracking-wide">{img.venue}</div>
                </div>
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
