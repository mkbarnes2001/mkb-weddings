import { useEffect, useMemo, useState } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";
import { MasonryGallery } from "./MasonryGallery";

import creativeFlashHero from "figma:asset/4e80a09ae14c9e2aaefa75a7ed64281f0bbc855b.png";

type CsvRow = {
  venue: string;
  category: string;
  filename: string;
  tags?: string;
  flashPin?: string;
  flashPinOrder?: string;
};

const THUMB_BASE = "https://images.mkbweddings.co.uk/thumb";
const FULL_BASE = "https://images.mkbweddings.co.uk/full";
const HERO_FOCUS = "50% 50%";

function normalize(s: string) {
  return (s || "").trim().toLowerCase();
}

function encSegment(s: string) {
  return encodeURIComponent(s);
}

function fullFromThumbFilename(filename500: string) {
  return filename500.replace(/_500\.webp$/i, "_2000.webp");
}

function thumbUrl(r: CsvRow) {
  return `${THUMB_BASE}/${encSegment(r.venue)}/${encSegment(r.category)}/${encodeURIComponent(
    r.filename,
  )}`;
}

function fullUrl(r: CsvRow) {
  return `${FULL_BASE}/${encSegment(r.venue)}/${encSegment(r.category)}/${encodeURIComponent(
    fullFromThumbFilename(r.filename),
  )}`;
}

function cleanCsvValue(value: string) {
  const trimmed = (value || "").trim();
  return trimmed.replace(/^"+|"+$/g, "").replace(/""+/g, '"').replace(/"/g, "").trim();
}

function parseGalleryCsv(csvText: string): CsvRow[] {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const parseLine = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];

      if (ch === '"' && inQuotes && next === '"') {
        cur += '"';
        i += 1;
        continue;
      }

      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (ch === "," && !inQuotes) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }

    out.push(cur.trim());
    return out;
  };

  const header = parseLine(lines[0]).map((h) => normalize(h));
  const venueIdx = header.indexOf("venue");
  const categoryIdx = header.indexOf("category");
  const filenameIdx = header.indexOf("filename");
  const tagsIdx = header.indexOf("tags");
  const flashPinIdx = header.indexOf("flashpin");
  const flashPinOrderIdx = header.indexOf("flashpinorder");

  if (venueIdx === -1 || categoryIdx === -1 || filenameIdx === -1) {
    console.error(
      "CSV header must include: venue,category,filename optional: tags,flashPin,flashPinOrder",
    );
    return [];
  }

  return lines
    .slice(1)
    .map((line) => {
      const cols = parseLine(line);

      return {
        venue: cleanCsvValue(cols[venueIdx] || ""),
        category: cleanCsvValue(cols[categoryIdx] || ""),
        filename: cleanCsvValue(cols[filenameIdx] || ""),
        tags: tagsIdx >= 0 ? cleanCsvValue(cols[tagsIdx] || "") : "",
        flashPin: flashPinIdx >= 0 ? cleanCsvValue(cols[flashPinIdx] || "") : "",
        flashPinOrder:
          flashPinOrderIdx >= 0 ? cleanCsvValue(cols[flashPinOrderIdx] || "") : "",
      };
    })
    .filter((row) => row.venue && row.category && row.filename);
}

function hasTag(tags: string | undefined, target: string) {
  if (!tags) return false;

  return tags
    .split(/[,|]/g)
    .map((tag) => normalize(tag))
    .filter(Boolean)
    .includes(normalize(target));
}

function hashStringToInt(str: string) {
  let h = 2166136261;

  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return h >>> 0;
}

function stableShuffle<T>(arr: T[], seed: string, keyFn: (t: T) => string) {
  const copy = [...arr];

  copy.sort((a, b) => {
    const ha = hashStringToInt(seed + "|" + keyFn(a));
    const hb = hashStringToInt(seed + "|" + keyFn(b));
    return ha - hb;
  });

  return copy;
}

function isPinned(value?: string) {
  return ["y", "yes", "true", "1", "pin", "pinned"].includes(normalize(value || ""));
}

function getPinOrder(value?: string) {
  const parsed = Number(value || "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 9999;
}

export function GalleryCreativeFlash() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadError(null);

        const res = await fetch("/gallery.csv", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load /gallery.csv (${res.status})`);

        const text = await res.text();
        const parsed = parseGalleryCsv(text);

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
    const tagged = rows.filter((row) => hasTag(row.tags, "creative-flash"));
    if (tagged.length > 0) return tagged;

    return rows.filter((row) => normalize(row.category) === "creative flash");
  }, [rows]);

  const images = useMemo(() => {
    const mapped = flashRows.map((row) => ({
      thumb: thumbUrl(row),
      full: fullUrl(row),
      venue: row.venue,
      filename: row.filename,
      flashPin: row.flashPin,
      flashPinOrder: row.flashPinOrder,
      alt: `Creative Flash – ${row.venue}`,
    }));

    const pinned = mapped
      .filter((image) => isPinned(image.flashPin))
      .sort((a, b) => {
        const orderDiff = getPinOrder(a.flashPinOrder) - getPinOrder(b.flashPinOrder);

        if (orderDiff !== 0) return orderDiff;

        return a.filename.localeCompare(b.filename);
      });

    const rest = mapped.filter((image) => !isPinned(image.flashPin));
    const shuffled = stableShuffle(rest, "creative-flash-v2", (image) => image.filename);

    return [...pinned, ...shuffled];
  }, [flashRows]);

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
      {/* HERO */}
      <div className="relative h-[60vh] min-h-[400px]">
        <ImageWithFallback
          src={creativeFlashHero}
          alt="Creative Flash Photography"
          className="w-full h-full object-cover"
          style={{ objectPosition: HERO_FOCUS }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-6 pb-16 w-full text-center">
            <h1 className="text-white text-5xl md:text-6xl mb-4">Creative Flash</h1>

            <p className="text-white text-sm md:text-base">
              Bold, dramatic, and unforgettable moments illuminated with expert flash lighting
            </p>
          </div>
        </div>
      </div>

      {/* TEXT */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <div className="brand-eyebrow mb-10 mt-2 text-center">
            Master of Flash Wedding Photography
          </div>

          <div className="brand-prose mx-auto">
            <p>
              Known as a master of flash wedding photography, MKB Weddings creates bold, vibrant,
              and dramatic images that stand out. Our flash photography expertise is perfect for
              evening portraits, dark venues, Irish weather conditions, and high-energy dance-floor
              shots.
            </p>

            <p>
              Using advanced off-camera flash techniques, we create striking editorial-style images
              with perfect lighting regardless of the conditions. From moody atmospheric shots to
              bright vibrant portraits, our flash work adds a unique artistic dimension to your
              wedding story.
            </p>
          </div>
        </div>

        {/* GRID */}
        {images.length === 0 ? (
          <div className="text-center py-20 text-neutral-600">No Creative Flash images found.</div>
        ) : (
          <div className="pb-16">
            <MasonryGallery
              images={images.map((image) => ({
                thumbSrc: image.thumb,
                fullSrc: image.full,
                alt: image.alt,
              }))}
              onImageClick={(index) => {
                setLightboxIndex(index);
                setLightboxOpen(true);
              }}
            />
          </div>
        )}

        {/* LIGHTBOX */}
        {lightboxOpen && images.length > 0 && (
          <ImageLightbox
            images={images.map((image) => image.full)}
            alts={images.map((image) => image.alt)}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
            onNavigate={(newIndex) => setLightboxIndex(newIndex)}
          />
        )}
      </div>
    </div>
  );
}