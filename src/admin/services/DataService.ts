import { weddingStories } from "../../data/weddingStories";
import { parseCsv } from "../utils/csv";
import { normalise, normaliseFilename } from "../utils/format";
import type { AiStatus, DashboardStats, WeddingRecord } from "../types";

type BlogGalleryRow = {
  blogSlug?: string;
  filename?: string;
  blogOrder?: string;
  blogCover?: string;
};

type AiRow = {
  source?: string;
  blogSlug?: string;
  filename?: string;
  aiTags?: string;
  aiAlt?: string;
  aiCaption?: string;
  aiUpdatedAt?: string;
};

type GalleryRow = {
  venue?: string;
  category?: string;
  filename?: string;
};

async function fetchText(path: string) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) return "";
  return res.text();
}

function latestDate(rows: AiRow[]) {
  const dates = rows
    .map((row) => row.aiUpdatedAt)
    .filter(Boolean)
    .map((date) => new Date(date || ""))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  return dates[0]?.toISOString() || "";
}

export type AdminData = {
  blogGalleryRows: BlogGalleryRow[];
  aiRows: AiRow[];
  galleryRows: GalleryRow[];
  weddings: WeddingRecord[];
  stats: DashboardStats;
};

export async function loadAdminData(): Promise<AdminData> {
  const [blogGalleryText, aiText, galleryText] = await Promise.all([
    fetchText("/blog-gallery.csv"),
    fetchText("/gallery-ai.csv"),
    fetchText("/gallery.csv"),
  ]);

  const blogGalleryRows = parseCsv<BlogGalleryRow>(blogGalleryText);
  const aiRows = parseCsv<AiRow>(aiText);
  const galleryRows = parseCsv<GalleryRow>(galleryText);

  const blogAiByKey = new Map<string, AiRow>();

  aiRows
    .filter((row) => normalise(row.source || "gallery") === "blog")
    .forEach((row) => {
      const blogSlug = normalise(row.blogSlug);
      const filename = normaliseFilename(row.filename);

      if (blogSlug && filename) {
        blogAiByKey.set(`${blogSlug}::${filename}`, row);
      }
    });

  const weddings: WeddingRecord[] = weddingStories.map((story) => {
    const rows = blogGalleryRows
      .filter((row) => (row.blogSlug || "").trim() === story.slug)
      .sort((a, b) => Number(a.blogOrder || 0) - Number(b.blogOrder || 0));

    const aiForImages = rows.map((row) =>
      blogAiByKey.get(`${normalise(story.slug)}::${normaliseFilename(row.filename)}`),
    );

    const existingAiRows = aiForImages.filter(Boolean) as AiRow[];
    const imageCount = rows.length;

    const coverRows = rows.filter((row) =>
      ["true", "yes", "1", "cover"].includes(normalise(row.blogCover)),
    );

    const tagsComplete = existingAiRows.filter((row) => (row.aiTags || "").trim()).length;
    const altComplete = existingAiRows.filter((row) => (row.aiAlt || "").trim()).length;
    const captionComplete = existingAiRows.filter((row) => (row.aiCaption || "").trim()).length;

    const status: AiStatus =
      imageCount === 0 || altComplete < imageCount || captionComplete < imageCount
        ? "missing"
        : tagsComplete < imageCount || coverRows.length === 0
          ? "warning"
          : "ready";

    return {
      slug: story.slug,
      title: story.title,
      couple: story.couple,
      venue: story.venue,
      weddingDate: story.weddingDate,
      imageCount,
      coverCount: coverRows.length,
      aiRows: existingAiRows.length,
      tagsComplete,
      altComplete,
      captionComplete,
      status,
      latestAiUpdate: latestDate(existingAiRows),
    };
  });

  const blogAiRows = aiRows.filter((row) => normalise(row.source || "gallery") === "blog");
  const galleryAiRows = aiRows.filter((row) => normalise(row.source || "gallery") !== "blog");
  const readyWeddingCount = weddings.filter((wedding) => wedding.status === "ready").length;

  const stats: DashboardStats = {
    weddingCount: weddings.length,
    readyWeddingCount,
    warningWeddingCount: weddings.length - readyWeddingCount,
    blogImageCount: blogGalleryRows.length,
    galleryImageCount: galleryRows.length,
    blogAiRows: blogAiRows.length,
    galleryAiRows: galleryAiRows.length,
    blogTagsComplete: blogAiRows.filter((row) => (row.aiTags || "").trim()).length,
    blogAltComplete: blogAiRows.filter((row) => (row.aiAlt || "").trim()).length,
    blogCaptionComplete: blogAiRows.filter((row) => (row.aiCaption || "").trim()).length,
  };

  return {
    blogGalleryRows,
    aiRows,
    galleryRows,
    weddings,
    stats,
  };
}
