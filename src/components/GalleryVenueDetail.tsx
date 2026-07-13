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
import { MasonryGallery } from "./MasonryGallery";
import {
  PublicVenueService,
  type PublicVenueDocument,
  type PublicVenueIndexItem,
} from "../services/PublicVenueService";

type CountyMeta = {
  slug: string;
  county: string;
  country?: string;
};

const SITE_ORIGIN =
  "https://www.mkbweddings.co.uk";

function hashString(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function stableShuffle<T>(
  values: T[],
  seed: string,
) {
  const output = [...values];
  let state = hashString(seed) || 1;

  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;

    return (state >>> 0) / 4294967296;
  };

  for (
    let index = output.length - 1;
    index > 0;
    index -= 1
  ) {
    const target = Math.floor(
      random() * (index + 1),
    );

    [output[index], output[target]] = [
      output[target],
      output[index],
    ];
  }

  return output;
}

function slugify(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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

function countryCodeFromVenueCountry(
  countryRaw: string,
): "GB" | "IE" | undefined {
  const country = String(countryRaw || "")
    .trim()
    .toLowerCase();

  if (!country) return undefined;

  if (
    country === "ireland" ||
    country === "republic of ireland" ||
    country === "roi"
  ) {
    return "IE";
  }

  if (
    country === "northern ireland" ||
    country === "ni"
  ) {
    return "GB";
  }

  return undefined;
}

function makeLocationLine(
  town: string,
  region: string,
  country: string,
) {
  return [town, region, country]
    .filter(Boolean)
    .join(", ");
}

function getFallbackVenueDescription(
  venueName: string,
  town?: string,
  region?: string,
  country?: string,
) {
  const location = makeLocationLine(
    town || "",
    region || "",
    country || "",
  );

  return `Wedding photography at ${venueName}${
    location ? ` in ${location}` : ""
  }. I photograph weddings here in a relaxed, documentary style — capturing genuine moments, natural emotion, and the atmosphere of the day as it unfolds. Couples receive authentic storytelling with a creative edge, plus confident direction when it matters.`;
}

function normaliseCountyName(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^county\s+/i, "")
    .replace(/\s+/g, " ");
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
  const [countyMetaMap, setCountyMetaMap] =
    useState<Record<string, CountyMeta>>({});
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
      fetch("/county-meta.json", {
        cache: "no-store",
      })
        .then((response) =>
          response.ok ? response.json() : {},
        )
        .catch(() => ({})),
    ])
      .then(
        ([
          loadedVenue,
          index,
          countyDocument,
        ]) => {
          if (cancelled) return;

          setVenue(loadedVenue);
          setAllVenues(index.venues);
          setCountyMetaMap(
            countyDocument as Record<
              string,
              CountyMeta
            >,
          );
        },
      )
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
        assetId: image.assetId,
        thumb: image.thumbSrc,
        full: image.fullSrc,
        alt:
          image.alt ||
          `${venue.name} wedding photography`,
        caption: image.caption || "",
        filename: image.filename,
      }));
  }, [venue]);

  const hero = useMemo(() => {
    if (!venue || !images.length) {
      return null;
    }

    return (
      images.find(
        (image) =>
          image.assetId ===
          venue.gallery.heroAssetId,
      ) || images[0]
    );
  }, [venue, images]);

  const { countySlug, countyName } =
    useMemo(() => {
      const region = venue?.county || "";
      const regionNormalised =
        normaliseCountyName(region);

      if (!regionNormalised) {
        return {
          countySlug: "",
          countyName: "",
        };
      }

      for (const [
        slug,
        county,
      ] of Object.entries(
        countyMetaMap || {},
      )) {
        const candidate = String(
          county?.county || slug,
        );

        if (
          normaliseCountyName(candidate) ===
          regionNormalised
        ) {
          return {
            countySlug: slug,
            countyName: candidate,
          };
        }
      }

      return {
        countySlug: slugify(region),
        countyName: region,
      };
    }, [countyMetaMap, venue?.county]);

  const moreVenueLinks = useMemo(() => {
    if (!venue) return [];

    const sameCountry = allVenues.filter(
      (item) =>
        item.slug !== venue.slug &&
        item.country &&
        venue.country &&
        item.country.toLowerCase() ===
          venue.country.toLowerCase(),
    );

    const otherCountry = allVenues.filter(
      (item) =>
        item.slug !== venue.slug &&
        (!item.country ||
          !venue.country ||
          item.country.toLowerCase() !==
            venue.country.toLowerCase()),
    );

    return [
      ...stableShuffle(
        sameCountry,
        `more:same:${venue.slug}:${sameCountry.length}`,
      ),
      ...stableShuffle(
        otherCountry,
        `more:other:${venue.slug}:${otherCountry.length}`,
      ),
    ].slice(0, 6);
  }, [allVenues, venue]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6 text-neutral-600">
        Loading venue gallery…
      </div>
    );
  }

  if (
    loadError ||
    !venue ||
    !images.length ||
    !hero
  ) {
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
            className="text-neutral-600 hover:text-neutral-900"
          >
            Back to Venues
          </Link>
        </div>
      </div>
    );
  }

  const name = venue.name;
  const town = venue.town;
  const region = venue.county;
  const country = venue.country;

  const locationLine = makeLocationLine(
    town,
    region,
    country,
  );

  const safeWebsite = safeExternalUrl(
    venue.links.website,
  );

  const description =
    venue.description ||
    getFallbackVenueDescription(
      name,
      town,
      region,
      country,
    );

  const introLine =
    venue.intro ||
    `Wedding photography at ${name}${
      locationLine ? `, ${locationLine}` : ""
    }`;

  const safeVenueId = venue.slug.replace(
    /\/+$/,
    "",
  );

  const canonical =
    `${SITE_ORIGIN}/gallery/venue/` +
    encodeURIComponent(safeVenueId);

  const metaTitle =
    venue.seo.title ||
    `${name} Wedding Photography${
      region ? ` | ${region}` : ""
    }${
      country ? `, ${country}` : ""
    } | MKB Weddings`;

  const metaDescription =
    venue.seo.description ||
    description ||
    `Natural, documentary wedding photography at ${name}${
      locationLine ? ` in ${locationLine}` : ""
    }. View real weddings and venue galleries by MKB Weddings.`;

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
      item:
        `${SITE_ORIGIN}/wedding-photographer`,
    },
    ...(countyName
      ? [
          {
            name: countyName,
            item:
              `${SITE_ORIGIN}/wedding-photographer/` +
              encodeURIComponent(countySlug),
          },
        ]
      : []),
    {
      name: "Venues",
      item: `${SITE_ORIGIN}/gallery/venues`,
    },
    {
      name,
      item: canonical,
    },
  ].map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.item,
  }));

  const heroImageObject = {
    "@type": "ImageObject",
    "@id": `${canonical}#primaryimage`,
    contentUrl: hero.full,
    url: hero.full,
    thumbnailUrl: hero.thumb,
    name: hero.alt,
    description: hero.alt,
    caption: hero.caption || hero.alt,
    representativeOfPage: true,
    creator: {
      "@type": "Person",
      name: "Mark Barnes",
    },
    copyrightHolder: {
      "@type": "Organization",
      name: "MKB Weddings",
    },
    creditText: "MKB Weddings",
  };

  const galleryImageObjects = images
    .slice(0, 24)
    .map((image, index) => ({
      "@type": "ImageObject",
      "@id":
        `${canonical}#image-${index + 1}`,
      contentUrl: image.full,
      url: image.full,
      thumbnailUrl: image.thumb,
      name: image.alt,
      description: image.alt,
      caption:
        image.caption || image.alt,
      representativeOfPage:
        image.assetId === hero.assetId,
      creator: {
        "@type": "Person",
        name: "Mark Barnes",
      },
      copyrightHolder: {
        "@type": "Organization",
        name: "MKB Weddings",
      },
      creditText: "MKB Weddings",
      acquireLicensePage:
        "https://www.mkbweddings.co.uk",
      isPartOf: {
        "@id": `${canonical}#webpage`,
      },
    }));

  const venuePlaceJsonLd = {
    "@type": [
      "Place",
      "EventVenue",
    ],
    "@id": `${canonical}#venue`,
    name,
    url: canonical,
    sameAs: safeWebsite
      ? [safeWebsite]
      : undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress:
        venue.practical.address ||
        undefined,
      addressLocality: town || undefined,
      addressRegion: region || undefined,
      addressCountry:
        countryCodeFromVenueCountry(
          country,
        ),
    },
  };

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
      heroImageObject,
      venuePlaceJsonLd,
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
        hasPart: galleryImageObjects,
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
          href={hero.full}
          fetchpriority="high"
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
          content={hero.full}
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
          src={hero.full}
          alt={hero.alt}
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
              {name}
            </h1>

            <div className="flex flex-col items-center gap-2 text-white/90">
              {locationLine ? (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {locationLine}
                  </span>
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
                      countySlug,
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
              {name}
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
              <p key={index}>
                {paragraph}
              </p>
            ))}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 pb-20">
        <MasonryGallery
          images={images.map((image) => ({
            thumbSrc: image.thumb,
            fullSrc: image.full,
            alt: image.alt,
          }))}
          onImageClick={(index) => {
            setLightboxIndex(index);
            setLightboxOpen(true);
          }}
        />
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
              {moreVenueLinks.map((item) => {
                const location = [
                  item.town,
                  item.county,
                  item.country,
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <Link
                    key={item.slug}
                    to={`/gallery/venue/${item.slug}`}
                    className="rounded-lg border border-neutral-200 p-4 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="text-neutral-900 font-medium">
                      {item.name}
                    </div>
                    {location ? (
                      <div className="text-neutral-600 text-sm mt-1">
                        {location}
                      </div>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      {lightboxOpen && images.length > 0 ? (
        <ImageLightbox
          images={images.map(
            (image) => image.full,
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
