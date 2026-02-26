import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const venueMetaPath = path.join(ROOT, "public", "venue-meta.json");
const countyCsvPath = path.join(ROOT, "public", "county.csv");
const outPath = path.join(ROOT, "public", "county-meta.json");

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(",").map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (values[i] || "")
        .replace(/^"+|"+$/g, "")
        .replace(/""/g, '"')
        .trim();
    });
    return obj;
  });
}

const venueMeta = JSON.parse(fs.readFileSync(venueMetaPath, "utf8"));
const countyCsv = parseCsv(fs.readFileSync(countyCsvPath, "utf8"));

const countyMap = {};

countyCsv.forEach(row => {
  countyMap[row["county-slug"]] = {
    slug: row["county-slug"],
    country: row["country"],
    countryCode: row["country-code"],
    county: row["county-display"],
    primaryKeyword: row["primary-keyword"],
    secondaryKeywords: (row["secondary-keywords"] || "").split("|"),
    seoTitle: row["seo-title"],
    seoDescription: row["seo-description"],
    intro: row["intro"],
    whySection: row["why-section"],
    travelSection: row["travel-section"],
    faqs: [
      {
        question: row["faq-1-q"],
        answer: row["faq-1-a"],
      },
      {
        question: row["faq-2-q"],
        answer: row["faq-2-a"],
      },
    ],
    venues: [],
  };
});

// Attach venues automatically
Object.entries(venueMeta).forEach(([slug, v]) => {
  const region = (v.venueRegion || "").toLowerCase();
  Object.values(countyMap).forEach(county => {
    if (region.includes(county.county.toLowerCase().replace("county ", ""))) {
      county.venues.push({
        venueSlug: slug,
        venueName: v.venueName,
        town: v.venueTown,
        url: `/gallery/venue/${slug}`,
      });
    }
  });
});

fs.writeFileSync(outPath, JSON.stringify(countyMap, null, 2));
console.log("✅ county-meta.json built");