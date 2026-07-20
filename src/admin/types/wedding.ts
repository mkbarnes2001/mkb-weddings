export type WeddingStatus = "ready" | "warning" | "missing";
export type WeddingPublicationStatus = "draft" | "published" | "archived";

export type WeddingStorage = "d1" | "legacy" | "json";

export type WeddingImage = {
  id?: string;
  filename: string;
  slug: string;
  order: number;
  isCover: boolean;
  thumbSrc: string;
  fullSrc: string;
  aiTags: string[];
  aiAlt: string;
  aiCaption: string;
};

export type WeddingRecord = {
  slug: string;
  title: string;
  couple: string;
  venue: string;
  weddingDate: string;
  intro?: string;
  imageCount: number;
  aiRows: number;
  tagsComplete: number;
  altComplete: number;
  captionComplete: number;
  coverCount: number;
  status: WeddingStatus;
  publicationStatus: WeddingPublicationStatus;
  storage: WeddingStorage;
  latestAiUpdate?: string;
  images: WeddingImage[];
};
