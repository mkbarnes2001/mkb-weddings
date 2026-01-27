import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";

type GalleryRow = {
  venue: string;
  category: string;
  filename: string; // ends in _500.webp
  tags?: string;
};

type VenueMetaRow = {
  venue: string; // must match gallery.csv venue EXACTLY
  venueName?: string; // venue-name
  venueLocation?: string; // venue-location
  venueWebsite?: string; // venue-website
  venueDescription?: string; // venue-description
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

function parseCsvLines(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).filter(Boolean);

  const parseLine = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (const ch of line) {
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

function parseGalleryCsv(csvText: string): GalleryRow[] {
  const rows = parseCsvLines(csvText);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.toLowerCase());
  const venueIdx = header.indexOf("venue");
  const categoryIdx = header.indexOf("category");
  const filenameIdx = header.indexOf("filename");
  const tagsIdx = header.indexOf("tags");

  if (venueIdx === -1 || categoryIdx === -1 || filenameIdx === -1) return [];

  return rows
    .slice(1)
    .map((cols) => ({
      venue: (cols[venueIdx] || "").trim(),
      category: (cols[categoryIdx] || "").trim(),
      filename: (cols[filenameIdx] || "").trim(),
      tags: tagsIdx !== -1 ? (cols[tagsIdx] || "").trim() : "",
    }))
    .filter((r) => r.venue && r.category && r.filename);
}

function parseVenueMetaCsv(csvText: string): VenueMetaRow[] {
  const rows = parseCsvLines(csvText);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.toLowerCase());
  const venueIdx = header.indexOf("venue");
  const nameIdx = header.indexOf("venue-name");
  const locIdx = header.indexOf("venue-location");
  const webIdx = header.indexOf("venue-website");
  const descIdx = header.indexOf("venue-description");

  if (venueIdx === -1) return [];

  return rows
    .slice(1)
    .map((cols) => ({
      venue: (cols[venueIdx] || "").trim(),
      venueName: nameIdx !== -1 ? (cols[nameIdx] || "").trim() : "",
      venueLocation: locIdx !== -1 ? (cols[locIdx] || "").trim() : "",
      venueWebsite: webIdx !== -1 ? (cols[webIdx] || "").trim() : "",
      venueDescription: descIdx !== -1 ? (cols[descIdx] || "").trim() : "",
    }))
    .filter((v) => v.venue);
}

function thumbUrl(r: GalleryRow) {
  return `${THUMB_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(r.filename)}`;
}

function fullUrlFromThumb(r: GalleryRow) {
  const filename2000 = r.filename.replace(/_500\.webp$/i, "_2000.webp");
  return `${FULL_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(filename2000)}`;
}

export function GalleryVenueDetail() {
  const { venueId } = useParams<{ venueId: string }>();

  const [galleryRows, setGalleryRows] = useState<GalleryRow[]>([]);
  const [venueMetaMap, setVenueMetaMap] = useState<Record<string, VenueMetaRow>>(
    {}
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadError(null);

        const [galleryRes, venueRes] = await Promise.all([
          fetch("/gallery.csv", { cache: "no-store" }),
          fetch("/galleryvenuedesc.csv", { cache: "no-store" }),
        ]);

        if (!galleryRes.ok) throw new Error("Failed to load gallery.csv");
        const galleryText = await galleryRes.text();
        const parsedGallery = parseGalleryCsv(galleryText);

        // venue metadata is optional
        let metaMap: Record<string, VenueMetaRow> = {};
        if (venueRes.ok) {
          const venueText = await venueRes.text();
          const parsedMeta = parseVenueMetaCsv(venueText);
          metaMap = {};
          for (const v of parsedMeta) metaMap[v.venue] = v;
        }

        if (!cancelled) {
          setGalleryRows(parsedGallery);
          setVenueMetaMap(metaMap);
        }
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || "Failed to load gallery data");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const venueRows = useMemo(() => {
    if (!venueId) return [];
    return galleryRows.filter((r) => slugify(r.venue) === venueId);
  }, [galleryRows, venueId]);

  const rawVenueKey = venueRows[0]?.venue || "";
  const meta = rawVenueKey ? venueMetaMap[rawVenueKey] : undefined;

  const displayName = meta?.venueName || rawVenueKey || "Venue";
  const location = meta?.venueLocation || "";
  const website = meta?.venueWebsite || "";
  const description = meta?.venueDescription || "";

  const images = useMemo(() => {
    return venueRows.map((r) => ({
      thumb: thumbUrl(r),
      full: fullUrlFromThumb(r),
      alt: `${displayName}${location ? `, ${location}` : ""} – ${r.category}`,
    }));
  }, [venueRows, displayName, location]);

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

  if (!rawVenueKey) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
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
      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback
          src={heroImage}
          alt={displayName}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-6 pb-14 w-full">
            <Link
              to="/gallery/venues"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Venues
            </Link>

            <h1 className="text-white text-5xl md:text-6xl mb-3">
              {displayName}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-white/85">
              {location && (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {location}
                </span>
              )}
              <span>{images.length} image{images.length !== 1 ? "s" : ""}</span>

              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-white hover:text-white/90 underline underline-offset-4"
                >
                  Venue website <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            {description && (
              <p className="mt-5 max-w-3xl text-white/90 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
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
