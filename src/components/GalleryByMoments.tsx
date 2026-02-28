// src/components/GalleryByMoments.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Helmet } from "react-helmet-async";

// Your original Figma-selected tile images:
import gettingReadyImage from "figma:asset/fb84c4cbee696343b417ad4224fe2d9c9960ad49.png";
import ceremonyImage from "figma:asset/824b08dfe2d92a128003e19c7f69fd10d28b2015.png";
import couplePortraitImage from "figma:asset/9caf1b2bbff1bbb43c7fe20f8da33be74aa354be.png";
import bridalPartyImage from "figma:asset/7bd3106c0b8c5268adbbc2617f84fb2440375cf1.png";
import receptionImage from "figma:asset/e2462e6839aea3c2d398e8bf894093d9d55e2977.png";
import detailsDecorImage from "figma:asset/7ec5ca5baceba029305e6928146e8f7050cf2009.png";

type CsvRow = {
  venue: string;
  category: string;
  filename: string;
};

const SITE_ORIGIN = "https://www.mkbweddings.co.uk";

// ✅ Hero image requested
const HERO_IMAGE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/thumb/Greenvale%20Hotel/family%20and%20bridal%20party/MKB-weddings-mkb-photography-NI-wedding-photographer-greenvale-cookstown-wedding-photography-434_500.webp";

function slugify(s: string) {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

  if (venueIdx === -1 || categoryIdx === -1 || filenameIdx === -1) {
    console.error("CSV header must be: venue,category,filename");
    return [];
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const venue = (cols[venueIdx] || "").trim();
    const category = (cols[categoryIdx] || "").trim();
    const filename = (cols[filenameIdx] || "").trim();
    if (!venue || !category || !filename) continue;
    rows.push({ venue, category, filename });
  }
  return rows;
}

/**
 * Curated tiles (Figma images + copy).
 * IDs MUST match slugify(category) from CSV.
 */
const MOMENT_TILES = [
  {
    id: "getting-ready",
    title: "Getting Ready",
    description: "Preparation, anticipation, and quiet moments before the ceremony",
    image: gettingReadyImage,
  },
  {
    id: "ceremony",
    title: "Ceremony",
    description: 'The vows, the emotion, and the moment you say “I do”',
    image: ceremonyImage,
  },
  {
    id: "couple-portraits",
    title: "Couple Portraits",
    description: "Just the two of you — captured naturally and beautifully",
    image: couplePortraitImage,
  },
  {
    id: "family-and-bridal-party",
    title: "Family and Bridal Party",
    description: "Celebrating with the people who matter most",
    image: bridalPartyImage,
  },
  {
    id: "reception-and-party",
    title: "Reception and Party",
    description: "Speeches, laughter, dancing — the celebration in full swing",
    image: receptionImage,
  },
  {
    id: "details-and-decor",
    title: "Details and Decor",
    description: "The thoughtful styling, florals, and finishing touches",
    image: detailsDecorImage,
  },
] as const;

export function GalleryByMoments() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

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

  const countsByMomentId = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const id = slugify(r.category);
      map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [rows]);

  const tilesToShow = useMemo(() => {
    return MOMENT_TILES.filter((t) => (countsByMomentId.get(t.id) ?? 0) > 0);
  }, [countsByMomentId]);

  const canonical = `${SITE_ORIGIN}/gallery/moments`;
  const metaTitle = "Wedding Moments Gallery | Northern Ireland & Ireland | MKB Weddings";
  const metaDescription =
    "Browse real wedding photography by moment — getting ready, ceremony, couple portraits, bridal party, reception and details — across Northern Ireland and Ireland.";

  if (loadError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-xl">
          <h1 className="text-3xl mb-3">Gallery loading error</h1>
          <p className="text-neutral-600 mb-6">{loadError}</p>
          <Link to="/gallery" className="text-neutral-600 hover:text-neutral-900 underline underline-offset-4">
            Back to Gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonical} />

        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={HERO_IMAGE} />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* HERO (match Venue/Moment detail style) */}
      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback
          src={HERO_IMAGE}
          alt="Wedding moments gallery across Northern Ireland and Ireland"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <div className="w-full max-w-7xl mx-auto px-6 pb-20 text-center">
            <Link
              to="/gallery"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Gallery
            </Link>

            <h1 className="text-white text-4xl md:text-5xl mb-4 font-serif">
              Wedding Moments
            </h1>

            <div className="text-white/85 text-sm">
              {tilesToShow.length} {tilesToShow.length === 1 ? "gallery" : "galleries"}
            </div>
          </div>
        </div>
      </div>

      {/* BREADCRUMBS */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-10">
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
            <li className="text-neutral-900">Moments</li>
          </ol>
        </nav>
      </div>

      {/* INTRO */}
      <section className="max-w-5xl mx-auto px-6 pt-12 pb-10 text-center">
        <p className="text-neutral-700 leading-relaxed text-lg">
          Browse real wedding photography by moment — from getting ready to the dancefloor —
          across Northern Ireland and Ireland.
        </p>
      </section>

      {/* TILES */}
      <div className="max-w-7xl mx-auto px-6 pb-32 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tilesToShow.map((moment) => {
            const count = countsByMomentId.get(moment.id) ?? 0;

            return (
              <Link
                key={moment.id}
                to={`/gallery/moment/${encodeURIComponent(moment.id)}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg"
              >
                <ImageWithFallback
                  src={moment.image}
                  alt={moment.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-8">
                  <h2 className="text-white text-2xl md:text-3xl mb-2 font-serif leading-tight">
                    {moment.title}
                  </h2>
                  <p className="text-white/90 text-sm mb-4">{moment.description}</p>

                  <div className="flex items-center text-white">
                    <span className="text-sm uppercase tracking-wider">
                      View Gallery{count ? ` (${count})` : ""}
                    </span>
                    <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-2" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {tilesToShow.length === 0 && (
          <div className="text-center py-20 text-neutral-600">
            No moments found (check gallery.csv categories).
          </div>
        )}
      </div>
    </div>
  );
}