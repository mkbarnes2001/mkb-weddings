import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export function CountyPage() {
  const { countySlug } = useParams();
  const [county, setCounty] = useState(null);

  useEffect(() => {
    fetch("/county-meta.json")
      .then(r => r.json())
      .then(data => setCounty(data[countySlug]));
  }, [countySlug]);

  if (!county) return null;

  const canonical = `https://www.mkbweddings.co.uk/wedding-photographer/county/${countySlug}`;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: county.faqs.map(f => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <Helmet>
        <title>{county.seoTitle}</title>
        <meta name="description" content={county.seoDescription} />
        <link rel="canonical" href={canonical} />
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>

      <h1 className="text-4xl font-serif mb-6">
        {county.primaryKeyword}
      </h1>

      <p className="mb-8">{county.intro}</p>

      <h2 className="text-2xl font-serif mt-10 mb-4">
        Why Get Married in {county.county}?
      </h2>
      <p>{county.whySection}</p>

      <h2 className="text-2xl font-serif mt-10 mb-4">
        Travel & Coverage
      </h2>
      <p>{county.travelSection}</p>

      <h2 className="text-2xl font-serif mt-10 mb-4">
        Wedding Venues in {county.county}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {county.venues.map(v => (
          <Link
            key={v.venueSlug}
            to={v.url}
            className="border p-4 rounded hover:bg-neutral-50"
          >
            <div className="font-medium">{v.venueName}</div>
            <div className="text-sm text-neutral-600">{v.town}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}