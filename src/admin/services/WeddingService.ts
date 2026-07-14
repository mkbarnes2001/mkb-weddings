import { BLOG_IMAGE_BASE_URL, weddingStories } from "../../data/weddingStories";
import { parseCsv } from "../utils/csv";
import { normalise, normaliseFilename } from "../utils/format";
import { AdminApiService } from "./AdminApiService";
import type {
  WeddingImage,
  WeddingPublicationStatus,
  WeddingRecord,
  WeddingStatus,
  WeddingStorage,
} from "../types/wedding";
import type { WeddingDocument } from "../../lib/weddingEngine";
import type { ImageManagerDocument } from "../types/imageManager";

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

type WeddingSource = WeddingDocument & {
  storage: WeddingStorage;
};

type StoredWeddingImage =
  ImageManagerDocument["images"][number] & {
    thumbSrc?: string;
    fullSrc?: string;
    aiTags?: string[];
    aiAlt?: string;
    aiCaption?: string;
    source?: {
      thumbPath?: string;
      fullPath?: string;
      storage?: string;
      [key: string]: unknown;
    };
  };

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

function buildImageUrl(
  size: "thumb" | "full",
  slug: string,
  filename: string,
) {
  const base = cleanBaseUrl(BLOG_IMAGE_BASE_URL);
  const finalFilename =
    size === "full" ? fullFilenameFromThumb(filename) : filename;

  return [
    base,
    size,
    encodePathPart(slug),
    encodePathPart(finalFilename),
  ]
    .filter(Boolean)
    .join("/");
}

