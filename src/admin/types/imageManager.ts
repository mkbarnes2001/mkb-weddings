export type ImageCollectionId =
  | "blog"
  | "venue"
  | "homepage"
  | "portfolio"
  | "instagram"
  | string;

export type ManagedWeddingImage = {
  id: string;
  filename: string;
  slug: string;
  order: number;
  isCover: boolean;
  hidden: boolean;
  rating: number;
  thumbSrc: string;
  fullSrc: string;
  aiTags: string[];
  aiAlt: string;
  aiCaption: string;
  collections: ImageCollectionId[];
};

export type ImageManagerDocument = {
  schemaVersion: 1;
  weddingSlug: string;
  updatedAt?: string;
  images: Array<{
    id: string;
    filename: string;
    order: number;
    isCover: boolean;
    hidden: boolean;
    rating: number;
    collections: ImageCollectionId[];
  }>;
};
