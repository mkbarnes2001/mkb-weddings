import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, MapPin } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";

type CountyVenue = {
  venueSlug: string;
  venueName: string;
  town?: string;
  url?: string;
};

type CountyMeta = {
  slug: string;
  county: string; // e.g. "County Down"
  country?: string; // e.g. "Northern Ireland" | "Ireland"
  countryCode?: string; // e.g. "GB" | "IE"
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

function safeSlug(input: string) {
  return (input || "").trim().toLowerCase().replace(/\/+$/, "");
}

function escapeJsonLdString(s: string) {
  return (s || "").replace(/\u2028|\u2029/g, "");
}

export function CountyPage() {
  // ✅ Hooks always run (no early return before hooks)
  const { countyId } = useParams<{ countyId: string }>();
  const countySlug = safeSlug(countyId || "");

  const [countyMap, setCountyMap] = useState<Record<string, CountyMeta>>({});
  const [loadError, setLoadError] = useState<string>("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [countySlug]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadError("");
        const res = await fetch("/county-meta.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`county-meta.json fetch failed: ${res.status}`);

        const data = (await res.json()) as Record<string, CountyMeta>;
        if (!cancelled) setCountyMap(data || {});
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || "Failed to load county data");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const meta = useMemo(() => {
    return countySlug ? countyMap[countySlug] : undefined;
  }, [countyMap, countySlug]);

  const countyName = (meta?.county || "").trim();
  const countryName = (meta?.country || "").trim();
  const pageTitle =
    (meta?.seoTitle || "").trim() ||
    (countyName ? `${countyName} Wedding Photographer | MKB Weddings` : "County Weddings | MKB Weddings");

  const pageDescription =
    (meta?.seoDescription || "").trim() ||
    (countyName
      ? `Wedding photography in ${countyName}${countryName ? `, ${countryName}` : ""}. Natural, documentary coverage by MKB Weddings.`
      : "Wedding photography across Northern Ireland and Ireland by MKB Weddings.");

  const canonical = `${SITE_ORIGIN}/wedding-photographer/${encodeURIComponent(countySlug)}`;

  // Pick a “hero” image:
  // - If you later add meta.heroImage in county-meta.json, use that.
  // - For now, fallback to a stable Unsplash hero.
  const heroImage =
    "https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=1600&q=80";

  const introLine = useMemo(() => {
    if (!countyName) return "Wedding photography";
    const loc = [countyName, countryName].filter(Boolean).join(", ");
    return `Wedding photographer in ${loc}`;
  }, [countyName, countryName]);

  const venues = meta?.venues || [];

  // ---------- JSON-LD ----------
  const breadcrumbItems = [
    { name: "Home", item: `${SITE_ORIGIN}/` },
    { name: "Gallery", item: `${SITE_ORIGIN}/gallery` },
    { name: "Venues", item: `${SITE_ORIGIN}/gallery/venues` },
    { name: countyName || countySlug, item: canonical },
  ].map((x, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    name: x.name,
    item: x.item,
  }));

  const pageJsonLd = useMemo(() => {
    const graph: any[] = [
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
        name: pageTitle,
        description: pageDescription,
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
        breadcrumb: { "@id": `${canonical}#breadcrumb` },
      },
    ];

    return {
      "@context": "https://schema.org",
      "@graph": graph,
    };
  }, [canonical, pageTitle, pageDescription]); // breadcrumbItems depends on countyName; ok to omit for stability

  // ✅ Only now we can safely decide “not found”
  const notFound = !!countySlug && !loadError && Object.keys(countyMap).length > 0 && !meta;

  if (loadError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-lg">
          <h1 className="text-3xl mb-3">County page error</h1>
          <p className="text-neutral-600 mb-6">{loadError}</p>
          <Link to="/gallery/venues" className="text-neutral-600 hover:text-neutral-900 underline underline-offset-4">
            Back to Venues
          </Link>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-3xl mb-3">County not found</h1>
          <Link to="/gallery/venues" className="text-neutral-600 hover:text-neutral-900 underline underline-offset-4">
            Back to Venues
          </Link>
        </div>
      </div>
    );
  }

  // While county-meta is loading, render a safe skeleton (no early-return hooks issues)
  if (!meta) {
    return (
      <div className="min-h-screen bg-white">
        <div className="relative h-[60vh] min-h-[420px] bg-neutral-100" />
        <div className="max-w-5xl mx-auto px-6 pt-12 pb-40">
          <div className="h-10 w-2/3 bg-neutral-100 rounded mb-6" />
          <div className="h-5 w-1/2 bg-neutral-100 rounded mb-3" />
          <div className="h-5 w-3/4 bg-neutral-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonical} />

        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={heroImage} />
        <meta property="og:type" content="website" />

        <script type="application/ld+json">
          {JSON.stringify(JSON.parse(escapeJsonLdString(JSON.stringify(pageJsonLd))))}
        </script>
      </Helmet>

      {/* HERO (matches GalleryVenueDetail styling) */}
      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback src={heroImage} alt={countyName} className="w-full h-full object-cover" />
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

            <h1 className="text-white text-5xl md:text-6xl mb-4">{countyName}</h1>

            <div className="flex flex-col items-center gap-2 text-white/90">
              {countryName ? (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{countryName}</span>
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
              <Link to="/gallery/venues" className="hover:text-neutral-900 underline underline-offset-4">
                Venues
              </Link>
            </li>
            <li className="opacity-60">
              <ChevronRight className="w-4 h-4" />
            </li>
            <li className="text-neutral-900">{countyName}</li>
          </ol>
        </nav>
      </div>

      {/* COUNTY INFO */}
      <section className="max-w-5xl mx-auto px-6 pt-12 pb-10 text-center">
        <p className="text-neutral-900 text-2xl md:text-4xl font-serif mb-10">{introLine}</p>

        {meta.intro ? (
          <div className="text-neutral-700 leading-relaxed text-lg space-y-5 mb-10">
            {meta.intro.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : null}

        {meta.whySection ? (
          <div className="text-neutral-700 leading-relaxed text-lg space-y-5 mb-10">
            <h2 className="text-neutral-900 text-2xl md:text-3xl font-serif mb-4">
              Why get married in {countyName}?
            </h2>
            {meta.whySection.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : null}

        {meta.travelSection ? (
          <div className="text-neutral-700 leading-relaxed text-lg space-y-5 mb-10">
            <h2 className="text-neutral-900 text-2xl md:text-3xl font-serif mb-4">
              Travel & coverage
            </h2>
            {meta.travelSection.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : null}
      </section>

      {/* VENUES LIST */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="pt-10 border-t border-neutral-200">
          <h2 className="text-neutral-900 text-2xl md:text-3xl font-serif mb-6 text-center">
            Wedding venues in {countyName}
          </h2>

          {venues.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {venues.map((v) => (
                <Link
                  key={v.venueSlug}
                  to={v.url || `/gallery/venue/${v.venueSlug}`}
                  className="rounded-lg border border-neutral-200 p-4 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
                >
                  <div className="text-neutral-900 font-medium">{v.venueName}</div>
                  {v.town ? <div className="text-neutral-600 text-sm mt-1">{v.town}</div> : null}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-neutral-600 text-center">No venues listed yet.</div>
          )}
        </div>
      </section>

      {/* FAQs */}
      {meta.faqs?.length ? (
        <section className="max-w-5xl mx-auto px-6 pb-40">
          <div className="pt-10 border-t border-neutral-200">
            <h2 className="text-neutral-900 text-2xl md:text-3xl font-serif mb-6 text-center">
              FAQs
            </h2>

            <div className="space-y-6">
              {meta.faqs.map((f, idx) => (
                <div key={idx} className="rounded-lg border border-neutral-200 p-6">
                  <div className="text-neutral-900 font-medium mb-2">{f.question}</div>
                  <div className="text-neutral-700 leading-relaxed">{f.answer}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <div className="pb-40" />
      )}
    </div>
  );
}