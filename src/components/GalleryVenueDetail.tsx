// src/components/GalleryVenueDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, MapPin, ChevronRight } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";

type GalleryRow = {
  venue: string;
  category: string;
  filename: string; // ends in _500.webp
  tags?: string;
};

type VenueMetaRow = {
  venue: string;
  venueName?: string;
  venueLocation?: string;
  venueWebsite?: string;
  venueDescription?: string;
};

// R2 base URLs
const THUMB_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/thumb";
const FULL_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/full";

// Primary site origin (www + https)
const SITE_ORIGIN = "https://www.mkbweddings.co.uk";

// --- PINNED IMAGES (PER VENUE) ---------------------------------------------
const PINNED: Record<string, string[]> = {
  // ... keep your existing pinned map exactly as-is ...
  // (unchanged — omitted here for brevity)
};

// --- Ordering helpers (pinned + stable shuffle) -----------------------------
function hashString(input: string) {
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

  const rand = () => {
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

function applyPinnedOrder(rows: GalleryRow[], venueSlug: string, seed: string) {
  const pinnedFilenames = (PINNED[(venueSlug || "").toLowerCase()] || []).filter(
    Boolean
  );
  if (!pinnedFilenames.length) return stableShuffle(rows, seed);

  const pinnedSet = new Set(pinnedFilenames);

  const pinned: GalleryRow[] = [];
  for (const fn of pinnedFilenames) {
    const found = rows.find((r) => r.filename === fn);
    if (found) pinned.push(found);
  }

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

function cleanText(s: string) {
  // Trim + remove BOM + collapse whitespace + remove stray wrapping quotes
  const t = (s || "").replace(/^\uFEFF/, "").trim().replace(/\s+/g, " ");
  // Strip wrapping quotes repeatedly (handles weird """" cases)
  return t.replace(/^"+|"+$/g, "");
}

function parseCsvLines(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const parseLine = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        // Handle escaped quote inside quoted field: ""
        const next = line[i + 1];
        if (inQuotes && next === '"') {
          cur += '"';
          i++; // skip the escaped quote
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }

      if (ch === "," && !inQuotes) {
        out.push(cleanText(cur));
        cur = "";
        continue;
      }

      cur += ch;
    }

    out.push(cleanText(cur));
    return out;
  };

  return lines.map(parseLine);
}

function parseGalleryCsv(csvText: string): GalleryRow[] {
  const rows = parseCsvLines(csvText);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => cleanText(h).toLowerCase());
  const venueIdx = header.indexOf("venue");
  const categoryIdx = header.indexOf("category");
  const filenameIdx = header.indexOf("filename");
  const tagsIdx = header.indexOf("tags");

  if (venueIdx === -1 || categoryIdx === -1 || filenameIdx === -1) return [];

  return rows
    .slice(1)
    .map((cols) => ({
      venue: cleanText(cols[venueIdx] || ""),
      category: cleanText(cols[categoryIdx] || ""),
      filename: cleanText(cols[filenameIdx] || ""),
      tags: tagsIdx >= 0 ? cleanText(cols[tagsIdx] || "") : undefined,
    }))
    .filter((r) => r.venue && r.category && r.filename);
}

