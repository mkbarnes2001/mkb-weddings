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

    const overrideById = new Map(
      (overrides?.images || []).map((image) => [
        image.id || imageId(image.filename),
        image,
      ]),
    );

    return baseImages
      .map((image, index) => {
        const id = imageId(image.filename);
        const override = overrideById.get(id);

        return {
          id,
          filename: image.filename,
          slug: weddingSlug,
          order: override?.order ?? image.order ?? index + 1,
          isCover: override?.isCover ?? image.isCover ?? false,
          hidden: override?.hidden ?? false,
          rating: clampRating(override?.rating ?? 0),
          thumbSrc: image.thumbSrc,
          fullSrc: image.fullSrc,
          aiTags: image.aiTags,
          aiAlt: image.aiAlt,
          aiCaption: image.aiCaption,
          collections: override?.collections?.length
            ? [...override.collections]
            : ["blog"],
        };
      })
      .sort((a, b) => a.order - b.order);
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
