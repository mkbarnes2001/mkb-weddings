// src/lib/intelligence.ts
import { BLOG_IMAGE_BASE_URL, WeddingStory } from "../data/weddingStories";

export interface BlogGalleryCsvRow {
  blogSlug?: string;
  filename: string;
  blogOrder?: string;
  blogCover?: string;
}

export interface AiCsvRow {
  source?: string;
  imageId?: string;
  blogSlug?: string;
  filename?: string;
  aiTags?: string;
  aiAlt?: string;
  aiCaption?: string;
}

export interface BlogImage {
  filename: string;
  blogSlug: string;
  blogOrder: number;
  isCover: boolean;
  thumbSrc: string;
  fullSrc: string;
  alt: string;
  caption: string;
  aiTags: string[];
  aiAlt: string;
  aiCaption: string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export function parseCsv<T extends Record<string, string>>(csvText: string): T[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    return row as T;
  });
}

async function fetchText(path: string) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) return "";
  return res.text();
}

function cleanBaseUrl(url: string) {
  return (url || "").replace(/\/+$/, "");
}

function encodePathPart(value: string) {
  return encodeURIComponent(value || "").replace(/%2F/g, "/");
}

function fullFilenameFromThumb(filename: string) {
  return filename.replace(/_500(\.[a-z0-9]+)$/i, "_2000$1");
}

function normalise(value?: string) {
  return (value || "").trim().toLowerCase();
}

function normaliseFilename(filename?: string) {
  return (filename || "")
    .trim()
    .replace(/_2000(\.[a-z0-9]+)$/i, "_500$1")
    .replace(/%20/g, " ");
}

function splitTags(value?: string) {
  return (value || "")
    .split(/[|,]/g)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function buildBlogImageUrl(size: "thumb" | "full", row: BlogGalleryCsvRow) {
  const base = cleanBaseUrl(BLOG_IMAGE_BASE_URL);
  const filename = size === "full" ? fullFilenameFromThumb(row.filename) : row.filename;

  return [base, size, encodePathPart(row.blogSlug || ""), encodePathPart(filename)]
    .filter(Boolean)
    .join("/");
}

function fallbackBlogAlt(story?: WeddingStory) {
  return story ? `${story.venue} wedding photography story` : "Wedding photograph";
}

export class MkbIntelligence {
  private blogRows: BlogGalleryCsvRow[];
  private aiByBlogSlugAndFilename: Map<string, AiCsvRow>;

  constructor({
    blogRows,
    aiRows,
  }: {
    blogRows: BlogGalleryCsvRow[];
    aiRows: AiCsvRow[];
  }) {
    this.blogRows = blogRows;
    this.aiByBlogSlugAndFilename = new Map();

    for (const row of aiRows) {
      const source = normalise(row.source || "gallery");
      if (source !== "blog") continue;

      const blogSlug = normalise(row.blogSlug);
      const filename = normaliseFilename(row.filename);

      if (blogSlug && filename) {
        this.aiByBlogSlugAndFilename.set(`${blogSlug}::${filename}`, row);
      }
    }
  }

  getAiForBlogImage(blogSlug: string, filename: string) {
    return this.aiByBlogSlugAndFilename.get(
      `${normalise(blogSlug)}::${normaliseFilename(filename)}`,
    );
  }

  getBlogImages(slug: string, story?: WeddingStory): BlogImage[] {
    return this.blogRows
      .filter((row) => (row.blogSlug || "").trim() === slug)
      .map((row, index) => {
        const blogOrder = Number(row.blogOrder || index + 1);
        const isCover = ["true", "yes", "1", "cover"].includes(
          (row.blogCover || "").trim().toLowerCase(),
        );

        const ai = this.getAiForBlogImage(slug, row.filename);
        const aiAlt = ai?.aiAlt || "";
        const aiCaption = ai?.aiCaption || "";

        return {
          filename: row.filename,
          blogSlug: slug,
          blogOrder: Number.isFinite(blogOrder) ? blogOrder : index + 1,
          isCover,
          thumbSrc: buildBlogImageUrl("thumb", row),
          fullSrc: buildBlogImageUrl("full", row),
          alt: aiAlt || fallbackBlogAlt(story),
          caption: aiCaption,
          aiTags: splitTags(ai?.aiTags),
          aiAlt,
          aiCaption,
        };
      })
      .sort((a, b) => a.blogOrder - b.blogOrder);
  }

  getCoverImage(images: BlogImage[]) {
    return images.find((image) => image.isCover) || images[0];
  }
}

export async function loadMkbIntelligence() {
  const [blogGalleryText, galleryAiText] = await Promise.all([
    fetchText("/blog-gallery.csv"),
    fetchText("/gallery-ai.csv"),
  ]);

  return new MkbIntelligence({
    blogRows: parseCsv<BlogGalleryCsvRow>(blogGalleryText),
    aiRows: parseCsv<AiCsvRow>(galleryAiText),
  });
}
