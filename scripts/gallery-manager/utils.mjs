import path from 'node:path';
import { validExt } from './config.mjs';

export function normalize(value) {
  return (value ?? '').toString().toLowerCase().replace(/\s+/g, ' ').trim();
}

export function isValidImageFile(filename) {
  if (!filename) return false;
  if (filename === '.DS_Store') return false;
  if (filename.startsWith('.')) return false;
  return validExt.has(path.extname(filename).toLowerCase());
}

export function isValidR2ImageKey(key) {
  if (!key) return false;
  if (key.endsWith('/')) return false;
  if (key.includes('.DS_Store')) return false;
  if (path.basename(key).startsWith('.')) return false;
  return validExt.has(path.extname(key).toLowerCase());
}

export function fullFilenameFromThumb(filename) {
  return String(filename || '').replace(/_500(\.[a-z0-9]+)$/i, '_2000$1');
}

export function contentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.webp') return 'image/webp';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  return 'application/octet-stream';
}

export function rowKey(row) {
  return `${normalize(row.venue)}|${normalize(row.category)}|${normalize(row.filename)}`;
}

export function filenameKey(row) {
  return normalize(row.filename);
}

export function safeRow(row, columns) {
  const out = {};
  for (const column of columns) out[column] = row[column] ?? '';
  return out;
}
