// src/components/WeddingStoryPage.tsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { weddingStories } from "../data/weddingStories";
import { getBlogImages, getCoverImage } from "../lib/blogGallery";
import type { BlogImage } from "../lib/blogGallery";

export function WeddingStoryPage() {
  const { slug } = useParams();
  const [images, setImages] = useState<BlogImage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const story = weddingStories.find((item) => item.slug === slug);

  useEffect(() => {
    if (!slug || !story) return;

    let cancelled = false;

    fetch("/gallery.csv")
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

  const cover = getCoverImage(images);
  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

  return (
    <div className="min-h-screen bg-white">
      <section className="relative h-[70vh] min-h-[500px] bg-neutral-200">
        {cover && (
          <ImageWithFallback
            src={cover.fullSrc}
            alt={`${story.couple} wedding at ${story.venue}`}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-6 pb-16 w-full text-white">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Wedding Stories
            </Link>
            <p className="uppercase tracking-[0.25em] text-xs text-white/70 mb-4">Wedding Story</p>
            <h1 className="text-5xl md:text-7xl mb-6 leading-tight">{story.title}</h1>
            <div className="flex flex-wrap gap-6 text-white/90 text-lg">
              <span className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                {story.venue}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {story.weddingDate}
              </span>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <p className="text-xl leading-relaxed text-neutral-800 mb-10">{story.intro}</p>

        <div className="space-y-6 text-lg leading-relaxed text-neutral-700 mb-16">
          {story.story.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </main>

      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="mb-8">
          <p className="uppercase tracking-[0.25em] text-xs text-neutral-500 mb-3">Gallery</p>
          <h2 className="text-4xl md:text-5xl">The photographs</h2>
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <button
                key={`${image.filename}-${index}`}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className="group aspect-[4/5] overflow-hidden rounded-xl bg-neutral-100"
              >
                <ImageWithFallback
                  src={image.thumbSrc}
                  alt={image.alt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="bg-neutral-50 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl mb-4">Getting married at {story.venue}?</h2>
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

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedIndex(null)}
        >
          <button
            type="button"
            className="absolute top-6 right-6 text-white text-3xl"
            onClick={() => setSelectedIndex(null)}
            aria-label="Close image"
          >
            ×
          </button>
          <img
            src={selectedImage.fullSrc}
            alt={selectedImage.alt}
            className="max-w-full max-h-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
