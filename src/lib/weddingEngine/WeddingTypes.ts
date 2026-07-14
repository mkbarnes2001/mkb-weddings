export interface WeddingSupplier {
  role: string;
  name: string;
  instagram?: string;
  website?: string;
}

export interface WeddingFacts {
  season?: string;
  ceremonyType?: string;
  ceremonyLocation?: string;
  receptionLocation?: string;
  celebrant?: string;
  photographer?: string;
}

export interface WeddingSeo {
  title?: string;
  description?: string;
}

export type WeddingLifecycleStatus =
  | "draft"
  | "published"
  | "archived";

export type WeddingStoryStatus =
  | "draft"
  | "published"
  | "archived";

export interface WeddingDocument {
  schemaVersion: 1;
  slug: string;
  title: string;
  couple: string;
  venue: string;
  venueSlug?: string;
  venueId?: string;
  weddingDate: string;
  excerpt: string;
  intro: string;
  story: string[];
  facts?: WeddingFacts;
  suppliers?: WeddingSupplier[];
  seo?: WeddingSeo;

  /**
   * Internal wedding lifecycle. This does not decide whether a public
   * wedding story exists.
   */
  status?: WeddingLifecycleStatus;

  /**
   * Public-story controls. New weddings default to false/draft.
   */
  storyEnabled?: boolean;
  storyStatus?: WeddingStoryStatus;
  storyPublishedAt?: string;

  updatedAt?: string;
}

export interface PublicWeddingImage {
  id: string;
  filename: string;
  order: number;
  thumbSrc: string;
  fullSrc: string;
  alt: string;
  caption: string;
  tags: string[];
  isCover: boolean;
}

export interface PublicWeddingDocument
  extends WeddingDocument {
  storyEnabled: true;
  storyStatus: "published";
  images: PublicWeddingImage[];
}
