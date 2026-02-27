// src/components/GalleryByVenue.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ChevronRight } from "lucide-react";
import { Helmet } from "react-helmet-async";

type GalleryRow = {
  venue: string;
  category: string;
  filename: string; // ends in _500.webp
  tags?: string;
};

type VenueMetaRow = {
  venue: string; // must match gallery.csv venue EXACTLY
  venueName?: string; // venue-name
};

const THUMB_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/thumb";
const FULL_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/full";

const SITE_ORIGIN = "https://www.mkbweddings.co.uk";

const PINNED_VENUES: string[] = [
  "Orange Tree House",
  "Ballyscullion Park",
  "Tullyglass Hotel",
  "Killeavy Castle",
  "Slieve Donard Hotel",
  "Wool Tower",
  "merchant",
  "rabbit hotel and spa",
  "leighinmohr house hotel",
  "beech hill",
];

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

  if (venueIdx === -1) return [];

  return rows
    .slice(1)
    .map((cols) => ({
      venue: (cols[venueIdx] || "").trim(),
      venueName: nameIdx !== -1 ? (cols[nameIdx] || "").trim() : "",
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

type VenueCard = {
  venue: string; // raw
  venueId: string; // slug
  displayName: string; // venue-name or fallback
  coverThumb: string;
  coverFull: string;
  count: number;
};

export function GalleryByVenue() {
  const [galleryRows, setGalleryRows] = useState<GalleryRow[]>([]);
  const [venueNameMap, setVenueNameMap] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadError(null);
        const res = await fetch("/gallery.csv", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load gallery.csv");
        const text = await res.text();
        const parsed = parseGalleryCsv(text);
        if (!cancelled) setGalleryRows(parsed);
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || "Failed to load gallery.csv");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/galleryvenuedesc.csv", { cache: "no-store" });
        if (!res.ok) return;
        const text = await res.text();
        const parsed = parseVenueMetaCsv(text);

        const map: Record<string, string> = {};
        for (const v of parsed) {
          if (v.venueName) map[v.venue] = v.venueName;
        }
        if (!cancelled) setVenueNameMap(map);
      } catch {
        // optional file
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const venueCards = useMemo((): VenueCard[] => {
    const byVenue = new Map<string, GalleryRow[]>();
    for (const r of galleryRows) {
      const arr = byVenue.get(r.venue) ?? [];
      arr.push(r);
      byVenue.set(r.venue, arr);
    }

    const cards: VenueCard[] = [];
    for (const [venue, rows] of byVenue.entries()) {
      const coverRow = rows[0];
      if (!coverRow) continue;

      cards.push({
        venue,
        venueId: slugify(venue),
        displayName: venueNameMap[venue] || venue,
        coverThumb: thumbUrl(coverRow),
        coverFull: fullUrlFromThumb(coverRow),
        count: rows.length,
      });
    }

    const pinnedSet = new Set(PINNED_VENUES.map((v) => v.toLowerCase()));
    return cards.sort((a, b) => {
      const ap = pinnedSet.has(a.venue.toLowerCase()) ? 0 : 1;
      const bp = pinnedSet.has(b.venue.toLowerCase()) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [galleryRows, venueNameMap]);

  // --- SEO / Schema ---
  const canonical = `${SITE_ORIGIN}/gallery/venues`;

  const metaTitle = "Wedding Venue Galleries | Northern Ireland & Ireland | MKB Weddings";

  const metaDescription =
    "Browse real wedding photography by venue across Northern Ireland and Ireland. Explore venue galleries, style inspiration, and full wedding stories by MKB Weddings.";

  const ogImage =
    venueCards[0]?.coverFull ||
    venueCards[0]?.coverThumb ||
    `${SITE_ORIGIN}/android-chrome-512x512.png`;

  // ✅ Breadcrumbs: Home > Counties > Venues
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: metaTitle,
        description: metaDescription,
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
        inLanguage: "en-GB",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumbs`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
          {
            "@type": "ListItem",
            position: 2,
            name: "Counties",
            item: `${SITE_ORIGIN}/wedding-photographer`,
          },
          { "@type": "ListItem", position: 3, name: "Venues", item: canonical },
        ],
      },
    ],
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-xl">
          <Helmet>
            <title>Wedding Venue Galleries | MKB Weddings</title>
            <meta name="robots" content="noindex" />
          </Helmet>

          <h1 className="text-3xl mb-3">Gallery loading error</h1>
          <p className="text-neutral-600 mb-6">{loadError}</p>
          <Link
            to="/gallery"
            className="text-neutral-600 hover:text-neutral-900 underline underline-offset-4"
          >
            Back to Gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />

        <link rel="canonical" href={canonical} />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:type" content="website" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={ogImage} />

        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      {/* ✅ IMPORTANT: top padding to clear your fixed header */}
      {/* If your nav is taller/shorter, tweak pt-24/pt-28 */}
      <div className="max-w-7xl mx-auto px-6 pt-28 pb-12 md:pt-32 md:pb-16">
        {/* Visible breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex justify-center mb-10">
          <ol className="flex flex-wrap items-center justify-center gap-2 text-neutral-600 text-sm">
            <li>
              <Link to="/" className="hover:text-neutral-900 underline underline-offset-4">
                Home
              </Link>
            </li>
            <li className="opacity-60">
              <ChevronRight className="w-4 h-4" />
            </li>
            <li>
              <Link
                to="/wedding-photographer"
                className="hover:text-neutral-900 underline underline-offset-4"
              >
                Counties
              </Link>
            </li>
            <li className="opacity-60">
              <ChevronRight className="w-4 h-4" />
            </li>
            <li className="text-neutral-900">Venues</li>
          </ol>
        </nav>

        {/* H1 + intro */}
        <header className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-neutral-900 text-3xl md:text-4xl font-serif mb-4">
            Wedding Venue Galleries
          </h1>
          <p className="text-neutral-700 text-lg md:text-xl leading-relaxed">
            Browse real wedding photography by venue across <strong>Northern Ireland</strong> and{" "}
            <strong>Ireland</strong>. Use these galleries to see how a venue photographs in different
            seasons, light and weather — and to find inspiration for your own day.
          </p>
        </header>

        {venueCards.length === 0 ? (
          <div className="text-center py-20 text-neutral-600">No venues found yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venueCards.map((v) => (
              <Link
                key={v.venueId}
                to={`/gallery/venue/${v.venueId}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg"
              >
                <ImageWithFallback
                  src={v.coverThumb}
                  alt={`${v.displayName} wedding photography venue gallery`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <h2 className="text-white text-2xl mb-2">{v.displayName}</h2>
                  <p className="text-white/85 text-sm mb-3">
                    {v.count} image{v.count !== 1 ? "s" : ""}
                  </p>
                  <div className="flex items-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm uppercase tracking-wider">Explore</span>
                    <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-2" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}