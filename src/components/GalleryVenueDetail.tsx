// src/components/GalleryVenueDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";

type GalleryRow = {
  venue: string;
  category: string;
  filename: string; // _500.webp
  tags?: string;
};

type VenueMetaRow = {
  venue: string;
  venueName?: string;
  venueLocation?: string;
  venueWebsite?: string;
  venueDescription?: string;
};

// R2 base URLs (same as your existing pages)
const THUMB_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/thumb";
const FULL_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/full";

// --- PINNED IMAGES (PER VENUE) ---------------------------------------------
// Use the _500.webp filenames exactly as in CSV.
// Keys must match the venueId slug in your URL (slugify(venue)).
const PINNED: Record<string, string[]> = {
  // Example:
  // "killeavy-castle": [
  //   "mkb-weddings-killeavy-castle-123_500.webp",
  //   "mkb-weddings-killeavy-castle-456_500.webp",
  // ],

  "orange-tree-house": [
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-orange-tree-house-greyabbey-wedding-photography-411_500.webp",
    "MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-411_500.webp",
    "MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-493_500.webp",
    "mkb-weddings-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-1.jpg_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-orange-tree-house-greyabbey-wedding-photography-618_500.webp",
    "MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-56_500.webp",
    "MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-357_500.webp",
    "MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-494_500.webp",
  ],

  
};

