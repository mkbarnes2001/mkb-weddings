// src/components/GalleryVenueDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, MapPin, ChevronRight } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { ImageLightbox } from "./ImageLightbox";

type GalleryRow = {
  venue: string;
  category: string;
  filename: string; // ends in _500.webp
  tags?: string;
};

type VenueMetaRow = {
  venue: string;
  venueName?: string;
  venueLocation?: string;
  venueWebsite?: string;
  venueDescription?: string;
};

// R2 base URLs
const THUMB_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/thumb";
const FULL_BASE =
  "https://pub-396aa8eae3b14a459d2cebca6fe95f55.r2.dev/full";

// Primary origin (pick ONE and keep it consistent everywhere)
const SITE_ORIGIN = "https://www.mkbweddings.co.uk";

// --- PINNED IMAGES (PER VENUE) ---------------------------------------------
// Use the _500.webp filenames exactly as in CSV.
// Keys must match the venueId slug in your URL (slugify(venue)).
const PINNED: Record<string, string[]> = {
  "orange-tree-house": [
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-orange-tree-house-greyabbey-wedding-photography-411_500.webp",
    "MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-411_500.webp",
    "MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-493_500.webp",
    "mkb-weddings-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-1.jpg_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-orange-tree-house-greyabbey-wedding-photography-618_500.webp",
    "MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-56_500.webp",
    "MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-357_500.webp",
    "MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-orange-tree-house-greyabbey-wedding-photography-494_500.webp",
  ],

  "ballyscullion-park": [
    "MKB-weddings-mkb-photography-northern-ireland-wedding-photographer-ballyscullion-park-belaghy-wedding-photography2_500.webp",
    "mkb-weddings-irish-wedding-photographer-ballyscullion-park-bellaghy-photography-447_500.webp",
    "mkb-weddings-irish-wedding-photographer-ballyscullion-park-bellaghy-photography-460_500.webp",
    "mkb-weddings-irish-wedding-photographer-ballyscullion-park-bellaghy-photography-179_500.webp",
    "MKB-weddings-mkb-photography-northern-ireland-wedding-photographer-ballyscullion-park-belaghy-wedding-photography8_500.webp",
    "mkb-weddings-irish-wedding-photographer-ballyscullion-park-bellaghy-photography-413_500.webp",
  ],

  "killeavy-castle": [
    "mkb-weddings-northern-ireland-wedding-photographer-killeavy-castle-newry-wedding-photography-160_500.webp",
    "MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_killeavy-castle_Wedding_Photography-462_500.webp",
    "mkb-weddings-northern-ireland-wedding-photographer-killeavy-castle-newry-wedding-photography-116_500.webp",
    "MKB-weddings-mkb-photography-northern-ireland-wedding-photographer-killeavy-castle-newry-wedding-photography6_500.webp",
    "MKB_weddings_mkb_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-killeavy-castle-wedding-photography-100_500.webp",
    "MKB_weddings_Ireland_Northen_ireland_Wedding_Photography_killeavy-castle_Wedding_Photography-609_500.webp",
  ],

  "slieve-donard-hotel": [
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-4_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-slieve-donard-hotel-newcastle-wedding-photography-94_500.webp",
    "MKB-weddings-mkb-photography-northern-ireland-wedding-photographer-slieve-donard-hotel-newcastle-wedding-photography2_500.webp",
    "MKB-weddings-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-slieve-donard-hotel-newcastle-wedding-photography-191_500.webp",
    "MKB-weddings-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-slieve-donard-hotel-newcastle-wedding-photography-367_500.webp",
  ],

  "tullyglass-hotel": [
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photographer-tullyglass-house-hotel-ballymena-wedding-photographer-557_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photographer-tullyglass-house-hotel-ballymena-wedding-photographer-521_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photographer-tullyglass-hotel-ballymena-wedding-photography-163_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photographer-tullyglass-house-hotel-ballymena-wedding-photographer-525_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photographer-tullyglass-house-hotel-ballymena-wedding-photographer-596_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photographer-tullyglass-house-hotel-ballymena-wedding-photographer-512_500.webp",
  ],

  "wool-tower": [
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-wool-tower-broughshane-wedding-photography-417_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-wool-tower-broughshane-wedding-photography-110_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-wool-tower-broughshane-wedding-photography-224_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-wool-tower-broughshane-wedding-photography-412_500.webp",
  ],

  "leighinmohr-house-hotel": [
    "MKB-weddings-mkb-photography_Northern_Ireland_Wedding_Photography_Leighinmohr_House_Hotel_Wedding_Photography-Full%20Res-361_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-leighinmohr-house-hotel-ballymena-wedding-photography--355_500.webp",
    "mkb-weddings-mkb-Photography-northern-ireland-wedding-photographer-LEIGHINMOHR-hotel-ballymena-wedding-photography-10_500.webp",
    "mkb-weddings-northern-ireland-wedding-photographer-leighinmohr-house-ballymena-wedding-photography-1_500.webp",
  ],

  "rabbit-hotel-and-spa": [
    "MKB-weddings-mkb-photography-northern-ireland-wedding-photographer-rabbit-hotel-and-spa-templepatrick-wedding-photography4_500.webp",
    "MKB_weddings_mkb-photography-Ireland_Northen_ireland_Wedding_Photography_Rabbit-hotel-and-spa-templepatrick_Wedding_Photography_D%26L-344_500.webp",
    "mkb-weddings-mkb-photography-northerin-ireland-wedding-photographer-ni-wedding-supplier-rabbit-hotel-and-spa-templepatrick-wedding-photography-406_500.webp",
    "MKB_weddings_mkb-photography-Ireland_Northen_ireland_Wedding_Photography_Rabbit-hotel-and-spa-templepatrick_Wedding_Photography_D%26L-511_500.webp",
  ],

  "belmont": [
    "mkb-weddings-mkb-photography-norther-ireland-wedding-photographer-belmont-house-hotel-banbridge-wedding-photography-100-1_500.webp",
    "mkb-weddings-mkb-photography-norther-ireland-wedding-photographer-belmont-house-hotel-banbridge-wedding-photography-138_500.webp",
    "mkb-weddings-mkb-photography-norther-ireland-wedding-photographer-belmont-house-hotel-banbridge-wedding-photography-118_500.webp",
    "mkb-weddings-mkb-photography-norther-ireland-wedding-photographer-belmont-house-hotel-banbridge-wedding-photography-259_500.webp",
  ],

  "landsdowne-hotel": [
    "mkb-weddings-landsdowne-hotel-belfast-wedding-photographer-234_500.webp",
    "mkb-weddings-landsdowne-hotel-belfast-wedding-photographer-226_500.webp",
    "mkb-weddings-landsdowne-hotel-belfast-wedding-photographer-164_500.webp",
  ],

  "beech-hill": [
    "mkb-weddings-northern-ireland-wedding-photographer-beech-hill-country-house-wedding-photography-9_500.webp",
    "MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-Beech-hill-country-house-derry-wedding-photography-FULL-RES-144_500.webp",
    "mkb-weddings-northern-ireland-wedding-photographer-beech-hill-country-house-wedding-photography-10_500.webp",
    "MKB_Photography-Northern-ireland-wedding-photography-northern-ireland-wedding-photographer-beech-hill-country-house-derry-wedding-photography-Full-res-361_500.webp",
  ],

  "la-mon-hotel": [
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-la-mon-hotel-belfast-wedding-photography--394_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-la-mon-hotel-belfast-wedding-photography--412_500.webp",
  ],

  "larchfields": [
    "mkb-weddings-northern-ireland-wedding-photographer-larchfields-estate-lisburn-wedding-photography-32_500.webp",
    "MKB_weddings_MKB_Photography_Ireland_Northen_ireland_Wedding_Photographer_Larchfield_estate_Wedding_Photography-376_500.webp",
    "MKB_weddings_MKB_Photography_Ireland_Northen_ireland_Wedding_Photographer_Larchfield_estate_Wedding_Photography-421_500.webp",
  ],

  "lough-erne-resort": [
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-lough-erne-resort-eniskillen-wedding-photography-280_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-lough-erne-resort-eniskillen-wedding-photography-277_500.webp",
    "MKB-weddings-mkb-photography_Northern_Ireland_wedding_photographer_Lough_Erne_Resort_Eniskillen_Wedding_photography-Full%20res-204_500.webp",
  ],

  "lusty-beg-island": [
    "MKB-weddings-mkb-photography_Northern_Ireland_Wedding_Photography_Lusty_Beg_Wedding_Photography_Hayley%26Brian-For_print-449_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photographer-lusty-beg-island-eniskillen-wedding-photography-291_500.webp",
  ],

  "millbrook-lodge": [
    "MKB-weddings-mkb-photography-northern-ireland-wedding-photographer-millbrook-lodge-ballynahinch-wedding-photography3_500.webp",
    "MKB-weddings-mkb-photography-northern-ireland-wedding-photographer-millbrook-lodge-ballynahinch-wedding-photography5_500.webp",
  ],

  "rocky-mountain-cottage": [
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-rocky-mountain-cottage-newry-wedding-photography-439_500.webp",
  ],

  "roe-valley-resort": [
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-roe-valley-resort-limavady-wedding-photography-419_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-roe-valley-resort-limavady-wedding-photography-422_500.webp",
  ],

  "rossharbour-resort": [
    "mkb-weddings-rossharbour-resort-wedding-photography-363_500.webp",
    "mkb-weddings-rossharbour-resort-wedding-photography-704_500.webp",
    "MKB-weddings-mkb-photography-northern-ireland-wedding-photographer-ross-harbour-enniskillen-wedding-photography_500.webp",
    "mkb-weddings-rossharbour-resort-wedding-photography-390_500.webp",
  ],

  "shandon-hotel": [
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-shandon-hotel-marble-hill-donegal-wedding-photography-404_500.webp",
  ],

  "cavan-crystal": [
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-cavan-crystal-hotel-wedding-photography--7_500.webp",
    "mkb-weddings-cavan-crystal-hotel-wedding-photographer-431_500.webp",
  ],

  "clandeboye-lodge": [
    "MKB_Photography_Ireland_Northen_irelandl_Wedding_Photography_Clandeboye_lodge_Wedding_Photography_Stephanie_and_Callum-383_500.webp",
    "mkb-weddings-irish-wedding-photographer-clandeboye-lodge-bangor-photography-108_500.webp",
  ],

  "corick-house": [
    "MKB-weddings-mkb-photography-northern-ireland-wedding-photographer-corrick-house-wedding-photography13_500.webp",
    "MKB-weddings-mkb-photography-northern-ireland-wedding-photographer-corrick-house-wedding-photography12_500.webp",
  ],

  "darver-castle": [
    "MKB-photography-Northern-Ireland-wedding-photographer-Irish-Wedding-photography-Darver-castle-wedding-photography-Full%20res-586_500.webp",
    "mkb-weddings-northern-ireland-wedding-photographer-ni-wedding-photography-darver-castle-wedding-photography-315_500.webp",
    "mkb-weddings-northern-ireland-wedding-photographer-ni-wedding-photography-darver-castle-wedding-photography-142_500.webp",
  ],

  "dunadry": [
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photographer-dunadry-hotel-belfast-photography-373_500.webp",
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photographer-dunadry-hotel-belfast-photography-530_500.webp",
  ],

  "galgorm": [
    "MKB-weddings-mkb-photography_Northern_Ireland_Wedding_Photography_Galgorm_Manor_wedding_photography_Galgorm_resort_wedding_photographer-Full-res-256_500.webp",
    "MKB-photography-Northern-Ireland-wedding-photographer-Galgorm-resort-Wedding-photography-Glagorm-resort-wedding-photography-full%20res-318_500.webp",
    "MKB-photography-Northern-Ireland-wedding-photographer-Galgorm-resort-Wedding-photography-Glagorm-resort-wedding-photography-full%20res-307_500.webp",
  ],

  "four-seasons-monaghan": [
    "mkb-weddings-mkb-photography-northern-ireland-wedding-photography-four-seasons-hotel-monaghan-wedding-photography-334_500.webp",
  ],
};

