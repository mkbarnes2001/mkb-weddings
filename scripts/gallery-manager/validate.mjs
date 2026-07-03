import { filenameKey, rowKey } from './utils.mjs';
import { warn, ok } from './colours.mjs';

export function detectDuplicateFilenames(rows, label) {
  const seen = new Map();
  const duplicates = [];

  for (const row of rows) {
    const key = filenameKey(row);
    if (!key) continue;

    if (seen.has(key)) duplicates.push({ filename: row.filename, first: seen.get(key), second: row });
    else seen.set(key, row);
  }

  if (duplicates.length) {
    warn(`Duplicate filenames detected in ${label}: ${duplicates.length}`);
    duplicates.slice(0, 20).forEach((dup) => {
      console.log(` - ${dup.filename}`);
      console.log(`   First:  ${dup.first.venue} / ${dup.first.category}`);
      console.log(`   Second: ${dup.second.venue} / ${dup.second.category}`);
    });
    if (duplicates.length > 20) console.log(` ...and ${duplicates.length - 20} more`);
  } else {
    ok(`No duplicate filenames in ${label}`);
  }

  return duplicates;
}

export function detectDuplicateRows(rows, label) {
  const seen = new Set();
  const duplicates = [];

  for (const row of rows) {
    const key = rowKey(row);
    if (seen.has(key)) duplicates.push(row);
    else seen.add(key);
  }

  if (duplicates.length) warn(`Duplicate rows detected in ${label}: ${duplicates.length}`);
  return duplicates;
}
