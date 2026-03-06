// src/components/GalleryMomentDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";


type CsvRow = {
  venue: string;
  category: string;
  filename: string; // ends in _500.webp
  tags?: string;
};

type VenueMetaRow = {
  venue: string;
  county?: string;
};

const SITE_ORIGIN = "https://www.mkbweddings.co.uk";

// R2 base
const THUMB_BASE = "https://images.mkbweddings.co.uk/thumb";
const FULL_BASE = "https://images.mkbweddings.co.uk/full";

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

function parseCsvLines(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).filter(Boolean);

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

  return lines.map(parseLine);
}

function parseGalleryCsv(csvText: string): CsvRow[] {
  const rows = parseCsvLines(csvText);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.toLowerCase());
  const venueIdx = header.indexOf("venue");
  const categoryIdx = header.indexOf("category");
  const filenameIdx = header.indexOf("filename");
  const tagsIdx = header.indexOf("tags"); // optional

  if (venueIdx === -1 || categoryIdx === -1 || filenameIdx === -1) return [];

  return rows
    .slice(1)
    .map((cols) => ({
      venue: (cols[venueIdx] || "").trim(),
      category: (cols[categoryIdx] || "").trim(),
      filename: (cols[filenameIdx] || "").trim(),
      tags: tagsIdx >= 0 ? (cols[tagsIdx] || "").trim() : "",
    }))
    .filter((r) => r.venue && r.category && r.filename);
}

function parseVenueMetaCsv(csvText: string): VenueMetaRow[] {
  const rows = parseCsvLines(csvText);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.toLowerCase());
  const venueIdx = header.indexOf("venue");
  const countyIdx = header.indexOf("venue-region");

  if (venueIdx === -1) return [];

  return rows
    .slice(1)
    .map((cols) => ({
      venue: (cols[venueIdx] || "").trim(),
      county: countyIdx !== -1 ? (cols[countyIdx] || "").trim() : "",
    }))
    .filter((v) => v.venue);
}

function thumbUrl(r: CsvRow) {
  return `${THUMB_BASE}/${encSegment(r.venue)}/${encSegment(r.category)}/${encodeURIComponent(
    r.filename
  )}`;
}

