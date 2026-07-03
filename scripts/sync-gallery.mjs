import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

/**
 * FUTURE-SAFE GALLERY SYNC
 * - Scans R2 thumb/
 * - Appends only new images
 * - Preserves every existing CSV column automatically
 * - Preserves all manual work: tags, venue pins, moment pins, flash pins, blog columns, etc.
 * - Creates a timestamped backup before writing
 * - Blocks duplicate filenames globally
 */

const {
  R2_BUCKET,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  GALLERY_CSV = "public/gallery.csv",
  R2_PREFIX = "thumb/",
} = process.env;

if (!R2_BUCKET || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error("❌ Missing required R2 environment variables");
  console.error("Need: R2_BUCKET, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
  process.exit(1);
}

const REQUIRED_COLUMNS = ["venue", "category", "filename"];
const DEFAULT_EXTRA_COLUMNS = [
  "tags",
  "blogSlug",
  "blogOrder",
  "blogCover",
  "venuePin",
  "venuePinOrder",
  "momentPin",
  "momentPinOrder",
  "flashPin",
  "flashPinOrder",
];

const VALID_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const normalize = (value) =>
  (value ?? "").toString().toLowerCase().replace(/\s+/g, " ").trim();

function readCsv(file) {
  if (!fs.existsSync(file)) {
    return { rows: [], columns: [...REQUIRED_COLUMNS, ...DEFAULT_EXTRA_COLUMNS] };
  }

  const raw = fs.readFileSync(file, "utf8");

  if (!raw.trim()) {
    return { rows: [], columns: [...REQUIRED_COLUMNS, ...DEFAULT_EXTRA_COLUMNS] };
  }

  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
  });

  const headerLine = raw.split(/\r?\n/)[0] || "";
  const columns = headerLine
    .split(",")
    .map((column) => column.trim().replace(/^"+|"+$/g, ""))
    .filter(Boolean);

  const finalColumns = Array.from(
    new Set([...REQUIRED_COLUMNS, ...columns, ...DEFAULT_EXTRA_COLUMNS]),
  );

  return {
    rows: records,
    columns: finalColumns,
  };
}

function createBackup(file) {
  if (!fs.existsSync(file)) return;

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");

  const backupPath = file.replace(/\.csv$/i, `.backup-${timestamp}.csv`);

  fs.copyFileSync(file, backupPath);
  console.log(`🧯 Backup created: ${backupPath}`);
}

function writeCsv(file, rows, columns) {
  const safeRows = rows.map((row) => {
    const safeRow = {};

    for (const column of columns) {
      safeRow[column] = row[column] ?? "";
    }

    return safeRow;
  });

  const out = stringify(safeRows, {
    header: true,
    columns,
  });

  fs.writeFileSync(file, out, "utf8");
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function listAllKeys(prefix) {
  const keys = [];
  let token;

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );

    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }

    token = res.NextContinuationToken;
  } while (token);

  return keys;
}

function keyToCandidateRow(key, prefix, columns) {
  if (!key.startsWith(prefix)) return null;

  const rel = key.slice(prefix.length);
  const parts = rel.split("/").filter(Boolean);

  if (parts.length < 3) return null;

  const filename = parts.pop();
  const category = parts.pop();
  const venue = parts.join("/");

  if (!filename || filename === ".DS_Store") return null;

  const ext = path.extname(filename).toLowerCase();
  if (!VALID_EXT.has(ext)) return null;

  const row = {};

  for (const column of columns) {
    row[column] = "";
  }

  row.venue = venue;
  row.category = category;
  row.filename = filename;

  return row;
}

async function main() {
  const { rows: existingRaw, columns } = readCsv(GALLERY_CSV);

  const existingRows = existingRaw.map((row) => {
    const safeRow = {};

    for (const column of columns) {
      safeRow[column] = row[column] ?? "";
    }

    return safeRow;
  });

  const filenameIndex = new Map();

  for (const row of existingRows) {
    const filenameKey = normalize(row.filename);
    if (!filenameKey) continue;

    if (!filenameIndex.has(filenameKey)) {
      filenameIndex.set(filenameKey, {
        venue: row.venue,
        category: row.category,
      });
    }
  }

  const prefix = R2_PREFIX.replace(/^\/+/, "");
  const keys = await listAllKeys(prefix);

  const additions = [];
  let skippedSameFolder = 0;
  let skippedDifferentFolder = 0;

  for (const key of keys) {
    const candidate = keyToCandidateRow(key, prefix, columns);
    if (!candidate) continue;

    const filenameKey = normalize(candidate.filename);
    if (!filenameKey) continue;

    if (filenameIndex.has(filenameKey)) {
      const original = filenameIndex.get(filenameKey);

      const sameFolder =
        normalize(original.venue) === normalize(candidate.venue) &&
        normalize(original.category) === normalize(candidate.category);

      if (sameFolder) {
        skippedSameFolder++;
      } else {
        skippedDifferentFolder++;
        console.warn(
          `⚠️ Duplicate filename found under a different R2 folder, skipping:\n` +
            `   ${candidate.filename}\n` +
            `   CSV already has: "${original.venue}" / "${original.category}"\n` +
            `   R2 key suggests: "${candidate.venue}" / "${candidate.category}"`,
        );
      }

      continue;
    }

    additions.push(candidate);
    filenameIndex.set(filenameKey, {
      venue: candidate.venue,
      category: candidate.category,
    });
  }

  if (additions.length === 0) {
    console.log(`✅ No new images found`);
    console.log(`📂 Scanned prefix: ${prefix}`);
    console.log(`ℹ️ Skipped existing same-folder files: ${skippedSameFolder}`);
    console.log(`ℹ️ Skipped duplicate different-folder files: ${skippedDifferentFolder}`);
    console.log(`🛡️ No CSV changes made`);
    return;
  }

  createBackup(GALLERY_CSV);

  const merged = existingRows.concat(additions);

  writeCsv(GALLERY_CSV, merged, columns);

  console.log(`✅ Added ${additions.length} new row(s) to ${GALLERY_CSV}`);
  console.log(`📂 Scanned prefix: ${prefix}`);
  console.log(`ℹ️ Skipped existing same-folder files: ${skippedSameFolder}`);
  console.log(`ℹ️ Skipped duplicate different-folder files: ${skippedDifferentFolder}`);
  console.log(`🛡️ Preserved columns: ${columns.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});