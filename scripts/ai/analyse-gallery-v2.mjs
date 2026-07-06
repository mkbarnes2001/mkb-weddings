import "dotenv/config";
import fs from "node:fs";
import { readCsv, writeCsv, backupFile } from "./lib/csv.mjs";
import { thumbPath, imageToDataUrl } from "./lib/paths.mjs";
import { loadCountyContext, getContextForRow } from "./lib/county-context.mjs";
import { responsesRequest, extractOutputText, parseJsonOutput, sleep } from "./lib/openai.mjs";

const {
  OPENAI_API_KEY,
  OPENAI_MODEL = "gpt-5.5",
  OPENAI_REQUEST_DELAY_MS = "22000",
  GALLERY_CSV = "public/gallery.csv",
  GALLERY_AI_CSV = "public/gallery-ai.csv",
  LOCAL_THUMB_ROOT,
  COUNTY_META_JSON = "public/county-meta.json",
} = process.env;

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : 25;
const DELAY_MS = Number(OPENAI_REQUEST_DELAY_MS || 22000);

const AI_COLUMNS = [
  "imageId",
  "venue",
  "category",
  "filename",
  "aiTags",
  "aiTagsConfidence",
  "aiAlt",
  "aiAltConfidence",
  "aiCaption",
  "aiCaptionConfidence",
  "aiRating",
  "aiRatingConfidence",
  "aiEmotion",
  "aiEmotionConfidence",
  "aiStoryMoment",
  "aiStoryMomentConfidence",
  "aiLighting",
  "aiLightingConfidence",
  "aiWeather",
  "aiWeatherConfidence",
  "aiColours",
  "aiColoursConfidence",
  "aiPeople",
  "aiPeopleConfidence",
  "aiReviewed",
  "aiModel",
  "aiUpdatedAt",
];

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in .env");
  process.exit(1);
}

if (!LOCAL_THUMB_ROOT) {
  console.error("Missing LOCAL_THUMB_ROOT in .env");
  process.exit(1);
}

function cleanList(value, max = 16) {
  const arr = Array.isArray(value) ? value : String(value || "").split(/[|,]/g);

  return Array.from(
    new Set(
      arr
        .map((item) => String(item).trim().toLowerCase())
        .filter(Boolean)
        .filter((item) => item.length <= 50),
    ),
  ).slice(0, max);
}

function cleanSentence(value, maxLength = 240) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normaliseRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return String(Math.max(1, Math.min(5, Math.round(n))));
}

function normaliseConfidence(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";

  if (n > 1) {
    return String(Math.max(0, Math.min(1, n / 100)).toFixed(2));
  }

  return String(Math.max(0, Math.min(1, n)).toFixed(2));
}

function needsAnalysis(aiRow) {
  if (FORCE) return true;

  return !(
    (aiRow.aiAlt || "").trim() &&
    (aiRow.aiCaption || "").trim() &&
    (aiRow.aiRating || "").trim() &&
    (aiRow.aiEmotion || "").trim() &&
    (aiRow.aiStoryMoment || "").trim() &&
    (aiRow.aiLighting || "").trim()
  );
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

  ai.venue = row.venue || ai.venue || "";
  ai.category = row.category || ai.category || "";
  ai.filename = row.filename || ai.filename || "";

  if (!ai.aiTags && row.aiTags) ai.aiTags = row.aiTags;

  return ai;
}

function buildPrompt(row, aiRow, context) {
  const existingTags = aiRow.aiTags ? aiRow.aiTags : "";

  return [
    "You are analysing wedding photography for MKB Weddings, a Northern Ireland wedding photographer.",
    "Return ONLY valid JSON in this exact shape:",
    JSON.stringify({
      tags: ["tag"],
      tagsConfidence: 0.9,
      alt: "SEO friendly alt text",
      altConfidence: 0.9,
      caption: "short natural caption",
      captionConfidence: 0.9,
      rating: 5,
      ratingConfidence: 0.9,
      emotion: "Joy",
      emotionConfidence: 0.9,
      storyMoment: "Couple Portraits",
      storyMomentConfidence: 0.9,
      lighting: "Natural Light",
      lightingConfidence: 0.9,
      weather: "Sunny",
      weatherConfidence: 0.9,
      colours: ["warm"],
      coloursConfidence: 0.9,
      people: ["bride", "groom"],
      peopleConfidence: 0.9,
    }),
    "Rules:",
    "- Do not identify real people or use personal names.",
    "- Do not guess sensitive attributes.",
    "- Make alt text natural, specific, and under 160 characters.",
    "- Include venue/town/county only when it fits naturally and is known from context.",
    "- Caption can be 1 sentence, warm but not cheesy.",
    "- Rating is 1 to 5 based on storytelling, composition, emotion, lighting, website value.",
    "- Confidence values must be between 0 and 1.",
    "- Tags should be useful for gallery search and SEO, max 16.",
    "- Story moment should use wedding-friendly wording, e.g. Getting Ready, Ceremony, Confetti, Couple Portraits, Family, Speeches, First Dance, Dancefloor, Details, Night Portrait.",
    "Known context:",
    `venue=${row.venue}`,
    `category=${row.category}`,
    `filename=${row.filename}`,
    `existingTags=${existingTags}`,
    `town=${context.town}`,
    `county=${context.county}`,
    `country=${context.country}`,
    `primaryKeyword=${context.primaryKeyword}`,
  ].join("\n");
}

