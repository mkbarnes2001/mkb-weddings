import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { readCsv, writeCsv, backupFile } from "./lib/csv.mjs";
import { responsesRequest, extractOutputText, parseJsonOutput, sleep } from "./lib/openai.mjs";

const {
  OPENAI_API_KEY,
  OPENAI_MODEL = "gpt-5.5",
  OPENAI_REQUEST_DELAY_MS = "22000",
  GALLERY_AI_CSV = "public/gallery-ai.csv",

  // Set this in .env if your blog thumbs live somewhere else.
  // Expected structure:
  // BLOG_THUMB_ROOT / blogSlug / filename_500.webp
  BLOG_THUMB_ROOT = "public/blog/thumb",
} = process.env;

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const STATUS = process.argv.includes("--status");

const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : 25;

const BLOG_ARG = process.argv.find((arg) => arg.startsWith("--blog="));
const BLOG_FILTER = BLOG_ARG ? BLOG_ARG.split("=")[1].trim().toLowerCase() : "";

const DELAY_MS = Number(OPENAI_REQUEST_DELAY_MS || 22000);

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

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in .env");
  process.exit(1);
}

function normalise(value) {
  return String(value || "").trim().toLowerCase();
}

function normaliseFilename(filename) {
  return String(filename || "")
    .trim()
    .replace(/_2000(\.[a-z0-9]+)$/i, "_500$1");
}

function blogThumbPath(row) {
  const blogSlug = row.blogSlug || "";
  const filename = normaliseFilename(row.filename || "");

  const root = path.isAbsolute(BLOG_THUMB_ROOT)
    ? BLOG_THUMB_ROOT
    : path.join(process.cwd(), BLOG_THUMB_ROOT);

  return path.join(root, blogSlug, filename);
}

function mimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".webp") return "image/webp";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "image/jpeg";
}

function imageToDataUrl(file) {
  const buffer = fs.readFileSync(file);
  return `data:${mimeType(file)};base64,${buffer.toString("base64")}`;
}

function cleanTags(tags, max = 16) {
  const arr = Array.isArray(tags) ? tags : String(tags || "").split(/[|,]/g);

  return Array.from(
    new Set(
      arr
        .map((tag) => String(tag).trim().toLowerCase())
        .filter(Boolean)
        .filter((tag) => tag.length <= 50),
    ),
  ).slice(0, max);
}

function mergeTags(existing, generated, max = 20) {
  return cleanTags([...cleanTags(existing, max), ...cleanTags(generated, max)], max).join("|");
}

function needsVisualTags(row) {
  if (normalise(row.source) !== "blog") return false;
  if (BLOG_FILTER && normalise(row.blogSlug) !== BLOG_FILTER) return false;
  if (FORCE) return true;
  return !(row.aiTags || "").trim();
}

function getStatus(aiRows) {
  const blogRows = aiRows.filter((row) => {
    if (normalise(row.source) !== "blog") return false;
    if (BLOG_FILTER && normalise(row.blogSlug) !== BLOG_FILTER) return false;
    return true;
  });

  const withTags = blogRows.filter((row) => (row.aiTags || "").trim()).length;
  const missingTags = blogRows.length - withTags;

  return {
    total: blogRows.length,
    withTags,
    missingTags,
    completion: blogRows.length ? ((withTags / blogRows.length) * 100).toFixed(1) : "0.0",
  };
}

function printStatus(status) {
  console.log("\nBlog Visual Tag Status");
  console.log("----------------------");
  console.log(`Total blog rows:      ${status.total}`);
  console.log(`Rows with aiTags:     ${status.withTags}`);
  console.log(`Rows missing aiTags:  ${status.missingTags}`);
  console.log(`Completion:           ${status.completion}%`);
}

function buildPrompt(row) {
  return [
    "You are visually tagging wedding photography images for MKB Weddings.",
    "Return ONLY valid JSON in this exact shape:",
    '{"tags":["tag1","tag2"]}',
    "",
    "Rules:",
    "- Use short, useful visual tags for search, blog captions and SEO.",
    "- Max 16 tags.",
    "- Focus on what is visible in the image: people, moment, mood, lighting, weather, location clues, details and action.",
    "- Do not identify real people.",
    "- Do not use personal names from the couple field.",
    "- Do not guess sensitive attributes.",
    "- Do not guess the venue unless it is known from context.",
    "- Good examples: bride, groom, bridesmaids, groomsmen, ceremony, confetti, speeches, first dance, dancefloor, bouquet, rings, cake, black and white, golden hour, night portrait, off camera flash, rain, rainbow, dog, emotional hug, laughter.",
    "",
    "Known blog context:",
    `blogSlug=${row.blogSlug || ""}`,
    `blogTitle=${row.blogTitle || ""}`,
    `blogVenue=${row.blogVenue || row.venue || ""}`,
    `blogWeddingDate=${row.blogWeddingDate || ""}`,
    `blogExcerpt=${row.blogExcerpt || ""}`,
    `filename=${row.filename || ""}`,
  ].join("\n");
}

