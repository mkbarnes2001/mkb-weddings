// src/components/CountyPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";

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
  country?: string;
  countryCode?: "GB" | "IE" | string;
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
};

const SITE_ORIGIN = "https://www.mkbweddings.co.uk";

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

  const canonical = useMemo(() => {
    const safe = encodeURIComponent(slug);
    return `${SITE_ORIGIN}/county/${safe}`;
  }, [slug]);

  if (!countySlug || (Object.keys(metaMap).length > 0 && !county)) {
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

  // While loading JSON, show a lightweight placeholder
  if (!county) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-neutral-600">Loading…</div>
      </div>
    );
  }

  const title =
    (county.seoTitle || "").trim() ||
    `${county.county} Wedding Photographer | MKB Weddings`;

  const description =
    (county.seoDescription || "").trim() ||
    `Natural, documentary wedding photography in ${county.county}. Explore venues and real wedding galleries by MKB Weddings.`;

  const venues = county.venues || [];
  const faqs = county.faqs || [];

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />

        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-6 pt-14 pb-16">
        <nav className="text-sm text-neutral-600 mb-6">
          <Link to="/" className="hover:text-neutral-900 underline underline-offset-4">
            Home
          </Link>{" "}
          <span className="opacity-50">/</span>{" "}
          <Link to="/gallery/venues" className="hover:text-neutral-900 underline underline-offset-4">
            Venues
          </Link>{" "}
          <span className="opacity-50">/</span>{" "}
          <span className="text-neutral-900">{county.county}</span>
        </nav>

        <h1 className="text-4xl md:text-5xl font-serif text-neutral-900 mb-6">
          {county.primaryKeyword || `Wedding Photographer ${county.county}`}
        </h1>

        {county.secondaryKeywords?.length ? (
          <p className="text-neutral-600 mb-8">
            {county.secondaryKeywords.filter(Boolean).join(" • ")}
          </p>
        ) : null}

        {county.intro ? (
          <div className="text-neutral-700 leading-relaxed text-lg space-y-5 mb-10">
            {county.intro.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : null}

        {county.whySection ? (
          <section className="mb-10">
            <h2 className="text-2xl md:text-3xl font-serif text-neutral-900 mb-4">
              Why get married in {county.county}?
            </h2>
            <div className="text-neutral-700 leading-relaxed text-lg space-y-5">
              {county.whySection.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        ) : null}

        {county.travelSection ? (
          <section className="mb-12">
            <h2 className="text-2xl md:text-3xl font-serif text-neutral-900 mb-4">
              Travel & coverage
            </h2>
            <div className="text-neutral-700 leading-relaxed text-lg space-y-5">
              {county.travelSection.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mb-14">
          <h2 className="text-2xl md:text-3xl font-serif text-neutral-900 mb-5">
            Wedding venues in {county.county}
          </h2>

          {venues.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <p className="text-neutral-600">No venues listed yet for this county.</p>
          )}
        </section>

        {faqs.length ? (
          <section>
            <h2 className="text-2xl md:text-3xl font-serif text-neutral-900 mb-5">
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
      </div>
    </div>
  );
}