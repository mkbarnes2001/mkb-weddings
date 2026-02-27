import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";

type CountyMeta = {
  slug: string;
  county: string;
  country?: string;
  seoTitle?: string;
  seoDescription?: string;

  // ✅ expected from build-county-meta.json
  heroImageUrl?: string; // full (optional here)
  heroThumbUrl?: string; // thumb (used on landing)
};

const SITE_ORIGIN = "https://www.mkbweddings.co.uk";

const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=1200&q=80";

function safeSlug(input: string) {
  return (input || "").trim().toLowerCase().replace(/\/+$/, "");
}

export function CountiesLanding() {
  const [metaMap, setMetaMap] = useState<Record<string, CountyMeta>>({});
  const [loadError, setLoadError] = useState("");

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
    const arr = Object.values(metaMap || {}).filter((c) => c?.slug);
    // sort by county name
    return arr.sort((a, b) => (a.county || "").localeCompare(b.county || ""));
  }, [metaMap]);

  const canonical = `${SITE_ORIGIN}/wedding-photographer`;

  const title = "Wedding Photographer Northern Ireland & Ireland | Counties | MKB Weddings";
  const description =
    "Browse wedding photography by county across Northern Ireland and Ireland. Explore venues, real wedding galleries, and local coverage by MKB Weddings.";

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

      {/* HERO (matches your Venue/County styling) */}
      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback
          src={FALLBACK_THUMB}
          alt="Wedding photography across Northern Ireland and Ireland"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <div className="w-full max-w-7xl mx-auto px-6 pb-20 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </Link>

            <h1 className="text-white text-5xl md:text-6xl mb-4">Wedding Photographer by County</h1>

            <div className="text-white/85 text-sm">
              {counties.length} {counties.length === 1 ? "county" : "counties"}
            </div>

            {loadError ? (
              <div className="mt-4 text-sm text-red-200">{loadError}</div>
            ) : null}
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {counties.map((c) => {
            const slug = safeSlug(c.slug);

            // ✅ THIS IS THE ONLY LINE YOU MAY NEED TO ADJUST IF YOUR FIELD NAME DIFFERS
            const thumb = (c.heroThumbUrl || "").trim() || (c.heroImageUrl || "").trim() || FALLBACK_THUMB;

            const countyName = (c.county || slug).trim();
            const country = (c.country || "").trim();
            const subtitle = [country].filter(Boolean).join(" • ");

            return (
              <Link
                key={slug}
                to={`/wedding-photographer/${encodeURIComponent(slug)}`}
                className="group rounded-xl overflow-hidden border border-neutral-200 hover:border-neutral-300 transition-colors"
              >
                <div className="relative aspect-[4/3]">
                  <ImageWithFallback
                    src={thumb}
                    alt={`${countyName} wedding photography`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <div className="text-white text-xl md:text-2xl font-serif leading-tight">
                      {countyName}
                    </div>
                    {subtitle ? <div className="text-white/85 text-sm mt-1">{subtitle}</div> : null}
                  </div>
                </div>

                <div className="p-5">
                  <div className="text-neutral-700 text-sm leading-relaxed line-clamp-3">
                    {(c.seoDescription || "").trim() ||
                      `Explore venues and real wedding galleries across ${countyName}.`}
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