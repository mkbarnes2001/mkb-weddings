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
  url: string;
};

type CountyFaq = {
  question: string;
  answer: string;
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

  faqs?: CountyFaq[];
  venues?: CountyVenue[];

  heroImageUrl?: string;
};

const SITE_ORIGIN = "https://www.mkbweddings.co.uk";

const FALLBACK_HERO =
  "https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=1600&q=80";

function safeSlug(input: string) {
  return (input || "").trim().toLowerCase().replace(/\/+$/, "");
}

function escapeForJsonLd(s: string) {
  return (s || "").replace(/\u2028|\u2029/g, " ");
}

export function CountyPage() {
  const { countySlug } = useParams<{ countySlug: string }>();
  const slug = safeSlug(countySlug || "");

  const [metaMap, setMetaMap] = useState<Record<string, CountyMeta>>({});
  const [loadError, setLoadError] = useState<string>("");

  const county = slug ? metaMap[slug] : undefined;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadError("");
        const res = await fetch("/county-meta.json", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setLoadError(`Failed to load county-meta.json (${res.status})`);
          return;
        }

        const json = (await res.json()) as Record<string, CountyMeta>;
        if (!cancelled) setMetaMap(json || {});
      } catch {
        if (!cancelled) {
          setLoadError(
            "county-meta.json could not be parsed. Check for broken quotes/commas in the JSON."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const canonical = useMemo(() => {
    const safe = encodeURIComponent(slug);
    return `${SITE_ORIGIN}/wedding-photographer/${safe}`;
  }, [slug]);

  if (!countySlug) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-3xl mb-3">County not found</h1>
          <Link to="/wedding-photographer" className="text-neutral-600 hover:text-neutral-900">
            Back to Counties
          </Link>
        </div>
      </div>
    );
  }

  if (!county) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="text-neutral-600">Loading…</div>
        {loadError ? (
          <div className="mt-4 max-w-xl text-sm text-red-600">{loadError}</div>
        ) : null}
      </div>
    );
  }

  const title =
    (county.seoTitle || "").trim() || `${county.county} Wedding Photographer | MKB Weddings`;

  const description =
    (county.seoDescription || "").trim() ||
    `Natural, documentary wedding photography in ${county.county}. Explore venues and real wedding galleries by MKB Weddings.`;

  const venues = county.venues || [];
  const faqs = county.faqs || [];
  const locationLine = [county.county, county.country].filter(Boolean).join(", ");
  const heroImage = (county.heroImageUrl || "").trim() || FALLBACK_HERO;

  // Breadcrumbs: Home → Gallery → Counties → County
  const breadcrumbItems = [
    { name: "Home", item: `${SITE_ORIGIN}/` },
    { name: "Gallery", item: `${SITE_ORIGIN}/gallery` },
    { name: "Counties", item: `${SITE_ORIGIN}/wedding-photographer` },
    { name: county.county, item: canonical },
  ].map((x, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    name: escapeForJsonLd(x.name),
    item: x.item,
  }));

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
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: escapeForJsonLd(title),
        description: escapeForJsonLd(description),
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
        breadcrumb: { "@id": `${canonical}#breadcrumb` },
      },
    ],
  };

  // Typography tokens (main content)
  const bodyText = "text-primary/75 text-base md:text-lg leading-loose";

  // ✅ Smaller headings (previously text-2xl md:text-3xl)
  const h2Main = "text-neutral-900 text-xl md:text-2xl font-serif mb-4";

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

      {/* HERO */}
      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback src={heroImage} alt={county.county} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <div className="w-full max-w-7xl mx-auto px-6 pb-20 text-center">
            <Link
              to="/wedding-photographer"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Counties
            </Link>

            <h1 className="text-white text-4xl md:text-5xl mb-4 font-serif">
              {county.primaryKeyword || `Wedding Photographer ${county.county}`}
            </h1>

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
            <li className="text-neutral-900">{county.county}</li>
          </ol>
        </nav>
      </div>

      {/* COUNTY INFO */}
      <section className="max-w-5xl mx-auto px-6 pt-12 pb-10 text-center">
       {county.secondaryKeywords?.length ? (
        <p className="text-neutral-900 text-xl md:text-2xl font-serif mb-12">
          {county.secondaryKeywords
          .map((s) => (s || "").replace(/["\\]+/g, "").trim())
          .filter(Boolean)
          .join(" • ")}
          </p>
        ) : null}

        {county.intro ? (
          <div className={`${bodyText} space-y-6 mb-12`}>
            {county.intro.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : null}

        {county.whySection ? (
          <div className="mb-12">
            <h2 className={h2Main}>Why get married in {county.county}?</h2>
            <div className={`${bodyText} space-y-6`}>
              {county.whySection.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        ) : null}

        {county.travelSection ? (
          <div className="mb-12">
            <h2 className={h2Main}>Travel &amp; coverage</h2>
            <div className={`${bodyText} space-y-6`}>
              {county.travelSection.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* VENUES GRID */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className={`${h2Main} text-center mb-8`}>Wedding venues in {county.county}</h2>

          {venues.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {venues.map((v) => (
                <Link
                  key={v.venueSlug}
                  to={v.url}
                  className="rounded-lg border border-neutral-200 p-4 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
                >
                  <div className="text-neutral-900 font-medium text-base md:text-lg">
                    {v.venueName}
                  </div>
                  {v.town ? (
                    <div className="text-neutral-600 text-sm md:text-base mt-1">{v.town}</div>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-neutral-600 text-center text-base md:text-lg">
              No venues listed yet for this county.
            </p>
          )}
        </div>
      </section>

      {/* FAQS */}
      {faqs.length ? (
        <section className="max-w-5xl mx-auto px-6 pb-40">
          <div className="pt-16 border-t border-neutral-200">
            <h2 className={`${h2Main} text-center mb-10`}>FAQs</h2>

            <div className="space-y-8 text-left max-w-3xl mx-auto">
              {faqs.map((f, i) => (
                <details key={i} className="group">
                  <summary className="cursor-pointer text-neutral-900 font-medium text-base md:text-lg">
                    {f.question}
                  </summary>
                  <div className={`${bodyText} mt-3`}>{f.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Explore more counties */}
      <section className="max-w-5xl mx-auto px-6 pt-12 pb-56 text-center">
        <div className="pt-16 border-t border-neutral-200">
          <h2 className={`${h2Main} mb-4`}>Explore more counties</h2>
          <p className={`${bodyText} mb-10`}>Browse all county pages, then jump into venue galleries.</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pb-12">
            <Link
              to="/wedding-photographer"
              className="text-neutral-900 hover:text-neutral-700 underline underline-offset-4"
            >
              View all counties
            </Link>
            <Link
              to="/gallery"
              className="text-neutral-900 hover:text-neutral-700 underline underline-offset-4"
            >
              Back to gallery
            </Link>
            <Link
              to="/gallery/venues"
              className="text-neutral-900 hover:text-neutral-700 underline underline-offset-4"
            >
              Browse venues
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}