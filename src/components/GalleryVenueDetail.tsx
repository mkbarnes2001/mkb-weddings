import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, ArrowLeft } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";

type CsvRow = {
  venue: string;
  category: string;
  filename: string; // thumbnail filename, ends in _500.webp
};

// IMPORTANT: use your real R2 public dev domain here
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

function fullUrlFromThumb(r: CsvRow) {
  const filename2000 = r.filename.replace(/_500\.webp$/i, "_2000.webp");
  return `${FULL_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(filename2000)}`;
}

export function GalleryVenueDetail() {
  const { venueId } = useParams<{ venueId: string }>();

  const [rows, setRows] = useState<CsvRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"recent" | "oldest">("recent");

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
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

  const venueName = venueRows[0]?.venue;

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of venueRows) set.add(r.category);
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [venueRows]);

  const filtered = useMemo(() => {
    let out = venueRows;

    if (categoryFilter !== "all") {
      out = out.filter((r) => r.category === categoryFilter);
    }

    if (sortBy === "oldest") {
      out = [...out].reverse();
    }

    return out;
  }, [venueRows, categoryFilter, sortBy]);

  const images = useMemo(() => {
    return filtered.map((r) => ({
      thumb: thumbUrl(r),
      full: fullUrlFromThumb(r),
      alt: `${r.venue} – ${r.category}`,
    }));
  }, [filtered]);

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

  if (!venueName) {
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
      {/* Hero */}
      <div className="relative h-[60vh] min-h-[400px]">
        <ImageWithFallback src={heroImage} alt={venueName} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Center-aligned hero content */}
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-6 pb-16 w-full text-center">
            <Link
              to="/gallery/venues"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Venues
            </Link>

            <h1 className="text-white text-5xl md:text-6xl mb-4">{venueName}</h1>
            <p className="text-white flex items-center gap-2 justify-center">
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
                  setLightboxImage(img.full);
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
      {lightboxImage && (
        <ImageLightbox
          images={images.map((i) => i.full)}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxImage(null)}
          onNavigate={(newIndex) => {
            setLightboxIndex(newIndex);
            setLightboxImage(images[newIndex]?.full ?? null);
          }}
        />
      )}
    </div>
  );
}