function fullUrlFromThumb(r: CsvRow) {
  const filename2000 = r.filename.replace(/_500\.webp$/i, "_2000.webp");
  return `${FULL_BASE}/${encSegment(r.venue)}/${encSegment(r.category)}/${encodeURIComponent(
    filename2000
  )}`;
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

// Optional: pin images to the top PER moment.
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

  ceremony: [
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

const MOMENT_META: Record<
  string,
  { name: string; description: string; hero: string; focus?: string }
> = {
  "getting-ready": {
    name: "Getting Ready",
    description: "Preparation and anticipation before the day begins.",
    hero: "https://images.mkbweddings.co.uk/full/Galgorm/getting%20ready/MKB-photography-Northern-Ireland-wedding-photographer-Galgorm-resort-Wedding-photography-Glagorm-resort-wedding-photography-full%20res-67_2000.webp",
    focus: "50% 50%",
  },

  ceremony: {
    name: "Ceremony",
    description: "The vows, the emotion, and the moment you say “I do”.",
    hero: "https://images.mkbweddings.co.uk/full/Killeavy%20castle/ceremony/mkb-weddings-northern-ireland-wedding-photographer-killeavy-castle-newry-wedding-photography-135_2000.webp",
    focus: "50% 50%",
  },

  "couple-portraits": {
    name: "Couple Portraits",
    description: "Just the two of you — natural, relaxed portraits.",
    hero: "https://images.mkbweddings.co.uk/full/Slieve%20donard%20hotel/couple%20portraits/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-4_2000.webp",
    focus: "50% 50%",
  },

  "family-and-bridal-party": {
    name: "Family and Bridal Party",
    description: "Celebrating with the people who mean the most.",
    hero: "https://images.mkbweddings.co.uk/full/Orange%20tree%20house/family%20and%20bridal%20party/mkb-weddings-mkb-photography-northern-ireland-wedding-photography-orange-tree-house-greyabbey-wedding-photography-415_2000.webp",
    focus: "50% 50%",
  },

  "reception-and-party": {
    name: "Reception and Party",
    description: "Dance, celebrate, and have fun into the night.",
    hero: "https://images.mkbweddings.co.uk/full/Belmont/reception%20and%20party/mkb-weddings-mkb-photography-norther-ireland-wedding-photographer-belmont-house-hotel-banbridge-wedding-photography-300_2000.webp",
    focus: "50% 50%",
  },

  "details-and-decor": {
    name: "Details and Decor",
    description: "The little things that make your day uniquely yours.",
    hero: "https://images.mkbweddings.co.uk/full/Leighinmohr%20house%20hotel/details%20and%20decor/mkb-weddings-northern-ireland-wedding-photographer-creative-wedding-photography-10_2000.webp",
    focus: "50% 50%",
  },
};

export function GalleryMomentDetail() {
  const { momentId } = useParams<{ momentId: string }>();
  const meta = momentId ? MOMENT_META[momentId] : undefined;

  const [rows, setRows] = useState<CsvRow[]>([]);
  const [venueCountyMap, setVenueCountyMap] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [momentId]);

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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/galleryvenuedesc.csv", { cache: "no-store" });
        if (!res.ok) return;

        const text = await res.text();
        const parsed = parseVenueMetaCsv(text);

        const map: Record<string, string> = {};
        for (const row of parsed) {
          if (row.venue && row.county) {
            map[row.venue] = row.county;
          }
        }

        if (!cancelled) setVenueCountyMap(map);
      } catch {
        // optional file, ignore failures
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

  const momentName = meta?.name || momentRows[0]?.category || "";
  const momentDescription = meta?.description;

  const images = useMemo(() => {
    const mapped = momentRows.map((r) => ({
      thumb: thumbUrl(r),
      full: fullUrlFromThumb(r),
      alt: `${r.category} at ${r.venue}${venueCountyMap[r.venue] ? `, ${venueCountyMap[r.venue]}` : ""}`,
      filename: r.filename,
    }));

    const pinnedList = momentId ? PINNED[momentId] || [] : [];
    const pinnedSet = new Set(pinnedList.map((x) => x.toLowerCase().trim()));

    const pinned = mapped.filter((m) => pinnedSet.has(m.filename.toLowerCase().trim()));
    const rest = mapped.filter((m) => !pinnedSet.has(m.filename.toLowerCase().trim()));

    const shuffled = stableShuffle(rest, `moment-${momentId || "unknown"}-v1`, (m) => m.filename);

    return [...pinned, ...shuffled];
  }, [momentRows, momentId, venueCountyMap]);

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
          <Link
            to="/gallery/moments"
            className="text-neutral-600 hover:text-neutral-900 underline underline-offset-4"
          >
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
          <Link
            to="/gallery/moments"
            className="text-neutral-600 hover:text-neutral-900 underline underline-offset-4"
          >
            Back to Moments
          </Link>
        </div>
      </div>
    );
  }

  const heroImage =
    meta?.hero ||
    images[0]?.full ||
    images[0]?.thumb ||
    "https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=1600&q=80";

  const heroFocus = meta?.focus || "50% 50%";

  const canonical = `${SITE_ORIGIN}/gallery/moment/${encodeURIComponent(momentId || "")}`;
  const metaTitle = `${momentName} Wedding Photos | Northern Ireland & Ireland | MKB Weddings`;
  const metaDescription =
    momentDescription ||
    `Browse ${momentName.toLowerCase()} wedding photography across Northern Ireland and Ireland — real moments, real weddings, captured by MKB Weddings.`;

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonical} />
        
        <link
          rel="preload"
          as="image"
          href={heroImage}
          fetchpriority="high"
        />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={heroImage} />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* HERO */}
      <div className="relative h-[60vh] min-h-[400px]">
        <ImageWithFallback
        src={heroImage}
        alt={`${momentName} wedding photography in Northern Ireland`}
        width={2000}
        height={1200}
        fetchPriority="high"
        decoding="async"
        className="w-full h-full object-cover"
        style={{ objectPosition: heroFocus }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-6 pb-16 w-full text-center">
            <Link
              to="/gallery/moments"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Moments
            </Link>

            <h1 className="text-white text-5xl md:text-6xl mb-4">{momentName}</h1>

            <p className="text-white text-sm md:text-base">
              {images.length} {images.length === 1 ? "image" : "images"} · {venueCount}{" "}
              {venueCount === 1 ? "venue" : "venues"}
            </p>
          </div>
        </div>
      </div>

      {/* BREADCRUMBS */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-16">
        <nav aria-label="Breadcrumb" className="flex justify-center">
          <ol className="flex flex-wrap items-center justify-center gap-2 text-neutral-600 text-sm">
            <li>
              <Link to="/" className="hover:text-neutral-900 underline underline-offset-4">
                Home
              </Link>
            </li>
            <li className="opacity-60">
              <ChevronRight className="w-4 h-4" />
            </li>
            <li>
              <Link to="/gallery" className="hover:text-neutral-900 underline underline-offset-4">
                Gallery
              </Link>
            </li>
            <li className="opacity-60">
              <ChevronRight className="w-4 h-4" />
            </li>
            <li>
              <Link
                to="/gallery/moments"
                className="hover:text-neutral-900 underline underline-offset-4"
              >
                Moments
              </Link>
            </li>
            <li className="opacity-60">
              <ChevronRight className="w-4 h-4" />
            </li>
            <li className="text-neutral-900">{momentName}</li>
          </ol>
        </nav>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-6 pb-32">
        {momentDescription && (
          <div className="text-center max-w-3xl mx-auto mt-16 mb-10">
            <p className="font-serif text-[20px] leading-[1.9] text-neutral-800">
              {momentDescription}
            </p>
          </div>
        )}

        {images.length === 0 ? (
          <div className="text-center py-20 text-neutral-600">No images found for this moment.</div>
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

        {lightboxOpen && images.length > 0 && (
          <ImageLightbox
            images={images.map((i) => i.full)}
            alts={images.map((i) => i.alt)}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
            onNavigate={(newIndex) => setLightboxIndex(newIndex)}
          />
        )}
      </div>
    </div>
  );
}