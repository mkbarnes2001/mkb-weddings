import "dotenv/config";
import fs from "node:fs";
import { readCsv, writeCsv, backupFile } from "./lib/csv.mjs";

const {
  GALLERY_CSV = "public/gallery.csv",
  GALLERY_AI_CSV = "public/gallery-ai.csv",
  IMAGE_ID_PREFIX = "MKB",
} = process.env;

const APPLY = process.argv.includes("--apply");

const GALLERY_REQUIRED = ["imageId", "venue", "category", "filename"];
const AI_COLUMNS = [
  "imageId",
  "venue",
  "category",
  "filename",
  "aiTags",
  "aiAlt",
  "aiCaption",
  "aiRating",
  "aiEmotion",
  "aiStoryMoment",
  "aiLighting",
  "aiWeather",
  "aiColours",
  "aiPeople",
  "aiReviewed",
  "aiModel",
  "aiUpdatedAt",
];

function pad(num) {
  return String(num).padStart(6, "0");
}

function existingImageIds(rows) {
  return new Set(rows.map((row) => row.imageId).filter(Boolean));
}

function nextImageId(used, counter) {
  let id;
  do {
    id = `${IMAGE_ID_PREFIX}${pad(counter.value)}`;
    counter.value += 1;
  } while (used.has(id));
  used.add(id);
  return id;
}

function main() {
  const { rows: galleryRows, columns: galleryColumnsRaw } = readCsv(GALLERY_CSV, GALLERY_REQUIRED);
  const galleryColumns = [...galleryColumnsRaw];
  if (!galleryColumns.includes("imageId")) galleryColumns.unshift("imageId");

  const { rows: aiRows, columns: aiColumnsRaw } = readCsv(GALLERY_AI_CSV, AI_COLUMNS);
  const aiColumns = Array.from(new Set([...AI_COLUMNS, ...aiColumnsRaw]));

  const usedIds = existingImageIds(galleryRows);
  const counter = { value: usedIds.size + 1 };
  let assignedIds = 0;

  for (const row of galleryRows) {
    if (!row.imageId) {
      row.imageId = nextImageId(usedIds, counter);
      assignedIds += 1;
    }
  }

  const aiByImageId = new Map(aiRows.filter((row) => row.imageId).map((row) => [row.imageId, row]));
  let aiAdded = 0;
  let aiUpdated = 0;

  for (const row of galleryRows) {
    let ai = aiByImageId.get(row.imageId);

    if (!ai) {
      ai = {};
      for (const column of aiColumns) ai[column] = "";
      ai.imageId = row.imageId;
      ai.venue = row.venue || "";
      ai.category = row.category || "";
      ai.filename = row.filename || "";
      if (row.aiTags) ai.aiTags = row.aiTags;
      aiByImageId.set(row.imageId, ai);
      aiRows.push(ai);
      aiAdded += 1;
      continue;
    }

    let changed = false;
    for (const [field, value] of [
      ["venue", row.venue || ""],
      ["category", row.category || ""],
      ["filename", row.filename || ""],
    ]) {
      if (ai[field] !== value) {
        ai[field] = value;
        changed = true;
      }
    }

    if (!ai.aiTags && row.aiTags) {
      ai.aiTags = row.aiTags;
      changed = true;
    }

    if (changed) aiUpdated += 1;
  }

  console.log("MKB Intelligence V2 migration");
  console.log(`Gallery rows: ${galleryRows.length}`);
  console.log(`New imageId values to assign: ${assignedIds}`);
  console.log(`AI rows to add: ${aiAdded}`);
  console.log(`AI rows to update: ${aiUpdated}`);

  if (!APPLY) {
    console.log("Dry run only. Nothing changed.");
    console.log("Run: node scripts/ai/migrate-gallery-ai-v2.mjs --apply");
    return;
  }

  const galleryBackup = backupFile(GALLERY_CSV, "backup-before-imageid");
  if (galleryBackup) console.log(`Backup created: ${galleryBackup}`);

  if (fs.existsSync(GALLERY_AI_CSV)) {
    const aiBackup = backupFile(GALLERY_AI_CSV, "backup-before-ai-v2-migration");
    if (aiBackup) console.log(`Backup created: ${aiBackup}`);
  }

  writeCsv(GALLERY_CSV, galleryRows, galleryColumns);
  writeCsv(GALLERY_AI_CSV, aiRows, aiColumns);

  console.log("Migration complete.");
  console.log(`Updated: ${GALLERY_CSV}`);
  console.log(`Updated: ${GALLERY_AI_CSV}`);
}

main();
