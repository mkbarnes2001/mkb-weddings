import fs from "node:fs";
import { slugify } from "./paths.mjs";

export function loadCountyContext(countyMetaPath = "public/county-meta.json") {
  if (!fs.existsSync(countyMetaPath)) return new Map();
  const data = JSON.parse(fs.readFileSync(countyMetaPath, "utf8"));
  const venueMap = new Map();

  for (const county of Object.values(data)) {
    for (const venue of county.venues || []) {
      const keys = new Set([
        slugify(venue.venueSlug),
        slugify(venue.venueName),
      ]);

      for (const key of keys) {
        if (!key) continue;
        venueMap.set(key, {
          county: county.county || "",
          country: county.country || "",
          town: venue.town || "",
          venueName: venue.venueName || "",
          primaryKeyword: county.primaryKeyword || "",
          secondaryKeywords: county.secondaryKeywords || [],
        });
      }
    }
  }

  return venueMap;
}

export function getContextForRow(row, venueMap) {
  const venueKey = slugify(row.venue || "");
  return venueMap.get(venueKey) || {
    county: "",
    country: "",
    town: "",
    venueName: row.venue || "",
    primaryKeyword: "",
    secondaryKeywords: [],
  };
}
