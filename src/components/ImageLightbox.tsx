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

  // swipe
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

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
      // z-[2147483647] is “max int” style – guaranteed above sticky headers
      className="fixed top-0 left-0 w-screen h-screen z-[2147483647] bg-black/95"
      style={{
        // prevent weird bounce/back scroll interactions on mobile
        overscrollBehavior: "contain",
      }}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 z-0 cursor-zoom-out"
        onClick={onClose}
      />

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto text-white/85 text-sm px-3 py-1 rounded-md bg-black/40">
          {safeIndex + 1} / {count}
        </div>

        <button
          type="button"
          aria-label="Close (Esc)"
          onClick={onClose}
          className="pointer-events-auto rounded-full bg-white/10 hover:bg-white/15 p-2 text-white"
        >
          <X className="w-7 h-7" />
        </button>
      </div>

      {/* Nav buttons (always visible) */}
      <button
        type="button"
        aria-label="Previous (←)"
        onClick={goPrev}
        className="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 z-30 rounded-full bg-white/10 hover:bg-white/15 p-2 text-white"
      >
        <ChevronLeft className="w-10 h-10 md:w-12 md:h-12" />
      </button>

      <button
        type="button"
        aria-label="Next (→)"
        onClick={goNext}
        className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 z-30 rounded-full bg-white/10 hover:bg-white/15 p-2 text-white"
      >
        <ChevronRight className="w-10 h-10 md:w-12 md:h-12" />
      </button>

      {/* Stage:
          - explicit width/height so overflow ALWAYS works
          - scrollable for tall portraits
          - click left/right half to navigate
          - touch swipe left/right to navigate
      */}
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <div
          className="w-[94vw] h-[92vh] overflow-auto"
          style={{
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y", // allow vertical scroll; we handle horizontal swipe
          }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x < rect.width / 2) goPrev();
            else goNext();
          }}
          onTouchStart={(e) => {
            const t = e.touches[0];
            touchStartX.current = t.clientX;
            touchStartY.current = t.clientY;
          }}
          onTouchEnd={(e) => {
            const sx = touchStartX.current;
            const sy = touchStartY.current;
            touchStartX.current = null;
            touchStartY.current = null;
            if (sx == null || sy == null) return;

            const t = e.changedTouches[0];
            const dx = t.clientX - sx;
            const dy = t.clientY - sy;

            // Only treat as swipe if mostly horizontal and big enough
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) {
              if (dx < 0) goNext();
              else goPrev();
            }
          }}
        >
          <img
            src={src}
            alt=""
            draggable={false}
            className="block max-w-full h-auto select-none"
            onClick={(e) => e.stopPropagation()} // clicking image doesn't close or nav
          />
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

