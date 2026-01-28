/**
 * scripts/sync-gallery.mjs
 *
 * Purpose:
 * - List images in Cloudflare R2 under a prefix (default: "full/")
 * - Compare against gallery CSV
 * - Append any new images as new rows
 *
 * Assumptions:
 * - R2 object keys look like: full/<venue>/<moment>/<file>
 * - CSV stores: venue, moment, file, tag (optional: published, sort)
 *
 * Usage:
 * - Put creds in .env (recommended) or .env.local
 * - npm run sync-gallery
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
  // If dotenv isn't installed, it's fine—env vars may be set by the shell/CI.
}

const BUCKET = process.env.R2_BUCKET;
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

// Where your CSV lives in the repo
const CSV_PATH = process.env.GALLERY_CSV ?? "public/gallery.csv";

// Only scan the "full" gallery prefix in R2
// MUST end with "/" for predictable parsing
const GALLERY_PREFIX = (process.env.GALLERY_PREFIX ?? "full/").replace(/^\//, "").replace(/(?<!\/)$/, "/");

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
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) return [];
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true });
}

function writeCsv(filePath, rows) {
  // Keep your existing columns + the optional extras we’ve been using
  const csv = stringify(rows, {
    header: true,
    columns: ["venue", "moment", "file", "tag", "published", "sort"],
  });
  fs.writeFileSync(filePath, csv, "utf8");
}

function normalizeRow(r) {
  return {
    venue: (r.venue ?? "").trim(),
    moment: (r.moment ?? "").trim(),
    file: ((r.file ?? r.filename) ?? "").trim(),
    tag: (r.tag ?? "").trim(),
    published: (r.published ?? "true").toString().trim(), // existing rows default true
    sort: (r.sort ?? "").toString().trim(),
  };
}

function rowIdentity(r) {
  // Unique identity for a gallery item in your CSV
  return `${(r.venue ?? "").trim()}/${(r.moment ?? "").trim()}/${(r.file ?? "").trim()}`;
}

function keyToRow(key) {
  // expected: full/<venue>/<moment>/<file>
  // BUT prefix is configurable; we parse relative to GALLERY_PREFIX.

  if (!key.startsWith(GALLERY_PREFIX)) return null;

  const remainder = key.slice(GALLERY_PREFIX.length); // <venue>/<moment>/<file>
  const parts = remainder.split("/");

  if (parts.length < 3) return null;

  const venue = parts[0];
  const moment = parts[1];
  const file = parts.slice(2).join("/");

  const ext = path.extname(file).toLowerCase();
  if (!VALID_EXT.has(ext)) return null;

  return {
    venue,
    moment,
    file,
    tag: "",
    published: "false",
    sort: "",
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
    return;
  }

  const merged = existingRows.concat(newRows);

  // Optional tidy sort: venue + moment, then sort, then file
  merged.sort((a, b) => {
    const aKey = `${a.venue}||${a.moment}`;
    const bKey = `${b.venue}||${b.moment}`;
    if (aKey < bKey) return -1;
    if (aKey > bKey) return 1;

    const as = a.sort === "" ? Number.POSITIVE_INFINITY : Number(a.sort);
    const bs = b.sort === "" ? Number.POSITIVE_INFINITY : Number(b.sort);
    if (as !== bs) return as - bs;

    return a.file.localeCompare(b.file);
  });

  writeCsv(CSV_PATH, merged);

  console.log(`✅ Added ${newRows.length} new row(s) to ${CSV_PATH}`);
  console.log(`Scanned prefix: ${GALLERY_PREFIX}`);
  console.log("New rows default to published=false and empty tag.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
