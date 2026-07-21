import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";
import { MasonryGallery } from "./MasonryGallery";

const SITE_ORIGIN = "https://www.mkbweddings.co.uk";

type PublicMomentImage = {
  assetKey: string;
  imageId: string;
  filename: string;
  venueSlug: string;
  venueName: string;
  thumbSrc: string;
  fullSrc: string;
  alt: string;
  caption: string;
};

type PublicMomentPayload = {
  ok: true;
  moment: {
    id: string;
    slug: string;
    name: string;
    description: string;
  };
  hero: PublicMomentImage | null;
  images: PublicMomentImage[];
  venueCount: number;
};

export function GalleryMomentDetail() {
  const { momentId = "" } = useParams<{ momentId: string }>();
  const [payload, setPayload] = useState<PublicMomentPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [momentId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    fetch(`/api/public/moments/${encodeURIComponent(momentId)}?refresh=${Date.now()}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body?.error || `Unable to load moment (${response.status}).`);
        }
        return body as PublicMomentPayload;
      })
      .then((body) => {
        if (!cancelled) setPayload(body);
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Unable to load moment gallery.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [momentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <p className="text-neutral-600">Loading gallery…</p>
      </div>
    );
  }

  if (loadError || !payload?.moment) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-xl">
          <h1 className="text-3xl mb-3">Moment gallery unavailable</h1>
          <p className="text-neutral-600 mb-6">
            {loadError || "This moment could not be found."}
          </p>
          <Link
            to="/gallery/moments"
            className="text-neutral-600 hover:text-neutral-900 underline underline-offset-4"
          >
            Back to Moments
          </Link>
        </div>
      </div>
    );
  }

  const { moment, images, venueCount, hero } = payload;
  const momentName = moment.name;
  const momentDescription = moment.description;
  const heroImage =
    hero?.fullSrc ||
    hero?.thumbSrc ||
    images[0]?.fullSrc ||
    images[0]?.thumbSrc ||
    "https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=1600&q=80";

  const canonical = `${SITE_ORIGIN}/gallery/moment/${encodeURIComponent(moment.slug)}`;
  const metaTitle = `${momentName} Wedding Photos | Northern Ireland & Ireland | MKB Weddings`;
  const metaDescription =
    momentDescription ||
    `Browse ${momentName.toLowerCase()} wedding photography across Northern Ireland and Ireland — real moments, real weddings, captured by MKB Weddings.`;

  const galleryImageObjects = images.slice(0, 24).map((image, index) => ({
    "@type": "ImageObject",
    "@id": `${canonical}#image-${index + 1}`,
    contentUrl: image.fullSrc,
    url: image.fullSrc,
    thumbnailUrl: image.thumbSrc,
    name: image.alt,
    description: image.alt,
    caption: image.caption || image.alt,
    representativeOfPage: index === 0,
    creator: { "@type": "Person", name: "Mark Barnes" },
    copyrightHolder: { "@type": "Organization", name: "MKB Weddings" },
    creditText: "MKB Weddings",
    acquireLicensePage: SITE_ORIGIN,
    isPartOf: { "@id": `${canonical}#webpage` },
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
        "@type": "ImageObject",
        "@id": `${canonical}#primaryimage`,
        contentUrl: heroImage,
        url: heroImage,
        name: `${momentName} wedding photography`,
        description: `${momentName} wedding photography by MKB Weddings`,
        representativeOfPage: true,
        creator: { "@type": "Person", name: "Mark Barnes" },
        copyrightHolder: { "@type": "Organization", name: "MKB Weddings" },
        creditText: "MKB Weddings",
      },
      {
        "@type": "CollectionPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: metaTitle,
        description: metaDescription,
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
        primaryImageOfPage: { "@id": `${canonical}#primaryimage` },
        hasPart: galleryImageObjects,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonical} />
        <link rel="preload" as="image" href={heroImage} />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={heroImage} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(pageJsonLd)}</script>
      </Helmet>

      <div className="relative h-[60vh] min-h-[400px]">
        <ImageWithFallback
          src={heroImage}
          alt={`${momentName} wedding photography in Northern Ireland`}
          width={2000}
          height={1200}
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-6 pb-16 w-full text-center">
            <Link
              to="/gallery/moments"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Moments
            </Link>

            <h1 className="text-white text-5xl md:text-6xl mb-4">{momentName}</h1>
            <p className="text-white text-sm md:text-base">
              {images.length} {images.length === 1 ? "image" : "images"} · {venueCount}{" "}
              {venueCount === 1 ? "venue" : "venues"}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-6 pb-12">
        <nav aria-label="Breadcrumb" className="flex justify-center">
          <ol className="flex flex-wrap items-center justify-center gap-2 text-neutral-600 text-sm">
            <li>
              <Link to="/" className="hover:text-neutral-900 underline underline-offset-4">
                Home
              </Link>
            </li>
            <li className="opacity-60"><ChevronRight className="w-4 h-4" /></li>
            <li>
              <Link to="/gallery" className="hover:text-neutral-900 underline underline-offset-4">
                Gallery
              </Link>
            </li>
            <li className="opacity-60"><ChevronRight className="w-4 h-4" /></li>
            <li>
              <Link
                to="/gallery/moments"
                className="hover:text-neutral-900 underline underline-offset-4"
              >
                Moments
              </Link>
            </li>
            <li className="opacity-60"><ChevronRight className="w-4 h-4" /></li>
            <li className="text-neutral-900">{momentName}</li>
          </ol>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-32">
        {momentDescription ? (
          <div className="text-center max-w-3xl mx-auto mt-16 mb-10">
            <p className="font-serif text-[20px] leading-[1.9] text-neutral-800">
              {momentDescription}
            </p>
          </div>
        ) : null}

        {images.length === 0 ? (
          <div className="text-center py-20 text-neutral-600">
            No images are currently published for this moment.
          </div>
        ) : (
          <MasonryGallery
            images={images.map((image) => ({
              thumbSrc: image.thumbSrc,
              fullSrc: image.fullSrc,
              alt: image.alt,
            }))}
            onImageClick={(index) => {
              setLightboxIndex(index);
              setLightboxOpen(true);
            }}
          />
        )}

        {lightboxOpen && images.length > 0 ? (
          <ImageLightbox
            images={images.map((image) => image.fullSrc)}
            alts={images.map((image) => image.alt)}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
            onNavigate={(newIndex) => setLightboxIndex(newIndex)}
          />
        ) : null}
      </div>
    </div>
  );
}
