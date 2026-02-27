// scripts/build-county-meta.mjs
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

const ROOT = process.cwd();
const COUNTY_CSV = path.join(ROOT, "public", "county.csv");
const VENUE_META_JSON = path.join(ROOT, "public", "venue-meta.json");
const OUT_JSON = path.join(ROOT, "public", "county-meta.json");

function readText(fp) {
  return fs.readFileSync(fp, "utf8");
}

function readJson(fp) {
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(readText(fp));
  } catch {
    return null;
  }
}

function clean(v) {
  return String(v ?? "")
    .trim()
    .replace(/^"+|"+$/g, "")
    .replaceAll("\uFEFF", "");
}

function cleanKeyword(v) {
  // remove stray trailing quotes/commas users sometimes leave in CSV
  return clean(v).replace(/["',]+$/g, "").trim();
}

function splitKeywords(v) {
  const s = clean(v);
  if (!s) return [];
  return s
    .split("|")
    .map((x) => cleanKeyword(x))
    .filter(Boolean);
}

function titleCaseFromSlug(slug) {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function countyTokenFromSlug(countySlug) {
  // co-down => down, co-londonderry => londonderry
  return String(countySlug || "")
    .toLowerCase()
    .replace(/^co-/, "")
    .trim();
}

function heroThumbFromFull(fullUrl) {
  const u = clean(fullUrl);
  if (!u) return "";

  // expected:
  // .../full/<VENUE>/<MOMENT>/<FILE>_2000.webp
  // to:
  // .../thumb/<VENUE>/<MOMENT>/<FILE>_500.webp
  let out = u.replace("/full/", "/thumb/");
  out = out.replace(/_2000\.webp(\?.*)?$/i, "_500.webp$1");
  return out;
}

function toVenueSlug(venueName) {
  return String(venueName || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeRegion(s) {
  return clean(s)
    .toLowerCase()
    .replace(/^county\s+/i, "")
    .replace(/^co\.?\s+/i, "")
    .replace(/\./g, "")
    .trim();
}

function regionMatchesCounty(venueRegion, countySlug) {
  const vr = normalizeRegion(venueRegion);
  const token = normalizeRegion(countyTokenFromSlug(countySlug));
  if (!vr || !token) return false;

  // "down" should match "down" inside "co down"
  return vr.includes(token);
}

function main() {
  if (!fs.existsSync(COUNTY_CSV)) {
    console.error(`❌ Missing ${COUNTY_CSV}`);
    process.exit(1);
  }

  const csvText = readText(COUNTY_CSV);

  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  });

  // Expected headers from your file:
  // county-slug,country,country-code,county-display,primary-keyword,secondary-keywords,seo-title,seo-description,intro,why-section,travel-section,faq-1-q,faq-1-a,faq-2-q,faq-2-a,heroImageUrl
  const venueMeta = readJson(VENUE_META_JSON) || {};

  const out = {};

  for (const r of records) {
    const slug = clean(r["county-slug"]).toLowerCase();
    if (!slug) continue;

    const countyDisplay = clean(r["county-display"]) || titleCaseFromSlug(slug);
    const country = clean(r["country"]);
    const countryCode = clean(r["country-code"]);

    const heroImageUrl = clean(r["heroImageUrl"]);
    const heroThumbUrl = heroThumbFromFull(heroImageUrl);

    const faq1q = clean(r["faq-1-q"]);
    const faq1a = clean(r["faq-1-a"]);
    const faq2q = clean(r["faq-2-q"]);
    const faq2a = clean(r["faq-2-a"]);

    const faqs = [];
    if (faq1q && faq1a) faqs.push({ question: faq1q, answer: faq1a });
    if (faq2q && faq2a) faqs.push({ question: faq2q, answer: faq2a });

    // Build venues list from venue-meta.json by matching venueRegion to county slug
    const venues = Object.entries(venueMeta)
      .filter(([, v]) => regionMatchesCounty(v?.venueRegion, slug))
      .map(([venueSlug, v]) => ({
        venueSlug,
        venueName: clean(v?.venueName) || titleCaseFromSlug(venueSlug),
        town: clean(v?.venueTown) || "",
        url: `/gallery/venue/${encodeURIComponent(venueSlug)}`,
      }))
      .sort((a, b) => a.venueName.localeCompare(b.venueName));

    out[slug] = {
      slug,
      country,
      countryCode,
      county: countyDisplay,

      primaryKeyword: clean(r["primary-keyword"]),
      secondaryKeywords: splitKeywords(r["secondary-keywords"]),

      seoTitle: clean(r["seo-title"]),
      seoDescription: clean(r["seo-description"]),

      intro: clean(r["intro"]),
      whySection: clean(r["why-section"]),
      travelSection: clean(r["travel-section"]),

      faqs,
      venues,

      heroImageUrl,
      heroThumbUrl,
    };
  }

  const keys = Object.keys(out);

  if (keys.length === 0) {
    console.error(
      "❌ build-county-meta produced 0 counties. Not overwriting county-meta.json.\n" +
        "Check CSV headers/formatting in public/county.csv."
    );
    process.exit(1);
  }

  // Write pretty JSON
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`✅ county-meta.json written: ${OUT_JSON} (counties: ${keys.length})`);
}

main();