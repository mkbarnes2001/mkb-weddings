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
    // stop page behind scrolling
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [currentIndex, images.length, onClose, onNavigate]);

  if (!src) return null;

  const atStart = currentIndex === 0;
  const atEnd = currentIndex === images.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/95">
      {/* Backdrop (make sure it's BEHIND controls) */}
      <button
        type="button"
        aria-label="Close backdrop"
        className="absolute inset-0 z-0 cursor-zoom-out"
        onClick={onClose}
      />

      {/* Controls layer */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {/* Close */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="pointer-events-auto absolute top-5 right-5 text-white/90 hover:text-white"
        >
          <X className="w-8 h-8" />
        </button>

        {/* Prev */}
        <button
          type="button"
          aria-label="Previous"
          onClick={() => onNavigate(Math.max(0, currentIndex - 1))}
          disabled={atStart}
          className="pointer-events-auto absolute left-3 md:left-8 top-1/2 -translate-y-1/2 text-white/90 hover:text-white disabled:opacity-30"
        >
          <ChevronLeft className="w-12 h-12" />
        </button>

        {/* Next */}
        <button
          type="button"
          aria-label="Next"
          onClick={() => onNavigate(Math.min(images.length - 1, currentIndex + 1))}
          disabled={atEnd}
          className="pointer-events-auto absolute right-3 md:right-8 top-1/2 -translate-y-1/2 text-white/90 hover:text-white disabled:opacity-30"
        >
          <ChevronRight className="w-12 h-12" />
        </button>

        {/* Counter (bottom, away from image center) */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/85 text-sm px-3 py-1 rounded-md bg-black/40">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      {/* Image area: scrollable for tall portraits */}
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <div className="max-w-[94vw] max-h-[92vh] overflow-auto">
          <img
            src={src}
            alt=""
            className="block max-w-[94vw] max-h-[92vh] w-auto h-auto object-contain select-none"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
            onError={() => console.error("Lightbox image failed to load:", src)}
          />
        </div>
      </div>
    </div>
  );
}
