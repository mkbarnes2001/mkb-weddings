import fs from "node:fs";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const CSV_PATH = process.argv[2] ?? "public/gallery.csv";

const raw = fs.readFileSync(CSV_PATH, "utf8");
const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

function to500(name) {
  return (name ?? "").replace(/_2000(\.\w+)$/i, "_500$1");
}

// Normalize + dedupe by (venue, category, filename_500)
const seen = new Map();

for (const r of rows) {
  const venue = (r.venue ?? "").trim();
  const category = (r.category ?? "").trim();
  const filename = to500((r.filename ?? "").trim());
  const tags = (r.tags ?? "").trim();

  if (!venue || !category || !filename) continue;

  const key = `${venue}||${category}||${filename}`.toLowerCase();

  // Prefer row that already has tags if there’s a collision
  const prev = seen.get(key);
  if (!prev) {
    seen.set(key, { venue, category, filename, tags });
  } else if (!prev.tags && tags) {
    seen.set(key, { venue, category, filename, tags });
  }
}

const cleaned = Array.from(seen.values()).sort((a, b) => {
  const ak = `${a.venue}||${a.category}||${a.filename}`.toLowerCase();
  const bk = `${b.venue}||${b.category}||${b.filename}`.toLowerCase();
  return ak.localeCompare(bk);
});

const out = stringify(cleaned, {
  header: true,
  columns: ["venue", "category", "filename", "tags"],
});

fs.writeFileSync(CSV_PATH, out, "utf8");
console.log(`✅ Normalized + deduped: ${CSV_PATH}`);
console.log(`Rows before: ${rows.length}, after: ${cleaned.length}`);