// --- Ordering helpers (pinned + stable shuffle) -----------------------------
function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function stableShuffle<T>(arr: T[], seed: string) {
  const out = [...arr];
  let s = hashString(seed) || 1;

  const rand = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };

  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function applyPinnedOrder(
  rows: GalleryRow[],
  venueSlug: string,
  seed: string
): GalleryRow[] {
  const pinnedFilenames = (PINNED[(venueSlug || "").toLowerCase()] || []).filter(
    Boolean
  );
  if (!pinnedFilenames.length) return stableShuffle(rows, seed);

  const pinnedSet = new Set(pinnedFilenames);

  const pinned: GalleryRow[] = [];
  for (const fn of pinnedFilenames) {
    const found = rows.find((r) => r.filename === fn);
    if (found) pinned.push(found);
  }

  const rest = rows.filter((r) => !pinnedSet.has(r.filename));
  const shuffledRest = stableShuffle(rest, seed);

  return [...pinned, ...shuffledRest];
}

// --- CSV helpers -------------------------------------------------------------
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

function cleanCsvValue(v: string) {
  const t = (v || "").trim();
  return t.replace(/^"+|"+$/g, "").replace(/""+/g, '"').replace(/"/g, "").trim();
}

function parseCsvLines(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).filter(Boolean);

  const parseLine = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (const ch of line) {
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

function parseGalleryCsv(csvText: string): GalleryRow[] {
  const rows = parseCsvLines(csvText);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.toLowerCase());
  const venueIdx = header.indexOf("venue");
  const categoryIdx = header.indexOf("category");
  const filenameIdx = header.indexOf("filename");
  const tagsIdx = header.indexOf("tags");

  if (venueIdx === -1 || categoryIdx === -1 || filenameIdx === -1) return [];

  return rows
    .slice(1)
    .map((cols) => ({
      venue: cleanCsvValue(cols[venueIdx] || ""),
      category: cleanCsvValue(cols[categoryIdx] || ""),
      filename: cleanCsvValue(cols[filenameIdx] || ""),
      tags: tagsIdx >= 0 ? cleanCsvValue(cols[tagsIdx] || "") : undefined,
    }))
    .filter((r) => r.venue && r.category && r.filename);
}

function parseVenueMetaCsv(csvText: string): VenueMetaRow[] {
  const rows = parseCsvLines(csvText);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.toLowerCase());
  const venueIdx = header.indexOf("venue");
  const nameIdx = header.indexOf("venue-name");
  const locIdx = header.indexOf("venue-location");
  const webIdx = header.indexOf("venue-website");
  const descIdx = header.indexOf("venue-description");

  if (venueIdx === -1) return [];

  return rows
    .slice(1)
    .map((cols) => ({
      venue: cleanCsvValue(cols[venueIdx] || ""),
      venueName: nameIdx >= 0 ? cleanCsvValue(cols[nameIdx] || "") : "",
      venueLocation: locIdx >= 0 ? cleanCsvValue(cols[locIdx] || "") : "",
      venueWebsite: webIdx >= 0 ? cleanCsvValue(cols[webIdx] || "") : "",
      venueDescription: descIdx >= 0 ? cleanCsvValue(cols[descIdx] || "") : "",
    }))
    .filter((v) => v.venue);
}

