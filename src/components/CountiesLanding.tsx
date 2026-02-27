// src/components/CountiesLanding.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";

type CountyMeta = {
  slug: string;
  county: string;
  country?: string;

  seoTitle?: string;
  seoDescription?: string;

  // from build-county-meta
  heroImageUrl?: string; // full hero
  heroThumbUrl?: string; // thumb hero for cards
};

const SITE_ORIGIN = "https://www.mkbweddings.co.uk";

const HERO_IMAGE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/full/Slieve%20donard%20hotel/couple%20portraits/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-94_2000.webp";

const FALLBACK_CARD =
  "https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=1600&q=80";

function safeSlug(input: string) {
  return (input || "").trim().toLowerCase().replace(/\/+$/, "");
}

function byCountyName(a: CountyMeta, b: CountyMeta) {
  return (a.county || "").localeCompare(b.county || "");
}

export function CountiesLanding() {
  const [metaMap, setMetaMap] = useState<Record<string, CountyMeta>>({});
  const [loadError, setLoadError] = useState<string>("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

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
        if (!cancelled) setLoadError("county-meta.json could not be loaded/parsed.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const counties = useMemo(() => {
    return Object.entries(metaMap)
      .map(([slug, v]) => ({ ...v, slug: safeSlug(v.slug || slug) }))
      .filter((c) => c.slug && c.county)
      .sort(byCountyName);
  }, [metaMap]);

  const canonical = `${SITE_ORIGIN}/wedding-photographer`;

  const title = "Wedding Photographer by County | Northern Ireland & Ireland | MKB Weddings";
  const description =
    "Browse real wedding photography by county across Northern Ireland and Ireland. Use these galleries to explore the various venues within each county.";

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />

        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={HERO_IMAGE} />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* HERO */}
      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback
          src={HERO_IMAGE}
          alt="Northern Ireland & Ireland Wedding Photography"
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
              Northern Ireland &amp; Ireland Wedding Photography
            </h1>

            <div className="text-white/85 text-sm">
              {counties.length} {counties.length === 1 ? "county" : "counties"}
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
            <li className="text-neutral-900">Counties</li>
          </ol>
        </nav>
      </div>

      {/* INTRO TEXT (same spacing/feel as CountyPage) */}
      <section className="max-w-5xl mx-auto px-6 pt-12 pb-10 text-center">
        <p className="text-neutral-700 leading-relaxed text-lg">
          Browse real wedding photography by county across Northern Ireland and Ireland. Use these
          galleries to explore the various venues within each county.
        </p>
      </section>

      {/* SPACE between breadcrumbs/intro and tiles */}
      <div className="max-w-7xl mx-auto px-6 pb-24 pt-6">
        {loadError ? <div className="text-center text-red-600 mb-8">{loadError}</div> : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {counties.map((c) => {
            const cardImage =
              (c.heroThumbUrl || "").trim() ||
              (c.heroImageUrl || "").trim() ||
              FALLBACK_CARD;

            const countryLabel = (c.country || "").trim();

            return (
              <Link
                key={c.slug}
                to={`/wedding-photographer/${encodeURIComponent(c.slug)}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg"
              >
                <ImageWithFallback
                  src={cardImage}
                  alt={c.county}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                <div className="absolute inset-0 flex flex-col justify-end p-8">
                  <h2 className="text-white text-2xl md:text-3xl mb-2 font-serif leading-tight">
                    {c.county}
                  </h2>

                  {/* country text in WHITE */}
                  {countryLabel ? (
                    <p className="text-white/90 text-sm mb-4">{countryLabel}</p>
                  ) : (
                    <div className="mb-4" />
                  )}

                  {/* Match GalleryLanding "Explore" row */}
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