import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";

type GalleryRow = {
  venue: string;
  category: string;
  filename: string;
  tags?: string;
};

type VenueMetaRow = {
  venue: string;
  venueName?: string;
  venueLocation?: string;
  venueWebsite?: string;
  venueDescription?: string;
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

  return rows
    .slice(1)
    .map((cols) => ({
      venue: (cols[venueIdx] || "").trim(),
      category: (cols[categoryIdx] || "").trim(),
      filename: (cols[filenameIdx] || "").trim(),
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

  return rows
    .slice(1)
    .map((cols) => ({
      venue: (cols[venueIdx] || "").trim(),
      venueName: (cols[nameIdx] || "").trim(),
      venueLocation: (cols[locIdx] || "").trim(),
      venueWebsite: (cols[webIdx] || "").trim(),
      venueDescription: (cols[descIdx] || "").trim(),
    }))
    .filter((v) => v.venue);
}

function thumbUrl(r: GalleryRow) {
  return `${THUMB_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(r.filename)}`;
}

function fullUrlFromThumb(r: GalleryRow) {
  return `${FULL_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(r.filename.replace("_500.webp", "_2000.webp"))}`;
}

export function GalleryVenueDetail() {
  const { venueId } = useParams<{ venueId: string }>();

  const [galleryRows, setGalleryRows] = useState<GalleryRow[]>([]);
  const [venueMetaMap, setVenueMetaMap] = useState<Record<string, VenueMetaRow>>(
    {}
  );

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    (async () => {
      const [galleryRes, venueRes] = await Promise.all([
        fetch("/gallery.csv", { cache: "no-store" }),
        fetch("/galleryvenuedesc.csv", { cache: "no-store" }),
      ]);

      const galleryText = await galleryRes.text();
      setGalleryRows(parseGalleryCsv(galleryText));

      if (venueRes.ok) {
        const venueText = await venueRes.text();
        const parsed = parseVenueMetaCsv(venueText);
        const map: Record<string, VenueMetaRow> = {};
        parsed.forEach((v) => (map[v.venue] = v));
        setVenueMetaMap(map);
      }
    })();
  }, []);

  const venueRows = useMemo(
    () => galleryRows.filter((r) => slugify(r.venue) === venueId),
    [galleryRows, venueId]
  );

  const rawVenue = venueRows[0]?.venue || "";
  const meta = rawVenue ? venueMetaMap[rawVenue] : undefined;

  const name = meta?.venueName || rawVenue;
  const location = meta?.venueLocation || "";
  const description = meta?.venueDescription || "";
  const website = meta?.venueWebsite || "";

  const introLine = `Wedding photography at ${name}${
    location ? `, ${location}` : ""
  }`;

  const metaTitle = `${name} Wedding Photography | MKB Weddings`;

  const metaDescription =
    description ||
    `Natural, documentary wedding photography at ${name}${
      location ? ` in ${location}` : ""
    }. View real weddings and venue galleries by MKB Weddings.`;

  const images = venueRows.map((r) => ({
    thumb: thumbUrl(r),
    full: fullUrlFromThumb(r),
    alt: `${name}${location ? `, ${location}` : ""} – ${r.category}`,
  }));

  const heroImage = images[0]?.full;

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
      </Helmet>

      {/* HERO */}
      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback
          src={heroImage}
          alt={name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-6 pb-14 text-center">
            <Link
              to="/gallery/venues"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Venues
            </Link>

          <h1 className="text-white text-5xl md:text-6xl mb-2 text-center">
  {name}
</h1>
<p className="text-white/90 text-lg text-center">
  {introLine}
</p>
          </div>
        </div>
      </div>

      {/* VENUE INFO */}
      <section className="max-w-5xl mx-auto px-6 py-10 text-center">
        {location && (
         <div className="flex items-center justify-center gap-2 text-neutral-700 mb-4">
            <MapPin className="w-4 h-4" />
            <span>{location}</span>
          </div>
        )}

        {website && (
          <a
            href={website}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 underline mb-6"
          >
            Visit venue website <ExternalLink className="w-4 h-4" />
          </a>
        )}

        {description && (
          <div className="text-neutral-700 leading-relaxed space-y-4 text-lg text-center">
            {description.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
      </section>

      {/* GRID */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                setLightboxIndex(idx);
                setLightboxOpen(true);
              }}
              className="aspect-[4/3] overflow-hidden rounded-lg"
            >
              <ImageWithFallback
                src={img.thumb}
                alt={img.alt}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {lightboxOpen && (
        <ImageLightbox
          images={images.map((i) => i.full)}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
