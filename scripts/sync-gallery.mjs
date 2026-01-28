import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const BUCKET = process.env.R2_BUCKET;
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

// Path to your CSV in the repo:
const CSV_PATH = process.env.GALLERY_CSV ?? "public/gallery.csv";

// If you store images as: venue/moment/file.jpg
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
  // Keep your original columns, plus optional published/sort if you decide to use them
  const csv = stringify(rows, {
    header: true,
    columns: ["venue", "moment", "file", "tag", "published", "sort"],
  });
  fs.writeFileSync(filePath, csv, "utf8");
}

function keyToRow(key) {
  const parts = key.split("/");
  if (parts.length < 3) return null;

  const venue = parts[0];
  const moment = parts[1];
  const file = parts.slice(2).join("/"); // allows nested later if needed

  const ext = path.extname(file).toLowerCase();
  if (!VALID_EXT.has(ext)) return null;

  return {
    venue,
    moment,
    file,
    tag: "",            // you can fill in later
    published: "false", // safe default
    sort: "",           // blank = append/end
  };
}

function rowIdentity(r) {
  // the “unique key” for a row
  return `${(r.venue ?? "").trim()}/${(r.moment ?? "").trim()}/${(r.file ?? "").trim()}`;
}

async function listAllKeys() {
  const keys = [];
  let token = undefined;

  while (true) {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
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
  const rows = readCsv(CSV_PATH);

  // Normalize existing rows (and handle CSVs that use "filename" instead of "file")
  const normalized = rows.map((r) => ({
    venue: (r.venue ?? "").trim(),
    moment: (r.moment ?? "").trim(),
    file: ((r.file ?? r.filename) ?? "").trim(),
    tag: (r.tag ?? "").trim(),
    published: (r.published ?? "true").toString().trim(), // existing rows default true
    sort: (r.sort ?? "").toString().trim(),
  }));

  const existing = new Set(normalized.map(rowIdentity));

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
    return;
  }

  const merged = normalized.concat(newRows);

  // Optional tidy sort: venue + moment, then sort, then file name
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
  console.log("New rows default to published=false and empty tag.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
