import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";
import { MasonryGallery } from "./MasonryGallery";

const SITE_ORIGIN = "https://www.mkbweddings.co.uk";

type PublicCollectionImage = {
  assetKey: string;
  imageId: string;
  filename: string;
  thumbSrc: string;
  fullSrc: string;
  alt: string;
  caption: string;
  weddingSlug: string;
};

type PublicCollectionPayload = {
  ok: true;
  collection: {
    id: string;
    slug: string;
    name: string;
    description: string;
    seoTitle: string;
    seoDescription: string;
  };
  hero: PublicCollectionImage | null;
  images: PublicCollectionImage[];
};

export function GalleryCustomCollection() {
  const { collectionSlug = "" } = useParams<{ collectionSlug: string }>();
  const [payload, setPayload] = useState<PublicCollectionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [collectionSlug]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    fetch(
      `/api/public/custom-collections/${encodeURIComponent(collectionSlug)}?refresh=${Date.now()}`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body?.error || `Unable to load collection (${response.status}).`);
        }
        return body as PublicCollectionPayload;
      })
      .then((body) => {
        if (!cancelled) setPayload(body);
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load collection gallery.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [collectionSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <p className="text-neutral-600">Loading gallery…</p>
      </div>
    );
  }

  if (loadError || !payload?.collection) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-xl">
          <h1 className="text-3xl mb-3">Collection unavailable</h1>
          <p className="text-neutral-600 mb-6">
            {loadError || "This collection could not be found."}
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

  const { collection, hero, images } = payload;
  const heroImage =
    hero?.fullSrc ||
    hero?.thumbSrc ||
    images[0]?.fullSrc ||
    images[0]?.thumbSrc ||
    "https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=1600&q=80";
  const canonical = `${SITE_ORIGIN}/gallery/collection/${encodeURIComponent(collection.slug)}`;
  const metaTitle =
    collection.seoTitle ||
    `${collection.name} Wedding Photography | MKB Weddings`;
  const metaDescription =
    collection.seoDescription ||
    collection.description ||
    `Explore ${collection.name.toLowerCase()} wedding photography by MKB Weddings across Northern Ireland and Ireland.`;

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
      </Helmet>

      <div className="relative h-[60vh] min-h-[400px]">
        <ImageWithFallback
          src={heroImage}
          alt={`${collection.name} wedding photography`}
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
              to="/gallery"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Gallery
            </Link>
            <h1 className="text-white text-5xl md:text-6xl mb-4">
              {collection.name}
            </h1>
            <p className="text-white text-sm md:text-base">
              {images.length} {images.length === 1 ? "image" : "images"}
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
            <li className="text-neutral-900">{collection.name}</li>
          </ol>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-32">
        {collection.description ? (
          <div className="text-center max-w-3xl mx-auto mt-10 mb-12">
            <p className="font-serif text-[20px] leading-[1.9] text-neutral-800">
              {collection.description}
            </p>
          </div>
        ) : null}

        {images.length === 0 ? (
          <div className="text-center py-20 text-neutral-600">
            No images have been published in this collection yet.
          </div>
        ) : (
          <MasonryGallery
            images={images.map((image) => ({
              thumbSrc: image.thumbSrc || image.fullSrc,
              fullSrc: image.fullSrc || image.thumbSrc,
              alt: image.alt || collection.name,
            }))}
            onImageClick={(index) => {
              setLightboxIndex(index);
              setLightboxOpen(true);
            }}
          />
        )}

        {lightboxOpen && images.length > 0 ? (
          <ImageLightbox
            images={images.map((image) => image.fullSrc || image.thumbSrc)}
            alts={images.map((image) => image.alt || collection.name)}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
            onNavigate={(newIndex) => setLightboxIndex(newIndex)}
          />
        ) : null}
      </div>
    </div>
  );
}
