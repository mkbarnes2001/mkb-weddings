// src/components/ImageLightbox.tsx
import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
};

export function ImageLightbox({ images, currentIndex, onClose, onNavigate }: Props) {
  const count = images.length;
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const safeIndex = useMemo(() => {
    if (!count) return 0;
    return ((currentIndex % count) + count) % count;
  }, [currentIndex, count]);

  const src = images[safeIndex];
  if (!src || !count) return null;

  const goPrev = () => onNavigate((safeIndex - 1 + count) % count); // wrap
  const goNext = () => onNavigate((safeIndex + 1) % count); // wrap

  useEffect(() => {
    overlayRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIndex, count, onClose]);

  const node = (
    <div
      ref={overlayRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
      className="fixed inset-0 z-[99999] bg-black/95"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 z-0 cursor-zoom-out"
        onClick={onClose}
      />

      {/* Controls */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <button
          type="button"
          aria-label="Close (Esc)"
          onClick={onClose}
          className="pointer-events-auto absolute top-5 right-5 rounded-full bg-white/10 hover:bg-white/15 p-2 text-white"
        >
          <X className="w-7 h-7" />
        </button>

        <button
          type="button"
          aria-label="Previous (←)"
          onClick={goPrev}
          className="pointer-events-auto absolute left-3 md:left-8 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/15 p-2 text-white"
        >
          <ChevronLeft className="w-10 h-10 md:w-12 md:h-12" />
        </button>

        <button
          type="button"
          aria-label="Next (→)"
          onClick={goNext}
          className="pointer-events-auto absolute right-3 md:right-8 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/15 p-2 text-white"
        >
          <ChevronRight className="w-10 h-10 md:w-12 md:h-12" />
        </button>

        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/85 text-sm px-3 py-1 rounded-md bg-black/40">
          {safeIndex + 1} / {count}
        </div>
      </div>

      {/* Image stage (scrollable for tall portraits) */}
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <div
          className="max-w-[94vw] max-h-[92vh] overflow-auto"
          onClick={(e) => {
            // click navigation: left half prev, right half next
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x < rect.width / 2) goPrev();
            else goNext();
          }}
        >
          <img
            src={src}
            alt=""
            className="block max-w-full h-auto select-none"
            draggable={false}
            onClick={(e) => e.stopPropagation()} // clicking the image doesn't close / nav
            onError={() => console.error("Lightbox image failed to load:", src)}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

