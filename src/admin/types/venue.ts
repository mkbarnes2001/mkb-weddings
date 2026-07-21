export type VenueStatus = "draft" | "published" | "archived";

export type VenueSeo = {
  title: string;
  description: string;
};

export type VenueContact = {
  email: string;
  phone: string;
  coordinatorName: string;
  coordinatorEmail: string;
};

export type VenueLinks = {
  website: string;
  instagram: string;
  facebook: string;
  googleMaps: string;
};

export type VenuePractical = {
  address: string;
  parking: string;
  accommodation: string;
  ceremonyTypes: string;
  capacity: string;
  outdoorCeremony: boolean;
};

export type VenueNotes = {
  general: string;
  portraitLocations: string;
  rainBackup: string;
  sunsetNotes: string;
  restrictions: string;
};

export type VenueGalleryDisplay = {
  venue: boolean;
  moments: boolean;
  blog: boolean;
  homepage: boolean;
  portfolio: boolean;
  creativeFlash: boolean;
};

export type VenueGalleryItem = {
  assetId: string;
  imageId: string;
  weddingSlug: string;
  filename: string;
  order: number;
  included: boolean;
  hidden: boolean;
  rating: number;
  moments: string[];
  tags: string[];
  aiTags?: string[];
  aiAlt?: string;
  aiCaption?: string;
  display: VenueGalleryDisplay;
  thumbSrc?: string;
  fullSrc?: string;
  source?: {
    type: "legacy-gallery-csv" | "wedding-json" | "local-upload" | string;
    csvRow?: number;
    venue?: string;
    category?: string;
  };
};

export type VenueGalleryDocument = {
  schemaVersion: 1;
  updatedAt: string;
  heroAssetId: string;
  images: VenueGalleryItem[];
};

export type VenueDocument = {
  schemaVersion: 1;
  id: string;
  slug: string;
  name: string;
  county: string;
  town: string;
  country: string;
  intro: string;
  description: string;
  heroImageId: string;
  status: VenueStatus;
  links: VenueLinks;
  contact: VenueContact;
  practical: VenuePractical;
  notes: VenueNotes;
  seo: VenueSeo;
  gallery: VenueGalleryDocument;
  createdAt: string;
  updatedAt: string;
};

export type VenueWeddingSummary = {
  slug: string;
  title: string;
  couple: string;
  weddingDate: string;
  status: string;
};

export type VenueSummary = VenueDocument & {
  weddingCount: number;
  publishedWeddingCount: number;
  imageCount: number;
  lastWeddingDate: string;
  recentWeddings: VenueWeddingSummary[];
};
