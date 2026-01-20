// src/components/ImageLightbox.tsx
import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
};

export function ImageLightbox({ images, currentIndex, onClose, onNavigate }: Props) {
  const src = images[currentIndex];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate(Math.max(0, currentIndex - 1));
      if (e.key === "ArrowRight") onNavigate(Math.min(images.length - 1, currentIndex + 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex, images.length, onClose, onNavigate]);

  if (!src) return null;

  const atStart = currentIndex === 0;
  const atEnd = currentIndex === images.length - 1;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90">
      {/* Backdrop */}
      <div className="absolute inset-0 z-0 cursor-zoom-out" onClick={onClose} />

      {/* Close */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute top-5 right-5 z-30 text-white/90 hover:text-white"
      >
        <X className="w-7 h-7" />
      </button>

      {/* Prev */}
      <button
        type="button"
        aria-label="Previous"
        onClick={() => onNavigate(Math.max(0, currentIndex - 1))}
        disabled={atStart}
        className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-30 text-white/90 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-10 h-10" />
      </button>

      {/* Next */}
      <button
        type="button"
        aria-label="Next"
        onClick={() => onNavigate(Math.min(images.length - 1, currentIndex + 1))}
        disabled={atEnd}
        className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-30 text-white/90 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-10 h-10" />
      </button>

      {/* Image area (scrolls for tall portraits) */}
      <div className="absolute inset-0 z-20 flex items-center justify-center p-4 md:p-10">
        <div className="max-w-[92vw] max-h-[88vh] overflow-auto">
          <img
            src={src}
            alt=""
            className="block max-w-full max-h-[88vh] object-contain select-none"
            onClick={(e) => e.stopPropagation()}
            onError={() => console.error("Lightbox image failed to load:", src)}
          />
        </div>
      </div>

      {/* Counter (always on top, not in the image container) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 text-white/80 text-sm">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}