// --- URL builders ------------------------------------------------------------
function thumbUrl(r: GalleryRow) {
  return `${THUMB_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(r.filename)}`;
}

function fullUrlFromThumb(r: GalleryRow) {
  return `${FULL_BASE}/${encSegment(r.venue)}/${encSegment(
    r.category
  )}/${encodeURIComponent(r.filename.replace(/_500\.webp$/i, "_2000.webp"))}`;
}

// Avoid encodeURI/URIError crashes if CSV contains bad % sequences
function safeExternalUrl(input: string): string {
  const raw = (input || "").trim();
  if (!raw) return "";
  try {
    // If already absolute
    const u = new URL(raw);
    return u.href;
  } catch {
    try {
      // If missing scheme
      const u = new URL(`https://${raw.replace(/^\/+/, "")}`);
      return u.href;
    } catch {
      return "";
    }
  }
}

// --- GEO inference (helps NI vs ROI SEO signals) ----------------------------
function inferGeo(locationRaw: string): {
  regionLabel: string;
  addressCountryCode: "GB" | "IE";
  addressCountryName: "United Kingdom" | "Ireland";
} {
  const loc = (locationRaw || "").toLowerCase();

  const roiHints = [
    "donegal",
    "monaghan",
    "cavan",
    "dublin",
    "galway",
    "mayo",
    "sligo",
    "leitrim",
    "meath",
    "louth",
    "kildare",
    "wicklow",
    "wexford",
    "waterford",
    "cork",
    "kerry",
    "clare",
    "limerick",
    "tipperary",
    "laois",
    "offaly",
    "westmeath",
    "longford",
    "roscommon",
    "kilkenny",
    "carlow",
  ];

  const niHints = [
    "antrim",
    "down",
    "armagh",
    "tyrone",
    "fermanagh",
    "derry",
    "londonderry",
    "belfast",
    "lisburn",
    "bangor",
    "newry",
    "coleraine",
    "enniskillen",
    "omagh",
    "ballymena",
    "larne",
    "carrickfergus",
    "newtownards",
  ];

  if (roiHints.some((h) => loc.includes(h))) {
    return { regionLabel: "Ireland", addressCountryCode: "IE", addressCountryName: "Ireland" };
  }
  if (niHints.some((h) => loc.includes(h))) {
    return {
      regionLabel: "Northern Ireland",
      addressCountryCode: "GB",
      addressCountryName: "United Kingdom",
    };
  }

  // default (since most of your business is NI)
  return {
    regionLabel: "Northern Ireland",
    addressCountryCode: "GB",
    addressCountryName: "United Kingdom",
  };
}

