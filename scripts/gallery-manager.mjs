import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
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
  LOCAL_FULL_HOLDING_ROOT = "",

  R2_THUMB_PREFIX = "thumb/",
  R2_FULL_PREFIX = "full/",
} = process.env;

const APPLY = process.argv.includes("--apply");
const DELETE_MODE = process.argv.includes("--delete-missing");
const YES = process.argv.includes("--yes");

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

const VALID_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".jpeg"]);

const normalize = (value) =>
  (value ?? "").toString().toLowerCase().replace(/\s+/g, " ").trim();

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

function isValidImageFile(filename) {
  if (!filename) return false;
  if (filename === ".DS_Store") return false;
  if (filename.startsWith(".")) return false;
  return VALID_EXT.has(path.extname(filename).toLowerCase());
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
      if (item === ".DS_Store" || item.startsWith(".")) continue;

      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!isValidImageFile(item)) continue;

      const rel = path.relative(root, fullPath);
      const parts = rel.split(path.sep);

      if (parts.length < 3) {
        console.warn(`⚠️ Skipping invalid thumb structure: ${rel}`);
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

function walkFiles(root) {
  const files = [];
  if (!root || !fs.existsSync(root)) return files;

  function walk(dir) {
    for (const item of fs.readdirSync(dir)) {
      if (item === ".DS_Store" || item.startsWith(".")) continue;

      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (isValidImageFile(item)) {
        files.push(fullPath);
      }
    }
  }

  walk(root);
  return files;
}

function rowKey(row) {
  return `${normalize(row.venue)}|${normalize(row.category)}|${normalize(row.filename)}`;
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

function deletedLocalFullPath(row) {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(
    LOCAL_FULL_ROOT,
    "_deleted-by-gallery-manager",
    date,
    row.venue,
    row.category,
    fullFilenameFromThumb(row.filename),
  );
}

function makeEmptyCsvRow(localRow, columns) {
  const row = {};
  for (const column of columns) row[column] = "";

  row.venue = localRow.venue;
  row.category = localRow.category;
  row.filename = localRow.filename;

  return row;
}

function buildHoldingIndex() {
  const index = new Map();

  if (!LOCAL_FULL_HOLDING_ROOT || !fs.existsSync(LOCAL_FULL_HOLDING_ROOT)) {
    return index;
  }

  for (const file of walkFiles(LOCAL_FULL_HOLDING_ROOT)) {
    const base = path.basename(file);
    const key = normalize(base);

    if (!index.has(key)) {
      index.set(key, file);
    } else {
      console.warn(`⚠️ Duplicate full filename in holding folder: ${base}`);
    }
  }

  return index;
}

function moveFullFromHoldingIfNeeded(row, holdingIndex) {
  const target = localFullPath(row);

  if (fs.existsSync(target)) {
    return { status: "exists", source: "", target };
  }

  const expectedFilename = fullFilenameFromThumb(row.filename);
  const source = holdingIndex.get(normalize(expectedFilename));

  if (!source) {
    return { status: "missing", source: "", target };
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.renameSync(source, target);

  return { status: "moved", source, target };
}

function moveLocalFullToDeleted(row) {
  const source = localFullPath(row);
  if (!fs.existsSync(source)) return false;

  const destination = deletedLocalFullPath(row);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.renameSync(source, destination);

  return true;
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function isValidR2ImageKey(key) {
  if (!key) return false;
  if (key.endsWith("/")) return false;
  if (key.includes(".DS_Store")) return false;
  if (path.basename(key).startsWith(".")) return false;
  return VALID_EXT.has(path.extname(key).toLowerCase());
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
      if (obj.Key && isValidR2ImageKey(obj.Key)) keys.push(obj.Key);
    }

    token = res.NextContinuationToken;
  } while (token);

  return keys;
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
  await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

async function confirmIfNeeded(summary) {
  if (!APPLY) return false;
  if (YES) return true;

  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`\nApply these changes? Type YES to continue: `);
  rl.close();

  return answer.trim() === "YES";
}

async function main() {
  console.log(APPLY ? "🚀 APPLY MODE" : "🔎 DRY RUN MODE");
  console.log("Thumb folder is the source of truth.");
  console.log("Delete one local thumb to remove image from CSV, local full archive, and R2.");
  console.log("Full images can sit in LOCAL_FULL_HOLDING_ROOT and will be moved automatically.\n");

  const { rows: existingRaw, columns } = readCsv(GALLERY_CSV);

  const existingRows = existingRaw.map((row) => {
    const safeRow = {};
    for (const column of columns) safeRow[column] = row[column] ?? "";
    return safeRow;
  });

  const localThumbRows = walkLocalThumbs(LOCAL_THUMB_ROOT);
  const localMap = new Map(localThumbRows.map((row) => [rowKey(row), row]));
  const csvMap = new Map(existingRows.map((row) => [rowKey(row), row]));

  const holdingIndex = buildHoldingIndex();

  const fullMoves = [];
  const missingFulls = [];

  for (const row of localThumbRows) {
    const result = moveFullFromHoldingIfNeeded(row, holdingIndex);

    if (result.status === "moved") {
      fullMoves.push(result);
    }

    if (result.status === "missing") {
      missingFulls.push(result.target);
    }
  }

  const r2ThumbKeys = new Set(await listAllKeys(R2_THUMB_PREFIX));
  const r2FullKeys = new Set(await listAllKeys(R2_FULL_PREFIX));

  const csvAdditions = localThumbRows
    .filter((row) => !csvMap.has(rowKey(row)))
    .map((row) => makeEmptyCsvRow(row, columns));

  const removedRows = existingRows.filter((row) => !localMap.has(rowKey(row)));
  const keptRows = existingRows.filter((row) => localMap.has(rowKey(row)));

  const thumbsToUpload = [];
  const fullsToUpload = [];

  for (const row of localThumbRows) {
    const tKey = thumbKey(row);
    const fKey = fullKey(row);
    const fPath = localFullPath(row);

    if (!r2ThumbKeys.has(tKey)) {
      thumbsToUpload.push({ localPath: row.localThumbPath, key: tKey });
    }

    if (fs.existsSync(fPath) && !r2FullKeys.has(fKey)) {
      fullsToUpload.push({ localPath: fPath, key: fKey });
    }
  }

  const r2ThumbsToDelete = removedRows
    .map((row) => thumbKey(row))
    .filter((key) => r2ThumbKeys.has(key));

  const r2FullsToDelete = removedRows
    .map((row) => fullKey(row))
    .filter((key) => r2FullKeys.has(key));

  console.log(`Local thumbs found: ${localThumbRows.length}`);
  console.log(`CSV rows currently: ${existingRows.length}`);
  console.log(`CSV rows to add: ${csvAdditions.length}`);
  console.log(`CSV rows to remove: ${removedRows.length}`);
  console.log(`Full files to move from holding: ${fullMoves.length}`);
  console.log(`Missing local full files: ${missingFulls.length}`);
  console.log(`R2 thumbs to upload: ${thumbsToUpload.length}`);
  console.log(`R2 fulls to upload: ${fullsToUpload.length}`);
  console.log(`R2 thumbs to delete: ${r2ThumbsToDelete.length}`);
  console.log(`R2 fulls to delete: ${r2FullsToDelete.length}`);

  if (removedRows.length > 0) {
    console.log("\nImages removed locally and due for deletion:");
    removedRows.slice(0, 30).forEach((row) => {
      console.log(` - ${row.venue} / ${row.category} / ${row.filename}`);
    });
    if (removedRows.length > 30) console.log(` ...and ${removedRows.length - 30} more`);
  }

  if (fullMoves.length > 0) {
    console.log("\nFull files to move from holding:");
    fullMoves.slice(0, 20).forEach((move) => {
      console.log(` - ${path.basename(move.source)} → ${move.target}`);
    });
    if (fullMoves.length > 20) console.log(` ...and ${fullMoves.length - 20} more`);
  }

  if (missingFulls.length > 0) {
    console.log("\nFirst missing full files:");
    missingFulls.slice(0, 15).forEach((file) => console.log(` - ${file}`));
    if (missingFulls.length > 15) console.log(` ...and ${missingFulls.length - 15} more`);
  }

  if (!APPLY) {
    console.log("\nDry run only. Nothing changed.");
    console.log("Run with:");
    console.log("node scripts/gallery-manager.mjs --apply");
    return;
  }

  const confirmed = await confirmIfNeeded();
  if (!confirmed) {
    console.log("Cancelled. Nothing changed.");
    return;
  }

  createBackup(GALLERY_CSV);

  for (const move of fullMoves) {
    if (!fs.existsSync(move.target)) {
      fs.mkdirSync(path.dirname(move.target), { recursive: true });
      fs.renameSync(move.source, move.target);
    }
  }

  for (const row of removedRows) {
    const moved = moveLocalFullToDeleted(row);
    if (moved) {
      console.log(`🗂️ Moved local full to deleted archive: ${row.venue} / ${row.category} / ${fullFilenameFromThumb(row.filename)}`);
    }
  }

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

  writeCsv(GALLERY_CSV, keptRows.concat(csvAdditions), columns);

  console.log("\n✅ Gallery Manager V3 complete.");
  console.log(`🛡️ Preserved columns: ${columns.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});