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

  // swipe state
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  const safeIndex = useMemo(() => {
    if (!count) return 0;
    return ((currentIndex % count) + count) % count;
  }, [currentIndex, count]);

  const src = images[safeIndex];
  if (!src || !count) return null;

  const goPrev = () => onNavigate((safeIndex - 1 + count) % count);
  const goNext = () => onNavigate((safeIndex + 1) % count);

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

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 2147483647, // force above everything
    background: "rgba(0,0,0,0.95)",
    overscrollBehavior: "contain",
  };

  const stageStyle: React.CSSProperties = {
    width: "94vw",
    height: "92vh",
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
    touchAction: "pan-y",
  };

  const pillStyle: React.CSSProperties = {
    background: "rgba(0,0,0,0.4)",
  };

  const roundBtnClass =
    "rounded-full p-2 text-white bg-white/10 hover:bg-white/15";

  const content = (
    <div
      ref={overlayRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
      style={overlayStyle}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
        className="cursor-zoom-out"
      />

      {/* Top bar */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          right: 16,
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pointerEvents: "auto",
        }}
      >
        <div className="text-white/85 text-sm px-3 py-1 rounded-md" style={pillStyle}>
          {safeIndex + 1} / {count}
        </div>

        <button type="button" aria-label="Close (Esc)" onClick={onClose} className={roundBtnClass}>
          <X className="w-7 h-7" />
        </button>
      </div>

      {/* Prev/Next buttons */}
      <button
        type="button"
        aria-label="Previous (←)"
        onClick={goPrev}
        className={roundBtnClass}
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 30,
        }}
      >
        <ChevronLeft className="w-12 h-12" />
      </button>

      <button
        type="button"
        aria-label="Next (→)"
        onClick={goNext}
        className={roundBtnClass}
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 30,
        }}
      >
        <ChevronRight className="w-12 h-12" />
      </button>

      {/* Stage */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          style={stageStyle}
          onClick={(e) => {
            // click empty area: left half prev, right half next
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x < rect.width / 2) goPrev();
            else goNext();
          }}
          onTouchStart={(e) => {
            const t = e.touches[0];
            startX.current = t.clientX;
            startY.current = t.clientY;
          }}
          onTouchEnd={(e) => {
            const sx = startX.current;
            const sy = startY.current;
            startX.current = null;
            startY.current = null;
            if (sx == null || sy == null) return;

            const t = e.changedTouches[0];
            const dx = t.clientX - sx;
            const dy = t.clientY - sy;

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
            // critical: allow image to exceed container height so you can scroll portrait
            style={{ display: "block", maxWidth: "100%", height: "auto", maxHeight: "none" }}
            className="select-none"
            onClick={(e) => {
              e.stopPropagation();
              // click image: next (Shift+click: prev)
              if ((e as any).shiftKey) goPrev();
              else goNext();
            }}
            onError={() => console.error("Lightbox image failed to load:", src)}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

