import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";

type CsvRow = {
  venue: string;
  category: string;
  filename: string; // thumbnail filename, ends in _500.webp
  tags?: string; // optional, if you added tags column
};

// IMPORTANT: use your real R2 public dev domain here
const THUMB_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/thumb";
const FULL_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/full";

/**
 * PINNED images PER VENUE.
 * Key must match the venue route param (slugify(venue)).
 * Values must be filenames EXACTLY as in CSV (use the _500.webp names).
 */
const PINNED_IMAGES: Record<string, string[]> = {};

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
  const tagsIdx = header.indexOf("tags"); // optional

  if (venueIdx === -1 || categoryIdx === -1 || filenameIdx === -1) {
    console.error("CSV header must include: venue,category,filename");
    return [];
  }

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

// ---- Stable shuffle helpers (no libs) ----
function hashString(input: string) {
  // deterministic 32-bit hash
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function stableShuffle<T>(items: T[], seed: string, keyFn: (t: T) => string) {
  return [...items].sort((a, b) => {
    const ha = hashString(seed + "::" + keyFn(a));
    const hb = hashString(seed + "::" + keyFn(b));
    return ha - hb;
  });
}

function applyPinnedThenShuffle(rows: CsvRow[], venueSlug: string) {
  const pinnedList = PINNED_IMAGES[venueSlug] ?? [];
  if (pinnedList.length === 0) {
    return stableShuffle(rows, `venue:${venueSlug}`, (r) => r.filename);
  }

  const byFilename = new Map<string, CsvRow[]>();
  for (const r of rows) {
    const arr = byFilename.get(r.filename) ?? [];
    arr.push(r);
    byFilename.set(r.filename, arr);
  }

  const pinnedRows: CsvRow[] = [];
  const pinnedSet = new Set<string>();
  for (const fn of pinnedList) {
    const matches = byFilename.get(fn);
    if (matches?.length) {
      pinnedRows.push(...matches);
      pinnedSet.add(fn);
    }
  }

  const remaining = rows.filter((r) => !pinnedSet.has(r.filename));
  const shuffledRemaining = stableShuffle(
    remaining,
    `venue:${venueSlug}`,
    (r) => r.filename
  );

  return [...pinnedRows, ...shuffledRemaining];
}

/** Make fast, consistent alt text for lots of images */
function buildAltText(r: CsvRow, index1Based: number) {
  const venue = r.venue?.trim();
  const category = r.category?.trim();
  const tags = (r.tags || "").trim();

  // If you have tags in CSV, they become a nice human phrase.
  // Example tags: "first dance; confetti; sunset" or "first dance, confetti"
  const tagPhrase = tags
    ? tags
        .split(/[;,|]/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 3)
        .join(", ")
    : "";

  const base = venue ? `${venue} wedding photography` : "Wedding photography";
  const withCategory = category ? `${base} – ${category}` : base;
  const withTags = tagPhrase ? `${withCategory} (${tagPhrase})` : withCategory;

  // Add sequence number to reduce duplicate alts across big galleries
  return `${withTags} – image ${index1Based}`;
}

export function GalleryVenueDetail() {
  const { venueId } = useParams<{ venueId: string }>();

  const [rows, setRows] = useState<CsvRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "shuffle">(
    "shuffle"
  );

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

  const venueRows = useMemo(() => {
    if (!venueId) return [];
    return rows.filter((r) => slugify(r.venue) === venueId);
  }, [rows, venueId]);

  const venueName = venueRows[0]?.venue || "";

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of venueRows) set.add(r.category);
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [venueRows]);

  const filteredRows = useMemo(() => {
    let out = venueRows;

    if (categoryFilter !== "all") {
      out = out.filter((r) => r.category === categoryFilter);
    }

    if (!venueId) return out;

    if (sortBy === "shuffle") {
      out = applyPinnedThenShuffle(out, venueId);
    } else if (sortBy === "oldest") {
      out = [...out].reverse();
    } else {
      out = [...out];
    }

    return out;
  }, [venueRows, categoryFilter, sortBy, venueId]);

  const images = useMemo(() => {
    return filteredRows.map((r, idx) => ({
      thumb: thumbUrl(r),
      full: fullUrlFromThumb(r),
      alt: buildAltText(r, idx + 1),
    }));
  }, [filteredRows]);

  // SEO strings
  const seoTitle = venueName
    ? `${venueName} Wedding Photographer | MKB Weddings`
    : "Wedding Venue Gallery | MKB Weddings";

  const seoDescription = venueName
    ? `View real weddings photographed at ${venueName}. Natural, relaxed wedding photography by MKB Weddings across Northern Ireland, Donegal, Monaghan & Cavan.`
    : "Browse wedding venue galleries by MKB Weddings across Northern Ireland, Donegal, Monaghan & Cavan.";

  // Canonical (helps avoid duplicate URLs)
  const canonicalUrl = venueId
    ? `https://www.mkbweddings.com/gallery/venue/${venueId}`
    : "https://www.mkbweddings.com/gallery/venues";

  if (loadError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <Helmet>
          <title>Gallery loading error | MKB Weddings</title>
          <meta name="description" content="There was a problem loading this gallery." />
          <link rel="canonical" href={canonicalUrl} />
        </Helmet>

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

  if (!venueName) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Helmet>
          <title>Venue Not Found | MKB Weddings</title>
          <meta name="description" content="This venue gallery could not be found." />
          <link rel="canonical" href={canonicalUrl} />
        </Helmet>

        <div className="text-center">
          <h1 className="text-4xl mb-4">Venue Not Found</h1>
          <Link to="/gallery/venues" className="text-neutral-600 hover:text-neutral-900">
            Back to Venues
          </Link>
        </div>
      </div>
    );
  }

  const heroImage =
    images[0]?.full ||
    images[0]?.thumb ||
    "https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=1600&q=80";

  return (
    <div className="min-h-screen bg-white">
      {/* ---------- SEO ---------- */}
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      {/* Hero */}
      <div className="relative h-[60vh] min-h-[400px]">
        <ImageWithFallback
          src={heroImage}
          alt={`${venueName} wedding photography hero`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-6 pb-16 w-full">
            <Link
              to="/gallery/venues"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Venues
            </Link>

            <h1 className="text-white text-5xl md:text-6xl mb-4 text-center md:text-left">
              {venueName}
            </h1>

            <p className="text-white flex items-center gap-2 justify-center md:justify-start">
              <MapPin className="w-4 h-4" />
              {images.length} {images.length === 1 ? "image" : "images"}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-10">
          <div className="flex gap-3 flex-wrap">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-neutral-300 rounded-lg bg-white"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All categories" : c}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-neutral-300 rounded-lg bg-white"
            >
              <option value="shuffle">Mixed (recommended)</option>
              <option value="recent">Recent first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          <div className="text-neutral-600">
            Showing {images.length} image{images.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Grid */}
        {images.length === 0 ? (
          <div className="text-center py-20 text-neutral-600">
            No images found for this venue.
          </div>
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
      </div>

      {/* Lightbox */}
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
