import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, MapPin, ChevronRight } from "lucide-react";
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

const SITE_ORIGIN = "https://www.mkbweddings.co.uk";

/* ---------------- Utilities ---------------- */

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

function thumbUrl(r: GalleryRow) {
  return `${THUMB_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(r.filename)}`;
}

function fullUrlFromThumb(r: GalleryRow) {
  return `${FULL_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(
    r.filename.replace(/_500\.webp$/i, "_2000.webp")
  )}`;
}

function getFallbackVenueDescription(name: string, location?: string) {
  return `Wedding photography at ${name}${
    location ? `, ${location}` : ""
  }. I photograph weddings here with a relaxed, documentary approach — capturing genuine moments and natural emotion throughout the day.`;
}

/* ---------------- Component ---------------- */

export function GalleryVenueDetail() {
  const { venueId } = useParams<{ venueId: string }>();

  const [galleryRows, setGalleryRows] = useState<GalleryRow[]>([]);
  const [venueMetaMap, setVenueMetaMap] =
    useState<Record<string, VenueMetaRow>>({});

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [venueId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [galleryRes, venueRes] = await Promise.all([
          fetch("/gallery.csv", { cache: "no-store" }),
          fetch("/galleryvenuedesc.csv", { cache: "no-store" }),
        ]);

        const galleryText = await galleryRes.text();
        if (!cancelled) {
          const rows = galleryText
            .split(/\r?\n/)
            .slice(1)
            .filter(Boolean)
            .map((line) => {
              const [venue, category, filename] = line.split(",");
              return {
                venue: venue?.trim(),
                category: category?.trim(),
                filename: filename?.trim(),
              } as GalleryRow;
            });
          setGalleryRows(rows);
        }

        if (venueRes.ok) {
          const venueText = await venueRes.text();
          const rows = venueText
            .split(/\r?\n/)
            .slice(1)
            .filter(Boolean)
            .map((line) => {
              const cols = line.split(",");
              return {
                venue: cols[0]?.trim(),
                venueName: cols[1]?.trim(),
                venueLocation: cols[2]?.trim(),
                venueWebsite: cols[3]?.trim(),
                venueDescription: cols[4]?.trim(),
              } as VenueMetaRow;
            });

          const map: Record<string, VenueMetaRow> = {};
          rows.forEach((r) => (map[r.venue] = r));
          if (!cancelled) setVenueMetaMap(map);
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const venueRows = useMemo(() => {
    if (!venueId) return [];
    return galleryRows.filter((r) => slugify(r.venue) === venueId);
  }, [galleryRows, venueId]);

  if (!venueRows.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Venue not found
      </div>
    );
  }

  const rawVenue = venueRows[0].venue;
  const meta = venueMetaMap[rawVenue];

  const name = meta?.venueName || rawVenue;
  const location = meta?.venueLocation || "";
  const website = meta?.venueWebsite || "";
  const description =
    meta?.venueDescription ||
    getFallbackVenueDescription(name, location);

  const images = venueRows.map((r) => ({
    thumb: thumbUrl(r),
    full: fullUrlFromThumb(r),
    alt: `${name}${location ? `, ${location}` : ""} – ${r.category}`,
  }));

  const heroImage = images[0]?.full;

  const canonical = `${SITE_ORIGIN}/gallery/venue/${venueId}`;

  const metaTitle = `${name} Wedding Photography | MKB Weddings`;

  /* ---------- Structured Data ---------- */

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: metaTitle,
        description,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_ORIGIN}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Gallery",
            item: `${SITE_ORIGIN}/gallery`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Venues",
            item: `${SITE_ORIGIN}/gallery/venues`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name,
            item: canonical,
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:image" content={heroImage} />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      {/* HERO */}
      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback
          src={heroImage}
          alt={name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Breadcrumb BELOW hero */}
      <div className="max-w-7xl mx-auto px-6 pt-10 text-center">
        <nav aria-label="Breadcrumb">
          <ol className="flex justify-center items-center flex-wrap gap-2 text-sm text-neutral-600">
            <li>
              <Link to="/" className="hover:underline">
                Home
              </Link>
            </li>
            <ChevronRight className="w-4 h-4" />
            <li>
              <Link to="/gallery" className="hover:underline">
                Gallery
              </Link>
            </li>
            <ChevronRight className="w-4 h-4" />
            <li>
              <Link to="/gallery/venues" className="hover:underline">
                Venues
              </Link>
            </li>
            <ChevronRight className="w-4 h-4" />
            <li className="text-neutral-900 font-medium">{name}</li>
          </ol>
        </nav>
      </div>

      {/* Intro */}
      <section className="max-w-4xl mx-auto px-6 pt-8 pb-16 text-center">
        <h1 className="text-3xl md:text-4xl font-serif mb-6">
          Wedding photography at {name}
          {location ? `, ${location}` : ""}
        </h1>

        {website && (
          <div className="mb-6">
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 underline"
            >
              Visit venue website <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        <p className="text-neutral-700 leading-relaxed">{description}</p>
      </section>

      {/* GRID */}
      <div className="max-w-7xl mx-auto px-6 pb-32">
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
          onNavigate={(i) => setLightboxIndex(i)}
        />
      )}
    </div>
  );
}