function getFallbackVenueDescription(venueName: string, location?: string) {
  const geo = inferGeo(location || "");
  const locText = location ? `, ${location}` : "";
  return `Wedding photography at ${venueName}${locText} (${geo.regionLabel}). I photograph weddings here with a relaxed, documentary approach — capturing genuine moments, natural emotion, and the atmosphere of the day as it unfolds. Couples get authentic storytelling with a creative edge, plus confident direction when it matters.`;
}

// ----------------------------------------------------------------------------
export function GalleryVenueDetail() {
  const { venueId } = useParams<{ venueId: string }>();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [venueId]);

  const [galleryRows, setGalleryRows] = useState<GalleryRow[]>([]);
  const [venueMetaMap, setVenueMetaMap] = useState<Record<string, VenueMetaRow>>({});

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [galleryRes, venueRes] = await Promise.all([
          fetch("/gallery.csv", { cache: "no-store" }),
          fetch("/galleryvenuedesc.csv", { cache: "no-store" }),
        ]);

        const galleryText = await galleryRes.text();
        if (!cancelled) setGalleryRows(parseGalleryCsv(galleryText));

        if (venueRes.ok) {
          const venueText = await venueRes.text();
          const parsed = parseVenueMetaCsv(venueText);

          const map: Record<string, VenueMetaRow> = {};
          parsed.forEach((v) => {
            map[v.venue] = v;
          });

          if (!cancelled) setVenueMetaMap(map);
        }
      } catch {
        // silent
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const venueRowsRaw = useMemo(() => {
    if (!venueId) return [];
    return galleryRows.filter((r) => slugify(r.venue) === venueId);
  }, [galleryRows, venueId]);

  const rawVenue = venueRowsRaw[0]?.venue || "";
  const meta = rawVenue ? venueMetaMap[rawVenue] : undefined;

  // Prevent location being used as name if columns got mixed
  const possibleName = (meta?.venueName || "").trim();
  const possibleLoc = (meta?.venueLocation || "").trim();
  const name =
    possibleName && possibleName.toLowerCase() !== possibleLoc.toLowerCase()
      ? possibleName
      : rawVenue;

  const location = possibleLoc || "";
  const websiteRaw = (meta?.venueWebsite || "").trim();
  const safeWebsite = safeExternalUrl(websiteRaw);

  const descriptionFromCsv = (meta?.venueDescription || "").trim();
  const description =
    descriptionFromCsv || getFallbackVenueDescription(name || rawVenue, location);

  const geo = inferGeo(location);

  // Visible copy
  const introLine = `Wedding photography at ${name}${location ? `, ${location}` : ""}`;

  // Pinned + stable shuffle per venue
  const venueRows = useMemo(() => {
    if (!venueRowsRaw.length) return [];
    const seed = `${venueId || ""}:${venueRowsRaw.length}`;
    return applyPinnedOrder(venueRowsRaw, venueId || "", seed);
  }, [venueRowsRaw, venueId]);

  const images = useMemo(() => {
    return venueRows.map((r) => ({
      thumb: thumbUrl(r),
      full: fullUrlFromThumb(r),
      alt: `${name}${location ? `, ${location}` : ""} – ${r.category}`,
      filename: r.filename,
    }));
  }, [venueRows, name, location]);

  const heroImage =
    images[0]?.full ||
    images[0]?.thumb ||
    "https://images.unsplash.com/photo-1519167758481-83f29da8c9b1?w=1600&q=80";

  // ----- Internal links (More venues) -----
  const moreVenueLinks = useMemo(() => {
    const uniqueVenueNames = Array.from(new Set(galleryRows.map((r) => r.venue))).filter(Boolean);

    const all = uniqueVenueNames
      .map((venue) => {
        const m = venueMetaMap[venue];
        const loc = (m?.venueLocation || "").trim();
        const displayName = (m?.venueName || "").trim() || venue;
        const slug = slugify(venue);
        return { venue, slug, displayName, loc };
      })
      .filter((v) => v.slug && v.slug !== (venueId || ""));

    const shuffled = stableShuffle(all, `more:${venueId || ""}:${all.length}`);
    return shuffled.slice(0, 6);
  }, [galleryRows, venueMetaMap, venueId]);

  if (!venueRowsRaw.length) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-3xl mb-3">Venue not found</h1>
          <Link to="/gallery/venues" className="text-neutral-600 hover:text-neutral-900">
            Back to Venues
          </Link>
        </div>
      </div>
    );
  }

  const safeVenueId = (venueId || "").replace(/\/+$/, "");
  const canonical = `${SITE_ORIGIN}/gallery/venue/${encodeURIComponent(safeVenueId)}`;

  const metaTitle = `${name} Wedding Photography | MKB Weddings`;
  const metaDescription =
    description ||
    `Natural, documentary wedding photography at ${name}${location ? ` in ${location}` : ""}. View real weddings and venue galleries by MKB Weddings.`;

 // ✅ Added: ensure browser title always updates (without changing anything else)
  useEffect(() => {
    document.title = metaTitle;
  }, [metaTitle]);


  // ---------- JSON-LD (Breadcrumbs + WebPage + Place/EventVenue + ImageObject) ----------
  const breadcrumbItems = [
    { name: "Home", item: `${SITE_ORIGIN}/` },
    { name: "Gallery", item: `${SITE_ORIGIN}/gallery` },
    { name: "Venues", item: `${SITE_ORIGIN}/gallery/venues` },
    { name, item: canonical },
  ].map((x, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    name: x.name,
    item: x.item,
  }));

  const heroImageObject = {
    "@type": "ImageObject",
    "@id": `${canonical}#primaryimage`,
    contentUrl: heroImage,
    url: heroImage,
    caption: `${name}${location ? `, ${location}` : ""} wedding photography`,
    representativeOfPage: true,
  };

  // Keep this small (don’t dump hundreds of images into JSON-LD)
  const galleryImageObjects = images.slice(0, 12).map((img, idx) => ({
    "@type": "ImageObject",
    "@id": `${canonical}#image-${idx + 1}`,
    contentUrl: img.full,
    url: img.full,
    caption: img.alt,
  }));

  const localityGuess = location.includes(",") ? location.split(",")[0].trim() : "";

  const venuePlaceJsonLd = {
    "@type": ["Place", "EventVenue"],
    "@id": `${canonical}#venue`,
    name,
    url: canonical,
    sameAs: safeWebsite ? [safeWebsite] : undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: localityGuess || undefined,
      addressRegion: geo.regionLabel,
      addressCountry: geo.addressCountryCode,
    },
  };

  const pageJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        url: `${SITE_ORIGIN}/`,
        name: "MKB Weddings",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: breadcrumbItems,
      },
      heroImageObject,
      venuePlaceJsonLd,
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: metaTitle,
        description: metaDescription,
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
        breadcrumb: { "@id": `${canonical}#breadcrumb` },
        primaryImageOfPage: { "@id": `${canonical}#primaryimage` },
        about: { "@id": `${canonical}#venue` },
        hasPart: galleryImageObjects,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />

        <link rel="canonical" href={canonical} />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={heroImage} />
        <meta property="og:type" content="website" />

        <script type="application/ld+json">{JSON.stringify(pageJsonLd)}</script>
      </Helmet>

      {/* HERO */}
      <div className="relative h-[60vh] min-h-[420px]">
        <ImageWithFallback src={heroImage} alt={name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <div className="w-full max-w-7xl mx-auto px-6 pb-20 text-center">
            <Link
              to="/gallery/venues"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Venues
            </Link>

            <h1 className="text-white text-5xl md:text-6xl mb-4">{name}</h1>

            <div className="flex flex-col items-center gap-2 text-white/90">
              {location ? (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{location}</span>
                </div>
              ) : null}

              <div className="text-white/85 text-sm">
                {images.length} {images.length === 1 ? "image" : "images"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BREADCRUMBS */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
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
                to="/gallery/venues"
                className="hover:text-neutral-900 underline underline-offset-4"
              >
                Venues
              </Link>
            </li>
            <li className="opacity-60">
              <ChevronRight className="w-4 h-4" />
            </li>
            <li className="text-neutral-900">{name}</li>
          </ol>
        </nav>
      </div>

      {/* VENUE INFO */}
      <section className="max-w-5xl mx-auto px-6 pt-10 pb-10 text-center">
        <p className="text-neutral-900 text-3xl md:text-5xl font-serif mb-10">{introLine}</p>

        {safeWebsite ? (
          <div className="mb-10">
            <a
              href={safeWebsite}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="inline-flex items-center gap-2 text-neutral-900 hover:text-neutral-700 underline underline-offset-4 justify-center"
            >
              Visit venue website <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ) : null}

        {description ? (
          <div className="text-neutral-700 leading-relaxed text-lg space-y-5 mb-10">
            {description.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : null}
      </section>

      {/* GRID */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((img, idx) => {
            const remainderLg = images.length % 3;
            const isLast = idx === images.length - 1;
            const shouldSpanLg = isLast && remainderLg === 1;

            return (
              <button
                key={`${img.thumb}-${idx}`}
                type="button"
                onClick={() => {
                  setLightboxIndex(idx);
                  setLightboxOpen(true);
                }}
                className={`aspect-[4/3] overflow-hidden rounded-lg group cursor-pointer text-left ${
                  shouldSpanLg ? "lg:col-span-3" : ""
                }`}
              >
                <ImageWithFallback
                  src={img.thumb}
                  alt={img.alt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Explore more venues (moved BELOW gallery pics) */}
      <section className="max-w-5xl mx-auto px-6 pb-40 text-center">
        <div className="pt-10 border-t border-neutral-200">
          <h2 className="text-neutral-900 text-2xl md:text-3xl font-serif mb-4">
            Explore more venues
          </h2>
          <p className="text-neutral-600 mb-6">
            Browse more real wedding galleries across {geo.regionLabel} and beyond.
          </p>

          {/* Simple text links (no boxes) */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link
              to="/gallery/venues"
              className="text-neutral-900 hover:text-neutral-700 underline underline-offset-4"
            >
              View all venues
            </Link>
            <Link
              to="/gallery"
              className="text-neutral-900 hover:text-neutral-700 underline underline-offset-4"
            >
              Back to gallery
            </Link>
          </div>

          {moreVenueLinks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {moreVenueLinks.map((v) => (
                <Link
                  key={v.slug}
                  to={`/gallery/venue/${v.slug}`}
                  className="rounded-lg border border-neutral-200 p-4 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
                >
                  <div className="text-neutral-900 font-medium">{v.displayName}</div>
                  {v.loc ? <div className="text-neutral-600 text-sm mt-1">{v.loc}</div> : null}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

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
  );
}