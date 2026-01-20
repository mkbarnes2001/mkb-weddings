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

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      {/* Click backdrop to close */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-zoom-out"
        onClick={onClose}
      />

      {/* Close button */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute top-5 right-5 z-10 text-white/90 hover:text-white"
      >
        <X className="w-7 h-7" />
      </button>

      {/* Prev */}
      <button
        type="button"
        aria-label="Previous"
        onClick={() => onNavigate(Math.max(0, currentIndex - 1))}
        disabled={currentIndex === 0}
        className="absolute left-4 md:left-8 z-10 text-white/90 hover:text-white disabled:opacity-30"
      >
        <ChevronLeft className="w-10 h-10" />
      </button>

      {/* Next */}
      <button
        type="button"
        aria-label="Next"
        onClick={() => onNavigate(Math.min(images.length - 1, currentIndex + 1))}
        disabled={currentIndex === images.length - 1}
        className="absolute right-4 md:right-8 z-10 text-white/90 hover:text-white disabled:opacity-30"
      >
        <ChevronRight className="w-10 h-10" />
      </button>

      {/* The image */}
      <div className="relative z-10 max-w-[92vw] max-h-[88vh]">
        <img
          src={src}
          alt=""
          className="max-w-[92vw] max-h-[88vh] object-contain select-none"
          onClick={(e) => e.stopPropagation()}
          onError={() => {
            // helpful debug in console if a URL is wrong/404
            // eslint-disable-next-line no-console
            console.error("Lightbox image failed to load:", src);
          }}
        />
      </div>

      {/* Counter */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/80 text-sm z-10">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}