async function tagImage(row, file) {
  const dataUrl = imageToDataUrl(file);

  const input = [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: buildPrompt(row),
        },
        {
          type: "input_image",
          image_url: dataUrl,
          detail: "low",
        },
      ],
    },
  ];

  const json = await responsesRequest({
    apiKey: OPENAI_API_KEY,
    model: OPENAI_MODEL,
    input,
  });

  const text = extractOutputText(json);
  const parsed = parseJsonOutput(text);

  return cleanTags(parsed.tags || [], 16);
}

async function tagWithRetry(row, file) {
  const maxAttempts = 6;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await tagImage(row, file);
    } catch (err) {
      const retryable = err.status === 429 || err.status >= 500;
      if (!retryable) throw err;

      const waitMs = err.retryAfter || Math.min(90000, DELAY_MS * attempt);
      console.warn(
        `Rate limited/server busy. Waiting ${Math.round(waitMs / 1000)}s before retry ${attempt}/${maxAttempts}...`,
      );

      await sleep(waitMs);
    }
  }

  throw new Error("Failed after repeated retries");
}

async function main() {
  const { rows: aiRows, columns: existingColumns } = readCsv(GALLERY_AI_CSV, AI_COLUMNS);
  const aiColumns = Array.from(new Set([...AI_COLUMNS, ...existingColumns]));

  const status = getStatus(aiRows);

  if (STATUS) {
    printStatus(status);
    console.log(`Blog thumb root: ${BLOG_THUMB_ROOT}`);
    return;
  }

  const candidates = aiRows.filter(needsVisualTags);
  const runItems = candidates.slice(0, LIMIT);

  console.log("MKB Blog Visual Tagger");
  console.log(`Blog thumb root: ${BLOG_THUMB_ROOT}`);
  console.log(`Blog filter: ${BLOG_FILTER || "none"}`);
  console.log(`Rows needing visual tags: ${candidates.length}`);
  console.log(`This run limit: ${runItems.length}`);
  console.log(`Model: ${OPENAI_MODEL}`);
  console.log(`Delay between requests: ${DELAY_MS}ms`);

  if (!APPLY) {
    console.log("Dry run only. Nothing changed.");
    console.log("Run: node scripts/ai/tag-blog-images.mjs --apply --limit=25");
    return;
  }

  const backup = backupFile(GALLERY_AI_CSV, "backup-before-blog-visual-tags");
  if (backup) console.log(`Backup created: ${backup}`);

  let complete = 0;
  let missingFiles = 0;

  for (const row of runItems) {
    const file = blogThumbPath(row);

    if (!fs.existsSync(file)) {
      missingFiles += 1;
      console.warn(`Skipping missing blog thumb: ${file}`);
      continue;
    }

    try {
      console.log(`\nTagging: ${row.blogSlug} / ${row.filename}`);
      const tags = await tagWithRetry(row, file);

      row.aiTags = mergeTags(row.aiTags || "", tags, 20);
      row.aiModel = OPENAI_MODEL;
      row.aiUpdatedAt = new Date().toISOString();

      complete += 1;

      console.log(`Tags: ${row.aiTags}`);
      console.log(`Progress: ${complete}/${runItems.length}`);

      writeCsv(GALLERY_AI_CSV, aiRows, aiColumns);
      await sleep(DELAY_MS);
    } catch (err) {
      console.error(`Failed: ${row.filename}`);
      console.error(err.message);
      writeCsv(GALLERY_AI_CSV, aiRows, aiColumns);
    }
  }

  writeCsv(GALLERY_AI_CSV, aiRows, aiColumns);

  printStatus(getStatus(aiRows));

  if (missingFiles > 0) {
    console.log(`\nMissing local blog thumb files: ${missingFiles}`);
    console.log("Check BLOG_THUMB_ROOT in .env if that number seems wrong.");
  }

  console.log("\nBlog visual tagging complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});