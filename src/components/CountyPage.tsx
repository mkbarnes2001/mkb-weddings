import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, MapPin } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";

type LocationVenue = {
  venueSlug: string;
  venueName: string;
  town?: string;
  county?: string;
  country?: string;
  url: string;
};

type LocationFaq = { question: string; answer: string };

type LocationSettings = {
  enabled: boolean;
  landingTitle: string;
  galleryTitle: string;
  cardDescription: string;
  singularLabel: string;
  pluralLabel: string;
  groupingLevel: string;
  publicBasePath: string;
  intro: string;
  seoTitle: string;
  seoDescription: string;
  heroImageUrl: string;
  publicOrigin: string;
};

type LocationMeta = {
  slug: string;
  name: string;
  areaType?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  seoTitle?: string;
  seoDescription?: string;
  intro?: string;
  whySection?: string;
  travelSection?: string;
  faqs?: LocationFaq[];
  venues?: LocationVenue[];
  heroImageUrl?: string;
};

type LegacyCountyMeta = {
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
  faqs?: LocationFaq[];
  venues?: LocationVenue[];
  heroImageUrl?: string;
};

type PublicLocationResponse = {
  ok: true;
  settings: LocationSettings;
  location: LocationMeta;
};

const SITE_ORIGIN = "https://www.mkbweddings.co.uk";
const FALLBACK_HERO =
  "https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=1600&q=80";

const DEFAULT_SETTINGS: LocationSettings = {
  enabled: true,
  landingTitle: "Explore by County",
  galleryTitle: "Northern Ireland & Ireland Wedding Photography",
  cardDescription: "Browse wedding galleries by county",
  singularLabel: "County",
  pluralLabel: "Counties",
  groupingLevel: "county",
  publicBasePath: "/wedding-photographer",
  intro: "",
  seoTitle: "",
  seoDescription: "",
  heroImageUrl: "",
  publicOrigin: SITE_ORIGIN,
};

function safeSlug(input: string) {
  return (input || "").trim().toLowerCase().replace(/\/+$/, "");
}

function escapeForJsonLd(s: string) {
  return (s || "").replace(/\u2028|\u2029/g, " ");
}

