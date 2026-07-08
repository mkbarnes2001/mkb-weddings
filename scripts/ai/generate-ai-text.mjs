import "dotenv/config";
import { readCsv, writeCsv, backupFile } from "./lib/csv.mjs";
import { loadCountyContext, getContextForRow } from "./lib/county-context.mjs";
import { responsesRequest, extractOutputText, parseJsonOutput, sleep } from "./lib/openai.mjs";

const {
  OPENAI_API_KEY,
  OPENAI_MODEL = "gpt-5.5",
  OPENAI_REQUEST_DELAY_MS = "22000",
  GALLERY_CSV = "public/gallery.csv",
  GALLERY_AI_CSV = "public/gallery-ai.csv",
  COUNTY_META_JSON = "public/county-meta.json",
} = process.env;

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const STATUS = process.argv.includes("--status");

const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : 25;

const SOURCE_ARG = process.argv.find((arg) => arg.startsWith("--source="));
const SOURCE_FILTER = SOURCE_ARG ? SOURCE_ARG.split("=")[1].trim().toLowerCase() : "";

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

function cleanSentence(value, maxLength = 260) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function needsText(aiRow) {
  if (FORCE) return true;

  if ((aiRow.aiTextReviewed || "").trim().toLowerCase() === "true") {
    return false;
  }

  return !(
    (aiRow.aiAlt || "").trim() &&
    (aiRow.aiCaption || "").trim()
  );
}

function passesFilters(aiRow) {
  const source = normalise(aiRow.source || "gallery");
  if (SOURCE_FILTER && source !== SOURCE_FILTER) return false;
  if (BLOG_FILTER && normalise(aiRow.blogSlug) !== BLOG_FILTER) return false;
  return true;
}

function ensureAiRow(row, aiById, aiRows, aiColumns) {
  let ai = aiById.get(row.imageId);

  if (!ai) {
    ai = {};
    for (const column of aiColumns) ai[column] = "";
    ai.imageId = row.imageId || "";
    aiById.set(row.imageId, ai);
    aiRows.push(ai);
  }

  ai.source = ai.source || "gallery";
  ai.venue = row.venue || ai.venue || "";
  ai.category = row.category || ai.category || "";
  ai.filename = row.filename || ai.filename || "";

  if (!ai.aiTags && row.aiTags) ai.aiTags = row.aiTags;

  return ai;
}

function buildPrompt(row, aiRow, context) {
  const source = normalise(aiRow.source || "gallery");
  const isBlog = source === "blog";

  return [
    "You are writing SEO-friendly image alt text and short captions for MKB Weddings, a Northern Ireland wedding photographer.",
    "Use the supplied source, venue, category, county, town, blog story context and AI tags. Do not invent details that are not supported.",
    "Return ONLY valid JSON in this exact shape:",
    '{"alt":"alt text here","caption":"caption here"}',
    "",
    "Rules:",
    "- Alt text must be natural, specific and under 160 characters.",
    "- Caption should be one natural sentence, under 240 characters.",
    "- Write in the MKB Weddings style: relaxed, documentary, warm, modern and natural.",
    "- Avoid repeating the same phrase across a gallery.",
    "- Avoid generic phrases like 'documentary wedding moment' unless there is no better supported detail.",
    "- Avoid cheesy words like magical, fairytale, perfect, breathtaking, unforgettable unless genuinely justified.",
    "- Focus on real moments, emotion, light, setting and atmosphere.",
    "- Do not identify real people.",
    "- Do not use personal names from the couple field.",
    "- Do not mention filename.",
    "- Do not keyword stuff.",
    "- Include venue, town or county only when it reads naturally.",
    "- Keep it polished but not over-written.",
    isBlog
      ? "- This image is part of a wedding story/blog gallery. Use the blog title, venue, date, excerpt and order to make the caption feel connected to the story."
      : "- This image is part of the main website gallery.",
    "",
    "Known context:",
    `source=${aiRow.source || "gallery"}`,
    `blogSlug=${aiRow.blogSlug || ""}`,
    `blogOrder=${aiRow.blogOrder || ""}`,
    `blogCover=${aiRow.blogCover || ""}`,
    `blogTitle=${aiRow.blogTitle || ""}`,
    `blogCouple=${aiRow.blogCouple || ""}`,
    `blogVenue=${aiRow.blogVenue || ""}`,
    `blogWeddingDate=${aiRow.blogWeddingDate || ""}`,
    `blogExcerpt=${aiRow.blogExcerpt || ""}`,
    `venue=${row.venue || aiRow.venue || ""}`,
    `category=${row.category || aiRow.category || ""}`,
    `filename=${row.filename || aiRow.filename || ""}`,
    `aiTags=${aiRow.aiTags || ""}`,
    `town=${context.town || ""}`,
    `county=${context.county || ""}`,
    `country=${context.country || ""}`,
    `primaryKeyword=${context.primaryKeyword || ""}`,
  ].join("\n");
}

