// scripts/make-venue-meta.mjs
import fs from "node:fs";
import path from "node:path";

function cleanCsvValue(v = "") {
  const t = String(v).trim();
  return t.replace(/^"+|"+$/g, "").replace(/""+/g, '"').replace(/"/g, "").trim();
}

// Simple CSV line parser supporting quoted commas
function parseCsvLines(csvText) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);

  const parseLine = (line) => {
    const out = [];
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

function slugify(s = "") {
  return s
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toCountryCode(countryRaw = "") {
  const c = countryRaw.trim().toLowerCase();
  if (c === "ireland") return "IE";
  if (c === "northern ireland") return "GB";
  return ""; // unknown
}

function buildVenueMetaFromCsv(csvText) {
  const rows = parseCsvLines(csvText);
  if (rows.length < 2) return {};

  const header = rows[0].map((h) => cleanCsvValue(h).toLowerCase());

  const idx = (name) => header.indexOf(name);

  const venueIdx = idx("venue");
  if (venueIdx === -1) throw new Error('CSV missing required column: "venue"');

  const nameIdx = idx("venue-name");
  const townIdx = idx("venue-location");
  const regionIdx = idx("venue-region");
  const countryIdx = idx("venue-country");
  const webIdx = idx("venue-website");
  const descIdx = idx("venue-description");

  const out = {};

  for (const row of rows.slice(1)) {
    const venue = cleanCsvValue(row[venueIdx] || "");
    if (!venue) continue;

    const slug = slugify(venue);
    if (!slug) continue;

    const venueName = nameIdx >= 0 ? cleanCsvValue(row[nameIdx] || "") : "";
    const venueTown = townIdx >= 0 ? cleanCsvValue(row[townIdx] || "") : "";
    const venueRegion = regionIdx >= 0 ? cleanCsvValue(row[regionIdx] || "") : "";
    const venueCountry = countryIdx >= 0 ? cleanCsvValue(row[countryIdx] || "") : "";
    const venueWebsite = webIdx >= 0 ? cleanCsvValue(row[webIdx] || "") : "";
    const venueDescription = descIdx >= 0 ? cleanCsvValue(row[descIdx] || "") : "";

    out[slug] = {
      venue, // raw CSV key
      venueName,
      venueTown,
      venueRegion,
      venueCountry,
      venueCountryCode: toCountryCode(venueCountry),
      venueWebsite,
      venueDescription,
    };
  }

  return out;
}

const csvPath =
  process.argv[2] ||
  path.resolve(process.cwd(), "public", "galleryvenuedesc.csv");

const outPath =
  process.argv[3] || path.resolve(process.cwd(), "public", "venue-meta.json");

const csvText = fs.readFileSync(csvPath, "utf8");
const meta = buildVenueMetaFromCsv(csvText);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(meta, null, 2), "utf8");

console.log(`✅ Wrote ${Object.keys(meta).length} venues -> ${outPath}`);