export function CountyPage() {
  const params = useParams<{ countySlug?: string; locationSlug?: string }>();
  const slug = safeSlug(params.locationSlug || params.countySlug || "");
  const [settings, setSettings] = useState<LocationSettings>(DEFAULT_SETTINGS);
  const [location, setLocation] = useState<LocationMeta | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setLoadError("");
    setLocation(null);

    Promise.allSettled([
      fetch(`/api/public/locations/${encodeURIComponent(slug)}`, { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error(`Location API returned ${response.status}.`);
        return response.json() as Promise<PublicLocationResponse>;
      }),
      fetch("/county-meta.json", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error(`county-meta.json returned ${response.status}.`);
        return response.json() as Promise<Record<string, LegacyCountyMeta>>;
      }),
    ]).then(([apiResult, legacyResult]) => {
      if (cancelled) return;

      if (apiResult.status === "fulfilled" && apiResult.value.location) {
        setSettings({ ...DEFAULT_SETTINGS, ...apiResult.value.settings });
        setLocation(apiResult.value.location);
        setLoaded(true);
        return;
      }

      if (legacyResult.status === "fulfilled") {
        const county = legacyResult.value?.[slug];
        if (county) {
          setSettings(DEFAULT_SETTINGS);
          setLocation({
            ...county,
            name: county.county,
            venues: county.venues || [],
          });
          if (apiResult.status === "rejected") {
            setLoadError("Using the existing county page while the location service is unavailable.");
          }
          setLoaded(true);
          return;
        }
      }

      setLoadError(`${DEFAULT_SETTINGS.singularLabel} not found.`);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const origin = (settings.publicOrigin || SITE_ORIGIN).replace(/\/+$/, "");
  const basePath = settings.publicBasePath || "/gallery/locations";
  const canonical = useMemo(
    () => `${origin}${basePath}/${encodeURIComponent(slug)}`,
    [origin, basePath, slug],
  );

  if (!slug) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-3xl mb-3">{settings.singularLabel} not found</h1>
          <Link to={basePath} className="text-neutral-600 hover:text-neutral-900">
            Back to {settings.pluralLabel}
          </Link>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="text-neutral-600">Loading…</div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl mb-3">{settings.singularLabel} not found</h1>
        {loadError ? <div className="mb-4 max-w-xl text-sm text-red-600">{loadError}</div> : null}
        <Link to={basePath} className="text-neutral-600 hover:text-neutral-900">
          Back to {settings.pluralLabel}
        </Link>
      </div>
    );
  }

  const title =
    (location.seoTitle || "").trim() || `${location.name} Wedding Photographer | MKB Weddings`;
  const description =
    (location.seoDescription || "").trim() ||
    `Natural, documentary wedding photography in ${location.name}. Explore venues and real wedding galleries.`;
  const venues = location.venues || [];
  const faqs = location.faqs || [];
  const locationLine = [location.name, location.region, location.country].filter(Boolean).join(", ");
  const heroImage = (location.heroImageUrl || "").trim() || settings.heroImageUrl || FALLBACK_HERO;

  const breadcrumbItems = [
    { name: "Home", item: `${origin}/` },
    { name: "Gallery", item: `${origin}/gallery` },
    { name: settings.pluralLabel, item: `${origin}${basePath}` },
    { name: location.name, item: canonical },
  ].map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: escapeForJsonLd(item.name),
    item: item.item,
  }));

  const pageJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${origin}/#website`, url: `${origin}/`, name: "MKB Weddings" },
      { "@type": "BreadcrumbList", "@id": `${canonical}#breadcrumb`, itemListElement: breadcrumbItems },
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: escapeForJsonLd(title),
        description: escapeForJsonLd(description),
        isPartOf: { "@id": `${origin}/#website` },
        breadcrumb: { "@id": `${canonical}#breadcrumb` },
      },
    ],
  };

  const bodyText = "text-primary/75 text-base md:text-lg leading-loose";
  const h2Main = "text-neutral-900 text-xl md:text-2xl font-serif mb-4";
  const singularLower = settings.singularLabel.toLowerCase();
  const pluralLower = settings.pluralLabel.toLowerCase();

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

      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback src={heroImage} alt={location.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="w-full max-w-7xl mx-auto px-6 pb-20 text-center">
            <Link
              to={basePath}
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to {settings.pluralLabel}
            </Link>
            <h1 className="text-white text-4xl md:text-5xl mb-4 font-serif">
              {location.primaryKeyword || `Wedding Photographer ${location.name}`}
            </h1>
            <div className="flex flex-col items-center gap-2 text-white/90">
              {locationLine ? (
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>{locationLine}</span></div>
              ) : null}
              <div className="text-white/85 text-sm">
                {venues.length} {venues.length === 1 ? "venue" : "venues"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-6 pb-10">
        <nav aria-label="Breadcrumb" className="flex justify-center">
          <ol className="flex flex-wrap items-center justify-center gap-2 text-neutral-600 text-sm">
            <li><Link to="/" className="hover:text-neutral-900 underline underline-offset-4">Home</Link></li>
            <li className="opacity-60"><ChevronRight className="w-4 h-4" /></li>
            <li><Link to="/gallery" className="hover:text-neutral-900 underline underline-offset-4">Gallery</Link></li>
            <li className="opacity-60"><ChevronRight className="w-4 h-4" /></li>
            <li><Link to={basePath} className="hover:text-neutral-900 underline underline-offset-4">{settings.pluralLabel}</Link></li>
            <li className="opacity-60"><ChevronRight className="w-4 h-4" /></li>
            <li className="text-neutral-900">{location.name}</li>
          </ol>
        </nav>
      </div>

      {loadError ? <div className="mx-auto max-w-4xl px-6 text-center text-sm text-amber-700">{loadError}</div> : null}

      <section className="max-w-4xl mx-auto px-6 pt-14 pb-14 text-center">
        {location.secondaryKeywords?.length ? (
          <p className="text-neutral-900/90 text-xl md:text-2xl font-serif mt-12 mb-16">
            {location.secondaryKeywords
              .map((value) => (value || "").replace(/["\\]+/g, "").trim())
              .filter(Boolean)
              .join(" • ")}
          </p>
        ) : null}

        {location.intro ? (
          <div className={`${bodyText} space-y-6 mb-16`}>
            {location.intro.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </div>
        ) : null}

        {location.whySection ? (
          <div className="mb-16">
            <h2 className={h2Main}>Why get married in {location.name}?</h2>
            <div className={`${bodyText} space-y-6`}>
              {location.whySection.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
          </div>
        ) : null}

        {location.travelSection ? (
          <div className="mb-16">
            <h2 className={h2Main}>Travel &amp; coverage</h2>
            <div className={`${bodyText} space-y-6`}>
              {location.travelSection.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
          </div>
        ) : null}
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className={`${h2Main} text-center mb-8`}>Wedding venues in {location.name}</h2>
          {venues.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {venues.map((venue) => (
                <Link
                  key={venue.venueSlug}
                  to={venue.url}
                  className="rounded-lg border border-neutral-200 p-4 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
                >
                  <div className="text-neutral-900 font-medium text-base md:text-lg">{venue.venueName}</div>
                  {venue.town ? <div className="text-neutral-600 text-sm md:text-base mt-1">{venue.town}</div> : null}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-neutral-600 text-center text-base md:text-lg">
              No venues listed yet for this {singularLower}.
            </p>
          )}
        </div>
      </section>

      {faqs.length ? (
        <section className="max-w-5xl mx-auto px-6 pb-40">
          <div className="pt-16 border-t border-neutral-200">
            <h2 className={`${h2Main} text-center mb-10`}>FAQs</h2>
            <div className="space-y-8 text-left max-w-3xl mx-auto">
              {faqs.map((faq, index) => (
                <details key={index} className="group">
                  <summary className="cursor-pointer text-neutral-900 font-medium text-base md:text-lg">{faq.question}</summary>
                  <div className={`${bodyText} mt-3`}>{faq.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="max-w-5xl mx-auto px-6 pt-12 pb-56 text-center">
        <div className="pt-16 border-t border-neutral-200">
          <h2 className={`${h2Main} mb-4`}>Explore more {pluralLower}</h2>
          <p className={`${bodyText} mb-10`}>Browse all {pluralLower}, then jump into venue galleries.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pb-12">
            <Link to={basePath} className="text-neutral-900 hover:text-neutral-700 underline underline-offset-4">View all {pluralLower}</Link>
            <Link to="/gallery" className="text-neutral-900 hover:text-neutral-700 underline underline-offset-4">Back to gallery</Link>
            <Link to="/gallery/venues" className="text-neutral-900 hover:text-neutral-700 underline underline-offset-4">Browse venues</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
