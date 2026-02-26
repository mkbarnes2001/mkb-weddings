// src/components/CountiesLanding.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";

type CountyVenue = {
  venueSlug: string;
  venueName: string;
  town?: string;
  url: string;
};

type CountyMeta = {
  slug: string;
  country?: string;
  countryCode?: string;
  county: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  seoTitle?: string;
  seoDescription?: string;
  intro?: string;
  whySection?: string;
  travelSection?: string;
  faqs?: { question: string; answer: string }[];
  venues?: CountyVenue[];
};

const SITE_ORIGIN = "https://www.mkbweddings.co.uk";

// ✅ Set your county landing route here
const COUNTY_LANDING_PATH = "/wedding-photographer";

// ✅ Set your county detail route prefix here
const COUNTY_DETAIL_PREFIX = "/wedding-photographer";

// ---------------------------------------------------------------------------
// THUMBNAIL IMAGES FOR EACH COUNTY (EDIT HERE)
// Keys must match county slug in county-meta.json (e.g. "co-down").
//
// You can use:
// - a hosted image URL, OR
// - a file in /public (e.g. "/img/counties/co-down.jpg").
//
// Tip: pick 1 strong hero image per county (coastline/landmark/venue).
// ---------------------------------------------------------------------------
const COUNTY_THUMBS: Record<string, string> = {
  // "co-down": "/img/counties/co-down.jpg",
  // "co-antrim": "/img/counties/co-antrim.jpg",
  // "co-londonderry": "/img/counties/co-londonderry.jpg",
  // "co-fermanagh": "/img/counties/co-fermanagh.jpg",
  // "co-tyrone": "/img/counties/co-tyrone.jpg",
  // "co-donegal": "/img/counties/co-donegal.jpg",
  // "co-cavan": "/img/counties/co-cavan.jpg",
  // "co-monaghan": "/img/counties/co-monaghan.jpg",
  // "co-louth": "/img/counties/co-louth.jpg",
  // "co-meath": "/img/counties/co-meath.jpg",
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=1600&q=80";

function safeText(s: unknown) {
  return (typeof s === "string" ? s : "").trim();
}

export function CountiesLanding() {
  const [countyMap, setCountyMap] = useState<Record<string, CountyMeta>>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/county-meta.json", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as Record<string, CountyMeta>;
        if (!cancelled) setCountyMap(json || {});
      } catch {
        // silent
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const counties = useMemo(() => {
    const list = Object.values(countyMap || {})
      .filter((c) => safeText(c.slug) && safeText(c.county))
      .map((c) => {
        const slug = safeText(c.slug);
        const countyName = safeText(c.county) || slug;
        const description =
          safeText(c.seoDescription) ||
          `Explore real wedding photography across ${countyName}.`;

        const image = COUNTY_THUMBS[slug] || FALLBACK_IMAGE;

        return {
          slug,
          countyName,
          description,
          image,
          link: `${COUNTY_DETAIL_PREFIX}/${encodeURIComponent(slug)}`,
        };
      });

    // Alphabetical by county name
    return list.sort((a, b) => a.countyName.localeCompare(b.countyName));
  }, [countyMap]);

  const title = "Wedding Photographer by County | Northern Ireland & Ireland | MKB Weddings";
  const description =
    "Browse wedding photography by county across Northern Ireland and Ireland — explore venue galleries and real weddings photographed by MKB Weddings.";
  const canonical = `${SITE_ORIGIN}${COUNTY_LANDING_PATH}`;

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />

        <link rel="canonical" href={canonical} />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Hero Section (matches GalleryLanding tile style) */}
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {counties.map((c) => (
            <Link
              key={c.slug}
              to={c.link}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg"
            >
              <ImageWithFallback
                src={c.image}
                alt={c.countyName}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-8">
                <h2 className="text-white text-2xl md:text-3xl mb-2">{c.countyName}</h2>
                <div className="flex items-center text-white">
                  <span className="text-sm uppercase tracking-wider">Explore</span>
                  <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-2" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {!counties.length ? (
          <div className="text-center text-neutral-600 mt-10">Loading counties…</div>
        ) : null}
      </div>
    </div>
  );
}