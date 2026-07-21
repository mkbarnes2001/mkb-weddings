export type MomentRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  availableForAssignment: boolean;
  showOnMomentsLanding: boolean;
  cardImageId: string;
  /** Optional full-width hero used on the individual moment gallery page. */
  heroImageId?: string;
  /** Ordered asset keys shown before the remainder of the gallery. */
  pinnedImageIds?: string[];
  /** Asset keys hidden only from this specific moment gallery. */
  hiddenImageIds?: string[];
  sortOrder: number;
  status: "active" | "archived";
};

export type MomentRepositoryDocument = {
  schemaVersion: 1;
  updatedAt: string;
  moments: MomentRecord[];
};

export type MomentGalleryImage = {
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
  globallyEnabled: boolean;
};

export type MomentGalleryPayload = {
  moment: MomentRecord;
  images: MomentGalleryImage[];
};