async function analyseImage({ row, aiRow, context, file }) {
  const dataUrl = imageToDataUrl(file);

  const input = [
    {
      role: "user",
      content: [
        { type: "input_text", text: buildPrompt(row, aiRow, context) },
        { type: "input_image", image_url: dataUrl, detail: "low" },
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

async function analyseWithRetry(args) {
  const maxAttempts = 6;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await analyseImage(args);
    } catch (err) {
      const retryable = err.status === 429 || err.status >= 500;

      if (!retryable) throw err;

      const waitMs = err.retryAfter || Math.min(90000, DELAY_MS * attempt);

      console.warn(
        `Rate limited/server busy. Waiting ${Math.round(
          waitMs / 1000,
        )}s before retry ${attempt}/${maxAttempts}...`,
      );

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

  const candidates = [];

  for (const row of galleryRows) {
    if (!row.imageId) continue;

    const aiRow = ensureAiRow(row, aiById, aiRows, aiColumns);

    if (needsAnalysis(aiRow)) {
      candidates.push({ row, aiRow });
    }
  }

  const runItems = candidates.slice(0, LIMIT);

  console.log("MKB Intelligence V2 analysis");
  console.log(`Gallery rows: ${galleryRows.length}`);
  console.log(`Rows needing analysis: ${candidates.length}`);
  console.log(`This run limit: ${runItems.length}`);
  console.log(`Model: ${OPENAI_MODEL}`);
  console.log(`Delay between requests: ${DELAY_MS}ms`);

  if (!APPLY) {
    console.log("Dry run only. Nothing changed.");
    console.log("Run: node scripts/ai/analyse-gallery-v2.mjs --apply --limit=25");
    return;
  }

  const backup = backupFile(GALLERY_AI_CSV, "backup-before-ai-v2-analysis");

  if (backup) console.log(`Backup created: ${backup}`);

  let complete = 0;

  for (const item of runItems) {
    const { row, aiRow } = item;
    const file = thumbPath(row, LOCAL_THUMB_ROOT);

    if (!fs.existsSync(file)) {
      console.warn(`Skipping missing thumb: ${file}`);
      continue;
    }

    try {
      const context = getContextForRow(row, venueMap);

      console.log(`\nAnalysing: ${row.venue} / ${row.category} / ${row.filename}`);

      const result = await analyseWithRetry({
        row,
        aiRow,
        context,
        file,
      });

      const mergedTags = cleanList(
        [...cleanList(aiRow.aiTags || ""), ...cleanList(result.tags || [])],
        18,
      );

      aiRow.aiTags = mergedTags.join("|");
      aiRow.aiTagsConfidence = normaliseConfidence(result.tagsConfidence);

      aiRow.aiAlt = cleanSentence(result.alt, 160);
      aiRow.aiAltConfidence = normaliseConfidence(result.altConfidence);

      aiRow.aiCaption = cleanSentence(result.caption, 260);
      aiRow.aiCaptionConfidence = normaliseConfidence(result.captionConfidence);

      aiRow.aiRating = normaliseRating(result.rating);
      aiRow.aiRatingConfidence = normaliseConfidence(result.ratingConfidence);

      aiRow.aiEmotion = cleanSentence(result.emotion, 60);
      aiRow.aiEmotionConfidence = normaliseConfidence(result.emotionConfidence);

      aiRow.aiStoryMoment = cleanSentence(result.storyMoment, 80);
      aiRow.aiStoryMomentConfidence = normaliseConfidence(result.storyMomentConfidence);

      aiRow.aiLighting = cleanSentence(result.lighting, 80);
      aiRow.aiLightingConfidence = normaliseConfidence(result.lightingConfidence);

      aiRow.aiWeather = cleanSentence(result.weather, 60);
      aiRow.aiWeatherConfidence = normaliseConfidence(result.weatherConfidence);

      aiRow.aiColours = cleanList(result.colours || [], 8).join("|");
      aiRow.aiColoursConfidence = normaliseConfidence(result.coloursConfidence);

      aiRow.aiPeople = cleanList(result.people || [], 8).join("|");
      aiRow.aiPeopleConfidence = normaliseConfidence(result.peopleConfidence);

      aiRow.aiModel = OPENAI_MODEL;
      aiRow.aiUpdatedAt = new Date().toISOString();

      complete += 1;

      console.log(`Alt: ${aiRow.aiAlt}`);
      console.log(
        `Rating: ${aiRow.aiRating} | ${aiRow.aiStoryMoment} | ${aiRow.aiEmotion}`,
      );
      console.log(
        `Confidence: alt ${aiRow.aiAltConfidence} | rating ${aiRow.aiRatingConfidence}`,
      );
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
  console.log("\nMKB Intelligence V2 analysis complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});