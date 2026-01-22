import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";

// Hero images (Figma-selected)
import gettingReadyHero from "figma:asset/fb84c4cbee696343b417ad4224fe2d9c9960ad49.png";
import ceremonyHero from "figma:asset/824b08dfe2d92a128003e19c7f69fd10d28b2015.png";
import couplePortraitHero from "figma:asset/9caf1b2bbff1bbb43c7fe20f8da33be74aa354be.png";
import bridalPartyHero from "figma:asset/7bd3106c0b8c5268adbbc2617f84fb2440375cf1.png";
import receptionHero from "figma:asset/e2462e6839aea3c2d398e8bf894093d9d55e2977.png";
import detailsDecorHero from "figma:asset/7ec5ca5baceba029305e6928146e8f7050cf2009.png";

type CsvRow = {
  venue: string;
  category: string;
  filename: string; // ends in _500.webp
  tags?: string;
};

// R2 base (same as your venue page)
const THUMB_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/thumb";
const FULL_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/full";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function slugify(s: string) {
  return (s || "")
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

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
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

  const header = parseLine(lines[0]).map((h) => h.toLowerCase());
  const venueIdx = header.indexOf("venue");
  const categoryIdx = header.indexOf("category");
  const filenameIdx = header.indexOf("filename");
  const tagsIdx = header.indexOf("tags"); // optional

  if (venueIdx === -1 || categoryIdx === -1 || filenameIdx === -1) return [];

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const venue = (cols[venueIdx] || "").trim();
    const category = (cols[categoryIdx] || "").trim();
    const filename = (cols[filenameIdx] || "").trim();
    const tags = tagsIdx >= 0 ? (cols[tagsIdx] || "").trim() : "";

    if (!venue || !category || !filename) continue;
    rows.push({ venue, category, filename, tags });
  }
  return rows;
}

function thumbUrl(r: CsvRow) {
  return `${THUMB_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(r.filename)}`;
}

function fullUrlFromThumb(r: CsvRow) {
  const filename2000 = r.filename.replace(/_500\.webp$/i, "_2000.webp");
  return `${FULL_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(filename2000)}`;
}

// Stable "random" ordering (same order per moment, changes if you bump version)
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

