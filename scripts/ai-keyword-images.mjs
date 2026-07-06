import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const {
  OPENAI_API_KEY,
  OPENAI_MODEL = "gpt-5.5",
  GALLERY_CSV = "public/gallery.csv",
  LOCAL_THUMB_ROOT,
  OPENAI_REQUEST_DELAY_MS = "22000",
} = process.env;

const APPLY = process.argv.includes("--apply");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : 25;

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in .env");
  process.exit(1);
}

if (!LOCAL_THUMB_ROOT) {
  console.error("Missing LOCAL_THUMB_ROOT in .env");
  process.exit(1);
}

const delayMs = Number(OPENAI_REQUEST_DELAY_MS || 22000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createBackup(file) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");

  const backupPath = file.replace(/\.csv$/i, `.backup-ai-tags-${timestamp}.csv`);
  fs.copyFileSync(file, backupPath);
  console.log(`Backup created: ${backupPath}`);
}

function readCsv(file) {
  const raw = fs.readFileSync(file, "utf8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true });

  const headerLine = raw.split(/\r?\n/)[0] || "";
  const columns = headerLine
    .split(",")
    .map((column) => column.trim().replace(/^"+|"+$/g, ""))
    .filter(Boolean);

  if (!columns.includes("aiTags")) columns.push("aiTags");

  return { rows, columns };
}

function writeCsv(file, rows, columns) {
  const safeRows = rows.map((row) => {
    const safeRow = {};
    for (const column of columns) safeRow[column] = row[column] ?? "";
    return safeRow;
  });

  fs.writeFileSync(file, stringify(safeRows, { header: true, columns }), "utf8");
}

function thumbPath(row) {
  return path.join(LOCAL_THUMB_ROOT, row.venue, row.category, row.filename);
}

function mimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  return "image/jpeg";
}

function imageToDataUrl(file) {
  const buffer = fs.readFileSync(file);
  return `data:${mimeType(file)};base64,${buffer.toString("base64")}`;
}

function cleanTags(tags) {
  return Array.from(
    new Set(
      tags
        .map((tag) => String(tag).trim().toLowerCase())
        .filter(Boolean)
        .filter((tag) => tag.length <= 40),
    ),
  ).slice(0, 12);
}

function extractOutputText(json) {
  if (json.output_text) return json.output_text;

  const parts = [];

  for (const item of json.output || []) {
    for (const content of item.content || []) {
      if (content.text) parts.push(content.text);
    }
  }

  return parts.join("\n");
}

async function callOpenAI(row, file) {
  const dataUrl = imageToDataUrl(file);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "You are keyword tagging wedding photography images for a wedding photographer website. " +
                "Return ONLY JSON in this exact shape: {\"tags\":[\"tag1\",\"tag2\"]}. " +
                "Use short useful tags for SEO and gallery filtering. " +
                "Include scene, people, lighting, mood, and wedding moment. " +
                "Do not identify real people. Do not mention names. " +
                "Avoid guessing venue. Max 12 tags.",
            },
            {
              type: "input_text",
              text: `Known context: venue=${row.venue}, category=${row.category}, filename=${row.filename}`,
            },
            {
              type: "input_image",
              image_url: dataUrl,
              detail: "low",
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    const text = await response.text();

    const err = new Error(`OpenAI error ${response.status}: ${text}`);
    err.status = response.status;
    err.retryAfter = retryAfter ? Number(retryAfter) * 1000 : null;
    throw err;
  }

  const json = await response.json();
  const outputText = extractOutputText(json);
  const parsed = JSON.parse(outputText);

  return cleanTags(parsed.tags || []);
}

async function tagImageWithRetry(row, file) {
  const maxAttempts = 6;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await callOpenAI(row, file);
    } catch (err) {
      const isRateLimit = err.status === 429;
      const isServerError = err.status >= 500;

      if (!isRateLimit && !isServerError) {
        throw err;
      }

      const waitMs = err.retryAfter || Math.min(60000, delayMs * attempt);

      console.warn(
        `Rate limited/server busy. Waiting ${Math.round(waitMs / 1000)}s before retry ${attempt}/${maxAttempts}...`,
      );

      await sleep(waitMs);
    }
  }

  throw new Error("Failed after repeated retries.");
}

async function main() {
  const { rows, columns } = readCsv(GALLERY_CSV);

  const allNeedingTags = rows.filter((row) => !(row.aiTags || "").trim());
  const needingTags = allNeedingTags.slice(0, LIMIT);

  console.log(`Rows needing AI tags: ${allNeedingTags.length}`);
  console.log(`This run limit: ${needingTags.length}`);
  console.log(`Model: ${OPENAI_MODEL}`);
  console.log(`Delay between successful requests: ${delayMs}ms`);

  if (!APPLY) {
    console.log("Dry run only. Nothing changed.");
    console.log("Run with: node scripts/ai-keyword-images.mjs --apply --limit=25");
    return;
  }

  createBackup(GALLERY_CSV);

  let done = 0;

  for (const row of needingTags) {
    const file = thumbPath(row);

    if (!fs.existsSync(file)) {
      console.warn(`Skipping missing thumb: ${file}`);
      continue;
    }

    try {
      console.log(`\nTagging: ${row.venue} / ${row.category} / ${row.filename}`);

      const tags = await tagImageWithRetry(row, file);
      row.aiTags = tags.join("|");

      done += 1;

      console.log(` → ${row.aiTags}`);
      console.log(`Progress this run: ${done}/${needingTags.length}`);

      writeCsv(GALLERY_CSV, rows, columns);

      await sleep(delayMs);
    } catch (err) {
      console.error(`Failed: ${row.filename}`);
      console.error(err.message);
      writeCsv(GALLERY_CSV, rows, columns);
    }
  }

  writeCsv(GALLERY_CSV, rows, columns);
  console.log("\nAI tagging complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});