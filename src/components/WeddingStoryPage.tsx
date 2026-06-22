// src/components/WeddingStoryPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, ChevronRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";
import { weddingStories } from "../data/weddingStories";
import { getBlogImages, getCoverImage } from "../lib/blogGallery";
import type { BlogImage } from "../lib/blogGallery";

export function WeddingStoryPage() {
  const { slug } = useParams();
  const [images, setImages] = useState<BlogImage[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const story = weddingStories.find((item) => item.slug === slug);

  const venueUrl = story ? `/gallery/venue/${story.slug}` : "/gallery/venues";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  useEffect(() => {
    if (!slug || !story) return;

    let cancelled = false;

    fetch("/gallery.csv", { cache: "no-store" })
      .then((res) => (res.ok ? res.text() : ""))
      .then((csvText) => {
        if (!cancelled) setImages(getBlogImages(csvText, slug, story));
      })
      .catch(() => {
        if (!cancelled) setImages([]);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, story]);

  const cover = getCoverImage(images);

  const lightboxImages = useMemo(() => images.map((image) => image.fullSrc), [images]);
  const lightboxAlts = useMemo(() => images.map((image) => image.alt), [images]);

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
      {/* HERO */}
      <section className="relative h-[70vh] min-h-[500px] bg-neutral-200">
        {cover ? (
          <ImageWithFallback
            src={cover.fullSrc}
            alt={`${story.couple} wedding at ${story.venue}`}
            width={2000}
            height={1200}
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover brightness-[0.7]"
          />
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/20" />

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

      {/* STORY TEXT */}
      <main className="max-w-4xl mx-auto px-6 py-16 text-center">
        <p className="text-xl md:text-2xl leading-relaxed text-neutral-800 mb-10 font-serif">
          {story.intro}
        </p>

        <div className="space-y-6 text-lg leading-relaxed text-neutral-700 text-left">
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

      {/* GALLERY - matches venue gallery viewing style */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
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
              Add this story slug to the <span className="font-mono">blogSlug</span> column in
              <span className="font-mono"> public/gallery.csv</span>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image, index) => {
              const remainderLg = images.length % 3;
              const isLast = index === images.length - 1;
              const shouldSpanLg = isLast && remainderLg === 1;

              return (
                <button
                  key={`${image.thumbSrc}-${index}`}
                  type="button"
                  onClick={() => {
                    setLightboxIndex(index);
                    setLightboxOpen(true);
                  }}
                  className={`aspect-[4/3] overflow-hidden rounded-lg group cursor-pointer text-left bg-neutral-100 ${
                    shouldSpanLg ? "lg:col-span-3" : ""
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
        )}
      </section>

      {/* CTA */}
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

      {/* LIGHTBOX - same component used by venue galleries */}
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