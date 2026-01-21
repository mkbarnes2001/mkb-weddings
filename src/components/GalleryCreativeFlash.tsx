// src/components/GalleryCreativeFlash.tsx
import { useEffect, useMemo, useState } from "react";
import { Zap } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";
import { fetchGalleryRows, hasTag, thumbUrl, fullUrlFromThumb } from "../lib/galleryCsv";

// If you already use a different Figma hero asset in your Creative Flash page,
// keep your existing import and replace this one.
import creativeFlashHero from "figma:asset/4e80a09ae14c9e2aaefa75a7ed64281f0bbc855b.png";

function setSeo(title: string, description: string) {
  document.title = title;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", description);
}

export function GalleryCreativeFlash() {
  const [rows, setRows] = useState<any[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    setSeo(
      "Creative Flash Wedding Photography | MKB Weddings",
      "Bold, dramatic, and unforgettable moments illuminated with expert flash lighting."
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadError(null);
        const parsed = await fetchGalleryRows();
        if (!cancelled) setRows(parsed);
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || "Failed to load gallery.csv");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const flashRows = useMemo(() => {
    return rows.filter((r) => hasTag(r, "creative-flash"));
  }, [rows]);

  const images = useMemo(() => {
    return flashRows.map((r) => ({
      thumb: thumbUrl(r),
      full: fullUrlFromThumb(r),
      alt: `Creative Flash – ${r.venue}`,
      venue: r.venue,
      filename: r.filename,
    }));
  }, [flashRows]);

  const featured = images; // show all; change to images.slice(0, 12) if you want

  if (loadError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-xl">
          <h1 className="text-3xl mb-3">Gallery loading error</h1>
          <p className="text-neutral-600 mb-6">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* HERO (Figma look) */}
     <div className="relative h-[280px] md:h-[360px] overflow-hidden mb-20 md:mb-32">
        <ImageWithFallback
          src={creativeFlashHero}
          alt="Creative Flash Photography"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/90 mb-4">
              <Zap className="w-5 h-5 text-neutral-900" />
            </div>
            <div className="text-white/90 text-xs uppercase tracking-[0.25em] mb-3">
              Creative Flash Photography
            </div>
            <h1 className="text-white text-2xl md:text-3xl font-medium max-w-3xl mx-auto">
              Bold, dramatic, and unforgettable moments illuminated with expert flash lighting
            </h1>
          </div>
        </div>
      </div>

      {/* BODY COPY (matches your designed page) */}
   <div className="max-w-3xl mx-auto text-center mt-16 mb-20 md:mb-28">
<h2 className="text-center font-serif text-sm uppercase tracking-widest text-neutral-800 mb-8">
  Master of Flash Wedding Photography
</h2>

<div className="text-center font-serif text-lg leading-relaxed text-neutral-700 space-y-8 mb-24">
  <p>
    Known as a master of flash wedding photography, MKB Weddings creates bold, vibrant, and dramatic
    images that stand out. Our flash photography expertise is perfect for evening portraits, dark
    venues, Irish weather conditions, and high-energy dance-floor shots.
  </p>

  <p>
    Using advanced off-camera flash techniques, we create striking editorial-style images with
    perfect lighting regardless of the conditions. From moody atmospheric shots to bright vibrant
    portraits, our flash work adds a unique artistic dimension to your wedding story.
  </p>
</div>


{/* GALLERY GRID (Moments-sized thumbnails + venue caption) */}
<div className="max-w-7xl mx-auto px-6 pt-16 md:pt-20 pb-16">
  {featured.length === 0 ? (
    <div className="text-center py-20 text-neutral-600">
      No images tagged <span className="font-medium">creative-flash</span> yet.
      <div className="mt-2 text-neutral-500 text-sm">
        Add <code>creative-flash</code> in the <code>tags</code> column for any row.
      </div>
    </div>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {featured.map((img, idx) => (
        <div key={`${img.thumb}-${idx}`}>
          <button
            type="button"
            onClick={() => {
              setLightboxIndex(idx);
              setLightboxOpen(true);
            }}
            className="aspect-[4/3] overflow-hidden rounded-lg group cursor-pointer text-left bg-neutral-100 w-full"
            aria-label={`Open Creative Flash image ${idx + 1}`}
          >
            <ImageWithFallback
              src={img.thumb}
              alt={img.alt}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          </button>

          {/* Venue caption */}
          <div className="mt-2 text-sm text-neutral-600">
            {img.venue}
          </div>
        </div>
      ))}
    </div>
  )}
</div>



      {/* LIGHTBOX */}
      {lightboxOpen && featured.length > 0 && (
        <ImageLightbox
          images={featured.map((i) => i.full)}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={(newIndex) => setLightboxIndex(newIndex)}
        />
      )}
    </div>
  );
}
