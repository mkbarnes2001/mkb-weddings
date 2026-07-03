import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const {
  R2_BUCKET,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,

  GALLERY_CSV = "public/gallery.csv",

  LOCAL_THUMB_ROOT,
  LOCAL_FULL_ROOT,

  R2_THUMB_PREFIX = "thumb/",
  R2_FULL_PREFIX = "full/",
} = process.env;

const APPLY = process.argv.includes("--apply");

if (!R2_BUCKET || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error("❌ Missing R2 environment variables.");
  process.exit(1);
}

if (!LOCAL_THUMB_ROOT || !LOCAL_FULL_ROOT) {
  console.error("❌ Missing LOCAL_THUMB_ROOT or LOCAL_FULL_ROOT in .env");
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

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function normalize(value) {
  return (value ?? "").toString().toLowerCase().replace(/\s+/g, " ").trim();
}

function fullFilenameFromThumb(filename) {
  return filename.replace(/_500(\.[a-z0-9]+)$/i, "_2000$1");
}

function contentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

function readCsv(file) {
  if (!fs.existsSync(file)) {
    return { rows: [], columns: [...REQUIRED_COLUMNS, ...DEFAULT_EXTRA_COLUMNS] };
  }

  const raw = fs.readFileSync(file, "utf8");
  if (!raw.trim()) {
    return { rows: [], columns: [...REQUIRED_COLUMNS, ...DEFAULT_EXTRA_COLUMNS] };
  }

  const records = parse(raw, { columns: true, skip_empty_lines: true });

  const headerLine = raw.split(/\r?\n/)[0] || "";
  const existingColumns = headerLine
    .split(",")
    .map((column) => column.trim().replace(/^"+|"+$/g, ""))
    .filter(Boolean);

  const columns = Array.from(
    new Set([...REQUIRED_COLUMNS, ...existingColumns, ...DEFAULT_EXTRA_COLUMNS]),
  );

  return { rows: records, columns };
}

function writeCsv(file, rows, columns) {
  const safeRows = rows.map((row) => {
    const safeRow = {};
    for (const column of columns) safeRow[column] = row[column] ?? "";
    return safeRow;
  });

  fs.writeFileSync(file, stringify(safeRows, { header: true, columns }), "utf8");
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

function walkLocalThumbs(root) {
  const rows = [];

  function walk(dir) {
    for (const item of fs.readdirSync(dir)) {
      if (item === ".DS_Store") continue;

      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
        continue;
      }

      const ext = path.extname(item).toLowerCase();
      if (!VALID_EXT.has(ext)) continue;

      const rel = path.relative(root, fullPath);
      const parts = rel.split(path.sep);

      if (parts.length < 3) {
        console.warn(`⚠️ Skipping file not in Venue/Category/Filename structure: ${rel}`);
        continue;
      }

      const filename = parts.pop();
      const category = parts.pop();
      const venue = parts.join("/");

      rows.push({
        venue,
        category,
        filename,
        localThumbPath: fullPath,
      });
    }
  }

  walk(root);
  return rows;
}

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

function thumbKey(row) {
  return `${R2_THUMB_PREFIX}${row.venue}/${row.category}/${row.filename}`.replace(/\/+/g, "/");
}

function fullKey(row) {
  return `${R2_FULL_PREFIX}${row.venue}/${row.category}/${fullFilenameFromThumb(row.filename)}`.replace(
    /\/+/g,
    "/",
  );
}

function localFullPath(row) {
  return path.join(LOCAL_FULL_ROOT, row.venue, row.category, fullFilenameFromThumb(row.filename));
}

function rowKey(row) {
  return `${normalize(row.venue)}|${normalize(row.category)}|${normalize(row.filename)}`;
}

function makeEmptyCsvRow(localRow, columns) {
  const row = {};
  for (const column of columns) row[column] = "";

  row.venue = localRow.venue;
  row.category = localRow.category;
  row.filename = localRow.filename;

  return row;
}

async function uploadFile(localPath, key) {
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: fs.createReadStream(localPath),
      ContentType: contentType(localPath),
    }),
  );
}

async function deleteR2Key(key) {
  await client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }),
  );
}

