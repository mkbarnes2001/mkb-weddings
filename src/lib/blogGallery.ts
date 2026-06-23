// src/lib/blogGallery.ts
import { BLOG_IMAGE_BASE_URL, WeddingStory } from "../data/weddingStories";

export interface GalleryCsvRow {
  blogSlug?: string;
  filename: string;
  blogOrder?: string;
  blogCover?: string;
}

export interface BlogImage {
  filename: string;
  blogSlug: string;
  blogOrder: number;
  isCover: boolean;
  thumbSrc: string;
  fullSrc: string;
  alt: string;
}

export interface BlogCard {
  story: WeddingStory;
  coverImage?: BlogImage;
  imageCount: number;
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

export function parseGalleryCsv(csvText: string): GalleryCsvRow[] {
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

    return row as unknown as GalleryCsvRow;
  });
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

export function buildImageUrl(size: "thumb" | "full", row: GalleryCsvRow) {
  const base = cleanBaseUrl(BLOG_IMAGE_BASE_URL);
  const filename = size === "full" ? fullFilenameFromThumb(row.filename) : row.filename;

  return [base, size, encodePathPart(row.blogSlug || ""), encodePathPart(filename)]
    .filter(Boolean)
    .join("/");
}

export function getBlogImages(csvText: string, slug: string, story?: WeddingStory): BlogImage[] {
  return parseGalleryCsv(csvText)
    .filter((row) => (row.blogSlug || "").trim() === slug)
    .map((row, index) => {
      const blogOrder = Number(row.blogOrder || index + 1);
      const isCover = ["true", "yes", "1", "cover"].includes(
        (row.blogCover || "").trim().toLowerCase(),
      );

      return {
        filename: row.filename,
        blogSlug: slug,
        blogOrder: Number.isFinite(blogOrder) ? blogOrder : index + 1,
        isCover,
        thumbSrc: buildImageUrl("thumb", row),
        fullSrc: buildImageUrl("full", row),
        alt: story ? `${story.couple} wedding at ${story.venue}` : "Wedding photograph",
      };
    })
    .sort((a, b) => a.blogOrder - b.blogOrder);
}

export function getCoverImage(images: BlogImage[]) {
  return images.find((image) => image.isCover) || images[0];
}

export function buildBlogCards(csvText: string, stories: WeddingStory[]): BlogCard[] {
  return stories.map((story) => {
    const images = getBlogImages(csvText, story.slug, story);

    return {
      story,
      coverImage: getCoverImage(images),
      imageCount: images.length,
    };
  });
}