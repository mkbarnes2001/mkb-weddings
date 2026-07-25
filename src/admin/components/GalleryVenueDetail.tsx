import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";
import {
  PublicVenueService,
  type PublicVenueDocument,
  type PublicVenueIndexItem,
} from "../services/PublicVenueService";

const SITE_ORIGIN =
  "https://www.mkbweddings.co.uk";

function safeExternalUrl(input: string) {
  const raw = String(input || "").trim();

  if (!raw) return "";

  try {
    return new URL(raw).href;
  } catch {
    try {
      return new URL(
        `https://${raw.replace(/^\/+/, "")}`,
      ).href;
    } catch {
      return "";
    }
  }
}

function countySlug(county: string) {
  return String(county || "")
    .trim()
    .toLowerCase()
    .replace(/^county\s+/i, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function countryCode(country: string) {
  return String(country || "")
    .toLowerCase()
    .includes("northern")
    ? "GB"
    : "IE";
}

function fallbackDescription(
  venue: PublicVenueDocument,
) {
  const location = [
    venue.town,
    venue.county,
    venue.country,
  ]
    .filter(Boolean)
    .join(", ");

  return `Wedding photography at ${venue.name}${
    location ? ` in ${location}` : ""
  }. I photograph weddings here in a relaxed, documentary style, capturing genuine moments, natural emotion and the atmosphere of the day as it unfolds.`;
}

export function GalleryVenueDetail() {
  const { venueId = "" } = useParams<{
    venueId: string;
  }>();

  const [venue, setVenue] =
    useState<PublicVenueDocument | null>(null);
  const [allVenues, setAllVenues] = useState<
    PublicVenueIndexItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [lightboxOpen, setLightboxOpen] =
    useState(false);
  const [lightboxIndex, setLightboxIndex] =
    useState(0);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, [venueId]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setLoadError("");

    Promise.all([
      PublicVenueService.loadVenue(venueId),
      PublicVenueService.loadIndex(),
    ])
      .then(([loadedVenue, index]) => {
        if (cancelled) return;

        setVenue(loadedVenue);
        setAllVenues(index.venues);
      })
      .catch((error) => {
        if (cancelled) return;

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load venue gallery.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [venueId]);

  const images = useMemo(() => {
    if (!venue) return [];

    return [...venue.gallery.images]
      .sort((a, b) => a.order - b.order)
      .map((image) => ({
        ...image,
        alt:
          image.alt ||
          `${venue.name} wedding photography`,
      }));
  }, [venue]);

  const heroImage = useMemo(() => {
    if (!venue || !images.length) return "";

    return (
      images.find(
        (image) =>
          image.assetId ===
          venue.gallery.heroAssetId,
      )?.fullSrc ||
      images[0].fullSrc ||
      images[0].thumbSrc
    );
  }, [venue, images]);

  const moreVenueLinks = useMemo(() => {
    return allVenues
      .filter((item) => item.slug !== venueId)
      .sort((a, b) => {
        const sameCountyA =
          a.county &&
          venue?.county &&
          a.county.toLowerCase() ===
            venue.county.toLowerCase()
            ? 0
            : 1;

        const sameCountyB =
          b.county &&
          venue?.county &&
          b.county.toLowerCase() ===
            venue.county.toLowerCase()
            ? 0
            : 1;

        if (sameCountyA !== sameCountyB) {
          return sameCountyA - sameCountyB;
        }

        return a.name.localeCompare(b.name);
      })
      .slice(0, 6);
  }, [allVenues, venueId, venue]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6 text-neutral-600">
        Loading venue gallery…
      </div>
    );
  }

  if (loadError || !venue || !images.length) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center">
          <Helmet>
            <title>
              Venue not found | MKB Weddings
            </title>
            <meta
              name="robots"
              content="noindex"
            />
          </Helmet>

          <h1 className="text-3xl mb-3">
            Venue not found
          </h1>
          {loadError ? (
            <p className="mb-5 text-neutral-600">
              {loadError}
            </p>
          ) : null}
          <Link
            to="/gallery/venues"
            className="text-neutral-600 hover:text-neutral-900 underline underline-offset-4"
          >
            Back to Venues
          </Link>
        </div>
      </div>
    );
  }

  const locationLine = [
    venue.town,
    venue.county,
    venue.country,
  ]
    .filter(Boolean)
    .join(", ");

  const safeWebsite = safeExternalUrl(
    venue.links.website,
  );

  const description =
    venue.description || fallbackDescription(venue);

  const introLine =
    venue.intro ||
    `Wedding photography at ${venue.name}${
      locationLine ? `, ${locationLine}` : ""
    }`;

  const countyName = venue.county;
  const countyId = countySlug(venue.county);

  const canonical =
    `${SITE_ORIGIN}/gallery/venue/` +
    encodeURIComponent(venue.slug);

  const metaTitle =
    venue.seo.title ||
    `${venue.name} Wedding Photography${
      venue.county ? ` | ${venue.county}` : ""
    } | MKB Weddings`;

  const metaDescription =
    venue.seo.description ||
    description.slice(0, 160);

  const breadcrumbItems = [
    {
      name: "Home",
      item: `${SITE_ORIGIN}/`,
    },
    {
      name: "Gallery",
      item: `${SITE_ORIGIN}/gallery`,
    },
    {
      name: "Counties",
      item: `${SITE_ORIGIN}/wedding-photographer`,
    },
    ...(countyName
      ? [
          {
            name: countyName,
            item:
              `${SITE_ORIGIN}/wedding-photographer/` +
              encodeURIComponent(countyId),
          },
        ]
      : []),
    {
      name: "Venues",
      item: `${SITE_ORIGIN}/gallery/venues`,
    },
    {
      name: venue.name,
      item: canonical,
    },
  ].map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.item,
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
        "@type": "ImageObject",
        "@id": `${canonical}#primaryimage`,
        contentUrl: heroImage,
        url: heroImage,
        caption: `${venue.name} wedding photography`,
        representativeOfPage: true,
      },
      {
        "@type": [
          "Place",
          "EventVenue",
        ],
        "@id": `${canonical}#venue`,
        name: venue.name,
        url: canonical,
        sameAs: safeWebsite
          ? [safeWebsite]
          : undefined,
        address: {
          "@type": "PostalAddress",
          streetAddress:
            venue.practical.address || undefined,
          addressLocality:
            venue.town || undefined,
          addressRegion:
            venue.county || undefined,
          addressCountry: countryCode(
            venue.country,
          ),
        },
      },
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: metaTitle,
        description: metaDescription,
        isPartOf: {
          "@id": `${SITE_ORIGIN}/#website`,
        },
        breadcrumb: {
          "@id": `${canonical}#breadcrumb`,
        },
        primaryImageOfPage: {
          "@id": `${canonical}#primaryimage`,
        },
        about: {
          "@id": `${canonical}#venue`,
        },
        hasPart: images
          .slice(0, 12)
          .map((image, index) => ({
            "@type": "ImageObject",
            "@id":
              `${canonical}#image-${index + 1}`,
            contentUrl: image.fullSrc,
            url: image.fullSrc,
            caption: image.alt,
          })),
      },
    ],
  };

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
        <link
          rel="preload"
          as="image"
          href={heroImage}
          fetchPriority="high"
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
          content={heroImage}
        />
        <meta
          property="og:type"
          content="website"
        />

        <script type="application/ld+json">
          {JSON.stringify(pageJsonLd)}
        </script>
      </Helmet>

      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback
          src={heroImage}
          alt={`${venue.name}${
            locationLine
              ? `, ${locationLine}`
              : ""
          } wedding photography`}
          width={2000}
          height={1200}
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover"
        />
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

            <h1 className="text-white text-5xl md:text-6xl mb-4">
              {venue.name}
            </h1>

            <div className="flex flex-col items-center gap-2 text-white/90">
              {locationLine ? (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{locationLine}</span>
                </div>
              ) : null}

              <div className="text-white/85 text-sm">
                {images.length}{" "}
                {images.length === 1
                  ? "image"
                  : "images"}
              </div>
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

            {countyName ? (
              <>
                <li className="opacity-60">
                  <ChevronRight className="w-4 h-4" />
                </li>
                <li>
                  <Link
                    to={`/wedding-photographer/${encodeURIComponent(
                      countyId,
                    )}`}
                    className="hover:text-neutral-900 underline underline-offset-4"
                  >
                    {countyName}
                  </Link>
                </li>
              </>
            ) : null}

            <li className="opacity-60">
              <ChevronRight className="w-4 h-4" />
            </li>
            <li>
              <Link
                to="/gallery/venues"
                className="hover:text-neutral-900 underline underline-offset-4"
              >
                Venues
              </Link>
            </li>
            <li className="opacity-60">
              <ChevronRight className="w-4 h-4" />
            </li>
            <li className="text-neutral-900">
              {venue.name}
            </li>
          </ol>
        </nav>
      </div>

      <section className="max-w-5xl mx-auto px-6 pt-12 pb-10 text-center">
        <p className="text-neutral-900 text-2xl md:text-4xl font-serif mb-10">
          {introLine}
        </p>

        {safeWebsite ? (
          <div className="mb-10">
            <a
              href={safeWebsite}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="inline-flex items-center gap-2 text-neutral-900 hover:text-neutral-700 underline underline-offset-4 justify-center"
            >
              Visit venue website
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ) : null}

        <div className="text-neutral-700 leading-relaxed text-lg space-y-5 mb-10">
          {description
            .split(/\n{2,}/)
            .map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image, index) => {
            const shouldSpanLast =
              index === images.length - 1 &&
              images.length % 3 === 1;

            return (
              <button
                key={image.assetId}
                type="button"
                onClick={() => {
                  setLightboxIndex(index);
                  setLightboxOpen(true);
                }}
                className={`aspect-[4/3] overflow-hidden rounded-lg group cursor-pointer text-left ${
                  shouldSpanLast
                    ? "lg:col-span-3"
                    : ""
                }`}
              >
                <ImageWithFallback
                  src={image.thumbSrc}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </button>
            );
          })}
        </div>
      </div>

      <section className="max-w-5xl mx-auto px-6 pb-40 text-center">
        <div className="pt-10 border-t border-neutral-200">
          <h2 className="text-neutral-900 text-2xl md:text-3xl font-serif mb-4">
            Explore more venues
          </h2>
          <p className="text-neutral-600 mb-6">
            Browse more real wedding galleries across
            Northern Ireland and Ireland.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link
              to="/gallery/venues"
              className="text-neutral-900 hover:text-neutral-700 underline underline-offset-4"
            >
              View all venues
            </Link>
            <Link
              to="/gallery"
              className="text-neutral-900 hover:text-neutral-700 underline underline-offset-4"
            >
              Back to gallery
            </Link>
          </div>

          {moreVenueLinks.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {moreVenueLinks.map((item) => (
                <Link
                  key={item.slug}
                  to={`/gallery/venue/${item.slug}`}
                  className="rounded-lg border border-neutral-200 p-4 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
                >
                  <div className="text-neutral-900 font-medium">
                    {item.name}
                  </div>
                  {[item.town, item.county]
                    .filter(Boolean)
                    .length ? (
                    <div className="text-neutral-600 text-sm mt-1">
                      {[item.town, item.county]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {lightboxOpen && images.length > 0 ? (
        <ImageLightbox
          images={images.map(
            (image) => image.fullSrc,
          )}
          alts={images.map(
            (image) => image.alt,
          )}
          currentIndex={lightboxIndex}
          onClose={() =>
            setLightboxOpen(false)
          }
          onNavigate={(newIndex) =>
            setLightboxIndex(newIndex)
          }
        />
      ) : null}
    </div>
  );
}
