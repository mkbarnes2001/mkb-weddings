// src/components/CountyPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, MapPin } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";

type CountyVenue = {
  venueSlug: string;
  venueName: string;
  town?: string;
  url: string; // e.g. "/gallery/venue/edenmore"
};

type CountyFaq = {
  question: string;
  answer: string;
};

type CountyMeta = {
  slug: string;

  country?: string; // e.g. "Northern Ireland" | "Ireland"
  countryCode?: string; // e.g. "GB" | "IE" (don’t assume)

  county: string; // e.g. "County Down"

  primaryKeyword?: string;
  secondaryKeywords?: string[];

  seoTitle?: string;
  seoDescription?: string;

  intro?: string;
  whySection?: string;
  travelSection?: string;

  faqs?: CountyFaq[];
  venues?: CountyVenue[];
};

const SITE_ORIGIN = "https://www.mkbweddings.co.uk";

// Same fallback hero used in GalleryVenueDetail
const DEFAULT_HERO =
  "https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=1600&q=80";

// --- tiny helpers (same vibe as GalleryVenueDetail) -------------------------
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

export function CountyPage() {
  const { countySlug } = useParams<{ countySlug: string }>();
  const slug = (countySlug || "").toLowerCase();

  const [metaMap, setMetaMap] = useState<Record<string, CountyMeta>>({});
  const county = metaMap[slug];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/county-meta.json", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as Record<string, CountyMeta>;
        if (!cancelled) setMetaMap(json || {});
      } catch {
        // silent
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Loading placeholder (lightweight)
  if (!countySlug && Object.keys(metaMap).length > 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-neutral-600">County not found</div>
      </div>
    );
  }

  if (!county) {
    // if metaMap is loaded and slug missing -> not found
    if (Object.keys(metaMap).length > 0 && countySlug) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center px-6">
          <div className="text-center">
            <h1 className="text-3xl mb-3">County not found</h1>
            <Link to="/gallery/venues" className="text-neutral-600 hover:text-neutral-900">
              Browse venues
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-neutral-600">Loading…</div>
      </div>
    );
  }

  const title =
    (county.seoTitle || "").trim() || `${county.county} Wedding Photographer | MKB Weddings`;

  const description =
    (county.seoDescription || "").trim() ||
    `Natural, documentary wedding photography in ${county.county}. Explore venues and real wedding galleries by MKB Weddings.`;

  const canonical = `${SITE_ORIGIN}/county/${encodeURIComponent(slug)}`;

  const venues = county.venues || [];
  const faqs = county.faqs || [];

  const locationLine = [county.county, county.country].filter(Boolean).join(", ");

  const introLine =
    county.primaryKeyword?.trim() ||
    `Wedding photographer ${county.county}${county.country ? `, ${county.country}` : ""}`;

  const heroImage = DEFAULT_HERO;

  // Explore more counties (small internal linking boost)
  const moreCountyLinks = useMemo(() => {
    const all = Object.values(metaMap)
      .filter((c) => c?.slug && c.slug !== slug)
      .map((c) => ({
        slug: c.slug,
        county: c.county,
        country: c.country,
      }))
      .filter((x) => x.slug && x.county);

    const shuffled = stableShuffle(all, `more-counties:${slug}:${all.length}`);
    return shuffled.slice(0, 6);
  }, [metaMap, slug]);

  // ---------- JSON-LD (Breadcrumbs + WebPage + AdministrativeArea) ----------
  const breadcrumbItems = [
    { name: "Home", item: `${SITE_ORIGIN}/` },
    { name: "Gallery", item: `${SITE_ORIGIN}/gallery` },
    { name: "Venues", item: `${SITE_ORIGIN}/gallery/venues` },
    { name: county.county, item: canonical },
  ].map((x, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    name: x.name,
    item: x.item,
  }));

  const areaJsonLd = {
    "@type": "AdministrativeArea",
    "@id": `${canonical}#county`,
    name: county.county,
    containedInPlace: county.country
      ? {
          "@type": "Country",
          name: county.country,
        }
      : undefined,
  };

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
        itemListElement: breadcrumbItems,
      },
      areaJsonLd,
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: title,
        description,
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
        breadcrumb: { "@id": `${canonical}#breadcrumb` },
        about: { "@id": `${canonical}#county` },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />

        <link rel="canonical" href={canonical} />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={heroImage} />
        <meta property="og:type" content="website" />

        <script type="application/ld+json">{JSON.stringify(pageJsonLd)}</script>
      </Helmet>

      {/* HERO (match GalleryVenueDetail) */}
      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback src={heroImage} alt={county.county} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <div className="w-full max-w-7xl mx-auto px-6 pb-20 text-center">
            <Link
              to="/gallery/venues"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Venues
            </Link>

            <h1 className="text-white text-5xl md:text-6xl mb-4">{county.county}</h1>

            <div className="flex flex-col items-center gap-2 text-white/90">
              {locationLine ? (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{locationLine}</span>
                </div>
              ) : null}

              <div className="text-white/85 text-sm">
                {venues.length} {venues.length === 1 ? "venue" : "venues"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BREADCRUMBS (match GalleryVenueDetail) */}
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
              <Link to="/gallery/venues" className="hover:text-neutral-900 underline underline-offset-4">
                Venues
              </Link>
            </li>
            <li className="opacity-60">
              <ChevronRight className="w-4 h-4" />
            </li>
            <li className="text-neutral-900">{county.county}</li>
          </ol>
        </nav>
      </div>

      {/* COUNTY INFO (match spacing/typography of venue detail) */}
      <section className="max-w-5xl mx-auto px-6 pt-12 pb-10 text-center">
        <p className="text-neutral-900 text-2xl md:text-4xl font-serif mb-10">{introLine}</p>

        {county.secondaryKeywords?.length ? (
          <div className="text-neutral-600 mb-10">
            {county.secondaryKeywords.filter(Boolean).join(" • ")}
          </div>
        ) : null}

        {county.intro ? (
          <div className="text-neutral-700 leading-relaxed text-lg space-y-5 mb-10">
            {county.intro.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : null}

        {county.whySection ? (
          <div className="text-left max-w-3xl mx-auto mb-10">
            <h2 className="text-neutral-900 text-2xl md:text-3xl font-serif mb-4 text-center">
              Why get married in {county.county}?
            </h2>
            <div className="text-neutral-700 leading-relaxed text-lg space-y-5">
              {county.whySection.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        ) : null}

        {county.travelSection ? (
          <div className="text-left max-w-3xl mx-auto mb-2">
            <h2 className="text-neutral-900 text-2xl md:text-3xl font-serif mb-4 text-center">
              Travel & coverage
            </h2>
            <div className="text-neutral-700 leading-relaxed text-lg space-y-5">
              {county.travelSection.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* VENUES LIST (match your “more venues” cards) */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-neutral-900 text-2xl md:text-3xl font-serif mb-6 text-center">
            Wedding venues in {county.county}
          </h2>

          {venues.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {venues.map((v) => (
                <Link
                  key={v.venueSlug}
                  to={v.url}
                  className="rounded-lg border border-neutral-200 p-4 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
                >
                  <div className="text-neutral-900 font-medium">{v.venueName}</div>
                  {v.town ? <div className="text-neutral-600 text-sm mt-1">{v.town}</div> : null}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-neutral-600 text-center">No venues listed yet for this county.</p>
          )}
        </div>
      </section>

      {/* FAQs */}
      {faqs.length ? (
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <h2 className="text-neutral-900 text-2xl md:text-3xl font-serif mb-6 text-center">
            FAQs
          </h2>

          <div className="space-y-4">
            {faqs.map((f, i) => (
              <details key={i} className="rounded-lg border border-neutral-200 p-4">
                <summary className="cursor-pointer text-neutral-900 font-medium">
                  {f.question}
                </summary>
                <div className="text-neutral-700 mt-3 leading-relaxed">{f.answer}</div>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {/* Explore more counties (optional internal links) */}
      {moreCountyLinks.length ? (
        <section className="max-w-5xl mx-auto px-6 pb-40 text-center">
          <div className="pt-10 border-t border-neutral-200">
            <h2 className="text-neutral-900 text-2xl md:text-3xl font-serif mb-4">
              Explore more counties
            </h2>
            <p className="text-neutral-600 mb-8">
              Browse more wedding venue round-ups across Northern Ireland and Ireland.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {moreCountyLinks.map((c) => (
                <Link
                  key={c.slug}
                  to={`/county/${c.slug}`}
                  className="rounded-lg border border-neutral-200 p-4 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
                >
                  <div className="text-neutral-900 font-medium">{c.county}</div>
                  {c.country ? <div className="text-neutral-600 text-sm mt-1">{c.country}</div> : null}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}