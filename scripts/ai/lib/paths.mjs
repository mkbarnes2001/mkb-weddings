import fs from "node:fs";
import path from "node:path";

export function thumbPath(row, thumbRoot) {
  return path.join(thumbRoot, row.venue || "", row.category || "", row.filename || "");
}

export function mimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

export function imageToDataUrl(file) {
  const buffer = fs.readFileSync(file);
  return `data:${mimeType(file)};base64,${buffer.toString("base64")}`;
}

export function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