function parseVenueMetaCsv(csvText: string): VenueMetaRow[] {
  const rows = parseCsvLines(csvText);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => cleanText(h).toLowerCase());
  const venueIdx = header.indexOf("venue");
  const nameIdx = header.indexOf("venue-name");
  const locIdx = header.indexOf("venue-location");
  const webIdx = header.indexOf("venue-website");
  const descIdx = header.indexOf("venue-description");

  if (venueIdx === -1) return [];

  return rows
    .slice(1)
    .map((cols) => ({
      venue: cleanText(cols[venueIdx] || ""),
      venueName: nameIdx >= 0 ? cleanText(cols[nameIdx] || "") : "",
      venueLocation: locIdx >= 0 ? cleanText(cols[locIdx] || "") : "",
      venueWebsite: webIdx >= 0 ? cleanText(cols[webIdx] || "") : "",
      venueDescription: descIdx >= 0 ? cleanText(cols[descIdx] || "") : "",
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

function getFallbackVenueDescription(venueName: string, location?: string) {
  return `Wedding photography at ${venueName}${location ? `, ${location}` : ""}. I photograph weddings here with a relaxed, documentary approach — capturing genuine moments, natural emotion, and the atmosphere of the day as it unfolds. Ideal for couples who want authentic storytelling with a creative edge.`;
}

// ----------------------------------------------------------------------------
export function GalleryVenueDetail() {
  const { venueId } = useParams<{ venueId: string }>();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [venueId]);

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
        // silent fail
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

  const rawVenue = cleanText(venueRowsRaw[0]?.venue || "");
  const meta = rawVenue ? venueMetaMap[rawVenue] : undefined;

  // --- FIX: choose a sensible venue name ---
  // Prefer venue-name, else use the gallery venue before comma (avoids "Venue, Town" becoming the name)
  const fallbackName = rawVenue ? cleanText(rawVenue.split(",")[0]) : "";
  const name = cleanText(meta?.venueName || "") || fallbackName || rawVenue;

  const location = cleanText(meta?.venueLocation || "");
  const website = cleanText(meta?.venueWebsite || "");
  const description =
    cleanText(meta?.venueDescription || "") ||
    getFallbackVenueDescription(name, location);

  const introLine = `Wedding photography at ${name}${
    location ? `, ${location}` : ""
  }`;

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
          <Link
            to="/gallery/venues"
            className="text-neutral-600 hover:text-neutral-900"
          >
            Back to Venues
          </Link>
        </div>
      </div>
    );
  }

  const safeVenueId = (venueId || "").replace(/\/+$/, "");
  const canonical = `${SITE_ORIGIN}/gallery/venue/${encodeURIComponent(
    safeVenueId
  )}`;

  const metaTitle = `${name} Wedding Photography | MKB Weddings`;
  const metaDescription =
    cleanText(description) ||
    `Natural, documentary wedding photography at ${name}${
      location ? ` in ${location}` : ""
    }. View real weddings and venue galleries by MKB Weddings.`;

  const safeWebsite = website ? encodeURI(website) : "";

  // ---------- JSON-LD (Breadcrumbs + WebPage + ImageObject) ----------
  const breadcrumbItems = [
    { name: "Home", item: `${SITE_ORIGIN}/` },
    { name: "Gallery", item: `${SITE_ORIGIN}/gallery` },
    { name: "Venues", item: `${SITE_ORIGIN}/gallery/venues` },
    { name, item: canonical },
  ];

  const pageJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        url: `${SITE_ORIGIN}/`,
        name: "MKB Weddings",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: breadcrumbItems.map((b, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          name: b.name,
          item: b.item,
        })),
      },
      {
        "@type": "ImageObject",
        "@id": `${canonical}#primaryimage`,
        url: heroImage,
        contentUrl: heroImage,
        caption: `${name}${location ? `, ${location}` : ""} wedding photography`,
        representativeOfPage: true,
      },
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: metaTitle,
        description: metaDescription,
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
        breadcrumb: { "@id": `${canonical}#breadcrumb` },
        primaryImageOfPage: { "@id": `${canonical}#primaryimage` },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />

        <link rel="canonical" href={canonical} />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={heroImage} />
        <meta property="og:type" content="website" />

        <script type="application/ld+json">{JSON.stringify(pageJsonLd)}</script>
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
          <div className="w-full max-w-7xl mx-auto px-6 pb-20 md:pb-20 text-center">
            <Link
              to="/gallery/venues"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Venues
            </Link>

            <h1 className="text-white text-5xl md:text-6xl mb-4">{name}</h1>

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

      {/* CONTENT */}
      <section className="max-w-5xl mx-auto px-6 pt-10 pb-10 text-center">
        {/* Breadcrumbs BELOW hero, centered, with spacing */}
        <nav aria-label="Breadcrumb" className="mb-8 flex justify-center">
          <ol className="flex flex-wrap items-center justify-center gap-2 text-neutral-500 text-sm">
            <li>
              <Link to="/" className="hover:text-neutral-900 underline underline-offset-4">
                Home
              </Link>
            </li>
            <li className="opacity-70">
              <ChevronRight className="w-4 h-4" />
            </li>
            <li>
              <Link
                to="/gallery"
                className="hover:text-neutral-900 underline underline-offset-4"
              >
                Gallery
              </Link>
            </li>
            <li className="opacity-70">
              <ChevronRight className="w-4 h-4" />
            </li>
            <li>
              <Link
                to="/gallery/venues"
                className="hover:text-neutral-900 underline underline-offset-4"
              >
                Venues
              </Link>
            </li>
            <li className="opacity-70">
              <ChevronRight className="w-4 h-4" />
            </li>
            <li className="text-neutral-800">{name}</li>
          </ol>
        </nav>

        <p className="text-neutral-900 text-lg font-medium mb-8">{introLine}</p>

        {safeWebsite ? (
          <div className="mb-10">
            <a
              href={safeWebsite}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="inline-flex items-center gap-2 text-neutral-900 hover:text-neutral-700 underline underline-offset-4 justify-center"
            >
              Visit venue website <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ) : null}

        <div className="text-neutral-700 leading-relaxed text-lg space-y-5 mb-16">
          {description.split(/\n{2,}/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      {/* GRID */}
      <div className="max-w-7xl mx-auto px-6 pb-40">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((img, idx) => {
            const remainderLg = images.length % 3;
            const isLast = idx === images.length - 1;
            const shouldSpanLg = isLast && remainderLg === 1;

            return (
              <button
                key={`${img.thumb}-${idx}`}
                type="button"
                onClick={() => {
                  setLightboxIndex(idx);
                  setLightboxOpen(true);
                }}
                className={`aspect-[4/3] overflow-hidden rounded-lg group cursor-pointer text-left ${
                  shouldSpanLg ? "lg:col-span-3" : ""
                }`}
              >
                <ImageWithFallback
                  src={img.thumb}
                  alt={img.alt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </button>
            );
          })}
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
