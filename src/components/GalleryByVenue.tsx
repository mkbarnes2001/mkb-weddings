import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import {
  PublicVenueService,
  type PublicVenueIndexItem,
} from "../services/PublicVenueService";

const SITE_ORIGIN =
  "https://www.mkbweddings.co.uk";

const HERO_IMAGE =
  "https://images.mkbweddings.co.uk/full/Crover%20House/couple%20portraits/mkb-weddings-irish-wedding-photographer-crover-house-cavan-wedding-photography-9_2000.webp";



export function GalleryByVenue() {
  const [venues, setVenues] = useState<
    PublicVenueIndexItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [masterHero, setMasterHero] = useState<{ fullSrc: string; thumbSrc: string; alt: string } | null>(null);
  const [loadError, setLoadError] = useState<
    string | null
  >(null);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      PublicVenueService.loadIndex(),
      fetch("/api/public/gallery-master-heroes?refresh=1", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null),
    ])
      .then(([index, heroData]) => {
        if (!cancelled) {
          setVenues(index.venues);
          setMasterHero(heroData?.venue || null);
          setLoadError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load venue galleries.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const venueCards = useMemo(() => venues, [venues]);

  const canonical =
    `${SITE_ORIGIN}/gallery/venues`;

  const metaTitle =
    "Wedding Venue Galleries | Northern Ireland & Ireland | MKB Weddings";

  const metaDescription =
    "Browse real wedding photography by venue across Northern Ireland and Ireland. Explore venue galleries, style inspiration, and full wedding stories by MKB Weddings.";

  const ogImage =
    masterHero?.fullSrc ||
    masterHero?.thumbSrc ||
    venueCards[0]?.coverFull ||
    venueCards[0]?.coverThumb ||
    HERO_IMAGE;

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: metaTitle,
        description: metaDescription,
        isPartOf: {
          "@id": `${SITE_ORIGIN}/#website`,
        },
        inLanguage: "en-GB",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumbs`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_ORIGIN}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Gallery",
            item: `${SITE_ORIGIN}/gallery`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Counties",
            item:
              `${SITE_ORIGIN}/wedding-photographer`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: "Venues",
            item: canonical,
          },
        ],
      },
    ],
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6 text-neutral-600">
        Loading venue galleries…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-xl">
          <Helmet>
            <title>
              Wedding Venue Galleries | MKB Weddings
            </title>
            <meta
              name="robots"
              content="noindex"
            />
          </Helmet>

          <h1 className="text-3xl mb-3">
            Gallery loading error
          </h1>
          <p className="text-neutral-600 mb-6">
            {loadError}
          </p>
          <Link
            to="/gallery"
            className="text-neutral-600 hover:text-neutral-900 underline underline-offset-4"
          >
            Back to Gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{metaTitle}</title>
        <meta
          name="description"
          content={metaDescription}
        />

        <link
          rel="canonical"
          href={canonical}
        />
        <meta
          property="og:url"
          content={canonical}
        />
        <meta
          property="og:title"
          content={metaTitle}
        />
        <meta
          property="og:description"
          content={metaDescription}
        />
        <meta
          property="og:image"
          content={ogImage}
        />
        <meta
          property="og:type"
          content="website"
        />

        <meta
          name="twitter:card"
          content="summary_large_image"
        />
        <meta
          name="twitter:title"
          content={metaTitle}
        />
        <meta
          name="twitter:description"
          content={metaDescription}
        />
        <meta
          name="twitter:image"
          content={ogImage}
        />

        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback
          src={masterHero?.fullSrc || masterHero?.thumbSrc || HERO_IMAGE}
          alt={masterHero?.alt || "Wedding venue galleries across Northern Ireland and Ireland"}
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
              Wedding Venue Galleries
            </h1>

            <div className="text-white/85 text-sm">
              {venueCards.length}{" "}
              {venueCards.length === 1
                ? "venue"
                : "venues"}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-6 pb-10">
        <nav
          aria-label="Breadcrumb"
          className="flex justify-center"
        >
          <ol className="flex flex-wrap items-center justify-center gap-2 text-neutral-600 text-sm">
            <li>
              <Link
                to="/"
                className="hover:text-neutral-900 underline underline-offset-4"
              >
                Home
              </Link>
            </li>
            <li className="opacity-60">
              <ChevronRight className="w-4 h-4" />
            </li>
            <li>
              <Link
                to="/gallery"
                className="hover:text-neutral-900 underline underline-offset-4"
              >
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
            <li className="text-neutral-900">
              Venues
            </li>
          </ol>
        </nav>
      </div>

      <section className="max-w-5xl mx-auto px-6 pt-12 pb-20 text-center">
        <p className="text-neutral-700 text-lg md:text-xl leading-relaxed">
          Browse real wedding photography by venue
          across <strong>Northern Ireland</strong> and{" "}
          <strong>Ireland</strong>. Use these galleries
          to see how a venue photographs in different
          seasons, light and weather — and to find
          inspiration for your own day.
        </p>
      </section>

      <div className="max-w-7xl mx-auto px-6 pb-40">
        {!venueCards.length ? (
          <div className="text-center py-20 text-neutral-600">
            No published venue galleries found yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venueCards.map((venue) => (
              <Link
                key={venue.id || venue.slug}
                to={`/gallery/venue/${venue.slug}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg"
              >
                <ImageWithFallback
                  src={
                    venue.coverThumb ||
                    venue.coverFull
                  }
                  alt={
                    venue.coverAlt ||
                    `${venue.name} wedding photography venue gallery`
                  }
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <h2 className="text-white text-2xl mb-2 font-serif">
                    {venue.name}
                  </h2>
                  <p className="text-white/85 text-sm mb-3">
                    {venue.imageCount} image
                    {venue.imageCount !== 1
                      ? "s"
                      : ""}
                  </p>
                  <div className="flex items-center text-white">
                    <span className="text-sm uppercase tracking-wider">
                      Explore
                    </span>
                    <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-2" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