function splitTags(value?: string) {
  return (value || "")
    .split(/[|,]/g)
    .map((tag) => tag.trim())
    .filter(Boolean);
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

function aiKey(blogSlug?: string, filename?: string) {
  return `${normalise(blogSlug)}::${normaliseFilename(filename)}`;
}

function legacyWeddingSources(): WeddingSource[] {
  return weddingStories.map((story) => ({
    schemaVersion: 1,
    slug: story.slug,
    title: story.title,
    couple: story.couple,
    venue: story.venue,
    weddingDate: story.weddingDate,
    excerpt: story.excerpt,
    intro: story.intro,
    story: story.story,
    facts: story.facts,
    suppliers: story.suppliers,
    seo: {
      title: story.seoTitle,
      description: story.seoDescription,
    },
    status: "published",
    storyEnabled: true,
    storyStatus: "published",
    storage: "legacy",
  }));
}

function mergeWeddingSources(
  legacy: WeddingSource[],
  json: WeddingSource[],
) {
  const map = new Map<string, WeddingSource>();

  legacy.forEach((wedding) => map.set(wedding.slug, wedding));
  json.forEach((wedding) => map.set(wedding.slug, wedding));

  return Array.from(map.values()).sort((a, b) =>
    a.couple.localeCompare(b.couple),
  );
}

export class WeddingService {
  private blogRows: BlogGalleryRow[];
  private blogAiByKey: Map<string, AiRow>;
  private weddingSources: WeddingSource[];
  private jsonImagesByWedding: Map<
    string,
    ImageManagerDocument
  >;

  constructor({
    blogRows,
    aiRows,
    weddingSources,
    jsonImagesByWedding,
  }: {
    blogRows: BlogGalleryRow[];
    aiRows: AiRow[];
    weddingSources: WeddingSource[];
    jsonImagesByWedding: Map<
      string,
      ImageManagerDocument
    >;
  }) {
    this.blogRows = blogRows;
    this.weddingSources = weddingSources;
    this.jsonImagesByWedding = jsonImagesByWedding;
    this.blogAiByKey = new Map();

    aiRows
      .filter((row) => normalise(row.source || "gallery") === "blog")
      .forEach((row) => {
        const key = aiKey(row.blogSlug, row.filename);
        if (key !== "::") this.blogAiByKey.set(key, row);
      });
  }

  static async load() {
    const [blogGalleryText, aiText, jsonWeddings] = await Promise.all([
      fetchText("/blog-gallery.csv"),
      fetchText("/gallery-ai.csv"),
      AdminApiService.listJsonWeddings().catch(() => []),
    ]);

    const jsonSources: WeddingSource[] = jsonWeddings.map((wedding) => ({
      ...wedding,
      storage: "json",
    }));

    const imageDocuments = await Promise.all(
      jsonWeddings.map(async (wedding) => {
        const document =
          await AdminApiService.getWeddingImages(
            wedding.slug,
          ).catch(() => null);

        return [wedding.slug, document] as const;
      }),
    );

    const jsonImagesByWedding = new Map<
      string,
      ImageManagerDocument
    >();

    imageDocuments.forEach(([slug, document]) => {
      if (document) {
        jsonImagesByWedding.set(slug, document);
      }
    });

    return new WeddingService({
      blogRows: parseCsv<BlogGalleryRow>(blogGalleryText),
      aiRows: parseCsv<AiRow>(aiText),
      weddingSources: mergeWeddingSources(
        legacyWeddingSources(),
        jsonSources,
      ),
      jsonImagesByWedding,
    });
  }

  getWeddings(): WeddingRecord[] {
    return this.weddingSources.map((source) =>
      this.buildWeddingRecord(source),
    );
  }

  getWedding(slug: string): WeddingRecord | undefined {
    const source = this.weddingSources.find(
      (item) => item.slug === slug,
    );

    return source ? this.buildWeddingRecord(source) : undefined;
  }

  private buildWeddingRecord(
    source: WeddingSource,
  ): WeddingRecord {
    const rows = this.blogRows
      .filter((row) => (row.blogSlug || "").trim() === source.slug)
      .sort(
        (a, b) =>
          Number(a.blogOrder || 0) -
          Number(b.blogOrder || 0),
      );

    const legacyImages: WeddingImage[] = rows.map(
      (row, index) => {
        const filename = row.filename || "";
        const ai = this.blogAiByKey.get(
          aiKey(source.slug, filename),
        );
        const order = Number(
          row.blogOrder || index + 1,
        );
        const isCover = [
          "true",
          "yes",
          "1",
          "cover",
        ].includes(normalise(row.blogCover));

        return {
          filename,
          slug: source.slug,
          order: Number.isFinite(order)
            ? order
            : index + 1,
          isCover,
          thumbSrc: buildImageUrl(
            "thumb",
            source.slug,
            filename,
          ),
          fullSrc: buildImageUrl(
            "full",
            source.slug,
            filename,
          ),
          aiTags: splitTags(ai?.aiTags),
          aiAlt: ai?.aiAlt || "",
          aiCaption: ai?.aiCaption || "",
        };
      },
    );

    const jsonDocument =
      this.jsonImagesByWedding.get(source.slug);

    const jsonImages: WeddingImage[] = (
      (jsonDocument?.images || []) as StoredWeddingImage[]
    )
      .map((image, index) => {
        const filename = String(
          image.filename || "",
        ).trim();

        const thumbSrc =
          String(image.thumbSrc || "").trim() ||
          String(image.source?.thumbPath || "").trim();

        const fullSrc =
          String(image.fullSrc || "").trim() ||
          String(image.source?.fullPath || "").trim();

        return {
          filename,
          slug: source.slug,
          order: Number(
            image.order || index + 1,
          ),
          isCover: Boolean(image.isCover),
          thumbSrc: thumbSrc || fullSrc,
          fullSrc: fullSrc || thumbSrc,
          aiTags: Array.isArray(image.aiTags)
            ? image.aiTags
                .map((tag) => String(tag || "").trim())
                .filter(Boolean)
            : [],
          aiAlt: String(image.aiAlt || ""),
          aiCaption: String(
            image.aiCaption || "",
          ),
        };
      })
      .filter(
        (image) =>
          image.filename &&
          (image.thumbSrc || image.fullSrc),
      );

    const imageByFilename =
      new Map<string, WeddingImage>();

    legacyImages.forEach((image) => {
      imageByFilename.set(
        normaliseFilename(image.filename),
        image,
      );
    });

    jsonImages.forEach((image) => {
      imageByFilename.set(
        normaliseFilename(image.filename),
        image,
      );
    });

    const images = Array.from(
      imageByFilename.values(),
    ).sort((a, b) => a.order - b.order);

    const aiRowsForImages = images
      .map((image) =>
        this.blogAiByKey.get(
          aiKey(source.slug, image.filename),
        ),
      )
      .filter(Boolean) as AiRow[];

    const imageCount = images.length;
    const tagsComplete = images.filter(
      (image) => image.aiTags.length > 0,
    ).length;
    const altComplete = images.filter((image) =>
      image.aiAlt.trim(),
    ).length;
    const captionComplete = images.filter((image) =>
      image.aiCaption.trim(),
    ).length;
    const coverCount = images.filter(
      (image) => image.isCover,
    ).length;

    const status: WeddingStatus =
      imageCount === 0 ||
      altComplete < imageCount ||
      captionComplete < imageCount
        ? "missing"
        : tagsComplete < imageCount || coverCount === 0
          ? "warning"
          : "ready";

    const storyEnabled =
      source.storage === "legacy"
        ? true
        : source.storyEnabled === true;

    const storyStatus =
      source.storage === "legacy"
        ? "published"
        : source.storyStatus ||
          "draft";

    const publicationStatus: WeddingPublicationStatus =
      storyStatus === "archived"
        ? "archived"
        : storyEnabled &&
            storyStatus === "published"
          ? "published"
          : "draft";

    return {
      slug: source.slug,
      title: source.title,
      couple: source.couple,
      venue: source.venue,
      weddingDate: source.weddingDate,
      intro: source.intro,
      imageCount,
      aiRows: images.filter(
        (image) =>
          image.aiTags.length > 0 ||
          image.aiAlt.trim() ||
          image.aiCaption.trim(),
      ).length,
      tagsComplete,
      altComplete,
      captionComplete,
      coverCount,
      status,
      publicationStatus,
      storage: source.storage,
      latestAiUpdate:
        latestDate(aiRowsForImages) ||
        jsonDocument?.updatedAt ||
        "",
      images,
    };
  }
}
