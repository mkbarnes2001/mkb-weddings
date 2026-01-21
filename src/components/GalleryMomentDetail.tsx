// src/components/GalleryMomentDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
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
};

const THUMB_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/thumb";
const FULL_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/full";

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

// Hero per moment (keys must match slugify(category))
const MOMENT_HERO: Record<string, string> = {
  "getting-ready": gettingReadyHero,
  ceremony: ceremonyHero,
  "couple-portraits": couplePortraitHero,
  "family-and-bridal-party": bridalPartyHero,
  "reception-and-party": receptionHero,
  "details-and-decor": detailsDecorHero,
};

// Curated overlay copy + SEO description
const MOMENT_COPY: Record<string, { title: string; description: string }> = {
  "getting-ready": {
    title: "Getting Ready",
    description: "Preparation, anticipation, and quiet moments before the ceremony.",
  },
  ceremony: {
    title: "Ceremony",
    description: "The vows, the emotion, and the moment you say “I do”.",
  },
  "couple-portraits": {
    title: "Couple Portraits",
    description: "Just the two of you — captured naturally and beautifully.",
  },
  "family-and-bridal-party": {
    title: "Family & Bridal Party",
    description: "Celebrating with the people who matter most.",
  },
  "reception-and-party": {
    title: "Reception & Party",
    description: "Speeches, laughter, dancing — the celebration in full swing.",
  },
  "details-and-decor": {
    title: "Details & Decor",
    description: "The thoughtful styling, florals, and finishing touches.",
  },
};

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

  const images = useMemo(() => {
    return momentRows.map((r) => ({
      thumb: thumbUrl(r),
      full: fullUrlFromThumb(r),
      alt: `${r.venue} – ${r.category}`,
      venue: r.venue,
    }));
  }, [momentRows]);

  const venues = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of momentRows) {
      map.set(r.venue, (map.get(r.venue) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([venue, count]) => ({ venue, count, venueId: slugify(venue) }))
      .sort((a, b) => a.venue.localeCompare(b.venue));
  }, [momentRows]);

  const copy = momentId ? MOMENT_COPY[momentId] : undefined;
  const title = copy?.title ?? momentNameFromCsv ?? "Moment";
  const description =
    copy?.description ?? "A curated selection of real wedding photographs.";

  const heroImage =
    (momentId && MOMENT_HERO[momentId]) ||
    images[0]?.full ||
    images[0]?.thumb ||
    "https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=1600&q=80";

  // SEO
  useEffect(() => {
    if (!momentId) return;
    const origin = window.location.origin;
    setSeoMeta({
      title: `${title} | MKB Weddings`,
      description: `${description} Browse ${images.length} image${images.length === 1 ? "" : "s"} across venues.`,
      canonical: `${origin}/gallery/moment/${encodeURIComponent(momentId)}`,
    });
  }, [momentId, title, description, images.length]);

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
      {/* HERO */}
      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback src={heroImage} alt={title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

        <div className="absolute inset-0">
          <div className="max-w-7xl mx-auto px-6 h-full flex flex-col justify-end pb-14">
            <div className="mb-6 flex items-center justify-between gap-6 flex-wrap">
              <Link
                to="/gallery/moments"
                className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Moments
              </Link>

              <nav className="text-white/75 text-sm flex items-center gap-2 flex-wrap">
                <Link to="/gallery" className="hover:text-white transition-colors">
                  Gallery
                </Link>
                <ChevronRight className="w-4 h-4 opacity-70" />
                <Link to="/gallery/moments" className="hover:text-white transition-colors">
                  Moments
                </Link>
                <ChevronRight className="w-4 h-4 opacity-70" />
                <span className="text-white">{title}</span>
              </nav>
            </div>

            <h1 className="text-white text-4xl md:text-5xl tracking-wide uppercase mb-4">
              {title}
            </h1>
            <p className="text-white/85 max-w-2xl text-base md:text-lg mb-6">{description}</p>

            <div className="text-white/80 text-sm uppercase tracking-wider">
              {images.length} image{images.length === 1 ? "" : "s"} across {venues.length} venue
              {venues.length === 1 ? "" : "s"}
            </div>

           </div>
        </div>
      </div>

      {/* GRID */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {images.length === 0 ? (
          <div className="text-center py-20 text-neutral-600">No images found for this moment.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((img, idx) => (
              <button
                key={`${img.thumb}-${idx}`}
                type="button"
                onClick={() => {
                  setLightboxIndex(idx);
                  setLightboxOpen(true);
                }}
                className="aspect-[4/3] overflow-hidden rounded-lg group cursor-pointer text-left"
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
