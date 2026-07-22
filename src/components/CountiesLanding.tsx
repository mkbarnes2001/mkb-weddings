import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";

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
  id?: string;
  slug: string;
  name: string;
  areaType?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  heroImageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  intro?: string;
  venueCount?: number;
  sortOrder?: number;
};

type LegacyCountyMeta = {
  slug: string;
  county: string;
  country?: string;
  seoTitle?: string;
  seoDescription?: string;
  heroImageUrl?: string;
  heroThumbUrl?: string;
};

type PublicLocationsResponse = {
  ok: true;
  settings: LocationSettings;
  locations: LocationMeta[];
};

const SITE_ORIGIN = "https://www.mkbweddings.co.uk";
const HERO_IMAGE =
  "https://images.mkbweddings.co.uk/full/Slieve%20donard%20hotel/couple%20portraits/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-94_2000.webp";
const FALLBACK_CARD =
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
  intro:
    "Browse real wedding photography by county across Northern Ireland and Ireland. Use these galleries to explore the various venues within each county.",
  seoTitle: "Wedding Photographer by County | Northern Ireland & Ireland | MKB Weddings",
  seoDescription:
    "Browse real wedding photography by county across Northern Ireland and Ireland. Use these galleries to explore the various venues within each county.",
  heroImageUrl: HERO_IMAGE,
  publicOrigin: SITE_ORIGIN,
};

function safeSlug(input: string) {
  return (input || "").trim().toLowerCase().replace(/\/+$/, "");
}

export function CountiesLanding() {
  const [settings, setSettings] = useState<LocationSettings>(DEFAULT_SETTINGS);
  const [locations, setLocations] = useState<LocationMeta[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      fetch("/api/public/locations", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error(`Location API returned ${response.status}.`);
        return response.json() as Promise<PublicLocationsResponse>;
      }),
      fetch("/county-meta.json", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error(`county-meta.json returned ${response.status}.`);
        return response.json() as Promise<Record<string, LegacyCountyMeta>>;
      }),
    ]).then(([apiResult, legacyResult]) => {
      if (cancelled) return;

      if (apiResult.status === "fulfilled" && apiResult.value.locations?.length) {
        setSettings({ ...DEFAULT_SETTINGS, ...apiResult.value.settings });
        setLocations(
          apiResult.value.locations
            .map((location) => ({ ...location, slug: safeSlug(location.slug) }))
            .filter((location) => location.slug && location.name),
        );
        return;
      }

      if (legacyResult.status === "fulfilled") {
        const fallback = Object.entries(legacyResult.value || {})
          .map(([slug, item]) => ({
            slug: safeSlug(item.slug || slug),
            name: item.county,
            country: item.country,
            seoTitle: item.seoTitle,
            seoDescription: item.seoDescription,
            heroImageUrl: item.heroThumbUrl || item.heroImageUrl,
          }))
          .filter((location) => location.slug && location.name)
          .sort((a, b) => a.name.localeCompare(b.name));
        setLocations(fallback);
        setSettings(DEFAULT_SETTINGS);
        if (apiResult.status === "rejected") {
          setLoadError("Using the existing county index because the new location service is unavailable.");
        }
        return;
      }

      setLoadError("Location data could not be loaded.");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const orderedLocations = useMemo(
    () => [...locations].sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999) || a.name.localeCompare(b.name)),
    [locations],
  );

  const origin = (settings.publicOrigin || SITE_ORIGIN).replace(/\/+$/, "");
  const basePath = settings.publicBasePath || "/gallery/locations";
  const canonical = `${origin}${basePath}`;
  const title = settings.seoTitle || `${settings.galleryTitle} | MKB Weddings`;
  const description = settings.seoDescription || settings.intro || settings.cardDescription;
  const heroImage = settings.heroImageUrl || HERO_IMAGE;

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
      </Helmet>

      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback
          src={heroImage}
          alt={settings.galleryTitle}
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
              {settings.galleryTitle}
            </h1>
            <div className="text-white/85 text-sm">
              {orderedLocations.length} {orderedLocations.length === 1 ? settings.singularLabel : settings.pluralLabel}
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
            <li className="text-neutral-900">{settings.pluralLabel}</li>
          </ol>
        </nav>
      </div>

      <section className="max-w-5xl mx-auto px-6 pt-12 pb-10 text-center">
        <p className="text-neutral-700 leading-relaxed text-lg">
          {settings.intro || settings.cardDescription}
        </p>
      </section>

      <div className="max-w-7xl mx-auto px-6 pb-40 pt-6">
        {loadError ? <div className="text-center text-amber-700 mb-8 text-sm">{loadError}</div> : null}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orderedLocations.map((location) => {
            const cardImage = (location.heroImageUrl || "").trim() || FALLBACK_CARD;
            const countryLabel = [location.region, location.country].filter(Boolean).join(" · ");
            return (
              <Link
                key={location.slug}
                to={`${basePath}/${encodeURIComponent(location.slug)}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg"
              >
                <ImageWithFallback
                  src={cardImage}
                  alt={location.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-8">
                  <h2 className="text-white text-2xl md:text-3xl mb-2 font-serif leading-tight">
                    {location.name}
                  </h2>
                  {countryLabel ? <p className="text-white/90 text-sm mb-4">{countryLabel}</p> : <div className="mb-4" />}
                  <div className="flex items-center text-white">
                    <span className="text-sm uppercase tracking-wider">Explore</span>
                    <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-2" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
