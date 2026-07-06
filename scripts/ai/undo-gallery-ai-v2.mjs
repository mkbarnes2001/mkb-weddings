import fs from "node:fs";
import { latestBackup } from "./lib/csv.mjs";

const file = process.env.GALLERY_AI_CSV || "public/gallery-ai.csv";
const backup = latestBackup(file, "backup-before-ai-v2");

if (!backup) {
  console.error("No V2 gallery-ai backup found.");
  process.exit(1);
}

const beforeUndo = file.replace(/\.csv$/i, `.before-undo-${Date.now()}.csv`);
if (fs.existsSync(file)) fs.copyFileSync(file, beforeUndo);
fs.copyFileSync(backup, file);
console.log(`Restored: ${backup}`);
console.log(`Previous current file saved as: ${beforeUndo}`);
