// src/components/GalleryMomentDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";

// Optional Figma hero images (recommended for consistent look)
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
};

// Your R2 public base URLs
const THUMB_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/thumb";
const FULL_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/full";

// Toggle: stable “mixed” order per moment (optional)
const ENABLE_STABLE_SHUFFLE = false;

// Toggle: use Figma hero images; fallback to first gallery image if missing
const USE_FIGMA_HERO = true;

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
    console.error("CSV header must include: venue, category, filename");
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

function fullUrlFromThumb(r: CsvRow) {
  const filename2000 = r.filename.replace(/_500\.webp$/i, "_2000.webp");
  return `${FULL_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(filename2000)}`;
}

// SEO helper
function setSeoMeta(args: { title: string; description: string; canonical?: string }) {
  document.title = args.title;

  let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", args.description);

  if (args.canonical) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", args.canonical);
  }
}

// Stable shuffle (optional)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFromString(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function shuffledStable<T>(arr: T[], seedKey: string) {
  const rng = mulberry32(seedFromString(seedKey));
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Curated copy + hero per moment (keys must match slugify(category) in CSV)
const MOMENT_CONFIG: Record<
  string,
  { title: string; description: string; seoDescription?: string; hero?: string }
> = {
  "getting-ready": {
    title: "Getting Ready",
    description: "Preparation, anticipation, and quiet moments before the ceremony.",
    seoDescription:
      "Getting ready wedding photography – preparation, details, and candid moments before the ceremony.",
    hero: gettingReadyHero,
  },
  ceremony: {
    title: "Ceremony",
    description: 'The vows, the emotion, and the moment you say “I do”.',
    seoDescription:
      "Ceremony wedding photography – vows, reactions, and emotional moments captured naturally.",
    hero: ceremonyHero,
  },
  "couple-portraits": {
    title: "Couple Portraits",
    description: "Just the two of you — captured naturally and beautifully.",
    seoDescription:
      "Couple portraits wedding photography – romantic portraits, natural moments, and beautiful light.",
    hero: couplePortraitHero,
  },
  "family-and-bridal-party": {
    title: "Family & Bridal Party",
    description: "Celebrating with the people who matter most.",
    seoDescription:
      "Family and bridal party wedding photography – group portraits and candid celebration moments.",
    hero: bridalPartyHero,
  },
  "reception-and-party": {
    title: "Reception & Party",
    description: "Speeches, laughter, dancing — the celebration in full swing.",
    seoDescription:
      "Reception wedding photography – speeches, dancing, and the best party moments of the day.",
    hero: receptionHero,
  },
  "details-and-decor": {
    title: "Details & Decor",
    description: "The thoughtful styling, florals, and finishing touches.",
    seoDescription:
      "Wedding details photography – décor, styling, florals, and the little things that matter.",
    hero: detailsDecorHero,
  },
};

/**
 * Adjust hero crop focus per moment.
 * Examples:
 *  - "50% 50%" center
 *  - "50% 60%" lower (shows more bottom)
 *  - "50% 40%" higher (shows more top)
 */
const HERO_FOCUS: Record<string, string> = {
  "getting-ready": "50% 45%",
  ceremony: "50% 55%",
  "couple-portraits": "50% 60%",
  "family-and-bridal-party": "50% 55%",
  "reception-and-party": "50% 55%",
  "details-and-decor": "50% 50%",
};

export function GalleryMomentDetail() {
  const { momentId } = useParams<{ momentId: string }>();

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

  const momentNameFromCsv = momentRows[0]?.category;

  const venuesCount = useMemo(() => {
    const set = new Set<string>();
    for (const r of momentRows) set.add(r.venue);
    return set.size;
  }, [momentRows]);

  const images = useMemo(() => {
    const base = momentRows.map((r) => ({
      thumb: thumbUrl(r),
      full: fullUrlFromThumb(r),
      alt: `${r.venue} – ${r.category}`,
      venue: r.venue,
      filename: r.filename,
    }));
    if (ENABLE_STABLE_SHUFFLE) return shuffledStable(base, momentId ?? "moment");
    return base;
  }, [momentRows, momentId]);

  const cfg = momentId ? MOMENT_CONFIG[momentId] : undefined;
  const title = cfg?.title ?? momentNameFromCsv ?? "Moment";
  const description = cfg?.description ?? "A curated selection of wedding images.";

  const heroImage =
    (USE_FIGMA_HERO ? cfg?.hero : undefined) ||
    images[0]?.full ||
    images[0]?.thumb ||
    "https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=1600&q=80";

  const heroFocus = (momentId && HERO_FOCUS[momentId]) || "50% 50%";

  // SEO
  useEffect(() => {
    if (!momentId) return;

    const pageTitle = `${title} | MKB Weddings`;
    const pageDesc =
      cfg?.seoDescription ??
      `${description} Browse ${images.length} image${images.length === 1 ? "" : "s"} across venues.`;

    setSeoMeta({
      title: pageTitle,
      description: pageDesc,
      canonical: `${window.location.origin}/gallery/moment/${encodeURIComponent(momentId)}`,
    });
  }, [momentId, title, description, images.length, cfg?.seoDescription]);

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

  if (!momentNameFromCsv) {
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

  return (
    <div className="min-h-screen bg-white">
      {/* HERO (hard-fixed height, cropped, no text on hero) */}
      <div className="relative h-[220px] md:h-[300px] overflow-hidden">
        <ImageWithFallback
          src={heroImage}
          alt={title}
          className="w-full h-full object-cover"
          style={{ objectPosition: heroFocus }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-black/10 to-transparent" />
      </div>

      {/* HEADER + META (below hero) */}
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-10">
        <Link
          to="/gallery/moments"
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Moments
        </Link>

        <h1 className="text-4xl md:text-5xl uppercase tracking-widest text-neutral-900 mb-6">
          {title}
        </h1>

        <p className="text-neutral-700 text-lg max-w-3xl leading-relaxed mb-10">
          {description}
        </p>

        <div className="text-neutral-500 text-sm uppercase tracking-wider">
          {images.length} image{images.length === 1 ? "" : "s"} · {venuesCount} venue
          {venuesCount === 1 ? "" : "s"}
        </div>
      </div>

      {/* GRID */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        {images.length === 0 ? (
          <div className="text-center py-20 text-neutral-600">No images found for this moment.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((img, idx) => (
              <div key={`${img.thumb}-${idx}`}>
                <button
                  type="button"
                  onClick={() => {
                    setLightboxIndex(idx);
                    setLightboxOpen(true);
                  }}
                  className="w-full aspect-[4/3] overflow-hidden rounded-lg group cursor-pointer text-left"
                  aria-label={`Open image ${idx + 1}`}
                >
                  <ImageWithFallback
                    src={img.thumb}
                    alt={img.alt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </button>

                {/* Simple story-style caption */}
                <div className="mt-2 text-sm text-neutral-600">{img.venue}</div>
              </div>
            ))}
          </div>
        )}
      </div>

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
  );
}
