import { AdminApiService } from "./AdminApiService";
import type {
  WeddingImage,
  WeddingPublicationStatus,
  WeddingRecord,
  WeddingStatus,
} from "../types/wedding";
import type { WeddingDocument } from "../../lib/weddingEngine";
import type { ImageManagerDocument } from "../types/imageManager";

type StoredWeddingImage = ImageManagerDocument["images"][number] & {
  thumbSrc?: string;
  fullSrc?: string;
  aiTags?: string[];
  aiAlt?: string;
  aiCaption?: string;
  source?: {
    thumbPath?: string;
    fullPath?: string;
    [key: string]: unknown;
  };
};

type D1Wedding = WeddingDocument & {
  storage: "d1";
  weddingPath: string;
};

export class WeddingService {
  private weddingSources: D1Wedding[];
  private imagesByWedding: Map<string, ImageManagerDocument>;

  constructor({
    weddingSources,
    imagesByWedding,
  }: {
    weddingSources: D1Wedding[];
    imagesByWedding: Map<string, ImageManagerDocument>;
  }) {
    this.weddingSources = weddingSources;
    this.imagesByWedding = imagesByWedding;
  }

  static async load() {
    const weddings = (await AdminApiService.listJsonWeddings()) as D1Wedding[];

    const imageDocuments = await Promise.all(
      weddings.map(async (wedding) => {
        const document = await AdminApiService.getWeddingImages(wedding.slug).catch(
          () => null,
        );
        return [wedding.slug, document] as const;
      }),
    );

    const imagesByWedding = new Map<string, ImageManagerDocument>();
    imageDocuments.forEach(([slug, document]) => {
      if (document) imagesByWedding.set(slug, document);
    });

    return new WeddingService({
      weddingSources: weddings,
      imagesByWedding,
    });
  }

  getWeddings(): WeddingRecord[] {
    return this.weddingSources
      .map((source) => this.buildWeddingRecord(source))
      .sort((a, b) => a.couple.localeCompare(b.couple));
  }

  getWedding(slug: string): WeddingRecord | undefined {
    const source = this.weddingSources.find((item) => item.slug === slug);
    return source ? this.buildWeddingRecord(source) : undefined;
  }

  private buildWeddingRecord(source: D1Wedding): WeddingRecord {
    const imageDocument = this.imagesByWedding.get(source.slug);

    const images: WeddingImage[] = (
      (imageDocument?.images || []) as StoredWeddingImage[]
    )
      .map((image, index) => {
        const filename = String(image.filename || "").trim();
        const thumbSrc =
          String(image.thumbSrc || "").trim() ||
          String(image.source?.thumbPath || "").trim();
        const fullSrc =
          String(image.fullSrc || "").trim() ||
          String(image.source?.fullPath || "").trim();

        return {
          filename,
          slug: source.slug,
          order: Number(image.order || index + 1),
          isCover: Boolean(image.isCover),
          thumbSrc: thumbSrc || fullSrc,
          fullSrc: fullSrc || thumbSrc,
          aiTags: Array.isArray(image.aiTags)
            ? image.aiTags.map((tag) => String(tag || "").trim()).filter(Boolean)
            : [],
          aiAlt: String(image.aiAlt || ""),
          aiCaption: String(image.aiCaption || ""),
        };
      })
      .filter((image) => image.filename && (image.thumbSrc || image.fullSrc))
      .sort((a, b) => a.order - b.order);

    const imageCount = images.length;
    const tagsComplete = images.filter((image) => image.aiTags.length > 0).length;
    const altComplete = images.filter((image) => image.aiAlt.trim()).length;
    const captionComplete = images.filter((image) => image.aiCaption.trim()).length;
    const coverCount = images.filter((image) => image.isCover).length;

    const status: WeddingStatus =
      imageCount === 0 || altComplete < imageCount || captionComplete < imageCount
        ? "missing"
        : tagsComplete < imageCount || coverCount === 0
          ? "warning"
          : "ready";

    const storyStatus = source.storyStatus || "draft";
    const publicationStatus: WeddingPublicationStatus =
      storyStatus === "archived"
        ? "archived"
        : source.storyEnabled === true && storyStatus === "published"
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
          image.aiTags.length > 0 || image.aiAlt.trim() || image.aiCaption.trim(),
      ).length,
      tagsComplete,
      altComplete,
      captionComplete,
      coverCount,
      status,
      publicationStatus,
      storage: "d1",
      latestAiUpdate: imageDocument?.updatedAt || source.updatedAt || "",
      images,
    };
  }
}
