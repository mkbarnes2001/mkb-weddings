export type CustomCollectionStatus = "draft" | "active" | "archived";

export type CustomCollectionImage = {
  assetKey: string;
  imageId: string;
  weddingSlug: string;
  venueSlug: string;
  venueName: string;
  filename: string;
  thumbSrc: string;
  fullSrc: string;
  alt: string;
  caption: string;
  included: boolean;
  hidden: boolean;
  sortOrder: number;
};

export type CustomCollection = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: CustomCollectionStatus;
  showOnLanding: boolean;
  sortOrder: number;
  heroAssetKey: string;
  seoTitle: string;
  seoDescription: string;
  imageCount: number;
  visibleImageCount: number;
  heroImage: {
    assetKey: string;
    imageId: string;
    thumbSrc: string;
    fullSrc: string;
    alt: string;
  } | null;
};

export type CustomCollectionGalleryPayload = {
  collection: CustomCollection;
  images: CustomCollectionImage[];
};
