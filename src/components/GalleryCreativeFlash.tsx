// src/components/GalleryCreativeFlash.tsx
import { useEffect, useMemo, useState } from "react";
import { Zap } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";
import {
  fetchGalleryRows,
  hasTag,
  thumbUrl,
  fullUrlFromThumb,
} from "../lib/galleryCsv";

// Figma-selected hero image (keep or swap to your preferred one)
import creativeFlashHero from "figma:asset/4e80a09ae14c9e2aaefa75a7ed64281f0bbc855b.png";

function setSeo(title: string, description: string) {
  document.title = title;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", description);
}
// --- Ordering helpers (pinned + stable shuffle) -----------------------------

// Put these FIRST. Use filenames exactly as in CSV (the _500.webp names).
// Example moment-style pinned, but for creative flash page:
const PINNED: string[] = [
  "MKB_weddings_mkb_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-killeavy-castle-wedding-photography-100_500.webp",
  "mkb-weddings-northern-ireland-wedding-photographer-killeavy-castle-newry-wedding-photography-113_500.webp",
  "mkb-weddings-irish-wedding-photographer-redcastle-hotel-moville-wedding-photography-24_500.webp",
  "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-112_500.webp"
];

// Simple hash for stable “random” ordering (no libraries)
function hashStringToInt(str: string) {
  let h = 2166136261; // FNV-ish
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Stable shuffle:
 * - same order for the same seed
 * - changes if you change the seed (or add/remove images)
 */
function stableShuffle<T>(arr: T[], seed: string, keyFn: (t: T) => string) {
  const copy = [...arr];
  copy.sort((a, b) => {
    const ka = keyFn(a);
    const kb = keyFn(b);
    const ha = hashStringToInt(seed + "|" + ka);
    const hb = hashStringToInt(seed + "|" + kb);
    return ha - hb;
  });
  return copy;
}

function normalizeFilename(name: string) {
  return (name || "").trim().toLowerCase();
}

export function GalleryCreativeFlash() {
  const [rows, setRows] = useState<any[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    setSeo(
      "Creative Flash Wedding Photography | MKB Weddings",
      "Bold, dramatic, and unforgettable moments illuminated with expert flash lighting."
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadError(null);
        const parsed = await fetchGalleryRows();
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
    return rows.filter((r) => hasTag(r, "creative-flash"));
  }, [rows]);

const featured = useMemo(() => {
  const mapped = flashRows.map((r) => ({
    thumb: thumbUrl(r),
    full: fullUrlFromThumb(r),
    alt: `Creative Flash – ${r.venue}`,
    venue: r.venue,
    filename: r.filename, // CSV filename (thumb version)
  }));

  // 1) Pull out pinned first (match by CSV filename)
  const pinnedSet = new Set(PINNED.map(normalizeFilename));

  const pinned = mapped.filter((m) => pinnedSet.has(normalizeFilename(m.filename)));
  const rest = mapped.filter((m) => !pinnedSet.has(normalizeFilename(m.filename)));

  // 2) Stable shuffle the remainder (seed can be whatever you want)
  // If you want it to change occasionally, change the seed string.
  const shuffled = stableShuffle(rest, "creative-flash-v1", (m) => m.filename);

  // 3) Final order: pinned first, then shuffled
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
      <div className="relative h-[320px] md:h-[420px] overflow-hidden mb-32">
        <ImageWithFallback
          src={creativeFlashHero}
          alt="Creative Flash Photography"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/90 mb-4">
              <Zap className="w-5 h-5 text-neutral-900" />
            </div>

            <div className="text-white/90 text-xs uppercase tracking-[0.25em] mb-3">
              Creative Flash Photography
            </div>

            <h1 className="text-white font-serif text-2xl md:text-4xl leading-tight max-w-4xl mx-auto">
              Bold, dramatic, and unforgettable moments illuminated with expert flash lighting
            </h1>
          </div>
        </div>
      </div>

      {/* BODY COPY */}
      <div className="max-w-5xl mx-auto px-6 pt-8 md:pt-12">
        <h2 className="text-center font-serif text-sm uppercase tracking-widest text-neutral-800 mb-8">
          Master of Flash Wedding Photography
        </h2>

        <div className="text-center font-serif text-lg leading-relaxed text-neutral-700 space-y-8 mb-36">
          <p>
            Known as a master of flash wedding photography, MKB Weddings creates bold, vibrant, and
            dramatic images that stand out. Our flash photography expertise is perfect for evening
            portraits, dark venues, Irish weather conditions, and high-energy dance-floor shots.
          </p>

          <p>
            Using advanced off-camera flash techniques, we create striking editorial-style images
            with perfect lighting regardless of the conditions. From moody atmospheric shots to
            bright vibrant portraits, our flash work adds a unique artistic dimension to your
            wedding story.
          </p>
        </div>
      </div>

      {/* GALLERY GRID (Moments-sized + venue caption) */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        {featured.length === 0 ? (
          <div className="text-center py-20 text-neutral-600">
            No images tagged <span className="font-medium">creative-flash</span> yet.
            <div className="mt-2 text-neutral-500 text-sm">
              Add <code>creative-flash</code> in the <code>tags</code> column for any row.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((img, idx) => (
              <div key={`${img.thumb}-${idx}`}>
                <button
                  type="button"
                  onClick={() => {
                    setLightboxIndex(idx);
                    setLightboxOpen(true);
                  }}
                  className="aspect-[4/3] overflow-hidden rounded-lg group cursor-pointer text-left bg-neutral-100 w-full"
                  aria-label={`Open Creative Flash image ${idx + 1}`}
                >
                  <ImageWithFallback
                    src={img.thumb}
                    alt={img.alt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </button>

                <div className="mt-2 text-sm text-neutral-600">{img.venue}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LIGHTBOX */}
      {lightboxOpen && featured.length > 0 && (
        <ImageLightbox
          images={featured.map((i) => i.full)}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={(newIndex) => setLightboxIndex(newIndex)}
        />
      )}
    </div>
  );
}
