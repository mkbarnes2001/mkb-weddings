import "dotenv/config";
import fs from "node:fs";
import { readCsv, writeCsv, backupFile } from "./lib/csv.mjs";

const {
  BLOG_GALLERY_CSV = "public/blog-gallery.csv",
  GALLERY_AI_CSV = "public/gallery-ai.csv",
  WEDDING_STORIES_TS = "src/data/weddingStories.ts",
} = process.env;

const APPLY = process.argv.includes("--apply");

const AI_COLUMNS = [
  "source",
  "imageId",
  "blogSlug",
  "blogOrder",
  "blogCover",
  "blogTitle",
  "blogCouple",
  "blogVenue",
  "blogWeddingDate",
  "blogExcerpt",
  "venue",
  "category",
  "filename",
  "aiTags",
  "aiAlt",
  "aiCaption",
  "aiReviewed",
  "aiTextReviewed",
  "aiModel",
  "aiUpdatedAt",
];

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normaliseFilename(filename) {
  return String(filename || "")
    .trim()
    .replace(/_2000(\.[a-z0-9]+)$/i, "_500$1")
    .replace(/%20/g, " ");
}

function get(row, names) {
  for (const name of names) {
    const value = row[name];
    if (value !== undefined && String(value).trim()) return String(value).trim();
  }
  return "";
}

function extractStringField(block, fieldName) {
  const re = new RegExp(`${fieldName}\\s*:\\s*(["'\`])([\\s\\S]*?)\\1`, "m");
  const match = block.match(re);
  return match?.[2]?.replace(/\s+/g, " ").trim() || "";
}

