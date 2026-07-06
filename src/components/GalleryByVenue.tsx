import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Helmet } from "react-helmet-async";
import {
  fetchGalleryRows,
  fullUrlFromThumb,
  imageAlt,
  slugify,
  thumbUrl,
  type CsvRow,
} from "../lib/galleryCsv";

type GalleryRow = CsvRow;

type VenueMetaRow = {
  venue: string; // must match gallery.csv venue EXACTLY
  venueName?: string; // venue-name
};

const SITE_ORIGIN = "https://www.mkbweddings.co.uk";

const HERO_IMAGE =
  "https://images.mkbweddings.co.uk/full/Crover%20House/couple%20portraits/mkb-weddings-irish-wedding-photographer-crover-house-cavan-wedding-photography-9_2000.webp";

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

function parseCsvLines(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).filter(Boolean);

  const parseLine = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      const next = line[i + 1];

      if (ch === '"' && inQuotes && next === '"') {
        cur += '"';
        i += 1;
        continue;
      }

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

type VenueCard = {
  venue: string; // raw
  venueId: string; // slug
  displayName: string; // venue-name or fallback
  coverThumb: string;
  coverFull: string;
  coverRow: GalleryRow;
  count: number;
};

function isVenuePinned(row: GalleryRow) {
  return ["y", "yes", "true", "1", "pin", "pinned"].includes(
    (row.venuePin || "").trim().toLowerCase(),
  );
}

function venuePinOrder(row: GalleryRow) {
  const value = Number((row.venuePinOrder || "").trim());
  return Number.isFinite(value) && value > 0 ? value : 9999;
}

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
        const rows = await fetchGalleryRows();
        if (!cancelled) setGalleryRows(rows);
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || "Failed to load gallery data");
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
        // optional
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const venueCards = useMemo((): VenueCard[] => {
    const byVenue = new Map<string, GalleryRow[]>();

    for (const row of galleryRows) {
      const arr = byVenue.get(row.venue) ?? [];
      arr.push(row);
      byVenue.set(row.venue, arr);
    }

    const cards: VenueCard[] = [];

    for (const [venue, rows] of byVenue.entries()) {
      const pinnedCover = rows
        .filter(isVenuePinned)
        .sort((a, b) => {
          const orderA = venuePinOrder(a);
          const orderB = venuePinOrder(b);

          if (orderA !== orderB) return orderA - orderB;

          return a.filename.localeCompare(b.filename);
        })[0];

      const coverRow = pinnedCover || rows[0];
      if (!coverRow) continue;

      cards.push({
        venue,
        venueId: slugify(venue),
        displayName: venueNameMap[venue] || venue,
        coverThumb: thumbUrl(coverRow),
        coverFull: fullUrlFromThumb(coverRow),
        coverRow,
        count: rows.length,
      });
    }

    const pinnedSet = new Set(PINNED_VENUES.map((venue) => venue.toLowerCase()));

    return cards.sort((a, b) => {
      const aPinned = pinnedSet.has(a.venue.toLowerCase()) ? 0 : 1;
      const bPinned = pinnedSet.has(b.venue.toLowerCase()) ? 0 : 1;

      if (aPinned !== bPinned) return aPinned - bPinned;

      return a.displayName.localeCompare(b.displayName);
    });
  }, [galleryRows, venueNameMap]);

  const canonical = `${SITE_ORIGIN}/gallery/venues`;

  const metaTitle = "Wedding Venue Galleries | Northern Ireland & Ireland | MKB Weddings";
  const metaDescription =
    "Browse real wedding photography by venue across Northern Ireland and Ireland. Explore venue galleries, style inspiration, and full wedding stories by MKB Weddings.";

  const ogImage = venueCards[0]?.coverFull || venueCards[0]?.coverThumb || HERO_IMAGE;

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
          { "@type": "ListItem", position: 2, name: "Gallery", item: `${SITE_ORIGIN}/gallery` },
          {
            "@type": "ListItem",
            position: 3,
            name: "Counties",
            item: `${SITE_ORIGIN}/wedding-photographer`,
          },
          { "@type": "ListItem", position: 4, name: "Venues", item: canonical },
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

      {/* HERO */}
      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback
          src={HERO_IMAGE}
          alt="Wedding venue galleries across Northern Ireland and Ireland"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <div className="w-full max-w-7xl mx-auto px-6 pb-20 text-center">
            <Link
              to="/gallery"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Gallery
            </Link>

            <h1 className="text-white text-4xl md:text-5xl mb-4 font-serif">
              Wedding Venue Galleries
            </h1>

            <div className="text-white/85 text-sm">
              {venueCards.length} {venueCards.length === 1 ? "venue" : "venues"}
            </div>
          </div>
        </div>
      </div>

      {/* BREADCRUMBS */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-10">
        <nav aria-label="Breadcrumb" className="flex justify-center">
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
              <Link to="/gallery" className="hover:text-neutral-900 underline underline-offset-4">
                Gallery
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
      </div>

      {/* INTRO */}
      <section className="max-w-5xl mx-auto px-6 pt-12 pb-20 text-center">
        <p className="text-neutral-700 text-lg md:text-xl leading-relaxed">
          Browse real wedding photography by venue across <strong>Northern Ireland</strong> and{" "}
          <strong>Ireland</strong>. Use these galleries to see how a venue photographs in different
          seasons, light and weather — and to find inspiration for your own day.
        </p>
      </section>

      {/* GRID */}
      <div className="max-w-7xl mx-auto px-6 pb-40">
        {venueCards.length === 0 ? (
          <div className="text-center py-20 text-neutral-600">No venues found yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venueCards.map((venue) => (
              <Link
                key={venue.venueId}
                to={`/gallery/venue/${venue.venueId}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg"
              >
                <ImageWithFallback
                  src={venue.coverThumb}
                  alt={imageAlt(venue.coverRow)}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <h2 className="text-white text-2xl mb-2 font-serif">{venue.displayName}</h2>
                  <p className="text-white/85 text-sm mb-3">
                    {venue.count} image{venue.count !== 1 ? "s" : ""}
                  </p>
                  <div className="flex items-center text-white">
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
