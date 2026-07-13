import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const SOURCE_TYPE = "legacy-gallery-csv";
const DEFAULT_PUBLIC_IMAGE_BASE =
  "https://images.mkbweddings.co.uk";

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normaliseMatch(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function parseCsv(text) {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;

  const input = String(text || "").replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];

    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      record.push(field);
      field = "";
    } else if (
      (character === "\n" || character === "\r") &&
      !quoted
    ) {
      if (character === "\r" && next === "\n") {
        index += 1;
      }

      record.push(field);
      field = "";

      if (record.some((value) => String(value).trim())) {
        records.push(record);
      }

      record = [];
    } else {
      field += character;
    }
  }

  if (field || record.length) {
    record.push(field);
    if (record.some((value) => String(value).trim())) {
      records.push(record);
    }
  }

  if (records.length < 2) return [];

  const headers = records[0].map((header) =>
    String(header || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ""),
  );

  return records.slice(1).map((values, index) => ({
    csvRow: index + 2,
    ...Object.fromEntries(
      headers.map((header, columnIndex) => [
        header,
        String(values[columnIndex] || "").trim(),
      ]),
    ),
  }));
}

function splitTags(value) {
  return [
    ...new Set(
      String(value || "")
        .split(/[,;|]/)
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

function normaliseFilename(value) {
  return String(value || "")
    .trim()
    .replace(/%20/g, " ")
    .replace(/_2000(\.[a-z0-9]+)$/i, "_500$1")
    .toLowerCase();
}

function createAiLookupKey({
  venue,
  category,
  filename,
}) {
  return [
    normaliseMatch(venue),
    normaliseMatch(category),
    normaliseFilename(filename),
  ].join("::");
}

function mergeUnique(...groups) {
  return [
    ...new Set(
      groups
        .flat()
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  ];
}

function encodeSegment(value) {
  return encodeURIComponent(String(value || ""));
}

function createAssetId({ venue, category, filename }) {
  const digest = crypto
    .createHash("sha256")
    .update(`${venue}\u0000${category}\u0000${filename}`)
    .digest("hex")
    .slice(0, 24);

  return `legacy_${digest}`;
}

function buildUrls({ baseUrl, venue, category, filename }) {
  const base = String(baseUrl || DEFAULT_PUBLIC_IMAGE_BASE)
    .replace(/\/+$/, "");

  const fullFilename = filename.replace(
    /_500\.webp$/i,
    "_2000.webp",
  );

  return {
    thumbSrc:
      `${base}/thumb/${encodeSegment(venue)}/` +
      `${encodeSegment(category)}/${encodeSegment(filename)}`,
    fullSrc:
      `${base}/full/${encodeSegment(venue)}/` +
      `${encodeSegment(category)}/${encodeSegment(fullFilename)}`,
  };
}

export function createGalleryMigrationEndpoint({
  projectRoot,
  galleryCsvPath,
  galleryAiCsvPath,
  venuesRoot,
  backupDir,
  publicImageBaseUrl = DEFAULT_PUBLIC_IMAGE_BASE,
}) {
  async function readVenueRecords() {
    await fs.mkdir(venuesRoot, { recursive: true });

    const entries = await fs.readdir(venuesRoot, {
      withFileTypes: true,
    });

    const venues = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const venuePath = path.join(
        venuesRoot,
        entry.name,
        "venue.json",
      );

      try {
        const venue = JSON.parse(
          await fs.readFile(venuePath, "utf8"),
        );

        venues.push({
          venue,
          venuePath,
        });
      } catch (error) {
        console.error(
          `Unable to read venue for gallery migration: ${entry.name}`,
          error,
        );
      }
    }

    return venues;
  }

  async function readSourceRows() {
    let csvText;

    try {
      csvText = await fs.readFile(galleryCsvPath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") {
        const missing = new Error(
          "public/gallery.csv was not found.",
        );
        missing.statusCode = 404;
        throw missing;
      }

      throw error;
    }

    let aiRows = [];

    if (galleryAiCsvPath) {
      try {
        aiRows = parseCsv(
          await fs.readFile(
            galleryAiCsvPath,
            "utf8",
          ),
        );
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }

    const aiByPath = new Map();
    const aiByFilenameCandidates = new Map();

    aiRows.forEach((row) => {
      const ai = {
        imageId: String(row.imageid || "").trim(),
        venue: String(row.venue || "").trim(),
        category: String(
          row.category || row.moment || "",
        ).trim(),
        filename: String(row.filename || "").trim(),
        aiTags: splitTags(row.aitags),
        aiAlt: String(row.aialt || "").trim(),
        aiCaption: String(
          row.aicaption || "",
        ).trim(),
        aiRating: Math.max(
          0,
          Math.min(
            5,
            Number(row.airating || 0) || 0,
          ),
        ),
      };

      if (!ai.filename) return;

      aiByPath.set(createAiLookupKey(ai), ai);

      const filenameKey =
        normaliseFilename(ai.filename);
      const candidates =
        aiByFilenameCandidates.get(filenameKey) || [];
      candidates.push(ai);
      aiByFilenameCandidates.set(
        filenameKey,
        candidates,
      );
    });

    const parsed = parseCsv(csvText);

    return parsed
      .map((row) => {
        const source = {
          csvRow: Number(row.csvRow || 0),
          venue: String(
            row.venue || row.venuename || "",
          ).trim(),
          category: String(
            row.category || row.moment || "",
          ).trim(),
          filename: String(
            row.filename || row.file || "",
          ).trim(),
          tags: splitTags(row.tags),
        };

        const exact = aiByPath.get(
          createAiLookupKey(source),
        );

        const filenameCandidates =
          aiByFilenameCandidates.get(
            normaliseFilename(source.filename),
          ) || [];

        const ai =
          exact ||
          (filenameCandidates.length === 1
            ? filenameCandidates[0]
            : null);

        return {
          ...source,
          imageId: ai?.imageId || "",
          aiTags: ai?.aiTags || [],
          aiAlt: ai?.aiAlt || "",
          aiCaption: ai?.aiCaption || "",
          aiRating: ai?.aiRating || 0,
          aiMatched: Boolean(ai),
        };
      })
      .filter(
        (row) =>
          row.venue && row.category && row.filename,
      );
  }

  function matchVenue(sourceVenue, venueRecords) {
    const sourceKey = normaliseMatch(sourceVenue);
    const sourceSlug = slugify(sourceVenue);

    return (
      venueRecords.find(({ venue }) =>
        [
          venue.name,
          venue.slug,
        ].some(
          (value) =>
            normaliseMatch(value) === sourceKey,
        ),
      ) ||
      venueRecords.find(
        ({ venue }) => venue.slug === sourceSlug,
      ) ||
      null
    );
  }

  function buildPlan(sourceRows, venueRecords) {
    const groups = new Map();

    sourceRows.forEach((row) => {
      const key = normaliseMatch(row.venue);
      const current = groups.get(key) || {
        sourceVenue: row.venue,
        rows: [],
      };

      current.rows.push(row);
      groups.set(key, current);
    });

    const venuePlans = [];
    const unmatchedVenues = [];

    for (const group of groups.values()) {
      const match = matchVenue(
        group.sourceVenue,
        venueRecords,
      );

      if (!match) {
        unmatchedVenues.push({
          sourceVenue: group.sourceVenue,
          imageCount: group.rows.length,
          categories: [
            ...new Set(
              group.rows.map((row) => row.category),
            ),
          ].sort(),
        });
        continue;
      }

      const existingImages = Array.isArray(
        match.venue?.gallery?.images,
      )
        ? match.venue.gallery.images
        : [];

      const existingIds = new Set(
        existingImages.map((item) => item.assetId),
      );

      const imported = group.rows.map((row, index) => {
        const assetId = createAssetId(row);
        const urls = buildUrls({
          baseUrl: publicImageBaseUrl,
          ...row,
        });

        return {
          assetId,
          imageId: row.imageId || assetId,
          weddingSlug: "",
          filename: row.filename,
          order: index + 1,
          included: true,
          hidden: false,
          rating: row.aiRating || 0,
          moments: [slugify(row.category)].filter(Boolean),
          tags: mergeUnique(
            row.tags,
            row.aiTags,
          ),
          aiTags: row.aiTags,
          aiAlt: row.aiAlt,
          aiCaption: row.aiCaption,
          display: {
            venue: true,
            moments: true,
            blog: false,
            homepage: false,
            portfolio: false,
          },
          thumbSrc: urls.thumbSrc,
          fullSrc: urls.fullSrc,
          source: {
            type: SOURCE_TYPE,
            csvRow: row.csvRow,
            venue: row.venue,
            category: row.category,
          },
        };
      });

      venuePlans.push({
        sourceVenue: group.sourceVenue,
        venueSlug: match.venue.slug,
        venueName: match.venue.name,
        venuePath: match.venuePath,
        imageCount: imported.length,
        existingImportedCount: imported.filter(
          (item) => existingIds.has(item.assetId),
        ).length,
        readyCount: imported.filter(
          (item) => !existingIds.has(item.assetId),
        ).length,
        categories: [
          ...new Set(
            group.rows.map((row) => row.category),
          ),
        ].sort(),
        tags: [
          ...new Set(
            group.rows.flatMap((row) => row.tags),
          ),
        ].sort(),
        imported,
        venue: match.venue,
      });
    }

    return {
      venuePlans: venuePlans.sort((a, b) =>
        a.venueName.localeCompare(b.venueName),
      ),
      unmatchedVenues: unmatchedVenues.sort((a, b) =>
        a.sourceVenue.localeCompare(b.sourceVenue),
      ),
    };
  }

  async function createBackup(sourcePath, prefix) {
    await fs.mkdir(backupDir, { recursive: true });

    try {
      const existing = await fs.readFile(
        sourcePath,
        "utf8",
      );
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");
      const backupPath = path.join(
        backupDir,
        `${prefix}-${timestamp}.json`,
      );

      await fs.writeFile(
        backupPath,
        existing,
        "utf8",
      );

      return path.relative(projectRoot, backupPath);
    } catch {
      return null;
    }
  }

  async function preview() {
    const [sourceRows, venueRecords] = await Promise.all([
      readSourceRows(),
      readVenueRecords(),
    ]);

    const plan = buildPlan(sourceRows, venueRecords);

    const categoryCounts = new Map();
    const tagCounts = new Map();

    sourceRows.forEach((row) => {
      categoryCounts.set(
        row.category,
        (categoryCounts.get(row.category) || 0) + 1,
      );

      row.tags.forEach((tag) => {
        tagCounts.set(
          tag,
          (tagCounts.get(tag) || 0) + 1,
        );
      });
    });

    return {
      source: path.relative(projectRoot, galleryCsvPath),
      aiSource: galleryAiCsvPath
        ? path.relative(
            projectRoot,
            galleryAiCsvPath,
          )
        : "",
      imageBaseUrl: publicImageBaseUrl,
      totalRows: sourceRows.length,
      aiMatchedRows: sourceRows.filter(
        (row) => row.aiMatched,
      ).length,
      aiAltRows: sourceRows.filter(
        (row) => row.aiAlt,
      ).length,
      aiCaptionRows: sourceRows.filter(
        (row) => row.aiCaption,
      ).length,
      totalSourceVenues: new Set(
        sourceRows.map((row) => normaliseMatch(row.venue)),
      ).size,
      matchedVenues: plan.venuePlans.length,
      unmatchedVenueCount: plan.unmatchedVenues.length,
      readyRows: plan.venuePlans.reduce(
        (sum, venue) => sum + venue.readyCount,
        0,
      ),
      alreadyImportedRows: plan.venuePlans.reduce(
        (sum, venue) =>
          sum + venue.existingImportedCount,
        0,
      ),
      categories: [...categoryCounts.entries()]
        .map(([name, count]) => ({
          name,
          slug: slugify(name),
          count,
        }))
        .sort((a, b) => b.count - a.count),
      tags: [...tagCounts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      venues: plan.venuePlans.map(
        ({ imported, venue, venuePath, ...summary }) =>
          summary,
      ),
      unmatchedVenues: plan.unmatchedVenues,
    };
  }

  async function migrate({ mode = "refresh" } = {}) {
    if (!["refresh", "merge"].includes(mode)) {
      const error = new Error(
        "Migration mode must be refresh or merge.",
      );
      error.statusCode = 400;
      throw error;
    }

    const [sourceRows, venueRecords] = await Promise.all([
      readSourceRows(),
      readVenueRecords(),
    ]);

    const plan = buildPlan(sourceRows, venueRecords);
    const backups = [];
    let importedImages = 0;
    let skippedImages = 0;
    let updatedVenues = 0;

    for (const venuePlan of plan.venuePlans) {
      const venue = venuePlan.venue;
      const currentImages = Array.isArray(
        venue?.gallery?.images,
      )
        ? venue.gallery.images
        : [];

      let combined;

      if (mode === "refresh") {
        const retained = currentImages.filter(
          (item) =>
            item?.source?.type !== SOURCE_TYPE,
        );

        combined = [
          ...venuePlan.imported,
          ...retained,
        ];
        importedImages += venuePlan.imported.length;
      } else {
        const existingIds = new Set(
          currentImages.map((item) => item.assetId),
        );
        const missing = venuePlan.imported.filter(
          (item) => !existingIds.has(item.assetId),
        );

        combined = [...currentImages, ...missing];
        importedImages += missing.length;
        skippedImages +=
          venuePlan.imported.length - missing.length;
      }

      combined = combined.map((item, index) => ({
        ...item,
        order: index + 1,
      }));

      const currentHero = String(
        venue?.gallery?.heroAssetId ||
          venue?.heroImageId ||
          "",
      );
      const combinedIds = new Set(
        combined.map((item) => item.assetId),
      );
      const heroAssetId = combinedIds.has(currentHero)
        ? currentHero
        : venuePlan.imported[0]?.assetId || "";

      const nextVenue = {
        ...venue,
        heroImageId: heroAssetId,
        gallery: {
          schemaVersion: 1,
          updatedAt: new Date().toISOString(),
          heroAssetId,
          images: combined,
        },
        updatedAt: new Date().toISOString(),
      };

      const backupPath = await createBackup(
        venuePlan.venuePath,
        `${venue.slug}-gallery-migration`,
      );

      if (backupPath) backups.push(backupPath);

      await fs.writeFile(
        venuePlan.venuePath,
        `${JSON.stringify(nextVenue, null, 2)}\n`,
        "utf8",
      );

      updatedVenues += 1;
    }

    return {
      mode,
      updatedVenues,
      importedImages,
      skippedImages,
      unmatchedVenues: plan.unmatchedVenues,
      backups,
    };
  }

  return {
    preview,
    migrate,
  };
}
