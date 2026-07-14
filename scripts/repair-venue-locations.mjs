import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicVenuePublisher } from "../server/public-venue-publisher.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");

const csvArg = process.argv
  .slice(2)
  .find((arg) => arg.startsWith("--csv="));

const CSV_PATH = path.resolve(
  PROJECT_ROOT,
  csvArg
    ? csvArg.slice("--csv=".length)
    : "public/galleryvenuedesc.csv",
);

const VENUES_ROOT = path.join(
  PROJECT_ROOT,
  "content",
  "venues",
);

const PUBLIC_DATA_ROOT = path.join(
  PROJECT_ROOT,
  "public",
  "venue-data",
);

function text(value) {
  return String(value ?? "").trim();
}

function normalise(value) {
  return text(value)
    .toLowerCase()
    .replace(/^county\s+/i, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return text(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(csvText) {
  const cleanText = csvText.replace(/^\uFEFF/, "");
  const rows = cleanText
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map(parseCsvLine);

  if (rows.length < 2) return [];

  const headers = rows[0].map((header) =>
    normalise(header).replace(/\s+/g, "-"),
  );

  return rows.slice(1).map((columns) =>
    Object.fromEntries(
      headers.map((header, index) => [
        header,
        text(columns[index]),
      ]),
    ),
  );
}

function firstValue(row, keys) {
  for (const key of keys) {
    const value = text(row[key]);
    if (value) return value;
  }

  return "";
}

function inferCountry(county) {
  const value = normalise(county);

  const irelandCounties = new Set([
    "cavan",
    "donegal",
    "leitrim",
    "louth",
    "meath",
    "monaghan",
  ]);

  if (!value) return "";

  return irelandCounties.has(value)
    ? "Ireland"
    : "Northern Ireland";
}

function locationFromRow(row) {
  const sourceVenue = firstValue(row, [
    "venue",
    "venue-slug",
  ]);

  const displayName = firstValue(row, [
    "venue-name",
    "name",
  ]);

  const town = firstValue(row, [
    "venue-location",
    "town",
    "location",
    "city",
  ]);

  const county = firstValue(row, [
    "venue-region",
    "county",
    "region",
  ]);

  const country =
    firstValue(row, [
      "venue-country",
      "country",
    ]) || inferCountry(county);

  return {
    sourceVenue,
    displayName,
    town,
    county,
    country,
    row,
  };
}

function buildIndexes(locations) {
  const bySlug = new Map();
  const byName = new Map();

  function add(map, key, location) {
    if (!key) return;

    const current = map.get(key) || [];
    current.push(location);
    map.set(key, current);
  }

  for (const location of locations) {
    add(
      bySlug,
      slugify(location.sourceVenue),
      location,
    );

    add(
      bySlug,
      slugify(location.displayName),
      location,
    );

    add(
      byName,
      normalise(location.sourceVenue),
      location,
    );

    add(
      byName,
      normalise(location.displayName),
      location,
    );
  }

  return {
    bySlug,
    byName,
  };
}

function uniqueMatches(matches) {
  const seen = new Set();

  return matches.filter((match) => {
    const key = [
      normalise(match.sourceVenue),
      normalise(match.displayName),
      normalise(match.town),
      normalise(match.county),
      normalise(match.country),
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findLocation(venue, folderSlug, indexes) {
  const candidates = uniqueMatches([
    ...(indexes.bySlug.get(folderSlug) || []),
    ...(indexes.bySlug.get(slugify(venue.slug)) || []),
    ...(indexes.bySlug.get(slugify(venue.name)) || []),
    ...(indexes.byName.get(normalise(venue.name)) || []),
  ]);

  if (candidates.length === 1) {
    return {
      location: candidates[0],
      candidates,
    };
  }

  const exactNameMatches = candidates.filter(
    (candidate) =>
      normalise(candidate.sourceVenue) ===
        normalise(venue.name) ||
      normalise(candidate.displayName) ===
        normalise(venue.name),
  );

  if (exactNameMatches.length === 1) {
    return {
      location: exactNameMatches[0],
      candidates,
    };
  }

  const exactSlugMatches = candidates.filter(
    (candidate) =>
      slugify(candidate.sourceVenue) ===
        folderSlug ||
      slugify(candidate.displayName) ===
        folderSlug,
  );

  if (exactSlugMatches.length === 1) {
    return {
      location: exactSlugMatches[0],
      candidates,
    };
  }

  return {
    location: null,
    candidates,
  };
}

function hasText(value) {
  return Boolean(text(value));
}

function changesForVenue(venue, location) {
  const changes = {};

  if (!hasText(venue.town) && hasText(location.town)) {
    changes.town = location.town;
  }

  if (!hasText(venue.county) && hasText(location.county)) {
    changes.county = location.county;
  }

  if (
    !hasText(venue.country) &&
    hasText(location.country)
  ) {
    changes.country = location.country;
  }

  return changes;
}

async function main() {
  const csvText = await fs.readFile(
    CSV_PATH,
    "utf8",
  );

  const sourceRows = parseCsv(csvText);
  const locations = sourceRows
    .map(locationFromRow)
    .filter(
      (location) =>
        location.sourceVenue ||
        location.displayName,
    );

  const indexes = buildIndexes(locations);

  await fs.mkdir(VENUES_ROOT, {
    recursive: true,
  });

  const entries = await fs.readdir(
    VENUES_ROOT,
    {
      withFileTypes: true,
    },
  );

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const backupRoot = path.join(
    PROJECT_ROOT,
    "backups",
    "venue-location-repair",
    timestamp,
  );

  const report = {
    mode: APPLY ? "apply" : "dry-run",
    generatedAt: new Date().toISOString(),
    csvPath: path.relative(
      PROJECT_ROOT,
      CSV_PATH,
    ),
    venueCount: 0,
    matchedCount: 0,
    changedCount: 0,
    unchangedCount: 0,
    unmatchedCount: 0,
    ambiguousCount: 0,
    changed: [],
    unchanged: [],
    unmatched: [],
    ambiguous: [],
  };

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const folderSlug = entry.name;
    const venuePath = path.join(
      VENUES_ROOT,
      folderSlug,
      "venue.json",
    );

    let venue;

    try {
      venue = JSON.parse(
        await fs.readFile(
          venuePath,
          "utf8",
        ),
      );
    } catch (error) {
      console.error(
        `Unable to read ${path.relative(
          PROJECT_ROOT,
          venuePath,
        )}:`,
        error,
      );
      continue;
    }

    report.venueCount += 1;

    const match = findLocation(
      venue,
      folderSlug,
      indexes,
    );

    if (!match.location) {
      const item = {
        slug: folderSlug,
        name: text(venue.name),
        candidates: match.candidates.map(
          (candidate) => ({
            sourceVenue:
              candidate.sourceVenue,
            displayName:
              candidate.displayName,
            town: candidate.town,
            county: candidate.county,
            country: candidate.country,
          }),
        ),
      };

      if (match.candidates.length > 1) {
        report.ambiguousCount += 1;
        report.ambiguous.push(item);
      } else {
        report.unmatchedCount += 1;
        report.unmatched.push(item);
      }

      continue;
    }

    report.matchedCount += 1;

    const changes = changesForVenue(
      venue,
      match.location,
    );

    if (!Object.keys(changes).length) {
      report.unchangedCount += 1;
      report.unchanged.push({
        slug: folderSlug,
        name: text(venue.name),
        town: text(venue.town),
        county: text(venue.county),
        country: text(venue.country),
      });
      continue;
    }

    report.changedCount += 1;
    report.changed.push({
      slug: folderSlug,
      name: text(venue.name),
      changes,
      sourceVenue:
        match.location.sourceVenue,
      sourceDisplayName:
        match.location.displayName,
    });

    if (!APPLY) continue;

    await fs.mkdir(
      path.join(backupRoot, folderSlug),
      {
        recursive: true,
      },
    );

    await fs.copyFile(
      venuePath,
      path.join(
        backupRoot,
        folderSlug,
        "venue.json",
      ),
    );

    const updatedVenue = {
      ...venue,
      ...changes,
      updatedAt:
        new Date().toISOString(),
    };

    await fs.writeFile(
      venuePath,
      `${JSON.stringify(
        updatedVenue,
        null,
        2,
      )}\n`,
      "utf8",
    );
  }

  if (APPLY) {
    const publisher =
      createPublicVenuePublisher({
        projectRoot: PROJECT_ROOT,
        venuesRoot: VENUES_ROOT,
        publicDataRoot:
          PUBLIC_DATA_ROOT,
      });

    report.publicVenueData =
      await publisher.publishAll();

    await fs.mkdir(backupRoot, {
      recursive: true,
    });

    await fs.writeFile(
      path.join(backupRoot, "report.json"),
      `${JSON.stringify(
        report,
        null,
        2,
      )}\n`,
      "utf8",
    );
  }

  console.log("");
  console.log(
    `Venue location repair (${report.mode})`,
  );
  console.log(
    "--------------------------------",
  );
  console.log(
    `Repository venues: ${report.venueCount}`,
  );
  console.log(
    `Matched:           ${report.matchedCount}`,
  );
  console.log(
    `Would change:      ${report.changedCount}`,
  );
  console.log(
    `Already complete:  ${report.unchangedCount}`,
  );
  console.log(
    `Unmatched:         ${report.unmatchedCount}`,
  );
  console.log(
    `Ambiguous:         ${report.ambiguousCount}`,
  );

  if (report.changed.length) {
    console.log("");
    console.log("Changes:");

    for (const item of report.changed) {
      console.log(
        `- ${item.slug}: ${JSON.stringify(
          item.changes,
        )}`,
      );
    }
  }

  if (report.unmatched.length) {
    console.log("");
    console.log("Unmatched venues:");

    for (const item of report.unmatched) {
      console.log(
        `- ${item.slug} (${item.name})`,
      );
    }
  }

  if (report.ambiguous.length) {
    console.log("");
    console.log("Ambiguous venues:");

    for (const item of report.ambiguous) {
      console.log(
        `- ${item.slug} (${item.name})`,
      );
    }
  }

  console.log("");

  if (!APPLY) {
    console.log(
      "Dry run only. No files were changed.",
    );
    console.log(
      "Run again with --apply after reviewing the summary.",
    );
  } else {
    console.log(
      `Backups and report: ${path.relative(
        PROJECT_ROOT,
        backupRoot,
      )}`,
    );
    console.log(
      `Public venue data regenerated: ${report.publicVenueData?.venueCount || 0} venues.`,
    );
  }
}

main().catch((error) => {
  console.error("");
  console.error(
    error instanceof Error
      ? error.message
      : error,
  );
  process.exitCode = 1;
});