// Optional: pin images to the top PER moment.
// Keys must match your URL momentId (slug), e.g. "getting-ready", "ceremony", etc.
// Use the _500.webp filenames exactly as in CSV.
const PINNED: Record<string, string[]> = {
  "getting-ready": [
    "MKB_weddings_mkb-photography-Ireland_Northen_ireland_Wedding_Photography_Rabbit-hotel-and-spa-templepatrick_Wedding_Photography_D%26L-186_500.webp",
    "mkb-weddings-mkb-Photography-northern-ireland-wedding-photographer-LEIGHINMOHR-hotel-ballymena-wedding-photography-7_500.webp",
    "mkb-weddings-northern-ireland-wedding-photographer-ni-wedding-photography-darver-castle-wedding-photography-100_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photographer-dunadry-hotel-belfast-photography-105_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-wool-tower-broughshane-wedding-photography-153_500.webp",
    "mkb-weddings-mkb-Photography-northern-ireland-wedding-photographer-merchant-hotel-belfast-wedding-photography-114_500.webp",
    "MKB-photography-Northern-Ireland-wedding-photographer-Galgorm-resort-Wedding-photography-Glagorm-resort-wedding-photography-full%20res-67_500.webp",
    "mkb-weddings-northern-ireland-wedding-photographer-killeavy-castle-newry-wedding-photography-240_500.webp",
    "mkb-weddings-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-39_500.webp",
  ],

  "ceremony": [
    "mkb-weddings-northern-ireland-wedding-photographer-ni-wedding-photography-darver-castle-wedding-photography-100_500.webp",
    "MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-164_500.webp",
    "mkb-weddings-northern-ireland-wedding-photographer-killeavy-castle-newry-wedding-photography-135_500.webp",
    "MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-full-res-144_500.webp",
    "mkb-weddings-mkb-photography-norther-ireland-wedding-photographer-belmont-house-hotel-banbridge-wedding-photography-416_500.webp",
    "mkb-weddings-irish-wedding-photographer-ballyscullion-park-bellaghy-photography-338_500.webp",
  ],

  "couple-portraits": [
    "MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-494_500.webp",
    "mkb-weddings-northern-ireland-wedding-photographer-killeavy-castle-newry-wedding-photography-116_500.webp",
    "MKB_weddings_mkb_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-killeavy-castle-wedding-photography-100_500.webp",
    "MKB-photography-Northern-Ireland-wedding-photographer-Galgorm-resort-Wedding-photography-Glagorm-resort-wedding-photography-full%20res-318_500.webp",
    "MKB-photography-Northern-Ireland-wedding-photographer-Irish-Wedding-photography-Darver-castle-wedding-photography-Full%20res-586_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-4_500.webp",
    "mkb-weddings-irish-wedding-photographer-bellingham-castle-wedding-photography-7_500.webp",
    "mkb-weddings-mkb-photography-ireland-northern-ireland-wedding-photographer-slieve-russell-wedding-photography-394_500.webp",
    "MKB-weddings-mkb-photography-northern-ireland-wedding-photographer-ross-harbour-enniskillen-wedding-photography_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-12-1_500.webp",
    "mkb-weddings-northern-ireland-wedding-photographer-larchfields-estate-lisburn-wedding-photography-34_500.webp",
    "mkb-weddings-northern-ireland-wedding-photographer-beech-hill-country-house-wedding-photography-9_500.webp",
  ],

  "family-and-bridal-party": [
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-orange-tree-house-greyabbey-wedding-photography-415_500.webp",
    "MKB-weddings-mkb-photography-NI-wedding-photographer-greenvale-cookstown-wedding-photography-434_500.webp",
    "mkb-weddings-northern-ireland-wedding-photographer-beech-hill-country-house-wedding-photography-10_500.webp",
    "mkb-weddings-irish-wedding-photographer-ballyscullion-park-bellaghy-photography-413_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-26-1_500.webp",
  ],

  "reception-and-party": [
    "mkb-weddings-northern-ireland-wedding-photographer-ni-wedding-photography-darver-castle-wedding-photography-189_500.webp",
    "MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_killeavy-castle_Wedding_Photography-609_500.webp",
    "mkb-weddings-northern-ireland-wedding-photographer-ni-wedding-photography-darver-castle-wedding-photography-315_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-lough-erne-resort-eniskillen-wedding-photography-530_500.webp",
    "mkb-weddings-mkb-photography-norther-ireland-wedding-photographer-belmont-house-hotel-banbridge-wedding-photography-397_500.webp",
    "mkb-weddings-mkb-photography-donegal-wedding-photography-harveys-point-hotel-donegal-wedding-photography-702_500.webp",
    "MKB-weddings-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-slieve-donard-hotel-newcastle-wedding-photography-291_500.webp",
  ],

  "details-and-decor": [
    "mkb-weddings-northern-ireland-wedding-photographer-creative-wedding-photography-10_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-edenmore-house-moira-wedding-photography--107_500.webp",
    "mkb-weddings-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-31_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-shandon-hotel-marble-hill-donegal-wedding-photography-104_500.webp",
  ],
};


// Curated moment labels + hero + crop focus (object-position)
const MOMENT_META: Record<
  string,
  { name: string; description: string; hero: string; focus?: string }
> = {
  "getting-ready": {
    name: "Getting Ready",
    description: "Preparation and anticipation before the day begins.",
    hero: gettingReadyHero,
    focus: "50% 50%",
  },
  ceremony: {
    name: "Ceremony",
    description: "The vows, the emotion, and the moment you say “I do”.",
    hero: ceremonyHero,
    focus: "50% 50%",
  },
  "couple-portraits": {
    name: "Couple Portraits",
    description: "Just the two of you — natural, relaxed portraits.",
    hero: couplePortraitHero,
    focus: "50% 50%",
  },
  "family-bridal-party": {
    name: "Family and Bridal Party",
    description: "Celebrating with the people who mean the most.",
    hero: bridalPartyHero,
    focus: "50% 50%",
  },
  "reception-party": {
    name: "Reception and Party",
    description: "Dance, celebrate, and have fun into the night.",
    hero: receptionHero,
    focus: "50% 50%",
  },
  "details-decor": {
    name: "Details and Decor",
    description: "The little things that make your day uniquely yours.",
    hero: detailsDecorHero,
    focus: "50% 50%",
  },
};

