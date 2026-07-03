import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.mjs';
import { fullFilenameFromThumb, isValidImageFile, normalize } from './utils.mjs';
import { warn } from './colours.mjs';

export function walkLocalThumbs(root) {
  const rows = [];

  function walk(dir) {
    for (const item of fs.readdirSync(dir)) {
      if (item === '.DS_Store' || item.startsWith('.')) continue;

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
        warn(`Skipping invalid thumb structure: ${rel}`);
        continue;
      }

      const filename = parts.pop();
      const category = parts.pop();
      const venue = parts.join('/');

      rows.push({ venue, category, filename, localThumbPath: fullPath });
    }
  }

  walk(root);
  return rows;
}

export function walkFiles(root) {
  const files = [];
  if (!root || !fs.existsSync(root)) return files;

  function walk(dir) {
    for (const item of fs.readdirSync(dir)) {
      if (item === '.DS_Store' || item.startsWith('.')) continue;

      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (isValidImageFile(item)) files.push(fullPath);
    }
  }

  walk(root);
  return files;
}

export function localFullPath(row) {
  return path.join(config.localFullRoot, row.venue, row.category, fullFilenameFromThumb(row.filename));
}

export function deletedLocalFullPath(row) {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(
    config.localFullRoot,
    '_deleted-by-gallery-manager',
    date,
    row.venue,
    row.category,
    fullFilenameFromThumb(row.filename),
  );
}

export function buildHoldingIndex() {
  const index = new Map();
  if (!config.localFullHoldingRoot || !fs.existsSync(config.localFullHoldingRoot)) return index;

  for (const file of walkFiles(config.localFullHoldingRoot)) {
    const base = path.basename(file);
    const key = normalize(base);

    if (!index.has(key)) {
      index.set(key, file);
    } else {
      warn(`Duplicate full filename in holding folder: ${base}`);
    }
  }

  return index;
}

export function planFullMoveFromHolding(row, holdingIndex) {
  const target = localFullPath(row);
  if (fs.existsSync(target)) return { status: 'exists', source: '', target, row };

  const expectedFilename = fullFilenameFromThumb(row.filename);
  const source = holdingIndex.get(normalize(expectedFilename));
  if (!source) return { status: 'missing', source: '', target, row };

  return { status: 'move', source, target, row };
}

export function moveFullFromHolding(move) {
  fs.mkdirSync(path.dirname(move.target), { recursive: true });
  fs.renameSync(move.source, move.target);
}

export function moveLocalFullToDeleted(row) {
  const source = localFullPath(row);
  if (!fs.existsSync(source)) return false;

  const destination = deletedLocalFullPath(row);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.renameSync(source, destination);
  return true;
}
