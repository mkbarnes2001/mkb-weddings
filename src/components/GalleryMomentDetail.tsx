import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";

/* =========================
   Types
========================= */
type CsvRow = {
  venue: string;
  category: string;
  filename: string;
};

/* =========================
   R2 BASE URLS
========================= */
const THUMB_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/thumb";
const FULL_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/full";

/* =========================
   Helpers
========================= */
function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function encSegment(s: string) {
  return encodeURIComponent(s);
}

function parseGalleryCsv(csvText: string): CsvRow[] {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const parseLine = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const header = parseLine(lines[0]).map((h) => h.toLowerCase());
  const venueIdx = header.indexOf("venue");
  const categoryIdx = header.indexOf("category");
  const filenameIdx = header.indexOf("filename");

  if (venueIdx === -1 || categoryIdx === -1 || filenameIdx === -1) return [];

  return lines.slice(1).map((line) => {
    const cols = parseLine(line);
    return {
      venue: cols[venueIdx]?.trim(),
      category: cols[categoryIdx]?.trim(),
      filename: cols[filenameIdx]?.trim(),
    };
  }).filter(r => r.venue && r.category && r.filename);
}

function thumbUrl(r: CsvRow) {
  return `${THUMB_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(r.filename)}`;
}

function fullUrlFromThumb(r: CsvRow) {
  return `${FULL_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(
    r.filename.replace(/_500\.webp$/i, "_2000.webp")
  )}`;
}

/* =========================
   Component
========================= */
export function GalleryMomentDetail() {
  const { momentId } = useParams<{ momentId: string }>();

  const [rows, setRows] = useState<CsvRow[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    fetch("/gallery.csv", { cache: "no-store" })
      .then((r) => r.text())
      .then(parseGalleryCsv)
      .then(setRows)
      .catch(console.error);
  }, []);

  const momentRows = useMemo(
    () => rows.filter((r) => slugify(r.category) === momentId),
    [rows, momentId]
  );

  const momentName = momentRows[0]?.category ?? "";

  const images = useMemo(
    () =>
      momentRows.map((r) => ({
        thumb: thumbUrl(r),
        full: fullUrlFromThumb(r),
        alt: `${r.venue} – ${r.category}`,
      })),
    [momentRows]
  );

  if (!momentName) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Moment not found.</p>
      </div>
    );
  }

  /* =========================
     Render
  ========================= */
  return (
    <div className="min-h-screen bg-white">
      {/* HERO */}
      <div className="relative h-[38vh] min-h-[260px] max-h-[420px] overflow-hidden">
        <ImageWithFallback
          src={images[0]?.full}
          alt={momentName}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-6 pb-10">
            <h1 className="text-white text-4xl md:text-5xl uppercase tracking-widest">
              {momentName}
            </h1>
          </div>
        </div>
      </div>

      {/* META */}
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-6">
        <Link
          to="/gallery/moments"
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Moments
        </Link>

        <p className="text-neutral-700 text-lg max-w-2xl mb-10 leading-relaxed">
          The vows, the emotion, and the moment you say “I do”.
        </p>

        <div className="text-neutral-500 text-sm uppercase tracking-wider mb-10">
          {images.length} image{images.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* GRID */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                setLightboxIndex(idx);
                setLightboxOpen(true);
              }}
              className="aspect-[4/3] overflow-hidden rounded-lg group"
            >
              <ImageWithFallback
                src={img.thumb}
                alt={img.alt}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            </button>
          ))}
        </div>
      </div>

      {/* LIGHTBOX */}
      {lightboxOpen && (
        <ImageLightbox
          images={images.map((i) => i.full)}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
