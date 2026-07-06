import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

export function readCsv(file, fallbackColumns = []) {
  if (!fs.existsSync(file)) return { rows: [], columns: [...fallbackColumns] };
  const raw = fs.readFileSync(file, "utf8");
  if (!raw.trim()) return { rows: [], columns: [...fallbackColumns] };
  const rows = parse(raw, { columns: true, skip_empty_lines: true });
  const headerLine = raw.split(/\r?\n/)[0] || "";
  const columns = headerLine
    .split(",")
    .map((column) => column.trim().replace(/^"+|"+$/g, ""))
    .filter(Boolean);
  for (const column of fallbackColumns) {
    if (!columns.includes(column)) columns.push(column);
  }
  return { rows, columns };
}

export function writeCsv(file, rows, columns) {
  const safeRows = rows.map((row) => {
    const safeRow = {};
    for (const column of columns) safeRow[column] = row[column] ?? "";
    return safeRow;
  });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, stringify(safeRows, { header: true, columns }), "utf8");
}

export function backupFile(file, label = "backup") {
  if (!fs.existsSync(file)) return "";
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");
  const backupPath = file.replace(/\.csv$/i, `.${label}-${timestamp}.csv`);
  fs.copyFileSync(file, backupPath);
  return backupPath;
}

export function latestBackup(file, labelPrefix = "") {
  const dir = path.dirname(file);
  const base = path.basename(file).replace(/\.csv$/i, "");
  if (!fs.existsSync(dir)) return "";
  const backups = fs
    .readdirSync(dir)
    .filter((name) => {
      if (!name.endsWith(".csv")) return false;
      if (!name.startsWith(`${base}.`)) return false;
      return labelPrefix ? name.includes(labelPrefix) : name.includes("backup");
    })
    .map((name) => path.join(dir, name))
    .sort();
  return backups.at(-1) || "";
}
