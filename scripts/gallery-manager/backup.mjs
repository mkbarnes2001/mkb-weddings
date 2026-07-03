import fs from 'node:fs';
import path from 'node:path';
import { ok, warn, err } from './colours.mjs';

export function createBackup(file) {
  if (!fs.existsSync(file)) return '';

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .replace('Z', '');

  const backupPath = file.replace(/\.csv$/i, `.backup-${timestamp}.csv`);
  fs.copyFileSync(file, backupPath);
  ok(`Backup created: ${backupPath}`);
  return backupPath;
}

export function restoreLatestBackup(file) {
  const dir = path.dirname(file);
  const base = path.basename(file).replace(/\.csv$/i, '');

  if (!fs.existsSync(dir)) {
    err(`Folder not found: ${dir}`);
    process.exit(1);
  }

  const backups = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(`${base}.backup-`) && name.endsWith('.csv'))
    .map((name) => path.join(dir, name))
    .sort();

  if (backups.length === 0) {
    err('No gallery CSV backups found.');
    process.exit(1);
  }

  const latest = backups[backups.length - 1];

  if (fs.existsSync(file)) {
    const beforeUndo = file.replace(/\.csv$/i, `.before-undo-${Date.now()}.csv`);
    fs.copyFileSync(file, beforeUndo);
    warn(`Current CSV saved as: ${beforeUndo}`);
  }

  fs.copyFileSync(latest, file);
  ok(`Restored latest backup: ${latest}`);
}
