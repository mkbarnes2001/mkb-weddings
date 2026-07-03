import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { requiredColumns, defaultExtraColumns } from './config.mjs';
import { safeRow } from './utils.mjs';

export function readCsv(file) {
  if (!fs.existsSync(file)) {
    return { rows: [], columns: [...requiredColumns, ...defaultExtraColumns] };
  }

  const raw = fs.readFileSync(file, 'utf8');
  if (!raw.trim()) {
    return { rows: [], columns: [...requiredColumns, ...defaultExtraColumns] };
  }

  const records = parse(raw, { columns: true, skip_empty_lines: true });
  const headerLine = raw.split(/\r?\n/)[0] || '';
  const existingColumns = headerLine
    .split(',')
    .map((column) => column.trim().replace(/^"+|"+$/g, ''))
    .filter(Boolean);

  const columns = Array.from(new Set([...requiredColumns, ...existingColumns, ...defaultExtraColumns]));
  return { rows: records.map((row) => safeRow(row, columns)), columns };
}

export function writeCsv(file, rows, columns) {
  const safeRows = rows.map((row) => safeRow(row, columns));
  fs.writeFileSync(file, stringify(safeRows, { header: true, columns }), 'utf8');
}

export function makeEmptyCsvRow(localRow, columns) {
  const row = {};
  for (const column of columns) row[column] = '';
  row.venue = localRow.venue;
  row.category = localRow.category;
  row.filename = localRow.filename;
  return row;
}
