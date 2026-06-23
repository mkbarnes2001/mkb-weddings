import fs from "node:fs";
import path from "node:path";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

/**
 * SAFE BLOG GALLERY SYNC
 * - Scans R2 blog/thumb/
 * - Updates public/blog-gallery.csv
 * - Preserves existing blogOrder and blogCover values
 * - Appends only new images
 */

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;

  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");
loadEnvFile(".dev.vars");

const {
  R2_BUCKET,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  BLOG_GALLERY_CSV = "public/blog-gallery.csv",
  R2_PREFIX = "blog/thumb/",
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
    columns: ["blogSlug", "filename", "blogOrder", "blogCover"],
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

  const rel = key.slice(prefix.length); // blogSlug/filename
  const parts = rel.split("/").filter(Boolean);

  if (parts.length < 2) return null;

  const filename = parts.pop();
  const blogSlug = parts.join("/");

  if (!filename || filename === ".DS_Store") return null;

  const ext = path.extname(filename).toLowerCase();
  if (!VALID_EXT.has(ext)) return null;

  return {
    blogSlug,
    filename,
    blogOrder: "",
    blogCover: "",
  };
}

async function main() {
  const existingRaw = readCsv(BLOG_GALLERY_CSV);

  const existingRows = existingRaw.map((r) => ({
    blogSlug: (r.blogSlug ?? "").toString(),
    filename: (r.filename ?? "").toString(),
    blogOrder: (r.blogOrder ?? "").toString(),
    blogCover: (r.blogCover ?? "").toString(),
  }));

  const existingIndex = new Set();

  for (const r of existingRows) {
    const key = `${normalize(r.blogSlug)}|${normalize(r.filename)}`;
    if (key !== "|") existingIndex.add(key);
  }

  const prefix = R2_PREFIX.replace(/^\/+/, "");
  const keys = await listAllKeys(prefix);

  const additions = [];
  let skippedExisting = 0;

  for (const key of keys) {
    const candidate = keyToCandidateRow(key, prefix);
    if (!candidate) continue;

    const indexKey = `${normalize(candidate.blogSlug)}|${normalize(candidate.filename)}`;

    if (existingIndex.has(indexKey)) {
      skippedExisting++;
      continue;
    }

    additions.push(candidate);
    existingIndex.add(indexKey);
  }

  if (additions.length === 0) {
    console.log(`✅ No new blog images found (scanned prefix: ${prefix})`);
    console.log(`ℹ️ Skipped existing rows: ${skippedExisting}`);
    return;
  }

  const merged = existingRows.concat(additions);
  writeCsv(BLOG_GALLERY_CSV, merged);

  console.log(`✅ Added ${additions.length} new row(s) to ${BLOG_GALLERY_CSV}`);
  console.log(`📂 Scanned prefix: ${prefix}`);
  console.log(`ℹ️ Skipped existing rows: ${skippedExisting}`);
  console.log("🛡️ Existing blogOrder and blogCover values were preserved");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});