function loadWeddingStories(file) {
  const map = new Map();

  if (!fs.existsSync(file)) {
    console.warn(`Wedding stories file not found: ${file}`);
    return map;
  }

  const text = fs.readFileSync(file, "utf8");

  const objectRegex = /\{\s*slug\s*:\s*["'`]([^"'`]+)["'`][\s\S]*?\n\s*\}/g;
  let match;

  while ((match = objectRegex.exec(text)) !== null) {
    const block = match[0];
    const slug = match[1]?.trim();
    if (!slug) continue;

    map.set(slug, {
      slug,
      title: extractStringField(block, "title"),
      couple: extractStringField(block, "couple"),
      venue: extractStringField(block, "venue"),
      weddingDate: extractStringField(block, "weddingDate"),
      excerpt: extractStringField(block, "excerpt"),
    });
  }

  return map;
}

function makeBlogImageId(blogSlug, index) {
  const safeSlug = slugify(blogSlug || "blog");
  const safeIndex = String(index + 1).padStart(4, "0");
  return `BLOG-${safeSlug}-${safeIndex}`;
}

function main() {
  if (!fs.existsSync(BLOG_GALLERY_CSV)) {
    console.error(`Missing ${BLOG_GALLERY_CSV}`);
    process.exit(1);
  }

  const storyMap = loadWeddingStories(WEDDING_STORIES_TS);

  const { rows: blogRowsRaw } = readCsv(BLOG_GALLERY_CSV, []);
  const { rows: aiRows, columns: existingAiColumns } = readCsv(GALLERY_AI_CSV, AI_COLUMNS);
  const aiColumns = Array.from(new Set([...AI_COLUMNS, ...existingAiColumns]));

  const aiById = new Map(aiRows.filter((row) => row.imageId).map((row) => [row.imageId, row]));
  const galleryAiByFilename = new Map();

  for (const row of aiRows) {
    const filename = normaliseFilename(row.filename);
    if (!filename) continue;

    const source = String(row.source || "gallery").trim().toLowerCase();
    if (source && source !== "gallery") continue;

    if (!galleryAiByFilename.has(filename)) galleryAiByFilename.set(filename, row);
  }

  let rowsToAdd = 0;
  let rowsToUpdate = 0;
  let copiedFromGallery = 0;
  let enrichedFromStory = 0;
  let missingFilename = 0;

  blogRowsRaw.forEach((row, index) => {
    const blogSlug = get(row, ["blogSlug", "blogslug", "slug", "storySlug", "storyslug"]);
    const filenameRaw = get(row, ["filename", "file", "image", "imageFilename", "imagefilename"]);
    const filename = normaliseFilename(filenameRaw);

    if (!filename) {
      missingFilename += 1;
      return;
    }

    const story = storyMap.get(blogSlug) || {};
    const blogOrder = get(row, ["blogOrder", "blogorder", "order", "sortOrder", "sortorder"]);
    const blogCover = get(row, ["blogCover", "blogcover", "cover"]);
    const imageId = get(row, ["imageId", "imageid"]) || makeBlogImageId(blogSlug, index);

    let aiRow = aiById.get(imageId);

    if (!aiRow) {
      aiRow = {};
      for (const column of aiColumns) aiRow[column] = "";
      aiRow.imageId = imageId;
      aiRows.push(aiRow);
      aiById.set(imageId, aiRow);
      rowsToAdd += 1;
    } else {
      rowsToUpdate += 1;
    }

    aiRow.source = "blog";
    aiRow.blogSlug = blogSlug || aiRow.blogSlug || "";
    aiRow.blogOrder = blogOrder || aiRow.blogOrder || "";
    aiRow.blogCover = blogCover || aiRow.blogCover || "";
    aiRow.filename = filename || aiRow.filename || "";
    aiRow.category = "blog";

    if (story.slug) {
      aiRow.blogTitle = story.title || aiRow.blogTitle || "";
      aiRow.blogCouple = story.couple || aiRow.blogCouple || "";
      aiRow.blogVenue = story.venue || aiRow.blogVenue || "";
      aiRow.blogWeddingDate = story.weddingDate || aiRow.blogWeddingDate || "";
      aiRow.blogExcerpt = story.excerpt || aiRow.blogExcerpt || "";
      aiRow.venue = story.venue || aiRow.venue || "";
      enrichedFromStory += 1;
    }

    const existing = galleryAiByFilename.get(filename);
    if (existing) {
      if (!aiRow.aiTags && existing.aiTags) aiRow.aiTags = existing.aiTags;
      if (!aiRow.aiAlt && existing.aiAlt) aiRow.aiAlt = existing.aiAlt;
      if (!aiRow.aiCaption && existing.aiCaption) aiRow.aiCaption = existing.aiCaption;
      if (!aiRow.aiModel && existing.aiModel) aiRow.aiModel = existing.aiModel;
      if (!aiRow.aiUpdatedAt && existing.aiUpdatedAt) aiRow.aiUpdatedAt = existing.aiUpdatedAt;
      copiedFromGallery += 1;
    }
  });

  console.log("MKB Blog AI Migration with Story Context");
  console.log(`Blog rows found: ${blogRowsRaw.length}`);
  console.log(`Wedding stories found: ${storyMap.size}`);
  console.log(`Rows to add: ${rowsToAdd}`);
  console.log(`Rows to update: ${rowsToUpdate}`);
  console.log(`Rows enriched from weddingStories.ts: ${enrichedFromStory}`);
  console.log(`Copied existing AI metadata from main-gallery filename match: ${copiedFromGallery}`);
  console.log(`Rows skipped due to missing filename: ${missingFilename}`);

  if (!APPLY) {
    console.log("Dry run only. Nothing changed.");
    console.log("Run: node scripts/ai/migrate-blog-ai.mjs --apply");
    return;
  }

  const backup = backupFile(GALLERY_AI_CSV, "backup-before-blog-ai-context-migration");
  if (backup) console.log(`Backup created: ${backup}`);

  writeCsv(GALLERY_AI_CSV, aiRows, aiColumns);
  console.log(`Migration complete. Updated ${GALLERY_AI_CSV}`);
}

main();