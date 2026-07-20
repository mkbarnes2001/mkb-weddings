// src/components/WeddingStoryPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, ChevronRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";
import { MasonryGallery } from "./MasonryGallery";
import { loadMkbIntelligence, type BlogImage } from "../lib/intelligence";
import {
  PublicWeddingRepository,
  type PublicWeddingDetail,
} from "../lib/weddingEngine/PublicWeddingRepository";

function slugify(value: string) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function WeddingStoryPage() {
  const { slug } = useParams();
  const [story, setStory] = useState<PublicWeddingDetail | undefined>();
  const [storyLoading, setStoryLoading] = useState(true);
  const [images, setImages] = useState<BlogImage[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const venueUrl = story
    ? `/gallery/venue/${
        story.venueSlug ||
        slugify(story.venue)
      }`
    : "/gallery/venues";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    setStoryLoading(true);
    setStory(undefined);

    if (!slug) {
      setStoryLoading(false);
      return;
    }

    new PublicWeddingRepository()
      .getPublishedBySlug(slug)
      .then((loadedStory) => {
        if (!cancelled) {
          setStory(loadedStory);
        }
      })
      .catch(() => {
        if (!cancelled) setStory(undefined);
      })
      .finally(() => {
        if (!cancelled) setStoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug || !story) {
      setImages([]);
      return;
    }

    if (
      story.source !== "legacy" &&
      story.images.length > 0
    ) {
      setImages(
        story.images.map(
          (image) =>
            ({
              filename:
                image.filename,
              thumbSrc:
                image.thumbSrc,
              fullSrc:
                image.fullSrc,
              alt: image.alt,
              caption:
                image.caption,
              isCover:
                image.isCover,
            }) as BlogImage,
        ),
      );

      return;
    }

    let cancelled = false;

    /*
     * Static legacy data is retained only as a rollback fallback while the
     * D1 cutover is verified.
     */
    loadMkbIntelligence()
      .then((intelligence) => {
        if (!cancelled) {
          setImages(
            intelligence.getBlogImages(
              slug,
              {
                slug: story.slug,
                title: story.title,
                couple: story.couple,
                venue: story.venue,
                weddingDate:
                  story.weddingDate,
                excerpt:
                  story.excerpt,
                intro: story.intro,
                story: story.story,
                facts: story.facts,
                suppliers:
                  story.suppliers,
                seoTitle:
                  story.seo?.title,
                seoDescription:
                  story.seo
                    ?.description,
              },
            ),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setImages([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug, story]);

  const cover = useMemo(
    () => images.find((image) => image.isCover) || images[0],
    [images],
  );

  const lightboxImages = useMemo(
    () => images.map((image) => image.fullSrc),
    [images],
  );

  const lightboxAlts = useMemo(
    () => images.map((image) => image.alt),
    [images],
  );

  if (storyLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <p className="text-neutral-600">Loading wedding story…</p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-4xl mb-4">Wedding story not found</h1>
          <Link to="/blog" className="text-neutral-600 hover:text-neutral-900">
            Back to Wedding Stories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <section className="relative h-[70vh] min-h-[500px] bg-neutral-200">
        {cover ? (
          <ImageWithFallback
            src={cover.fullSrc}
            alt={cover.alt}
            width={2000}
            height={1200}
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover brightness-[0.5] contrast-[1.05]"
          />
        ) : null}

        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/30 to-black/80" />

        <div className="absolute inset-0 flex items-end">
          <div className="max-w-5xl mx-auto px-6 pb-16 w-full text-white text-center">
            <div className="flex justify-center mb-6">
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Wedding Stories
              </Link>
            </div>

            <p className="uppercase tracking-[0.25em] text-xs text-white/70 mb-4">
              Wedding Story
            </p>

            <h1 className="text-3xl md:text-5xl mb-6 leading-tight">
              {story.title}
            </h1>

            <div className="flex flex-wrap justify-center gap-8 text-white/90 text-lg">
              <span className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <Link
                  to={venueUrl}
                  className="underline underline-offset-4 hover:text-white transition-colors"
                >
                  {story.venue}
                </Link>
              </span>

              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {story.weddingDate}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 pt-8 pb-16">
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
              <Link to="/blog" className="hover:text-neutral-900 underline underline-offset-4">
                Wedding Stories
              </Link>
            </li>
            <li className="opacity-60">
              <ChevronRight className="w-4 h-4" />
            </li>
            <li>
              <Link to={venueUrl} className="hover:text-neutral-900 underline underline-offset-4">
                {story.venue}
              </Link>
            </li>
            <li className="opacity-60">
              <ChevronRight className="w-4 h-4" />
            </li>
            <li className="text-neutral-900">{story.couple}</li>
          </ol>
        </nav>
      </div>

      {story.facts ? (
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="border-y border-neutral-200 py-10">
            <div className="text-center mb-10">
              <p className="uppercase tracking-[0.25em] text-xs text-neutral-500 mb-3">
                Wedding at a Glance
              </p>
              <h2 className="text-2xl md:text-3xl font-serif">
                {story.couple} at {story.venue}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-center">
              {story.facts.season ? (
                <div>
                  <p className="uppercase tracking-widest text-xs text-neutral-500 mb-2">Season</p>
                  <p className="text-lg font-serif">{story.facts.season}</p>
                </div>
              ) : null}

              {story.facts.ceremonyType ? (
                <div>
                  <p className="uppercase tracking-widest text-xs text-neutral-500 mb-2">Ceremony</p>
                  <p className="text-lg font-serif">{story.facts.ceremonyType}</p>
                </div>
              ) : null}

              {story.facts.ceremonyLocation ? (
                <div>
                  <p className="uppercase tracking-widest text-xs text-neutral-500 mb-2">
                    Ceremony Location
                  </p>
                  <p className="text-lg font-serif">
                    {story.facts.ceremonyLocation}
                  </p>
                </div>
              ) : null}

              {story.facts.receptionLocation ? (
                <div>
                  <p className="uppercase tracking-widest text-xs text-neutral-500 mb-2">Reception</p>
                  <p className="text-lg font-serif">
                    {story.facts.receptionLocation}
                  </p>
                </div>
              ) : null}

              {story.facts.celebrant ? (
                <div>
                  <p className="uppercase tracking-widest text-xs text-neutral-500 mb-2">Celebrant</p>
                  <p className="text-lg font-serif">{story.facts.celebrant}</p>
                </div>
              ) : null}

              {story.facts.photographer ? (
                <div>
                  <p className="uppercase tracking-widest text-xs text-neutral-500 mb-2">Photography</p>
                  <p className="text-lg font-serif">
                    {story.facts.photographer}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <main className="max-w-4xl mx-auto px-6 pt-4 pb-16 text-center">
        <p className="text-xl md:text-2xl leading-relaxed text-neutral-800 mb-10 font-serif">
          {story.intro}
        </p>

        <div className="space-y-8 text-lg leading-relaxed text-neutral-700 text-center max-w-3xl mx-auto">
          {story.story.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-200 text-center">
          <p className="text-neutral-700 leading-relaxed">
            Planning your wedding at{" "}
            <Link
              to={venueUrl}
              className="font-medium underline underline-offset-4 hover:text-black transition-colors"
            >
              {story.venue}
            </Link>
            ? Browse the full venue gallery for more real wedding inspiration.
          </p>
        </div>
      </main>

      <section className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 pb-20">
        <div className="mb-8 text-center">
          <p className="uppercase tracking-[0.25em] text-xs text-neutral-500 mb-3">Gallery</p>
          <h2 className="text-2xl md:text-3xl font-serif">The photographs</h2>

          {images.length > 0 ? (
            <p className="text-neutral-600 mt-3">
              {images.length} {images.length === 1 ? "image" : "images"}
            </p>
          ) : null}
        </div>

        {images.length === 0 ? (
          <div className="bg-neutral-50 rounded-2xl p-10 text-center">
            <h3 className="text-3xl mb-4">No blog images selected yet</h3>
            <p className="text-neutral-700">
              Assign images to the Blog Gallery collection and publish the
              wedding story from Photography Intelligence.
            </p>
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
      </section>

      {story.suppliers && story.suppliers.length > 0 ? (
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="border-t border-neutral-200 pt-14">
            <div className="text-center mb-12">
              <p className="uppercase tracking-[0.25em] text-xs text-neutral-500 mb-3">
                Wedding Suppliers
              </p>

              <h2 className="text-3xl md:text-4xl font-serif mb-4">
                Meet the Team Behind the Day
              </h2>

              <p className="text-neutral-600 max-w-2xl mx-auto">
                Every wedding is brought to life by a brilliant team of suppliers.
                These are the people who helped make {story.couple}'s day so special.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {story.suppliers.map((supplier) => (
                <div
                  key={`${supplier.role}-${supplier.name}`}
                  className="rounded-2xl border border-neutral-200 p-6 hover:shadow-lg transition-shadow duration-300"
                >
                  <p className="uppercase tracking-widest text-xs text-neutral-500 mb-2">
                    {supplier.role}
                  </p>

                  <h3 className="font-serif text-xl mb-4">{supplier.name}</h3>

                  <div className="flex flex-wrap gap-4 text-sm">
                    {supplier.website ? (
                      <a
                        href={supplier.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4 hover:text-black"
                      >
                        Website
                      </a>
                    ) : null}

                    {supplier.instagram ? (
                      <a
                        href={`https://instagram.com/${supplier.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4 hover:text-black"
                      >
                        @{supplier.instagram}
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-neutral-50 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl mb-4 font-serif">
            Getting married at{" "}
            <Link
              to={venueUrl}
              className="underline underline-offset-4 hover:text-black transition-colors"
            >
              {story.venue}
            </Link>
            ?
          </h2>

          <p className="text-lg text-neutral-700 mb-8">
            Get in touch to check availability and talk through your wedding plans.
          </p>

          <Link
            to="/contact"
            className="inline-block px-8 py-4 rounded-lg bg-black text-white hover:bg-black/90 transition-colors"
          >
            Enquire About Your Date
          </Link>
        </div>
      </section>

      {lightboxOpen && images.length > 0 ? (
        <ImageLightbox
          images={lightboxImages}
          alts={lightboxAlts}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={(newIndex) => setLightboxIndex(newIndex)}
        />
      ) : null}
    </div>
  );
}
