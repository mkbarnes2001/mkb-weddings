import { useEffect, useMemo, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
  // Optional: default true
  wrap?: boolean;
};

export function ImageLightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
  wrap = true,
}: Props) {
  const count = images.length;
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const safeIndex = useMemo(() => {
    if (!count) return 0;
    return ((currentIndex % count) + count) % count;
  }, [currentIndex, count]);

  const src = images[safeIndex];
  if (!src || !count) return null;

  const goPrev = () => {
    if (!count) return;
    if (wrap) return onNavigate((safeIndex - 1 + count) % count);
    return onNavigate(Math.max(0, safeIndex - 1));
  };

  const goNext = () => {
    if (!count) return;
    if (wrap) return onNavigate((safeIndex + 1) % count);
    return onNavigate(Math.min(count - 1, safeIndex + 1));
  };

  useEffect(() => {
    // Focus overlay so key handling feels consistent
    overlayRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);

    // stop page behind scrolling
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
    // goPrev/goNext are stable enough (they close over safeIndex/count)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIndex, count, onClose]);

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
      className="fixed inset-0 z-50 bg-black/95"
    >
      {/* Backdrop (behind controls) */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 z-0 cursor-zoom-out"
        onClick={onClose}
      />

      {/* Controls layer */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {/* Close */}
        <button
          type="button"
          aria-label="Close (Esc)"
          onClick={onClose}
          className="pointer-events-auto absolute top-5 right-5 text-white/90 hover:text-white rounded-full bg-white/10 hover:bg-white/15 p-2"
        >
          <X className="w-7 h-7" />
        </button>

        {/* Prev (ALWAYS visible + clickable) */}
        <button
          type="button"
          aria-label="Previous (←)"
          onClick={goPrev}
          className="pointer-events-auto absolute left-3 md:left-8 top-1/2 -translate-y-1/2 text-white/90 hover:text-white rounded-full bg-white/10 hover:bg-white/15 p-2"
        >
          <ChevronLeft className="w-10 h-10 md:w-12 md:h-12" />
        </button>

        {/* Next (ALWAYS visible + clickable) */}
        <button
          type="button"
          aria-label="Next (→)"
          onClick={goNext}
          className="pointer-events-auto absolute right-3 md:right-8 top-1/2 -translate-y-1/2 text-white/90 hover:text-white rounded-full bg-white/10 hover:bg-white/15 p-2"
        >
          <ChevronRight className="w-10 h-10 md:w-12 md:h-12" />
        </button>

        {/* Counter */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/85 text-sm px-3 py-1 rounded-md bg-black/40">
          {safeIndex + 1} / {count}
        </div>
      </div>

      {/* Image area
          Key change for portraits:
          - constrain the *container* height/width
          - allow the image to be larger than the container -> scroll to see full portrait
      */}
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <div
          className="max-w-[94vw] max-h-[92vh] overflow-auto"
          // Click navigation: click left half = prev, right half = next
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
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
            onClick={(e) => e.stopPropagation()} // clicking the image itself doesn't close or nav
            onError={() => console.error("Lightbox image failed to load:", src)}
          />
        </div>
      </div>
    </div>
  );
}
