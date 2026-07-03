import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { config, requireConfig } from './config.mjs';
import { createBackup, restoreLatestBackup } from './backup.mjs';
import { ok, warn, info, err, muted } from './colours.mjs';
import { readCsv, writeCsv, makeEmptyCsvRow } from './csv.mjs';
import {
  buildHoldingIndex,
  localFullPath,
  moveFullFromHolding,
  moveLocalFullToDeleted,
  planFullMoveFromHolding,
  walkLocalThumbs,
} from './local.mjs';
import { deleteR2Key, fullKey, listAllKeys, thumbKey, uploadFile } from './r2.mjs';
import { detectDuplicateFilenames, detectDuplicateRows } from './validate.mjs';
import { rowKey } from './utils.mjs';

const APPLY = process.argv.includes('--apply');
const YES = process.argv.includes('--yes');
const UNDO = process.argv.includes('--undo');
const HEALTH = process.argv.includes('--health');

async function confirmIfNeeded() {
  if (!APPLY) return false;
  if (YES) return true;

  const rl = readline.createInterface({ input, output });
  const answer = await rl.question('\nApply these changes? Type YES to continue: ');
  rl.close();
  return answer.trim() === 'YES';
}

function printList(title, rows, formatter, limit = 25) {
  if (!rows.length) return;
  console.log(`\n${title}`);
  rows.slice(0, limit).forEach((row) => console.log(` - ${formatter(row)}`));
  if (rows.length > limit) console.log(` ...and ${rows.length - limit} more`);
}

async function main() {
  if (UNDO) {
    restoreLatestBackup(config.galleryCsv);
    return;
  }

  requireConfig();

  info(APPLY ? 'Gallery Manager V4 - APPLY MODE' : 'Gallery Manager V4 - DRY RUN MODE');
  console.log('Thumb folder is the source of truth. Delete one thumb to remove an image.');
  console.log('Full images may be placed in full-holding and will be moved automatically.\n');

  const { rows: csvRows, columns } = readCsv(config.galleryCsv);
  const localThumbRows = walkLocalThumbs(config.localThumbRoot);

  detectDuplicateFilenames(localThumbRows, 'local thumbs');
  detectDuplicateRows(csvRows, 'gallery.csv');

  const holdingIndex = buildHoldingIndex();
  const localMap = new Map(localThumbRows.map((row) => [rowKey(row), row]));
  const csvMap = new Map(csvRows.map((row) => [rowKey(row), row]));

  const fullMovePlans = [];
  const missingFulls = [];

  for (const row of localThumbRows) {
    const plan = planFullMoveFromHolding(row, holdingIndex);
    if (plan.status === 'move') fullMovePlans.push(plan);
    if (plan.status === 'missing') missingFulls.push(plan);
  }

  const r2ThumbKeys = new Set(await listAllKeys(config.r2ThumbPrefix));
  const r2FullKeys = new Set(await listAllKeys(config.r2FullPrefix));

  const csvAdditions = localThumbRows
    .filter((row) => !csvMap.has(rowKey(row)))
    .map((row) => makeEmptyCsvRow(row, columns));

  const removedRows = csvRows.filter((row) => !localMap.has(rowKey(row)));
  const keptRows = csvRows.filter((row) => localMap.has(rowKey(row)));

  const thumbsToUpload = [];
  const fullsToUpload = [];

  for (const row of localThumbRows) {
    const tKey = thumbKey(row);
    const fKey = fullKey(row);
    const fPath = localFullPath(row);

    if (!r2ThumbKeys.has(tKey)) thumbsToUpload.push({ localPath: row.localThumbPath, key: tKey });
    if (fs.existsSync(fPath) && !r2FullKeys.has(fKey)) fullsToUpload.push({ localPath: fPath, key: fKey });
  }

  const r2ThumbsToDelete = removedRows.map((row) => thumbKey(row)).filter((key) => r2ThumbKeys.has(key));
  const r2FullsToDelete = removedRows.map((row) => fullKey(row)).filter((key) => r2FullKeys.has(key));

  console.log('\nSummary');
  console.log(`Local thumbs found: ${localThumbRows.length}`);
  console.log(`CSV rows currently: ${csvRows.length}`);
  console.log(`CSV rows to add: ${csvAdditions.length}`);
  console.log(`CSV rows to remove: ${removedRows.length}`);
  console.log(`Full files to move from holding: ${fullMovePlans.length}`);
  console.log(`Missing local full files: ${missingFulls.length}`);
  console.log(`R2 thumbs to upload: ${thumbsToUpload.length}`);
  console.log(`R2 fulls to upload: ${fullsToUpload.length}`);
  console.log(`R2 thumbs to delete: ${r2ThumbsToDelete.length}`);
  console.log(`R2 fulls to delete: ${r2FullsToDelete.length}`);

  printList('Images removed locally and due for deletion:', removedRows, (row) => `${row.venue} / ${row.category} / ${row.filename}`);
  printList('Full files to move from holding:', fullMovePlans, (move) => `${path.basename(move.source)} → ${move.target}`, 15);
  printList('Missing full files:', missingFulls, (move) => move.target, 15);

  if (HEALTH) {
    if (!csvAdditions.length && !removedRows.length && !fullMovePlans.length && !missingFulls.length && !thumbsToUpload.length && !fullsToUpload.length) {
      ok('\nGallery health looks good.');
    } else {
      warn('\nGallery health has items to review.');
    }
    return;
  }

  if (!APPLY) {
    muted('\nDry run only. Nothing changed.');
    console.log('Run: node scripts/gallery-manager/index.mjs --apply');
    console.log('Undo latest CSV backup: node scripts/gallery-manager/index.mjs --undo');
    return;
  }

  const confirmed = await confirmIfNeeded();
  if (!confirmed) {
    warn('Cancelled. Nothing changed.');
    return;
  }

  createBackup(config.galleryCsv);

  for (const move of fullMovePlans) {
    fs.mkdirSync(path.dirname(move.target), { recursive: true });
    moveFullFromHolding(move);
    ok(`Moved full from holding: ${path.basename(move.source)}`);
  }

  for (const row of removedRows) {
    if (moveLocalFullToDeleted(row)) ok(`Archived local full: ${row.venue} / ${row.category} / ${row.filename}`);
  }

  for (const item of thumbsToUpload) {
    console.log(`Upload thumb: ${item.key}`);
    await uploadFile(item.localPath, item.key);
  }

  for (const item of fullsToUpload) {
    console.log(`Upload full: ${item.key}`);
    await uploadFile(item.localPath, item.key);
  }

  for (const key of r2ThumbsToDelete) {
    warn(`Delete R2 thumb: ${key}`);
    await deleteR2Key(key);
  }

  for (const key of r2FullsToDelete) {
    warn(`Delete R2 full: ${key}`);
    await deleteR2Key(key);
  }

  writeCsv(config.galleryCsv, keptRows.concat(csvAdditions), columns);
  ok('\nGallery Manager V4 complete.');
  ok(`Preserved columns: ${columns.join(', ')}`);
}

main().catch((error) => {
  err(error?.stack || error?.message || String(error));
  process.exit(1);
});