export function GalleryMomentDetail() {
  const { momentId } = useParams<{ momentId: string }>();
  const meta = momentId ? MOMENT_META[momentId] : undefined;

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

  const momentRows = useMemo(() => {
    if (!momentId) return [];
    return rows.filter((r) => slugify(r.category) === momentId);
  }, [rows, momentId]);

  const momentName = meta?.name || momentRows[0]?.category;
  const momentDescription = meta?.description;

  const images = useMemo(() => {
    const mapped = momentRows.map((r) => ({
      thumb: thumbUrl(r),
      full: fullUrlFromThumb(r),
      alt: `${r.venue} – ${r.category}`,
      filename: r.filename,
    }));

    const pinnedList = momentId ? PINNED[momentId] || [] : [];
    const pinnedSet = new Set(pinnedList.map((x) => x.toLowerCase().trim()));

    const pinned = mapped.filter((m) =>
      pinnedSet.has(m.filename.toLowerCase().trim())
    );
    const rest = mapped.filter(
      (m) => !pinnedSet.has(m.filename.toLowerCase().trim())
    );

    const shuffled = stableShuffle(
      rest,
      `moment-${momentId || "unknown"}-v1`,
      (m) => m.filename
    );

    return [...pinned, ...shuffled];
  }, [momentRows, momentId]);

  const venueCount = useMemo(() => {
    const set = new Set<string>();
    for (const r of momentRows) set.add(r.venue);
    return set.size;
  }, [momentRows]);

  if (loadError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-xl">
          <h1 className="text-3xl mb-3">Gallery loading error</h1>
          <p className="text-neutral-600 mb-6">{loadError}</p>
          <Link to="/gallery/moments" className="text-neutral-600 hover:text-neutral-900">
            Back to Moments
          </Link>
        </div>
      </div>
    );
  }

  if (!momentName) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-xl">
          <h1 className="text-4xl mb-3">Moment Not Found</h1>
          <p className="text-neutral-600 mb-6">
            This moment doesn’t exist in gallery.csv (or has no images).
          </p>
          <Link to="/gallery/moments" className="text-neutral-600 hover:text-neutral-900">
            Back to Moments
          </Link>
        </div>
      </div>
    );
  }

  // Match venue detail hero sizing/crop rules
  const heroImage =
    meta?.hero ||
    images[0]?.full ||
    images[0]?.thumb ||
    "https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=1600&q=80";

  const heroFocus = meta?.focus || "50% 50%";

  return (
    <div className="min-h-screen bg-white">
      {/* HERO — match Venue Detail (height + crop) */}
      <div className="relative h-[60vh] min-h-[400px]">
        <ImageWithFallback
          src={heroImage}
          alt={momentName}
          className="w-full h-full object-cover"
          style={{ objectPosition: heroFocus }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Bottom-aligned block, but centered text (per your request style direction) */}
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-6 pb-16 w-full text-center">
            <Link
              to="/gallery/moments"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Moments
            </Link>

            {/* Heading size matches Venue Detail */}
            <h1 className="text-white text-5xl md:text-6xl mb-4">{momentName}</h1>

            {/* Keep the counts subtle on hero like venue */}
            <p className="text-white text-sm md:text-base">
              {images.length} {images.length === 1 ? "image" : "images"} · {venueCount}{" "}
              {venueCount === 1 ? "venue" : "venues"}
            </p>
          </div>
        </div>
      </div>

      {/* CONTENT BELOW HERO */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Centered description (serif/news body) */}
        {momentDescription && (
          <div className="text-center max-w-3xl mx-auto mb-10">
            <p className="font-serif text-[20px] leading-[1.9] text-neutral-800">
              {momentDescription}
            </p>
          </div>
        )}

        {/* GRID */}
        {images.length === 0 ? (
          <div className="text-center py-20 text-neutral-600">
            No images found for this moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((img, idx) => (
              <button
                key={`${img.thumb}-${idx}`}
                type="button"
                onClick={() => {
                  setLightboxIndex(idx);
                  setLightboxOpen(true);
                }}
                className="aspect-[4/3] overflow-hidden rounded-lg group cursor-pointer text-left"
              >
                <ImageWithFallback
                  src={img.thumb}
                  alt={img.alt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </button>
            ))}
          </div>
        )}

        {/* LIGHTBOX */}
        {lightboxOpen && images.length > 0 && (
          <ImageLightbox
            images={images.map((i) => i.full)}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
            onNavigate={(newIndex) => setLightboxIndex(newIndex)}
          />
        )}
      </div>
    </div>
  );
}