// --- Ordering helpers (pinned + stable shuffle) -----------------------------
function hashString(input: string) {
  // small stable hash (no libs)
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function stableShuffle<T>(arr: T[], seed: string) {
  const out = [...arr];
  let s = hashString(seed) || 1;

  // Fisher–Yates with deterministic PRNG
  const rand = () => {
    // xorshift32
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };

  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function applyPinnedOrder(
  rows: GalleryRow[],
  venueSlug: string,
  seed: string
): GalleryRow[] {
  const pinnedFilenames = (PINNED[venueSlug] || []).filter(Boolean);

  if (!pinnedFilenames.length) {
    return stableShuffle(rows, seed);
  }

  const pinnedSet = new Set(pinnedFilenames);

  // Keep pinned in the exact order you list them
  const pinned: GalleryRow[] = [];
  for (const fn of pinnedFilenames) {
    const found = rows.find((r) => r.filename === fn);
    if (found) pinned.push(found);
  }

  // Shuffle the rest (stable)
  const rest = rows.filter((r) => !pinnedSet.has(r.filename));
  const shuffledRest = stableShuffle(rest, seed);

  return [...pinned, ...shuffledRest];
}

// --- CSV helpers -------------------------------------------------------------
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
  const tagsIdx = header.indexOf("tags"); // optional

  if (venueIdx === -1 || categoryIdx === -1 || filenameIdx === -1) return [];

  return rows
    .slice(1)
    .map((cols) => ({
      venue: (cols[venueIdx] || "").trim(),
      category: (cols[categoryIdx] || "").trim(),
      filename: (cols[filenameIdx] || "").trim(),
      tags: tagsIdx >= 0 ? (cols[tagsIdx] || "").trim() : undefined,
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
      venueName: nameIdx >= 0 ? (cols[nameIdx] || "").trim() : "",
      venueLocation: locIdx >= 0 ? (cols[locIdx] || "").trim() : "",
      venueWebsite: webIdx >= 0 ? (cols[webIdx] || "").trim() : "",
      venueDescription: descIdx >= 0 ? (cols[descIdx] || "").trim() : "",
    }))
    .filter((v) => v.venue);
}

// --- URL builders ------------------------------------------------------------
function thumbUrl(r: GalleryRow) {
  return `${THUMB_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(r.filename)}`;
}

function fullUrlFromThumb(r: GalleryRow) {
  return `${FULL_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(r.filename.replace(/_500\.webp$/i, "_2000.webp"))}`;
}

// ----------------------------------------------------------------------------
export function GalleryVenueDetail() {
  const { venueId } = useParams<{ venueId: string }>();

  const [galleryRows, setGalleryRows] = useState<GalleryRow[]>([]);
  const [venueMetaMap, setVenueMetaMap] = useState<Record<string, VenueMetaRow>>(
    {}
  );

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [galleryRes, venueRes] = await Promise.all([
          fetch("/gallery.csv", { cache: "no-store" }),
          fetch("/galleryvenuedesc.csv", { cache: "no-store" }),
        ]);

        const galleryText = await galleryRes.text();
        if (!cancelled) setGalleryRows(parseGalleryCsv(galleryText));

        if (venueRes.ok) {
          const venueText = await venueRes.text();
          const parsed = parseVenueMetaCsv(venueText);

          const map: Record<string, VenueMetaRow> = {};
          parsed.forEach((v) => {
            map[v.venue] = v;
          });

          if (!cancelled) setVenueMetaMap(map);
        }
      } catch {
        // silent fail; page will just show "Venue not found" if no rows
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const venueRowsRaw = useMemo(() => {
    if (!venueId) return [];
    return galleryRows.filter((r) => slugify(r.venue) === venueId);
  }, [galleryRows, venueId]);

  const rawVenue = venueRowsRaw[0]?.venue || "";
  const meta = rawVenue ? venueMetaMap[rawVenue] : undefined;

  const name = meta?.venueName || rawVenue;
  const location = meta?.venueLocation || "";
  const website = meta?.venueWebsite || "";
  const description = meta?.venueDescription || "";

  const introLine = `Wedding photography at ${name}${location ? `, ${location}` : ""}`;

  // Apply pinned + stable shuffle per venue
  const venueRows = useMemo(() => {
    if (!venueRowsRaw.length) return [];
    const seed = `${venueId || ""}:${venueRowsRaw.length}`;
    return applyPinnedOrder(venueRowsRaw, venueId || "", seed);
  }, [venueRowsRaw, venueId]);

  const images = useMemo(() => {
    return venueRows.map((r) => ({
      thumb: thumbUrl(r),
      full: fullUrlFromThumb(r),
      alt: `${name}${location ? `, ${location}` : ""} – ${r.category}`,
      filename: r.filename,
    }));
  }, [venueRows, name, location]);

  const heroImage =
    images[0]?.full ||
    images[0]?.thumb ||
    "https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=1600&q=80";

  if (!venueRowsRaw.length) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-3xl mb-3">Venue not found</h1>
          <Link to="/gallery/venues" className="text-neutral-600 hover:text-neutral-900">
            Back to Venues
          </Link>
        </div>
      </div>
    );
  }

  const metaTitle = `${name} Wedding Photography | MKB Weddings`;
  const metaDescription =
    description ||
    `Natural, documentary wedding photography at ${name}${
      location ? ` in ${location}` : ""
    }. View real weddings and venue galleries by MKB Weddings.`;

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
      </Helmet>

      {/* HERO (match your venue hero styling, centred, slightly higher) */}
      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback
          src={heroImage}
          alt={name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          {/* pb raises the hero content */}
          <div className="w-full max-w-7xl mx-auto px-6 pb-24 md:pb-24 text-center">
            <Link
              to="/gallery/venues"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Venues
            </Link>

            <h1 className="text-white text-5xl md:text-6xl mb-4">{name}</h1>

            {/* White subtext under heading (location + count) */}
            <div className="flex flex-col items-center gap-2 text-white/90">
              {location ? (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{location}</span>
                </div>
              ) : null}

              <div className="text-white/85 text-sm">
                {images.length} {images.length === 1 ? "image" : "images"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VENUE INFO (under hero) */}
      <section className="max-w-5xl mx-auto px-6 pt-12 pb-10 text-center">
        <p className="text-neutral-900 text-lg font-medium mb-8">{introLine}</p>

        {website ? (
          <div className="mb-10">
            <a
              href={website}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="inline-flex items-center gap-2 text-neutral-900 hover:text-neutral-700 underline underline-offset-4 justify-center"
            >
              Visit venue website <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ) : null}

        {description ? (
          <div className="text-neutral-700 leading-relaxed text-lg space-y-5 mb-20">
            {description.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : (
          // More space before thumbnails even if no description
          <div className="mb-20" />
        )}
      </section>

      {/* GRID (extra gap from description) */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
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
