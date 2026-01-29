import fs from "node:fs";
import path from "node:path";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

// --- Load env from .env.local or .env (works with ESM) ---
function loadEnvFile(file) {
  try {
    const p = path.resolve(process.cwd(), file);
    if (!fs.existsSync(p)) return;
    const raw = fs.readFileSync(p, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      // strip quotes
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // ignore
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

// --- Required env ---
const BUCKET = process.env.R2_BUCKET;
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

// --- Config ---
const CSV_PATH = process.env.GALLERY_CSV ?? "public/gallery.csv";

// IMPORTANT: use THUMB prefix because your gallery CSV uses _500.webp thumbs
// You can override with R2_PREFIX if needed.
const PREFIX = (process.env.R2_PREFIX ?? "thumb/").replace(/^\/+/, "");

// Extensions allowed
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

// --- CSV helpers ---
function readCsv(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) return [];
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true });
}

function writeCsv(filePath, rows) {
  const csv = stringify(rows, {
    header: true,
    columns: ["venue", "category", "filename", "tag"],
  });
  fs.writeFileSync(filePath, csv, "utf8");
}

// Unique identity for a row
function rowId(r) {
  return `${(r.venue ?? "").trim()}||${(r.category ?? "").trim()}||${(r.filename ?? "").trim()}`;
}

// Turn an R2 key into a CSV row
// Expected structure (thumb): thumb/<venue>/<category>/<filename>
function keyToRow(key) {
  if (!key.startsWith(PREFIX)) return null;

  // Remove prefix
  const rel = key.slice(PREFIX.length); // e.g. "Galgorm/ceremony/file_500.webp"
  if (!rel || rel.endsWith("/")) return null;

  // ignore DS_Store and folders
  const base = path.basename(rel);
  if (base === ".DS_Store") return null;

  const ext = path.extname(base).toLowerCase();
  if (!VALID_EXT.has(ext)) return null;

  const parts = rel.split("/").filter(Boolean);
  // needs at least venue/category/filename
  if (parts.length < 3) return null;

  const venue = parts[0];
  const category = parts[1];
  const filename = parts.slice(2).join("/"); // supports nested filenames if ever

  return {
    venue,
    category,
    filename,
    tag: "", // default for new rows
  };
}

async function listAllKeysWithPrefix() {
  const keys = [];
  let token = undefined;

  while (true) {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: PREFIX,
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
  const existingRowsRaw = readCsv(CSV_PATH);

  // Normalize existing rows and PRESERVE tag
  const existingRows = existingRowsRaw.map((r) => ({
    venue: (r.venue ?? "").trim(),
    category: (r.category ?? "").trim(),
    filename: ((r.filename ?? r.file ?? r.name) ?? "").trim(),
    tag: (r.tag ?? "").trim(),
  }));

  const existingSet = new Set(existingRows.map(rowId));

  const keys = await listAllKeysWithPrefix();
  const newRows = [];

  for (const k of keys) {
    const row = keyToRow(k);
    if (!row) continue;

    const id = rowId(row);
    if (!existingSet.has(id)) {
      newRows.push(row);
      existingSet.add(id);
    }
  }

  if (newRows.length === 0) {
    console.log(`No new images found under prefix: ${PREFIX}`);
    return;
  }

  // IMPORTANT: keep your current ordering; append new rows at end
  const merged = existingRows.concat(newRows);

  // Write back with stable columns (venue,category,filename,tag) and tag preserved
  writeCsv(CSV_PATH, merged);

  console.log(`✅ Added ${newRows.length} new row(s) to ${CSV_PATH}`);
  console.log(`Scanned prefix: ${PREFIX}`);
  console.log(`Existing tag values were preserved. New rows have empty tag.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
