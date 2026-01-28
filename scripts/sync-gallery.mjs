/**
 * scripts/sync-gallery.mjs
 *
 * Updates ONLY the gallery image CSV in the schema:
 *   venue,category,filename,tags
 *
 * R2 key format expected:
 *   full/<venue>/<category>/<filename>
 *
 * It will:
 * - list objects under Prefix "full/"
 * - append rows for any images not already present in the CSV
 * - NEVER add extra columns
 */

import fs from "node:fs";
import path from "node:path";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

// Load env from .env.local (common) then .env (fallback)
try {
  const dotenv = await import("dotenv");
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env" });
} catch {
  // ok
}

const BUCKET = process.env.R2_BUCKET;
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

// Must point to your image CSV (NOT the venue SEO CSV)
const CSV_PATH = process.env.GALLERY_CSV ?? "public/gallery.csv";

// Where full-size images live in R2
const GALLERY_PREFIX = "full/";

// Filter files
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
  // EXACT schema your React gallery expects
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
  // Unique identity
  return `${r.venue}/${r.category}/${r.filename}`.toLowerCase();
}

function keyToRow(key) {
  // Expected: full/<venue>/<category>/<filename>
  if (!key.startsWith(GALLERY_PREFIX)) return null;

  const remainder = key.slice(GALLERY_PREFIX.length); // <venue>/<category>/<filename>
  const parts = remainder.split("/");

  if (parts.length < 3) return null;

  const venue = parts[0];
  const category = parts[1];
  const filename = parts.slice(2).join("/"); // supports deeper nesting if you ever do it

  const ext = path.extname(filename).toLowerCase();
  if (!VALID_EXT.has(ext)) return null;

  return {
    venue,
    category,
    filename,
    tags: "", // default empty; you can fill later
  };
}

async function listAllKeys() {
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
  const rows = readCsv(CSV_PATH).map(normalizeRow);
  const existing = new Set(rows.map(rowIdentity));

  const keys = await listAllKeys();

  const newRows = [];
  for (const k of keys) {
    const row = keyToRow(k);
    if (!row) continue;

    const id = rowIdentity(row);
    if (!existing.has(id)) {
      newRows.push(row);
      existing.add(id);
    }
  }

  if (newRows.length === 0) {
    console.log("No new images found.");
    console.log(`Scanned prefix: ${GALLERY_PREFIX}`);
    return;
  }

  const merged = rows.concat(newRows);

  // Optional: keep things tidy
  merged.sort((a, b) => {
    const aKey = `${a.venue}||${a.category}||${a.filename}`.toLowerCase();
    const bKey = `${b.venue}||${b.category}||${b.filename}`.toLowerCase();
    return aKey.localeCompare(bKey);
  });

  writeCsv(CSV_PATH, merged);

  console.log(`✅ Added ${newRows.length} new row(s) to ${CSV_PATH}`);
  console.log(`Scanned prefix: ${GALLERY_PREFIX}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
