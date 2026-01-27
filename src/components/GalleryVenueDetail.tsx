import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, ArrowLeft, ExternalLink } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";

type CsvRow = {
  venue: string;
  category: string;
  filename: string; // thumbnail filename, ends in _500.webp
  tags?: string;
};

type VenueMetaRow = {
  venue: string; // MUST match gallery.csv "venue" exactly (e.g. "Belmont" / "Orange Tree House")
  venueName?: string; // venue-name
  venueLocation?: string; // venue-location
  venueWebsite?: string; // venue-website
  venueDescription?: string; // venue-description
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
const PINNED_IMAGES: Record<string, string[]> = {
  // "orange-tree-house": ["filename_500.webp", "..."],
};

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

/** Minimal CSV parser (supports quoted values containing commas) */
function parseCsvLines(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).filter(Boolean);

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

  return lines.map(parseLine);
}

function parseGalleryCsv(csvText: string): CsvRow[] {
  const rows = parseCsvLines(csvText);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => (h || "").toLowerCase());
  const venueIdx = header.indexOf("venue");
  const categoryIdx = header.indexOf("category");
  const filenameIdx = header.indexOf("filename");
  const tagsIdx = header.indexOf("tags"); // optional

  if (venueIdx === -1 || categoryIdx === -1 || filenameIdx === -1) {
    console.error("gallery.csv header must include: venue,category,filename");
    return [];
  }

  const out: CsvRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    const venue = (cols[venueIdx] || "").trim();
    const category = (cols[categoryIdx] || "").trim();
    const filename = (cols[filenameIdx] || "").trim();
    const tags = tagsIdx !== -1 ? (cols[tagsIdx] || "").trim() : "";

    if (!venue || !category || !filename) continue;
    out.push({ venue, category, filename, tags });
  }
  return out;
}

function parseVenueMetaCsv(csvText: string): VenueMetaRow[] {
  const rows = parseCsvLines(csvText);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => (h || "").toLowerCase());

  const venueIdx = header.indexOf("venue");
  const nameIdx = header.indexOf("venue-name");
  const locIdx = header.indexOf("venue-location");
  const webIdx = header.indexOf("venue-website");
  const descIdx = header.indexOf("venue-description");

  if (venueIdx === -1) {
    console.error("galleryvenuedesc.csv header must include: venue");
    return [];
  }

  const out: VenueMetaRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    const venue = (cols[venueIdx] || "").trim();
    if (!venue) continue;

    out.push({
      venue,
      venueName: nameIdx !== -1 ? (cols[nameIdx] || "").trim() : "",
      venueLocation: locIdx !== -1 ? (cols[locIdx] || "").trim() : "",
      venueWebsite: webIdx !== -1 ? (cols[webIdx] || "").trim() : "",
      venueDescription: descIdx !== -1 ? (cols[descIdx] || "").trim() : "",
    });
  }
  return out;
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
    if (matches && matches.length) {
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

export function GalleryVenueDetail() {
  const { venueId } = useParams<{ venueId: string }>();

  const [rows, setRows] = useState<CsvRow[]>([]);
  const [venueMeta, setVenueMeta] = useState<VenueMetaRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "shuffle">(
    "shuffle"
  );

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Load gallery.csv (images)
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

  // Load galleryvenuedesc.csv (one row per venue)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/galleryvenuedesc.csv", { cache: "no-store" });
        if (!res.ok) return; // optional file
        const text = await res.text();
        const parsed = parseVenueMetaCsv(text);

        // Match by slugified venue name, so URLs stay stable
        const match =
          venueId
            ? parsed.find((v) => slugify(v.venue) === venueId) || null
            : null;

        if (!cancelled) setVenueMeta(match);
      } catch {
        // ignore (metadata optional)
        if (!cancelled) setVenueMeta(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [venueId]);

  const venueRows = useMemo(() => {
    if (!venueId) return [];
    return rows.filter((r) => slugify(r.venue) === venueId);
  }, [rows, venueId]);

  const baseVenueName = venueRows[0]?.venue || "";
  const displayVenueName =
    (venueMeta?.venueName?.trim() ? venueMeta.venueName.trim() : "") ||
    baseVenueName;

  const venueLocation = (venueMeta?.venueLocation || "").trim();
  const venueDescription = (venueMeta?.venueDescription || "").trim();
  const venueWebsite = (venueMeta?.venueWebsite || "").trim();

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
      out = [...out]; // recent = as-is CSV order
    }

    return out;
  }, [venueRows, categoryFilter, sortBy, venueId]);

  const images = useMemo(() => {
    return filteredRows.map((r, idx) => ({
      thumb: thumbUrl(r),
      full: fullUrlFromThumb(r),
      alt: `${displayVenueName}${venueLocation ? `, ${venueLocation}` : ""} wedding photography – ${r.category} – image ${idx + 1}`,
    }));
  }, [filteredRows, displayVenueName, venueLocation]);

  // Page canonical
  const canonical =
    venueId ? `https://www.mkbweddings.com/gallery/venue/${venueId}` : undefined;

  const seoTitle = displayVenueName
    ? `${displayVenueName} Wedding Photographer${venueLocation ? ` | ${venueLocation}` : ""} | MKB Weddings`
    : "Wedding Venue Gallery | MKB Weddings";

  const seoDescription =
    displayVenueName && venueLocation
      ? `Wedding photography at ${displayVenueName} in ${venueLocation}. Browse real weddings and natural, relaxed images by MKB Weddings.`
      : displayVenueName
      ? `Wedding photography at ${displayVenueName}. Browse real weddings and natural, relaxed images by MKB Weddings.`
      : "Browse wedding venue galleries by MKB Weddings.";

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

  if (!baseVenueName) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
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
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        {canonical ? <link rel="canonical" href={canonical} /> : null}
      </Helmet>

      {/* Hero */}
      <div className="relative h-[60vh] min-h-[400px]">
        <ImageWithFallback
          src={heroImage}
          alt={displayVenueName || baseVenueName}
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

            <h1 className="text-white text-5xl md:text-6xl mb-3 text-center md:text-left">
              {displayVenueName || baseVenueName}
            </h1>

            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 justify-center md:justify-start text-white/90">
              {venueLocation ? (
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {venueLocation}
                </p>
              ) : null}

              <p className="flex items-center gap-2 justify-center md:justify-start">
                <span className="opacity-80">
                  {images.length} {images.length === 1 ? "image" : "images"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Venue intro (only shows when you’ve added description) */}
      {(venueDescription || venueWebsite) && (
        <section className="max-w-5xl mx-auto px-6 py-12">
          {venueDescription ? (
            <div className="text-neutral-700 leading-relaxed space-y-4 text-lg">
              {venueDescription.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ) : null}

          {venueWebsite ? (
            <div className="mt-6">
              <a
                href={venueWebsite}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="inline-flex items-center gap-2 text-neutral-800 hover:text-neutral-950 underline"
              >
                Visit venue website <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ) : null}
        </section>
      )}

      {/* Filters + Grid */}
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
