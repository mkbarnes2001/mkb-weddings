import type { WeddingImage } from "../types/wedding";
import type {
  ImageManagerDocument,
  ManagedWeddingImage,
} from "../types/imageManager";
import { AdminApiService } from "./AdminApiService";

function imageId(filename: string) {
  return filename.trim().toLowerCase();
}

function clampRating(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(5, Math.round(value)));
}

export class ImageManagerService {
  static async load(
    weddingSlug: string,
    baseImages: WeddingImage[],
  ): Promise<ManagedWeddingImage[]> {
    const overrides = await AdminApiService.getWeddingImages(
      weddingSlug,
    ).catch(() => null);

    const overrideImages =
      overrides?.images || [];

    const overrideById = new Map(
      overrideImages.map((image) => [
        image.id || imageId(image.filename),
        image,
      ]),
    );

    const overrideByFilename = new Map(
      overrideImages.map((image) => [
        imageId(image.filename),
        image,
      ]),
    );

    const matchedOverrideIds = new Set<string>();

    const mappedBaseImages = baseImages.map(
      (image, index) => {
        const fallbackId = imageId(image.filename);
        const sourceId = String(image.id || "").trim();
        const override =
          (sourceId ? overrideById.get(sourceId) : undefined) ||
          overrideById.get(fallbackId) ||
          overrideByFilename.get(fallbackId);

        if (override?.id) {
          matchedOverrideIds.add(override.id);
        }

        const id = override?.id || sourceId || fallbackId;
        const extendedOverride = override as
          | (typeof override & {
              thumbSrc?: string;
              fullSrc?: string;
              aiTags?: string[];
              aiAlt?: string;
              aiCaption?: string;
            })
          | undefined;

        return {
          id,
          filename: image.filename,
          slug: weddingSlug,
          order: override?.order ?? image.order ?? index + 1,
          isCover: override?.isCover ?? image.isCover ?? false,
          hidden: override?.hidden ?? false,
          rating: clampRating(override?.rating ?? 0),
          thumbSrc:
            extendedOverride?.thumbSrc ||
            image.thumbSrc,
          fullSrc:
            extendedOverride?.fullSrc ||
            image.fullSrc,
          aiTags:
            extendedOverride?.aiTags ||
            image.aiTags,
          aiAlt:
            extendedOverride?.aiAlt ??
            image.aiAlt,
          aiCaption:
            extendedOverride?.aiCaption ??
            image.aiCaption,
          collections: override?.collections?.length
            ? [...override.collections]
            : ["blog"],
        };
      });

    const overrideOnlyImages = overrideImages
      .filter((image) => {
        if (matchedOverrideIds.has(image.id)) {
          return false;
        }

        const extended = image as typeof image & {
          thumbSrc?: string;
          fullSrc?: string;
          aiTags?: string[];
          aiAlt?: string;
          aiCaption?: string;
        };

        return Boolean(
          extended.thumbSrc ||
          extended.fullSrc,
        );
      })
      .map((image, index) => {
        const extended = image as typeof image & {
          thumbSrc?: string;
          fullSrc?: string;
          aiTags?: string[];
          aiAlt?: string;
          aiCaption?: string;
        };

        return {
          id:
            image.id ||
            imageId(image.filename),
          filename: image.filename,
          slug: weddingSlug,
          order:
            image.order ||
            mappedBaseImages.length +
              index +
              1,
          isCover: Boolean(image.isCover),
          hidden: Boolean(image.hidden),
          rating: clampRating(
            image.rating || 0,
          ),
          thumbSrc:
            extended.thumbSrc ||
            extended.fullSrc ||
            "",
          fullSrc:
            extended.fullSrc ||
            extended.thumbSrc ||
            "",
          aiTags: Array.isArray(
            extended.aiTags,
          )
            ? extended.aiTags
            : [],
          aiAlt: extended.aiAlt || "",
          aiCaption:
            extended.aiCaption || "",
          collections:
            image.collections?.length
              ? [...image.collections]
              : [],
        };
      });

    return [
      ...mappedBaseImages,
      ...overrideOnlyImages,
    ].sort((a, b) => a.order - b.order);
  }

  static toDocument(
    weddingSlug: string,
    images: ManagedWeddingImage[],
  ): ImageManagerDocument {
    return {
      schemaVersion: 1,
      weddingSlug,
      updatedAt: new Date().toISOString(),
      images: images.map((image, index) => ({
        id: image.id,
        filename: image.filename,
        order: index + 1,
        isCover: image.isCover,
        hidden: image.hidden,
        rating: clampRating(image.rating),
        collections: [...new Set(image.collections)],
      })),
    };
  }

  static async save(
    weddingSlug: string,
    images: ManagedWeddingImage[],
  ) {
    return AdminApiService.saveWeddingImages(
      weddingSlug,
      this.toDocument(weddingSlug, images),
    );
  }
}
