/**
 * scripts/sync-gallery.mjs
 *
 * Syncs your image gallery CSV from Cloudflare R2.
 *
 * ✅ CSV schema (MUST match your React code):
 *   venue,category,filename,tags
 *
 * ✅ R2 full-size key format expected:
 *   full/<venue>/<category>/<filename>
 *
 * 🔑 Important behavior:
 * - Your site "used to all be 500" thumbs.
 * - This script STANDARDISES the CSV filename to the thumb version:
 *     *_2000.webp  -> *_500.webp
 * - It ONLY APPENDS new rows (never edits existing rows).
 *
 * Usage:
 *   npm run sync-gallery
 *
 * Env (in .env.local or .env):
 *   R2_BUCKET=mkb-gallery
 *   R2_ACCOUNT_ID=...
 *   R2_ACCESS_KEY_ID=...
 *   R2_SECRET_ACCESS_KEY=...
 *   (optional) GALLERY_CSV=public/gallery.csv
 *   (optional) GALLERY_PREFIX=full/
 */

import fs from "node:fs";
import path from "node:path";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

// Load env from .env.local first (common in Vite), then fall back to .env
try {
  const dotenv = await import("dotenv");
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" });
} catch {
  // If dotenv isn't installed, env vars may be provided by the shell/CI.
}

const BUCKET = process.env.R2_BUCKET;
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

const CSV_PATH = process.env.GALLERY_CSV ?? "public/gallery.csv";
const GALLERY_PREFIX = (process.env.GALLERY_PREFIX ?? "full/")
  .replace(/^\//, "")
  .replace(/(?<!\/)$/, "/");

const VALID_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

if (!BUCKET || !ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error(
    "Missing env vars. Set R2_BUCKET, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY"
  );
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
});

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) return [];
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true });
}

function writeCsv(filePath, rows) {
  // EXACT schema your gallery expects
  const csv = stringify(rows, {
    header: true,
    columns: ["venue", "category", "filename", "tags"],
  });
  fs.writeFileSync(filePath, csv, "utf8");
}

function normalizeRow(r) {
  return {
    venue: (r.venue ?? "").trim(),
    category: (r.category ?? "").trim(),
    filename: (r.filename ?? "").trim(),
    tags: (r.tags ?? "").trim(),
  };
}

function rowIdentity(r) {
  // identity is venue/category/filename (case-insensitive)
  return `${r.venue}/${r.category}/${r.filename}`.toLowerCase();
}

function toThumbFilename(filename) {
  // Standardise CSV to thumb naming.
  // Converts "..._2000.webp" -> "..._500.webp"
  // Leaves "..._500.webp" as-is.
  return filename.replace(/_2000(\.\w+)$/i, "_500$1");
}

function keyToRow(key) {
  // Expected: full/<venue>/<category>/<filename>
  if (!key.startsWith(GALLERY_PREFIX)) return null;

  const remainder = key.slice(GALLERY_PREFIX.length); // <venue>/<category>/<filename>
  const parts = remainder.split("/");

  // Must have venue/category/filename
  if (parts.length < 3) return null;

  const venue = (parts[0] ?? "").trim();
  const category = (parts[1] ?? "").trim();
  let filename = parts.slice(2).join("/").trim();

  if (!venue || !category || !filename) return null;

  const ext = path.extname(filename).toLowerCase();
  if (!VALID_EXT.has(ext)) return null;

  // 🔑 Always store thumb version in CSV
  filename = toThumbFilename(filename);

  return {
    venue,
    category,
    filename,
    tags: "",
  };
}

async function listAllKeysUnderPrefix() {
  const keys = [];
  let token = undefined;

  while (true) {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: GALLERY_PREFIX,
        ContinuationToken: token,
      })
    );

    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }

    if (!res.IsTruncated) break;
    token = res.NextContinuationToken;
  }

  return keys;
}

async function main() {
  const existingRows = readCsv(CSV_PATH).map(normalizeRow);
  const existingSet = new Set(existingRows.map(rowIdentity));

  const keys = await listAllKeysUnderPrefix();

  const newRows = [];
  for (const k of keys) {
    const row = keyToRow(k);
    if (!row) continue;

    const id = rowIdentity(row);
    if (!existingSet.has(id)) {
      newRows.push(row);
      existingSet.add(id);
    }
  }

  if (newRows.length === 0) {
    console.log("No new images found.");
    console.log(`Scanned prefix: ${GALLERY_PREFIX}`);
    return;
  }

  const merged = existingRows.concat(newRows);

  // Keep file tidy / predictable
  merged.sort((a, b) => {
    const aKey = `${a.venue}||${a.category}||${a.filename}`.toLowerCase();
    const bKey = `${b.venue}||${b.category}||${b.filename}`.toLowerCase();
    return aKey.localeCompare(bKey);
  });

  writeCsv(CSV_PATH, merged);

  console.log(`✅ Added ${newRows.length} new row(s) to ${CSV_PATH}`);
  console.log(`Scanned prefix: ${GALLERY_PREFIX}`);
  console.log("CSV filenames normalised to _500 thumbs.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
