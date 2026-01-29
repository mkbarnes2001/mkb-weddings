import fs from "node:fs";
import path from "node:path";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

/**
 * SAFE GALLERY SYNC (R2 -> gallery.csv)
 * - Reads existing CSV and PRESERVES it exactly (including tags)
 * - Appends only genuinely new images
 * - Blocks duplicates by filename globally (prevents Stormont/Glenavon mis-assignments)
 * - Default scans thumb/ (because gallery.csv uses _500.webp)
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

const VALID_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const normalize = (v) =>
  (v ?? "").toString().toLowerCase().replace(/\s+/g, " ").trim();

function readCsv(file) {
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, "utf8");
  if (!raw.trim()) return [];
  return parse(raw, { columns: true, skip_empty_lines: true });
}

function writeCsv(file, rows) {
  const out = stringify(rows, {
    header: true,
    columns: ["venue", "category", "filename", "tags"], // IMPORTANT: tags plural
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
      })
    );

    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }

    token = res.NextContinuationToken;
  } while (token);

  return keys;
}

function keyToCandidateRow(key, prefix) {
  if (!key.startsWith(prefix)) return null;

  const rel = key.slice(prefix.length); // Venue/Category/filename
  const parts = rel.split("/").filter(Boolean);
  if (parts.length < 3) return null;

  const filename = parts.pop();
  const category = parts.pop();
  const venue = parts.join("/");

  if (!filename || filename === ".DS_Store") return null;

  const ext = path.extname(filename).toLowerCase();
  if (!VALID_EXT.has(ext)) return null;

  return { venue, category, filename, tags: "" };
}

async function main() {
  // 1) Read existing rows as-is (preserve tags)
  const existingRaw = readCsv(GALLERY_CSV);

  // Defensive: ensure existing rows have the expected shape, but DO NOT change tag values
  const existingRows = existingRaw.map((r) => ({
    venue: (r.venue ?? "").toString(),
    category: (r.category ?? "").toString(),
    filename: (r.filename ?? "").toString(),
    tags: (r.tags ?? "").toString(), // IMPORTANT
  }));

  // 2) Build global filename index to prevent duplicates anywhere
  // filenameKey -> { venue, category } for warnings
  const filenameIndex = new Map();
  for (const r of existingRows) {
    const fKey = normalize(r.filename);
    if (!fKey) continue;
    if (!filenameIndex.has(fKey)) {
      filenameIndex.set(fKey, { venue: r.venue, category: r.category });
    }
  }

  // 3) Scan R2 keys
  const prefix = R2_PREFIX.replace(/^\/+/, "");
  const keys = await listAllKeys(prefix);

  const additions = [];
  let skippedSameVenue = 0;
  let skippedDifferentVenue = 0;

  for (const key of keys) {
    const candidate = keyToCandidateRow(key, prefix);
    if (!candidate) continue;

    const fKey = normalize(candidate.filename);
    if (!fKey) continue;

    // If filename already exists anywhere, skip (prevents Glenavon/Stormont duplication)
    if (filenameIndex.has(fKey)) {
      const original = filenameIndex.get(fKey);

      const sameVenue =
        normalize(original.venue) === normalize(candidate.venue) &&
        normalize(original.category) === normalize(candidate.category);

      if (sameVenue) {
        skippedSameVenue++;
      } else {
        skippedDifferentVenue++;
        console.warn(
          `⚠️ Duplicate filename found under different folder in R2, skipping:\n` +
            `   ${candidate.filename}\n` +
            `   CSV already has: "${original.venue}" / "${original.category}"\n` +
            `   R2 key suggests: "${candidate.venue}" / "${candidate.category}"`
        );
      }
      continue;
    }

    additions.push(candidate);
    filenameIndex.set(fKey, { venue: candidate.venue, category: candidate.category });
  }

  if (additions.length === 0) {
    console.log(`✅ No new images found (scanned prefix: ${prefix})`);
    console.log(`ℹ️ Skipped existing (same folder): ${skippedSameVenue}`);
    console.log(`ℹ️ Skipped duplicates (different folder): ${skippedDifferentVenue}`);
    return;
  }

  // 4) Append only. Never rewrite/normalize existing rows.
  const merged = existingRows.concat(additions);
  writeCsv(GALLERY_CSV, merged);

  console.log(`✅ Added ${additions.length} new row(s) to ${GALLERY_CSV}`);
  console.log(`📂 Scanned prefix: ${prefix}`);
  console.log(`ℹ️ Skipped existing (same folder): ${skippedSameVenue}`);
  console.log(`ℹ️ Skipped duplicates (different folder): ${skippedDifferentVenue}`);
  console.log(`🛡️ Existing "tags" values were preserved; new rows have tags=""`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