async function generateText({ row, aiRow, context }) {
  const input = [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: buildPrompt(row, aiRow, context),
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
  return parseJsonOutput(text);
}

function getTextStatus(aiRows) {
  const filteredRows = aiRows.filter(passesFilters);

  let complete = 0;
  let missingAltOnly = 0;
  let missingCaptionOnly = 0;
  let missingBoth = 0;

  for (const row of filteredRows) {
    const hasAlt = (row.aiAlt || "").trim();
    const hasCaption = (row.aiCaption || "").trim();

    if (hasAlt && hasCaption) complete += 1;
    else if (!hasAlt && !hasCaption) missingBoth += 1;
    else if (!hasAlt) missingAltOnly += 1;
    else if (!hasCaption) missingCaptionOnly += 1;
  }

  const total = filteredRows.length;
  const remaining = total - complete;
  const percentage = total > 0 ? ((complete / total) * 100).toFixed(1) : "0.0";

  return {
    total,
    complete,
    remaining,
    percentage,
    missingAltOnly,
    missingCaptionOnly,
    missingBoth,
  };
}

function printTextStatus(status) {
  console.log("\nAI Alt Text / Caption Status");
  console.log("--------------------------------");
  console.log(`Total rows:           ${status.total}`);
  console.log(`Completed:            ${status.complete}`);
  console.log(`Remaining:            ${status.remaining}`);
  console.log(`Completion:           ${status.percentage}%`);
  console.log("");
  console.log(`Missing alt only:     ${status.missingAltOnly}`);
  console.log(`Missing caption only: ${status.missingCaptionOnly}`);
  console.log(`Missing both:         ${status.missingBoth}`);
}

async function generateWithRetry(args) {
  const maxAttempts = 6;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await generateText(args);
    } catch (err) {
      const retryable = err.status === 429 || err.status >= 500;
      if (!retryable) throw err;

      const waitMs = err.retryAfter || Math.min(90000, DELAY_MS * attempt);
      console.warn(`Rate limited/server busy. Waiting ${Math.round(waitMs / 1000)}s before retry ${attempt}/${maxAttempts}...`);
      await sleep(waitMs);
    }
  }

  throw new Error("Failed after repeated retries");
}

async function main() {
  const { rows: galleryRows } = readCsv(GALLERY_CSV, [
    "imageId",
    "venue",
    "category",
    "filename",
  ]);

  const { rows: aiRows, columns: existingAiColumns } = readCsv(GALLERY_AI_CSV, AI_COLUMNS);
  const aiColumns = Array.from(new Set([...AI_COLUMNS, ...existingAiColumns]));

  const aiById = new Map(aiRows.filter((row) => row.imageId).map((row) => [row.imageId, row]));
  const venueMap = loadCountyContext(COUNTY_META_JSON);

  for (const row of galleryRows) {
    if (!row.imageId) continue;
    ensureAiRow(row, aiById, aiRows, aiColumns);
  }

  const textStatus = getTextStatus(aiRows);

  if (STATUS) {
    printTextStatus(textStatus);
    return;
  }

  const candidates = aiRows
    .filter((aiRow) => passesFilters(aiRow))
    .filter((aiRow) => needsText(aiRow))
    .map((aiRow) => ({
      row: {
        imageId: aiRow.imageId,
        venue: aiRow.venue || aiRow.blogVenue || "",
        category: aiRow.category || "blog",
        filename: aiRow.filename || "",
      },
      aiRow,
    }));

  const runItems = candidates.slice(0, LIMIT);

  console.log("MKB AI Text Generator");
  console.log(`Gallery rows: ${galleryRows.length}`);
  console.log(`AI rows: ${aiRows.length}`);
  console.log(`Rows needing alt/caption: ${candidates.length}`);
  console.log(`This run limit: ${runItems.length}`);
  console.log(`Source filter: ${SOURCE_FILTER || "all"}`);
  console.log(`Blog filter: ${BLOG_FILTER || "none"}`);
  console.log(`Model: ${OPENAI_MODEL}`);
  console.log(`Delay between requests: ${DELAY_MS}ms`);

  if (!APPLY) {
    console.log("Dry run only. Nothing changed.");
    console.log("Run: node scripts/ai/generate-ai-text.mjs --apply --limit=25");
    console.log("Blog only: node scripts/ai/generate-ai-text.mjs --apply --source=blog --limit=25");
    return;
  }

  const backup = backupFile(GALLERY_AI_CSV, "backup-before-ai-text");
  if (backup) console.log(`Backup created: ${backup}`);

  let complete = 0;

  for (const item of runItems) {
    const { row, aiRow } = item;

    try {
      const context = getContextForRow(row, venueMap);

      console.log(
        `\nGenerating: ${aiRow.source || "gallery"} / ${aiRow.blogSlug || ""} / ${row.venue || ""} / ${row.category || ""} / ${row.filename || ""}`,
      );

      const result = await generateWithRetry({ row, aiRow, context });

      aiRow.aiAlt = cleanSentence(result.alt, 160);
      aiRow.aiCaption = cleanSentence(result.caption, 240);
      aiRow.aiModel = OPENAI_MODEL;
      aiRow.aiUpdatedAt = new Date().toISOString();

      complete += 1;

      console.log(`Alt: ${aiRow.aiAlt}`);
      console.log(`Caption: ${aiRow.aiCaption}`);
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
  printTextStatus(getTextStatus(aiRows));
  console.log("\nAI alt text and caption generation complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});