async function main() {
  console.log(APPLY ? "🚀 APPLY MODE" : "🔎 DRY RUN MODE");
  console.log("Mac folders are treated as the source of truth.\n");

  const { rows: existingRaw, columns } = readCsv(GALLERY_CSV);

  const existingRows = existingRaw.map((row) => {
    const safeRow = {};
    for (const column of columns) safeRow[column] = row[column] ?? "";
    return safeRow;
  });

  const localThumbRows = walkLocalThumbs(LOCAL_THUMB_ROOT);

  const localRowMap = new Map();
  for (const row of localThumbRows) {
    const key = rowKey(row);

    if (localRowMap.has(key)) {
      console.warn(`⚠️ Duplicate local image skipped: ${row.venue}/${row.category}/${row.filename}`);
      continue;
    }

    localRowMap.set(key, row);
  }

  const existingRowMap = new Map();
  for (const row of existingRows) {
    existingRowMap.set(rowKey(row), row);
  }

  const r2ThumbKeys = new Set(await listAllKeys(R2_THUMB_PREFIX));
  const r2FullKeys = new Set(await listAllKeys(R2_FULL_PREFIX));

  const csvAdditions = [];
  const csvKept = [];
  const csvRemoved = [];

  for (const row of existingRows) {
    if (localRowMap.has(rowKey(row))) {
      csvKept.push(row);
    } else {
      csvRemoved.push(row);
    }
  }

  for (const localRow of localThumbRows) {
    if (!existingRowMap.has(rowKey(localRow))) {
      csvAdditions.push(makeEmptyCsvRow(localRow, columns));
    }
  }

  const thumbsToUpload = [];
  const fullsToUpload = [];

  for (const localRow of localThumbRows) {
    const tKey = thumbKey(localRow);
    const fKey = fullKey(localRow);
    const fPath = localFullPath(localRow);

    if (!r2ThumbKeys.has(tKey)) {
      thumbsToUpload.push({ localPath: localRow.localThumbPath, key: tKey });
    }

    if (fs.existsSync(fPath)) {
      if (!r2FullKeys.has(fKey)) {
        fullsToUpload.push({ localPath: fPath, key: fKey });
      }
    } else {
      console.warn(`⚠️ Matching full image not found on Mac: ${fPath}`);
    }
  }

  const localThumbKeySet = new Set(localThumbRows.map((row) => thumbKey(row)));
  const localFullKeySet = new Set(localThumbRows.map((row) => fullKey(row)));

  const r2ThumbsToDelete = [...r2ThumbKeys].filter((key) => !localThumbKeySet.has(key));
  const r2FullsToDelete = [...r2FullKeys].filter((key) => !localFullKeySet.has(key));

  console.log(`Local thumbs found: ${localThumbRows.length}`);
  console.log(`CSV rows to add: ${csvAdditions.length}`);
  console.log(`CSV rows to remove: ${csvRemoved.length}`);
  console.log(`R2 thumbs to upload: ${thumbsToUpload.length}`);
  console.log(`R2 fulls to upload: ${fullsToUpload.length}`);
  console.log(`R2 thumbs to delete: ${r2ThumbsToDelete.length}`);
  console.log(`R2 fulls to delete: ${r2FullsToDelete.length}`);

  if (csvRemoved.length > 0) {
    console.log("\nRows that would be removed from gallery.csv:");
    csvRemoved.slice(0, 25).forEach((row) => {
      console.log(` - ${row.venue} / ${row.category} / ${row.filename}`);
    });
    if (csvRemoved.length > 25) console.log(` ...and ${csvRemoved.length - 25} more`);
  }

  if (!APPLY) {
    console.log("\nDry run only. Nothing changed.");
    console.log("Run with --apply to update R2 and gallery.csv.");
    return;
  }

  createBackup(GALLERY_CSV);

  for (const item of thumbsToUpload) {
    console.log(`⬆️ Upload thumb: ${item.key}`);
    await uploadFile(item.localPath, item.key);
  }

  for (const item of fullsToUpload) {
    console.log(`⬆️ Upload full: ${item.key}`);
    await uploadFile(item.localPath, item.key);
  }

  for (const key of r2ThumbsToDelete) {
    console.log(`🗑️ Delete R2 thumb: ${key}`);
    await deleteR2Key(key);
  }

  for (const key of r2FullsToDelete) {
    console.log(`🗑️ Delete R2 full: ${key}`);
    await deleteR2Key(key);
  }

  const mergedRows = csvKept.concat(csvAdditions);
  writeCsv(GALLERY_CSV, mergedRows, columns);

  console.log("\n✅ Gallery manager complete.");
  console.log(`🛡️ Preserved columns: ${columns.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});