import fs from "node:fs";
import path from "node:path";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

/* -------------------------------------------------------
   ENV
------------------------------------------------------- */

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
  process.exit(1);
}

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

const VALID_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const normalise = (v) =>
  v.toLowerCase().replace(/\s+/g, " ").trim();

/* -------------------------------------------------------
   CSV
------------------------------------------------------- */

function readCsv(file) {
  if (!fs.existsSync(file)) return [];
  return parse(fs.readFileSync(file, "utf8"), {
    columns: true,
    skip_empty_lines: true,
  });
}

function writeCsv(file, rows) {
  const out = stringify(rows, {
    header: true,
    columns: ["venue", "category", "filename", "tag"],
  });
  fs.writeFileSync(file, out, "utf8");
}

/* -------------------------------------------------------
   R2
------------------------------------------------------- */

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function listKeys() {
  const keys = [];
  let token;

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: R2_PREFIX,
        ContinuationToken: token,
      })
    );

    for (const obj of res.Contents || []) {
      if (obj.Key) keys.push(obj.Key);
    }

    token = res.NextContinuationToken;
  } while (token);

  return keys;
}

/* -------------------------------------------------------
   MAIN
------------------------------------------------------- */

async function main() {
  const existingRows = readCsv(GALLERY_CSV);

  // Build a GLOBAL filename index (critical fix)
  const existingFilenames = new Map();
  for (const row of existingRows) {
    const name = normalise(row.filename || "");
    if (!existingFilenames.has(name)) {
      existingFilenames.set(name, row.venue);
    }
  }

  const keys = await listKeys();
  const additions = [];

  for (const key of keys) {
    if (!key.startsWith(R2_PREFIX)) continue;

    const rel = key.slice(R2_PREFIX.length);
    const parts = rel.split("/").filter(Boolean);
    if (parts.length < 3) continue;

    const filename = parts.pop();
    const category = parts.pop();
    const venue = parts.join("/");

    if (!VALID_EXT.has(path.extname(filename).toLowerCase())) continue;
    if (filename === ".DS_Store") continue;

    const filenameKey = normalise(filename);

    // 🚫 Block duplicates by filename (even across venues)
    if (existingFilenames.has(filenameKey)) {
      const originalVenue = existingFilenames.get(filenameKey);
      if (normalise(originalVenue) !== normalise(venue)) {
        console.warn(
          `⚠️ Skipping duplicate filename under different venue:\n` +
          `   ${filename}\n` +
          `   already exists under venue "${originalVenue}", skipping "${venue}"`
        );
      }
      continue;
    }

    additions.push({
      venue,
      category,
      filename,
      tag: "", // NEW rows only
    });

    existingFilenames.set(filenameKey, venue);
  }

  if (additions.length === 0) {
    console.log("✅ No new images found");
    return;
  }

  // Append ONLY (existing rows untouched)
  writeCsv(GALLERY_CSV, existingRows.concat(additions));

  console.log(`✅ Added ${additions.length} new image(s)`);
  console.log(`📂 Scanned prefix: ${R2_PREFIX}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
