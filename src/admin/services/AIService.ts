import { parseCsv } from "../utils/csv";
import { normalise } from "../utils/format";

type AiRow = {
  source?: string;
  aiTags?: string;
  aiAlt?: string;
  aiCaption?: string;
};

async function fetchText(path: string) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) return "";
  return res.text();
}

export class AIService {
  private rows: AiRow[];

  constructor(rows: AiRow[]) {
    this.rows = rows;
  }

  static async load() {
    const text = await fetchText("/gallery-ai.csv");
    return new AIService(parseCsv<AiRow>(text));
  }

  getBlogRows() {
    return this.rows.filter((row) => normalise(row.source || "gallery") === "blog");
  }

  getGalleryRows() {
    return this.rows.filter((row) => normalise(row.source || "gallery") !== "blog");
  }

  getCoverage(rows = this.rows) {
    return {
      total: rows.length,
      tags: rows.filter((row) => (row.aiTags || "").trim()).length,
      alt: rows.filter((row) => (row.aiAlt || "").trim()).length,
      captions: rows.filter((row) => (row.aiCaption || "").trim()).length,
    };
  }
}
